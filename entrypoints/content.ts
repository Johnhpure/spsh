import { defineContentScript } from "wxt/sandbox";
import type { ContentScriptContext } from "wxt/client";
import { createShadowRootUi } from "wxt/client";
import { createApp, ref, reactive, h } from "vue";
import type { App } from "vue";
import ControlPanel from "@/components/ControlPanel.vue";
import { aliyunGreen } from "@/utils/aliyun_green";
import { aliyunOcr } from "@/utils/aliyun_ocr";
import { deepseek } from "@/utils/deepseek";
import { getLabelDescription } from "@/utils/aliyun_labels";
import "./overlay.css";

interface ProductInfo {
  id: number;
  gmtCreate: string;
  gmtModified: string;
  shopId: number;
  shopName: string;
  merchantInfoId: number;
  repoId: number | null;
  categoryId: number;
  categoryName: string;
  categoryAuditStatus: string;
  categoryAuditReason: string | null;
  categoryImage: string;
  categoryLevel: number;
  categoryParentId: number;
  categoryParentName: string;
  categoryPath: { id: number; name: string }[];
  name: string;
  mainImage: string;
  images: string;
  description: string;
  price: number;
  originalPrice: number;
  consumerGotCoupon: boolean | null;
  stock: number;
  unlimitedStock: boolean;
  status: string;
  pendingTime: string;
  deleted: boolean;
  auditReason: string | null;
  deliveryTypes: string[];
  profitSharingRatio: number;
  consumerSharingRatio: number;
  goodPointRatio: number;
  merchantSharingRatio: number;
}

export default defineContentScript({
  matches: ["https://admin.pinhaopin.com/*"],
  cssInjectionMode: "ui",
  async main(ctx: ContentScriptContext) {
    console.log("Product Audit Extension Loaded");
    const ui = await createUi(ctx);
    ui.mount();
  },
});

function createUi(ctx: ContentScriptContext) {
  return createShadowRootUi(ctx, {
    name: "product-audit-panel",
    position: "inline",
    onMount: (uiContainer: HTMLElement) => {
      const container = document.createElement("div");
      uiContainer.append(container);

      const logs = ref<string[]>([]);
      const status = ref("空闲");
      const isRunning = ref(false);

      const auditState = reactive({
        product: null as { id: number; name: string; image: string } | null,
        textRequest: "",
        textResponse: "",
        imageRequest: "",
        imageResponse: "",
        scopeRequest: "",
        scopeResponse: "",
        aiAnalysis: "",
        result: null as {
          label: string;
          type: "success" | "danger" | "warning" | "info";
        } | null,
        stats: {
          total: 0,
          processed: 0,
          passed: 0,
          rejected: 0,
        },
      });

      const history = reactive<
        {
          id: string;
          name: string;
          image: string;
          status: "passed" | "rejected";
          reason?: string;
          timestamp: number;
        }[]
      >([]);

      try {
        const saved = localStorage.getItem("audit_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            history.push(...parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }

      const saveHistory = () => {
        try {
          localStorage.setItem(
            "audit_history",
            JSON.stringify(history.slice(0, 1000))
          );
        } catch (e) {
          console.error("Failed to save history", e);
        }
      };

      const log = (msg: string) => {
        logs.value.push("[" + new Date().toLocaleTimeString() + "] " + msg);
        console.log("[Audit] " + msg);
      };

      const stopAudit = () => {
        isRunning.value = false;
        status.value = "已停止";
        localStorage.setItem("product_audit_running", "false");
        log("用户停止审核。");
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

      const startAudit = async () => {
        if (isRunning.value) return;
        isRunning.value = true;
        status.value = "运行中";
        localStorage.setItem("product_audit_running", "true");
        log("开始审核...");

        try {
          let pageNo = 0;
          while (isRunning.value) {
            const { products, total } = await fetchPendingProducts(pageNo);
            log("API返回 " + products.length + " 个待审核商品");

            auditState.stats.total = total;

            let processedCount = 0;

            for (const product of products) {
              if (!isRunning.value) break;

              let {
                id,
                name,
                description,
                mainImage,
                images,
                categoryName,
                shopId,
              } = product as ProductInfo;

              const isAlreadyRejected = history.some(
                (h) => h.id === String(id) && h.status === "rejected"
              );
              if (isAlreadyRejected) {
                log(`ID ${id}: 已在拒绝历史中，跳过自动审核`);
                continue;
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

              auditState.product = {
                id: id,
                name: name,
                image: mainImage,
              };
              auditState.textRequest = "";
              auditState.textResponse = "";
              auditState.imageRequest = "";
              auditState.imageResponse = "";
              auditState.scopeRequest = "";
              auditState.scopeResponse = "";
              auditState.aiAnalysis = "";
              auditState.result = null;

              log(`正在处理 ID: ${id}, 图片数: ${imagesToAudit.length}...`);

              const contentToAudit =
                "商品名称：" + name + "\n商品描述：" + description;
              auditState.textRequest = contentToAudit;

              let isRejected = false;
              let rejectReason = "";

              const textResult = await aliyunGreen.textModeration(
                contentToAudit
              );
              auditState.textResponse = JSON.stringify(
                textResult.response,
                null,
                2
              );

              if (!textResult.isSafe) {
                isRejected = true;
                rejectReason = "文本违规";
                auditState.result = {
                  label: "拒绝 (文本违规)",
                  type: "danger",
                };
                log("ID " + id + ": 结果 拒绝 (阿里云 - 文本违规) -> 跳过处理");
              } else {
                if (imagesToAudit.length > 0) {
                  for (let i = 0; i < imagesToAudit.length; i++) {
                    const imgUrl = imagesToAudit[i];
                    auditState.imageRequest = `[${i + 1}/${
                      imagesToAudit.length
                    }] ${imgUrl}`;

                    const imageResult = await aliyunGreen.imageModeration(
                      imgUrl
                    );
                    auditState.imageResponse = JSON.stringify(
                      imageResult.response,
                      null,
                      2
                    );

                    if (!imageResult.isSafe) {
                      isRejected = true;

                      let specificReason = "图片违规";
                      if (
                        imageResult.response &&
                        imageResult.response.Data &&
                        imageResult.response.Data.Result
                      ) {
                        const results = imageResult.response.Data.Result;
                        const riskItem = results.find(
                          (r: any) =>
                            r.Label &&
                            r.Label !== "normal" &&
                            r.Label !== "nonLabel"
                        );
                        if (riskItem && riskItem.Label) {
                          specificReason = getLabelDescription(riskItem.Label);
                        }
                      }

                      rejectReason = specificReason;
                      auditState.result = {
                        label: `拒绝 (${specificReason})`,
                        type: "danger",
                      };
                      log(
                        `ID ${id}: 图片[${
                          i + 1
                        }] 拒绝 (${specificReason}) -> 跳过处理`
                      );
                      break;
                    }

                    if (i < imagesToAudit.length - 1)
                      await new Promise((r) => setTimeout(r, 500));
                  }
                }
              }

              if (!isRejected) {
                log(`ID ${id}: 开始经营范围审核...`);
                if (!categoryName) {
                  log(`ID ${id}: 缺少商品分类信息，跳过经营范围审核`);
                }

                if (!shopId) {
                  log(`ID ${id}: 缺少店铺ID信息，跳过经营范围审核`);
                } else {
                  try {
                    const shopRes = await fetch(
                      `https://admin.pinhaopin.com/gateway/mall/getAdminShopDetail?shopId=${shopId}`
                    );
                    const shopData = await shopRes.json();
                    const licensePic = shopData.data?.licensePic;

                    if (licensePic) {
                      log(`ID ${id}: 获取到营业执照，开始OCR识别...`);
                      auditState.scopeRequest = `License: ${licensePic}`;

                      const ocrResult =
                        await aliyunOcr.recognizeBusinessLicense(licensePic);
                      auditState.scopeResponse = JSON.stringify(
                        ocrResult,
                        null,
                        2
                      );

                      if (ocrResult.success && ocrResult.businessScope) {
                        log(`ID ${id}: OCR成功，开始AI分析...`);
                        const aiResult = await deepseek.analyzeBusinessScope(
                          categoryName,
                          ocrResult.businessScope
                        );
                        auditState.aiAnalysis = JSON.stringify(
                          aiResult,
                          null,
                          2
                        );

                        if (!aiResult.success) {
                          isRejected = true;
                          rejectReason = `经营范围不符: ${aiResult.reason}`;
                          auditState.result = {
                            label: `拒绝 (${rejectReason})`,
                            type: "danger",
                          };
                          log(
                            `ID ${id}: 经营范围不符 (${aiResult.reason}) -> 拒绝`
                          );
                        }
                      } else {
                        log(`ID ${id}: 营业执照识别失败: ${ocrResult.error}`);
                        auditState.result = {
                          label: "需人工审核 (OCR失败)",
                          type: "warning",
                        };
                        stopAudit();
                        return;
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
                  status: "rejected",
                  reason: rejectReason,
                  timestamp: Date.now(),
                });
                saveHistory();
              } else {
                auditState.result = { label: "通过", type: "success" };
                auditState.stats.passed++;
                log("ID " + id + ": 结果 通过 (阿里云)");

                history.unshift({
                  id: String(id),
                  name: name,
                  image: mainImage,
                  status: "passed",
                  timestamp: Date.now(),
                });
                saveHistory();

                await handleApprove(id);
              }

              processedCount++;
              auditState.stats.processed++;

              await new Promise((r) => setTimeout(r, 1000));
            }

            if (products.length === 0) {
              throw new Error("没有商品可审核");
            }

            pageNo++;
          }
        } catch (e) {
          log("错误: " + e);
          status.value = "错误";
          isRunning.value = false;
          localStorage.setItem("product_audit_running", "false");
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

      const app = createApp({
        setup() {
          return () =>
            h(ControlPanel, {
              status: status.value,
              isRunning: isRunning.value,
              logs: logs.value,
              auditState: auditState,
              history: history,
              onStart: startAudit,
              onStop: stopAudit,
            });
        },
      });

      app.mount(container);

      if (localStorage.getItem("product_audit_running") === "true") {
        startAudit();
      }

      return app;
    },
    onRemove: (app?: App) => {
      app?.unmount();
    },
  });
}
