# Product Audit Extension 功能与实现深度分析文档

## 1. 概述
`product-audit-extension` 是一个用于自动化审核电商平台商品的浏览器插件（基于 WXT 框架）。它通过拦截和操作 `https://admin.pinhaopin.com` 管理后台的页面内容，结合阿里云内容安全 API、阿里云 OCR API 和 DeepSeek AI 模型，实现对商品文本、图片及经营范围的自动化合规性检测。

## 2. 核心功能模块

### 2.1 自动化商品获取
- **功能**: 自动从后台接口拉取待审核商品列表。
- **实现**: 
  - 调用 `https://admin.pinhaopin.com/gateway/mall/listAllProducts` 接口。
  - 参数: `pageNumber=0`, `pageSize=200`, `status=pending`, `sortField=pendingTime`, `sortOrder=asc`。
  - 逻辑: 循环处理列表中的商品，如果列表为空，则倒计时 10 分钟后刷新页面。

### 2.2 多模态审核流水线
插件采用串行流水线方式对商品进行审核，任意环节不通过即终止并拒绝。

1.  **文本审核**: 检测商品名称和描述是否包含违规内容（广告法、违禁品等）。
2.  **图片审核**: 检测商品主图、轮播图及详情图是否包含违规内容（色情、暴恐、牛皮癣广告等）。
3.  **经营范围审核**: 
    - 获取店铺营业执照（通过 `getAdminShopDetail` 接口）。
    - 使用 OCR 识别营业执照上的“经营范围”。
    - 使用 DeepSeek AI 分析商品分类是否在经营范围许可内。

### 2.3 自动化操作
- **通过**: 自动点击页面上的“批准”按钮，并确认弹窗。
- **拒绝**: 
  - 自动记录拒绝原因到本地历史。
  - 发送审核记录到后端审计系统。
  - **注意**: 当前代码逻辑中，拒绝操作仅在插件内部记录并跳过该商品，并未实际点击页面上的“拒绝”按钮（可能是为了人工二次确认或防止误操作）。

### 2.4 历史记录与统计
- 实时统计总数、已处理、通过、拒绝数量。
- 本地存储（LocalStorage）最近 1000 条审核历史。
- 界面展示当前审核详情（请求/响应日志）及历史记录列表。

---

## 3. 阿里云 API 调用详解

插件主要使用阿里云“内容安全（Green）”和“文字识别（OCR）”服务。

### 3.1 文本内容安全 (Text Moderation)
用于检测商品标题和描述的合规性。

- **调用位置**: `utils/aliyun_green.ts` -> `textModeration`
- **接口地址**: `https://green-cip.cn-shanghai.aliyuncs.com/`
- **请求方式**: `POST`
- **公共参数**:
  - `AccessKeyId`: 配置的 AccessKey
  - `SignatureMethod`: `HMAC-SHA1`
  - `SignatureVersion`: `1.0`
  - `Version`: `2022-03-02`
- **业务参数**:
  - `Action`: `TextModerationPlus`
  - `Service`: `ad_compliance_detection_pro` (广告法合规检测专业版)
  - `ServiceParameters`: JSON 字符串 `{"content": "待审核文本"}`
- **返回参数**:
  - `Code`: 状态码（200 表示成功）
  - `Data.Reason`: 如果存在，表示违规原因（如“广告法违规”）。
  - `Data.Result`: 详细的标签和置信度。

### 3.2 图片内容安全 (Image Moderation)
用于检测商品图片的合规性。

- **调用位置**: `utils/aliyun_green.ts` -> `imageModeration`
- **接口地址**: `https://green-cip.cn-shanghai.aliyuncs.com/`
- **请求方式**: `POST`
- **公共参数**: 同上
- **业务参数**:
  - `Action`: `ImageModeration`
  - `Service`: `advertisingCheck` (营销广告图片检测)
  - `ServiceParameters`: JSON 字符串 `{"imageUrl": "图片URL"}`
- **返回参数**:
  - `Code`: 200
  - `Data.Result`: 数组，包含每个检测维度的标签（Label）。
  - **判断逻辑**: 如果 `Label` 不为 `normal` 且不为 `nonLabel`，则视为违规。

### 3.3 营业执照 OCR (Business License OCR)
用于识别店铺营业执照信息。

由于 OCR 接口要求图片必须是 OSS 链接或 Base64（插件采用上传临时 OSS 方案），因此涉及三个步骤：

#### 步骤 1: 获取 OSS 临时授权 (STS Token)
- **调用位置**: `utils/aliyun_ocr.ts` -> `getOssStsToken`
- **接口地址**: `https://viapiutils.cn-shanghai.aliyuncs.com/`
- **Action**: `GetOssStsToken`
- **Version**: `2020-04-01`
- **返回**: `AccessKeyId`, `AccessKeySecret`, `SecurityToken`。

#### 步骤 2: 上传图片到临时 OSS
- **调用位置**: `utils/aliyun_ocr.ts` -> `uploadToTempOss`
- **库**: `ali-oss`
- **Bucket**: `viapi-customer-temp`
- **Region**: `oss-cn-shanghai`
- **操作**: 将图片 URL 转为 Blob 后上传，获取 OSS URL。

#### 步骤 3: 识别营业执照
- **调用位置**: `utils/aliyun_ocr.ts` -> `recognizeBusinessLicense`
- **接口地址**: `https://ocr.cn-shanghai.aliyuncs.com/`
- **Action**: `RecognizeBusinessLicense`
- **Version**: `2019-12-30`
- **参数**: `ImageURL` (步骤 2 获取的 OSS URL)
- **返回**:
  - `Data.BusinessScope`: 经营范围文本。

---

## 4. DeepSeek AI 调用详解

用于智能分析商品分类与经营范围的匹配度。

- **调用位置**: `utils/deepseek.ts`
- **接口地址**: `https://api.deepseek.com/chat/completions`
- **模型**: `deepseek-chat`
- **Prompt 策略**: 
  - 角色: 严格的商业合规审核员。
  - 任务: 判断“商品分类”是否包含在“经营范围”内。
  - 规则: 必须显式或逻辑包含（如“服装”包含“T恤”），否则返回失败。
- **返回格式**: JSON `{ "result": "success" | "failed", "reason": "..." }`

---

## 5. 后端接口集成

### 5.1 品好拼管理后台 (Pinhaopin Admin)
- **获取商品列表**: `GET /gateway/mall/listAllProducts`
- **获取店铺详情**: `GET /gateway/mall/getAdminShopDetail?shopId={id}`

### 5.2 审核记录后端 (Audit Backend)
插件将审核结果发送到独立的后端服务进行留存。

- **调用位置**: `utils/auditApi.ts`
- **接口地址**: `{Configured_URL}/audit-records` (默认 `http://localhost:3000/api/audit-records`)
- **请求方式**: `POST`
- **数据结构**:
  ```json
  {
    "productId": "商品ID",
    "productTitle": "商品名称",
    "rejectionReason": "拒绝原因",
    "auditStage": "text" | "image" | "business_scope",
    "aiProcessingTime": 1234, // 毫秒
    "textRequest": "...",
    "textResponse": "...",
    "imageRequest": "...",
    "imageResponse": "...",
    "scopeRequest": "...",
    "scopeResponse": "..."
  }
  ```

## 6. 总结
该插件实现了一个高度自动化的电商审核闭环。它利用阿里云的成熟能力解决基础的文本和图片风控，利用 DeepSeek 的大模型能力解决复杂的语义匹配（经营范围审核），并通过模拟用户操作实现自动化处理，极大地降低了人工审核成本。
