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
        logs.value.push('[' + new Date().toLocaleTimeString() + '] ' + msg);
        console.log('[Audit] ' + msg);
      };

      const stopAudit = () => {
        isRunning.value = false;
        status.value = '已停止';
        localStorage.setItem('product_audit_running', 'false');
        log('用户停止审核。');
      };

      const fetchPendingProducts = async () => {
        try {
          const res = await fetch('https://admin.pinhaopin.com/gateway/mall/listAllProducts?pageNumber=0&pageSize=200&status=pending&sortField=pendingTime&sortOrder=asc');
          const data = await res.json();
          return data.data?.content || [];
        } catch (e) {
          log('API Fetch Error: ' + e);
          return [];
        }
      };

      const handleApprove = async (row: Element, id: string) => {
        const buttons = row.querySelectorAll('button, .el-button, .ant-btn');
        const approveBtn = Array.from(buttons).find(b => {
          const text = b.textContent?.replace(/\s/g, '') || '';
          return text.includes('通过') || text.includes('批准');
        });

        if (approveBtn) {
          log('ID ' + id + ': 点击批准按钮');
          (approveBtn as HTMLElement).click();

          // Wait for modal to appear
          let modalContent: Element | null = null;
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 200));
            modalContent = document.querySelector('.ant-modal-content');
            if (modalContent) break;
          }

          if (modalContent) {
            log('ID ' + id + ': 找到确认弹窗');
            const footerBtns = modalContent.querySelectorAll('.ant-modal-footer button, .ant-modal-footer .ant-btn');
            const confirmBtn = Array.from(footerBtns).find(b => {
              const text = b.textContent?.replace(/\s/g, '') || '';
              return text.includes('确认') || text.includes('批准') || b.classList.contains('ant-btn-primary');
            });

            if (confirmBtn) {
              log('ID ' + id + ': 点击弹窗确认按钮');
              (confirmBtn as HTMLElement).click();
            } else {
              log('ID ' + id + ': 未在弹窗中找到确认按钮');
            }
          } else {
            // Fallback for old behavior or if modal doesn't appear
            log('ID ' + id + ': 未检测到弹窗，尝试查找通用确认按钮');
            const confirmBtn = document.querySelector(
              '.el-message-box__btns .el-button--primary, .ant-modal-confirm-btns .ant-btn-primary'
            );
            if (confirmBtn) {
              (confirmBtn as HTMLElement).click();
            }
          }
        } else {
          log('ID ' + id + ': 未找到批准按钮');
        }
      };

      const handleReject = async (row: Element, id: string) => {
        const buttons = row.querySelectorAll('button, .el-button, .ant-btn');
        const rejectBtn = Array.from(buttons).find(b => {
          const text = b.textContent?.replace(/\s/g, '') || '';
          return text.includes('拒绝') || text.includes('驳回');
        });

        if (rejectBtn) {
          log('ID ' + id + ': 点击拒绝按钮');
          (rejectBtn as HTMLElement).click();

          // Wait for dialog and find textarea with retries
          let reasonInput: HTMLTextAreaElement | null = null;
          for (let i = 0; i < 5; i++) {
            await new Promise(r => setTimeout(r, 500));
            reasonInput = document.querySelector('.el-textarea__inner, textarea, .ant-input') as HTMLTextAreaElement;
            if (reasonInput && reasonInput.offsetParent !== null) break; // Ensure it's visible
          }

          if (reasonInput) {
            log('ID ' + id + ': 找到拒绝原因输入框');

            // Robust React 16+ hack
            const proto = Object.getPrototypeOf(reasonInput);
            const valueProp = Object.getOwnPropertyDescriptor(proto, "value") || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value") || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");

            if (valueProp && valueProp.set) {
              valueProp.set.call(reasonInput, '商品内容违规');
            } else {
              reasonInput.value = '商品内容违规';
            }

            reasonInput.dispatchEvent(new Event('input', { bubbles: true }));
            reasonInput.dispatchEvent(new Event('change', { bubbles: true }));
            reasonInput.dispatchEvent(new Event('blur', { bubbles: true }));
          } else {
            log('ID ' + id + ': 未找到拒绝原因输入框');
          }

          const confirmBtn = document.querySelector(
            '.el-dialog__footer .el-button--primary, .el-message-box__btns .el-button--primary, .ant-modal-footer .ant-btn-primary'
          );
          if (confirmBtn) {
            (confirmBtn as HTMLElement).click();
          } else {
            log('ID ' + id + ': 未找到确认按钮');
          }
        } else {
          log('ID ' + id + ': 未找到拒绝按钮');
        }
      };

      const startAudit = async () => {
        if (isRunning.value) return;
        isRunning.value = true;
        status.value = '运行中';
        localStorage.setItem('product_audit_running', 'true');
        log('开始审核...');

        try {
          while (isRunning.value) {
            // Fetch pending products from API
            const products = await fetchPendingProducts();
            log('API返回 ' + products.length + ' 个待审核商品');

            auditState.stats.total = products.length; // Update total count

            if (products.length === 0) {
              log('未找到待审核项目。10分钟后自动刷新页面...');
              auditState.product = null;
              auditState.textRequest = '';
              auditState.textResponse = '';
              auditState.imageRequest = '';
              auditState.imageResponse = '';
              auditState.scopeRequest = '';
              auditState.scopeResponse = '';
              auditState.aiAnalysis = '';
              auditState.result = null;

              // Wait 10 minutes (600 seconds)
              for (let i = 600; i > 0; i--) {
                if (!isRunning.value) break;
                if (i % 60 === 0) {
                  log(`等待刷新: 还剩 ${i / 60} 分钟...`);
                }
                await new Promise(r => setTimeout(r, 1000));
              }

              if (isRunning.value) {
                log('正在刷新页面...');
                window.location.reload();
                return; // Stop current execution as page will reload
              }
              continue;
            }

            let processedCount = 0;

            for (const product of products) {
              if (!isRunning.value) break;

              let { id, name, description, mainImage, categoryName, shopId } = product;

              // Check if already rejected in history
              const isAlreadyRejected = history.some(h => h.id === String(id) && h.status === 'rejected');
              if (isAlreadyRejected) {
                log(`ID ${id}: 已在拒绝历史中，跳过自动审核`);
                continue;
              }

              // Find the row in DOM by ID
              const allSpans = Array.from(document.querySelectorAll('span'));
              const idSpan = allSpans.find(s => s.textContent?.trim() === String(id));

              if (!idSpan) {
                log('ID ' + id + ': 未在页面找到对应行 (可能需翻页)');
                continue;
              }

              const row = idSpan.closest('tr') || idSpan.closest('.el-table__row') || idSpan.closest('.ant-table-row');
              if (!row) {
                log('ID ' + id + ': 无法定位行元素');
                continue;
              }

              // Collect all images
              const imagesToAudit: string[] = [];

              // 1. From API (if available)
              if (mainImage) imagesToAudit.push(mainImage);
              if (Array.isArray(product.slideImages)) imagesToAudit.push(...product.slideImages);
              else if (Array.isArray(product.images)) imagesToAudit.push(...product.images);
              else if (Array.isArray(product.gallery)) imagesToAudit.push(...product.gallery);
              else if (typeof product.slideImages === 'string') {
                imagesToAudit.push(...product.slideImages.split(',').filter((s: string) => s));
              }

              // 2. From DOM (The most reliable source for what's visible)
              const domImages = row.querySelectorAll('.ant-image-img');
              domImages.forEach((img: Element) => {
                const src = (img as HTMLImageElement).src;
                if (src && !src.includes('data:image')) {
                  imagesToAudit.push(src);
                }
              });

              // Deduplicate and upgrade to HTTPS
              const uniqueImages = [...new Set(imagesToAudit
                .filter(url => url && url.startsWith('http'))
                .map(url => url.replace(/^http:\/\//i, 'https://'))
              )];

              // Update UI State
              auditState.product = {
                id: String(id),
                name: name,
                image: uniqueImages[0] || mainImage
              };
              auditState.textRequest = '';
              auditState.textResponse = '';
              auditState.imageRequest = '';
              auditState.imageResponse = '';
              auditState.scopeRequest = '';
              auditState.scopeResponse = '';
              auditState.aiAnalysis = '';
              auditState.result = null;

              log(`正在处理 ID: ${id}, 图片数: ${uniqueImages.length}...`);

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
                if (uniqueImages.length > 0) {
                  for (let i = 0; i < uniqueImages.length; i++) {
                    const imgUrl = uniqueImages[i];
                    auditState.imageRequest = `[${i + 1}/${uniqueImages.length}] ${imgUrl}`;

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

                    if (i < uniqueImages.length - 1) await new Promise(r => setTimeout(r, 500));
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
                  const cells = Array.from(row.querySelectorAll('td'));
                  const numericCells = cells.map(c => c.textContent?.trim()).filter(t => t && /^\d+$/.test(t));
                  const found = numericCells.find(n => n !== String(id));
                  if (found) {
                    shopId = found;
                    log(`ID ${id}: 从DOM抓取到店铺ID: ${shopId}`);
                  } else {
                    log(`ID ${id}: 无法从DOM获取店铺ID`);
                  }
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
                saveHistory();

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
                    username: userInfo?.username
                  });

                  if (apiResult.success) {
                    log(`ID ${id}: 审核记录已成功发送到后端`);
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
                saveHistory();

                await handleApprove(row, id);
              }

              processedCount++;
              auditState.stats.processed++;

              await new Promise(r => setTimeout(r, 1000));
            }

            if (processedCount === 0) {
              log('本页未处理任何商品 (可能已处理或未找到DOM)。等待刷新...');
              await new Promise(r => setTimeout(r, 5000));
            }
          }
        } catch (e) {
          log('错误: ' + e);
          status.value = '错误';
          isRunning.value = false;
          localStorage.setItem('product_audit_running', 'false');
        }
      };

      const serverStats = ref<any>(null);

      const fetchServerStatistics = async () => {
        try {
          const stats = await auditRecordAPI.getStatistics();
          if (stats) {
            serverStats.value = stats;
            log('已更新服务器统计数据');
          }
        } catch (e) {
          console.error('Failed to fetch server statistics', e);
          log('获取服务器统计数据失败: ' + e);
        }
      };

      // Initial fetch
      fetchServerStatistics();

      const app = createApp({
        setup() {
          return () => h(ControlPanel, {
            status: status.value,
            isRunning: isRunning.value,
            logs: logs.value,
            auditState: auditState,
            history: history,
            serverStats: serverStats.value,
            onStart: startAudit,
            onStop: stopAudit,
            onRefreshStats: fetchServerStatistics
          });
        }
      });

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
