import { storage } from 'wxt/storage';
import { defineContentScript } from 'wxt/sandbox';
import type { ContentScriptContext } from 'wxt/client';
import { createShadowRootUi } from 'wxt/client';
import { createApp, ref, reactive, h } from 'vue';
import ControlPanel from '@/components/ControlPanel.vue';
import { aliyunGreen } from '@/utils/aliyun_green';
import { aliyunOcr } from '@/utils/aliyun_ocr';
import { deepseek } from '@/utils/deepseek';
import { getLabelDescription } from '@/utils/aliyun_labels';
import { auditRecordAPI } from '@/utils/auditApi';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import './overlay.css';

export default defineContentScript({
  matches: ['https://admin.pinhaopin.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx: ContentScriptContext) {
    console.log('Product Audit Extension Loaded');
    const ui = await createUi(ctx);
    ui.mount();
  },
});

function createUi(ctx: any) {
  return createShadowRootUi(ctx, {
    name: 'product-audit-panel',
    position: 'inline',
    onMount: (uiContainer: any) => {
      const container = document.createElement('div');
      uiContainer.append(container);

      const logs = ref<string[]>([]);
      const status = ref('空闲');
      const isRunning = ref(false);

      // Detailed Audit State
      const auditState = reactive({
        product: null as { id: string; name: string; image: string } | null,
        textRequest: '',
        textResponse: '',
        imageRequest: '',
        imageResponse: '',
        scopeRequest: '',
        scopeResponse: '',
        aiAnalysis: '',
        result: null as { label: string; type: 'success' | 'danger' | 'warning' | 'info' } | null,
        stats: {
          total: 0,
          processed: 0,
          passed: 0,
          rejected: 0
        }
      });

      const history = reactive<{
        id: string;
        name: string;
        image: string;
        status: 'passed' | 'rejected';
        reason?: string;
        timestamp: number;
      }[]>([]);

      // Load history from localStorage on mount
      try {
        const saved = localStorage.getItem('audit_history');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            history.push(...parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load history', e);
      }

      // Save history watcher
      const saveHistory = () => {
        try {
          localStorage.setItem('audit_history', JSON.stringify(history.slice(0, 1000))); // Limit to 1000 items
        } catch (e) {
          console.error('Failed to save history', e);
        }
      };

      const log = (msg: string) => {
        logs.value.unshift('[' + new Date().toLocaleTimeString() + '] ' + msg);
        console.log('[Audit] ' + msg);
      };

      const stopAudit = () => {
        isRunning.value = false;
        status.value = '已停止';
        localStorage.setItem('product_audit_running', 'false');
        log('用户停止审核。');
      };

      const fetchPendingProducts = async (pageNo: number = 0) => {
        try {
          const params = {
            pageNumber: String(pageNo),
            pageSize: "20",
            status: "pending",
          };
          const res = await fetch(
            "https://admin.pinhaopin.com/gateway/mall/listAllProducts?" +
            new URLSearchParams(params)
          );
          const data = await res.json();

          return {
            products: data?.data?.content || [],
            total: data?.data?.total || 0,
          };
        } catch (e) {
          log("API Fetch Error: " + e);
          return {
            products: [],
            total: 0,
          };
        }
      };

      const handleApprove = async (id: number) => {
        try {
          const res = await fetch(
            "https://admin.pinhaopin.com/gateway/mall/auditProduct",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, status: "online" }),
            }
          );

          if (!res.ok) {
            const errText = await res.text();
            log(`ID ${id}: 接口调用失败 ${res.status} - ${errText}`);
            return;
          }

          log(`ID ${id}: 审核已提交`);
        } catch (e) {
          log(`ID ${id}: 接口调用异常 - ${e}`);
        }
      };

      // const handleApprove = async (row: Element, id: string) => {
      //   const buttons = row.querySelectorAll('button, .el-button, .ant-btn');
      //   const approveBtn = Array.from(buttons).find(b => {
      //     const text = b.textContent?.replace(/\s/g, '') || '';
      //     return text.includes('通过') || text.includes('批准');
      //   });

      //   if (approveBtn) {
      //     log('ID ' + id + ': 点击批准按钮');
      //     (approveBtn as HTMLElement).click();

      //     // Wait for modal to appear
      //     let modalContent: Element | null = null;
      //     for (let i = 0; i < 10; i++) {
      //       await new Promise(r => setTimeout(r, 200));
      //       modalContent = document.querySelector('.ant-modal-content');
      //       if (modalContent) break;
      //     }

      //     if (modalContent) {
      //       log('ID ' + id + ': 找到确认弹窗');
      //       const footerBtns = modalContent.querySelectorAll('.ant-modal-footer button, .ant-modal-footer .ant-btn');
      //       const confirmBtn = Array.from(footerBtns).find(b => {
      //         const text = b.textContent?.replace(/\s/g, '') || '';
      //         return text.includes('确认') || text.includes('批准') || b.classList.contains('ant-btn-primary');
      //       });

      //       if (confirmBtn) {
      //         log('ID ' + id + ': 点击弹窗确认按钮');
      //         (confirmBtn as HTMLElement).click();
      //       } else {
      //         log('ID ' + id + ': 未在弹窗中找到确认按钮');
      //       }
      //     } else {
      //       // Fallback for old behavior or if modal doesn't appear
      //       log('ID ' + id + ': 未检测到弹窗，尝试查找通用确认按钮');
      //       const confirmBtn = document.querySelector(
      //         '.el-message-box__btns .el-button--primary, .ant-modal-confirm-btns .ant-btn-primary'
      //       );
      //       if (confirmBtn) {
      //         (confirmBtn as HTMLElement).click();
      //       }
      //     }
      //   } else {
      //     log('ID ' + id + ': 未找到批准按钮');
      //   }
      // };

      // const handleReject = async (row: Element, id: string) => {
      //   const buttons = row.querySelectorAll('button, .el-button, .ant-btn');
      //   const rejectBtn = Array.from(buttons).find(b => {
      //     const text = b.textContent?.replace(/\s/g, '') || '';
      //     return text.includes('拒绝') || text.includes('驳回');
      //   });

      //   if (rejectBtn) {
      //     log('ID ' + id + ': 点击拒绝按钮');
      //     (rejectBtn as HTMLElement).click();

      //     // Wait for dialog and find textarea with retries
      //     let reasonInput: HTMLTextAreaElement | null = null;
      //     for (let i = 0; i < 5; i++) {
      //       await new Promise(r => setTimeout(r, 500));
      //       reasonInput = document.querySelector('.el-textarea__inner, textarea, .ant-input') as HTMLTextAreaElement;
      //       if (reasonInput && reasonInput.offsetParent !== null) break; // Ensure it's visible
      //     }

      //     if (reasonInput) {
      //       log('ID ' + id + ': 找到拒绝原因输入框');

      //       // Robust React 16+ hack
      //       const proto = Object.getPrototypeOf(reasonInput);
      //       const valueProp = Object.getOwnPropertyDescriptor(proto, "value") || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value") || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");

      //       if (valueProp && valueProp.set) {
      //         valueProp.set.call(reasonInput, '商品内容违规');
      //       } else {
      //         reasonInput.value = '商品内容违规';
      //       }

      //       reasonInput.dispatchEvent(new Event('input', { bubbles: true }));
      //       reasonInput.dispatchEvent(new Event('change', { bubbles: true }));
      //       reasonInput.dispatchEvent(new Event('blur', { bubbles: true }));
      //     } else {
      //       log('ID ' + id + ': 未找到拒绝原因输入框');
      //     }

      //     const confirmBtn = document.querySelector(
      //       '.el-dialog__footer .el-button--primary, .el-message-box__btns .el-button--primary, .ant-modal-footer .ant-btn-primary'
      //     );
      //     if (confirmBtn) {
      //       (confirmBtn as HTMLElement).click();
      //     } else {
      //       log('ID ' + id + ': 未找到确认按钮');
      //     }
      //   } else {
      //     log('ID ' + id + ': 未找到拒绝按钮');
      //   }
      // };

      const startAudit = async () => {
        if (isRunning.value) return;
        isRunning.value = true;
        status.value = '运行中';
        localStorage.setItem('product_audit_running', 'true');
        log('开始审核...');

        try {
          let pageNo = 0;
          while (isRunning.value) {
            // Fetch pending products from API
            const { products, total } = await fetchPendingProducts(pageNo);
            log('API返回 ' + products.length + ' 个待审核商品');

            auditState.stats.total = total; // Update total count

            let processedCount = 0;

            for (const product of products) {
              if (!isRunning.value) break;

              processedCount++;
              auditState.stats.processed++;

              let { id, name, description, mainImage, images, categoryName, shopId, categoryAuditStatus, categoryAuditReason } = product;

              // Check if already rejected in history (runtime memory only)
              const isAlreadyRejected = history.some(h => h.id === String(id) && h.status === 'rejected');
              if (isAlreadyRejected) {
                log(`ID ${id}: 已在拒绝历史中，跳过自动审核`);
                continue;
              }

              // Check backend for existing record (Duplicate Check)
              try {
                const exists = await auditRecordAPI.checkProductExists(String(id));
                if (exists) {
                  log(`ID ${id}: 数据库查询结果：已存在 -> 跳过自动审核`);
                  // Add to runtime history so it shows up in UI
                  history.unshift({
                    id: String(id),
                    name: name,
                    image: mainImage,
                    status: 'passed',
                    timestamp: Date.now()
                  });
                  continue;
                } else {
                  log(`ID ${id}: 数据库查询结果：未存在 -> 继续审核`);
                }
              } catch (err) {
                console.error('Failed to check duplicate:', err);
                log(`ID ${id}: 检查重复失败: ${err}`);
              }

              const imagesToAudit: string[] = [];

              if (mainImage) imagesToAudit.push(mainImage);
              if (images) {
                images
                  .split(",")
                  .map((s) => s.trim().replace(/^`|`$/g, ""))
                  .filter((s) => s)
                  .forEach((s) => imagesToAudit.push(s));
              }

              // Update UI State
              auditState.product = {
                id: String(id),
                name: name,
                image: mainImage
              };
              auditState.textRequest = '';
              auditState.textResponse = '';
              auditState.imageRequest = '';
              auditState.imageResponse = '';
              auditState.scopeRequest = '';
              auditState.scopeResponse = '';
              auditState.aiAnalysis = '';
              auditState.result = null;

              log(`正在处理 ID: ${id}, 图片数: ${imagesToAudit.length}...`);

              // Track timing for API submission
              const auditStartTime = Date.now();

              // Audit Content
              const contentToAudit = '商品名称：' + name + '\n商品描述：' + description;
              auditState.textRequest = contentToAudit;

              let isRejected = false;
              let rejectReason = '';
              let auditStage: 'text' | 'image' | 'business_scope' = 'text';
              let apiError: string | undefined;

              // 1. Text Moderation
              const textResult = await aliyunGreen.textModeration(contentToAudit);
              auditState.textResponse = JSON.stringify(textResult.response, null, 2);

              if (!textResult.isSafe) {
                isRejected = true;
                rejectReason = '文本违规';
                auditStage = 'text';
                auditState.result = { label: '拒绝 (文本违规)', type: 'danger' };
                log('ID ' + id + ': 结果 拒绝 (阿里云 - 文本违规) -> 跳过处理');
              } else {
                // 2. Image Moderation (Multi-Image)
                if (imagesToAudit.length > 0) {
                  for (let i = 0; i < imagesToAudit.length; i++) {
                    const imgUrl = imagesToAudit[i];
                    auditState.imageRequest = `[${i + 1}/${imagesToAudit.length}] ${imgUrl}`;

                    const imageResult = await aliyunGreen.imageModeration(imgUrl);
                    auditState.imageResponse = JSON.stringify(imageResult.response, null, 2);

                    if (!imageResult.isSafe) {
                      isRejected = true;
                      auditStage = 'image';

                      let specificReason = '图片违规';
                      if (imageResult.response && imageResult.response.Data && imageResult.response.Data.Result) {
                        const results = imageResult.response.Data.Result;
                        const riskItem = results.find((r: any) => r.Label && r.Label !== 'normal' && r.Label !== 'nonLabel');
                        if (riskItem && riskItem.Label) {
                          specificReason = getLabelDescription(riskItem.Label);
                        }
                      }

                      rejectReason = specificReason;
                      auditState.result = { label: `拒绝 (${specificReason})`, type: 'danger' };
                      log(`ID ${id}: 图片[${i + 1}] 拒绝 (${specificReason}) -> 跳过处理`);
                      break; // Fail fast
                    }

                    if (i < imagesToAudit.length - 1) await new Promise(r => setTimeout(r, 500));
                  }
                }
              }
              // 3. Business Scope Audit
              if (!isRejected) {
                log(`ID ${id}: 开始经营范围审核...`);
                if (!categoryName) {
                  log(`ID ${id}: 缺少商品分类信息，跳过经营范围审核`);
                }

                if (!shopId) {
                  log(`ID ${id}: 缺少店铺ID信息，跳过经营范围审核`);
                } else {
                  try {
                    const shopRes = await fetch(`https://admin.pinhaopin.com/gateway/mall/getAdminShopDetail?shopId=${shopId}`);
                    const shopData = await shopRes.json();
                    const licensePic = shopData.data?.licensePic;

                    if (licensePic) {
                      log(`ID ${id}: 获取到营业执照，开始OCR识别...`);
                      auditState.scopeRequest = `License: ${licensePic}`;

                      const ocrResult = await aliyunOcr.recognizeBusinessLicense(licensePic);
                      auditState.scopeResponse = JSON.stringify(ocrResult, null, 2);

                      if (ocrResult.success && ocrResult.businessScope) {
                        log(`ID ${id}: OCR成功，开始AI分析...`);
                        const aiResult = await deepseek.analyzeBusinessScope(categoryName, ocrResult.businessScope);
                        auditState.aiAnalysis = JSON.stringify(aiResult, null, 2);

                        if (!aiResult.success) {
                          isRejected = true;
                          auditStage = 'business_scope';
                          rejectReason = `经营范围不符: ${aiResult.reason}`;
                          auditState.result = { label: `拒绝 (${rejectReason})`, type: 'danger' };
                          log(`ID ${id}: 经营范围不符 (${aiResult.reason}) -> 拒绝`);
                        }
                      } else {
                        const errorMsg = ocrResult.error || 'Unknown error';
                        log(`ID ${id}: 营业执照识别失败: ${errorMsg}`);

                        // If failed to recognize business scope, treat as rejection and continue
                        if (errorMsg.includes('Failed to recognize business scope')) {
                          isRejected = true;
                          auditStage = 'business_scope';
                          rejectReason = `营业执照识别失败: ${errorMsg}`;
                          auditState.result = { label: `识别失败`, type: 'danger' };
                          log(`ID ${id}: 营业执照识别失败 -> 记录并继续下一条`);
                        } else {
                          // For other errors, maybe we still want to stop? 
                          // Or just treat all OCR errors as failures?
                          // User request specifically mentioned "Failed to recognize business scope".
                          // But stopping the whole queue for one error is usually annoying.
                          // Let's assume we should only change behavior for this specific error as requested, 
                          // to avoid unintended side effects.
                          auditState.result = { label: '需人工审核 (OCR失败)', type: 'warning' };
                          stopAudit();
                          return;
                        }
                      }
                    } else {
                      log(`ID ${id}: 未找到店铺营业执照`);
                    }
                  } catch (e) {
                    log(`ID ${id}: 获取店铺详情失败: ${e}`);
                  }
                }
              }

              if (isRejected) {
                auditState.stats.rejected++;
                history.unshift({
                  id: String(id),
                  name: name,
                  image: mainImage,
                  status: 'rejected',
                  reason: rejectReason,
                  timestamp: Date.now()
                });
                // REMOVED: saveHistory();

                const auditEndTime = Date.now();
                const aiProcessingTime = auditEndTime - auditStartTime;

                try {
                  log(`ID ${id}: 正在发送审核记录到后端...`);
                  const userInfo = await storage.getItem<any>('local:user_info');

                  const apiResult = await auditRecordAPI.createRecord({
                    productId: String(id),
                    productTitle: name,
                    productImage: mainImage || '',
                    submitTime: new Date(),
                    aiProcessingTime: aiProcessingTime,
                    rejectionReason: rejectReason,
                    auditStage: auditStage,
                    apiError: apiError,
                    textRequest: auditState.textRequest,
                    textResponse: auditState.textResponse,
                    imageRequest: auditState.imageRequest,
                    imageResponse: auditState.imageResponse,
                    scopeRequest: auditState.scopeRequest,
                    scopeResponse: auditState.scopeResponse,
                    userId: userInfo?.id,
                    username: userInfo?.username,
                    // Manual Audit Fields
                    manualStatus: 'pending',
                    price: (product as any).price || 0,
                    shopName: (product as any).shopName || '',
                    shopId: String(shopId || ''),
                    categoryName: categoryName || '',
                    categoryImage: '',
                    images: images || '',
                    auditReason: rejectReason,
                    categoryAuditStatus: categoryAuditStatus || '',
                    categoryAuditReason: categoryAuditReason || ''
                  });

                  if (apiResult.success) {
                    log(`ID ${id}: 审核记录已成功发送到后端 (含人工审核信息)`);
                  } else {
                    log(`ID ${id}: 发送审核记录失败: ${apiResult.error}`);
                  }
                } catch (error) {
                  console.error(`[Audit] Failed to send record for ID ${id}:`, error);
                  log(`ID ${id}: 发送审核记录时发生异常: ${error}`);
                }
              } else {
                auditState.result = { label: '通过', type: 'success' };
                auditState.stats.passed++;
                log('ID ' + id + ': 结果 通过 (阿里云)');

                history.unshift({
                  id: String(id),
                  name: name,
                  image: mainImage,
                  status: 'passed',
                  timestamp: Date.now()
                });
                // REMOVED: saveHistory();

                await handleApprove(id);
              }

              await new Promise(r => setTimeout(r, 1000));
            }

            if (processedCount === 0) {
              throw new Error("没有商品可审核");
            }

            pageNo++;
          }
        } catch (e) {
          log('错误: ' + e);
          status.value = '错误';
          isRunning.value = false;
          localStorage.setItem('product_audit_running', 'false');
        }
      };

      const app = createApp({
        setup() {
          return () => h(ControlPanel, {
            status: status.value,
            isRunning: isRunning.value,
            logs: logs.value,
            auditState: auditState,
            history: history,
            onStart: startAudit,
            onStop: stopAudit
          });
        }
      });

      app.use(ElementPlus);

      app.mount(container);

      // Auto-start if previously running
      if (localStorage.getItem('product_audit_running') === 'true') {
        startAudit();
      }

      return app;
    },
    onRemove: (app: any) => {
      app.unmount();
    },
  });
}
