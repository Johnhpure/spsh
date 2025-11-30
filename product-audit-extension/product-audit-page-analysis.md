# 商品审核列表页面分析报告

## 1. 页面概述
- **页面名称**: 商品审核列表
- **页面地址**: `https://admin.pinhaopin.com/#/mall/product-audit`
- **功能**: 展示待审核的商品列表，提供查看详情、批准、拒绝等操作。

## 2. 接口分析

### 2.1 获取商品列表接口
该接口用于加载表格中的商品数据。

- **接口地址**: `https://admin.pinhaopin.com/gateway/mall/listAllProducts`
- **请求方式**: `GET`
- **请求参数**:
  | 参数名 | 示例值 | 说明 |
  | :--- | :--- | :--- |
  | `pageNumber` | `0` | 页码，从0开始 |
  | `pageSize` | `200` | 每页数量 |
  | `status` | `pending` | 状态筛选，pending表示待审核 |
  | `sortField` | `pendingTime` | 排序字段 |
  | `sortOrder` | `asc` | 排序方式 |

- **返回数据**: 包含商品列表（`content`）及分页信息。

### 2.2 获取店铺详情接口
插件内部使用的辅助接口，用于获取店铺营业执照。

- **接口地址**: `https://admin.pinhaopin.com/gateway/mall/getAdminShopDetail`
- **请求方式**: `GET`
- **请求参数**:
  | 参数名 | 示例值 | 说明 |
  | :--- | :--- | :--- |
  | `shopId` | `12345` | 店铺ID |

## 3. 按钮功能操作接口

由于插件通过模拟用户点击（DOM操作）来触发功能，以下接口基于前端常规交互逻辑推断，实际调用由页面前端代码发起。

### 3.1 详情 (Detail)
- **操作流程**: 点击列表中的“详 情”按钮。
- **功能**: 展示商品的详细信息（可能跳转页面或弹出模态框）。
- **推测接口**: 
  - `GET /gateway/mall/getAdminProductDetail?productId={id}`
  - 或 `GET /gateway/mall/product/{id}`

### 3.2 批准 (Approve)
- **操作流程**: 
  1. 点击列表中的“批 准”按钮。
  2. 弹出确认模态框（Modal）。
  3. 点击模态框底部的“确认批准”按钮。
- **推测接口**:
  - `POST /gateway/mall/auditProduct` 或 `/gateway/mall/approveProduct`
  - **参数**: `{ "productId": "...", "status": "approved" }`

### 3.3 拒绝 (Reject)
- **操作流程**:
  1. 点击列表中的“拒 绝”按钮。
  2. 弹出拒绝原因填写悬浮窗（Dialog/Modal）。
  3. 在输入框（Textarea）中填写拒绝原因（例如：“商品内容违规”）。
  4. 点击悬浮窗底部的“确认”按钮。
- **推测接口**:
  - `POST /gateway/mall/auditProduct` 或 `/gateway/mall/rejectProduct`
  - **参数**: 
    ```json
    {
      "productId": "...",
      "status": "rejected",
      "reason": "商品内容违规"
    }
    ```

## 4. 总结
当前插件通过 `content.ts` 脚本实现了对上述流程的自动化：
1. 直接调用 **列表接口** 获取数据。
2. 通过 **DOM 选择器** 定位并点击“批准”或“拒绝”按钮。
3. 对于拒绝操作，自动填充原因并触发输入事件，最后点击确认按钮完成提交。
