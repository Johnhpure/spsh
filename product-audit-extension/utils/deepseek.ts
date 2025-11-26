import { storage } from 'wxt/storage';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export class DeepSeekClient {
    private async getApiKey(): Promise<string | null> {
        const stored = await storage.getItem<{ deepseekApiKey: string }>('local:deepseek_config');
        return stored?.deepseekApiKey || null;
    }

    async analyzeBusinessScope(category: string, businessScope: string): Promise<{ success: boolean; reason?: string }> {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            return { success: false, reason: 'DeepSeek API Key is missing' };
        }

        const prompt = `
You are a strict business compliance auditor for a Chinese e-commerce platform.
Task: Determine if the merchant's business scope allows selling the specified product category.

Product Category: "${category}"
Merchant Business Scope: "${businessScope}"

Instructions:
1. Analyze if the business scope contains keywords or categories that cover the product category.
2. STRICTLY follow Chinese laws and regulations regarding business scope.
3. The match must be explicit or logically included. For example:
   - "Clothing" covers "T-shirts".
   - "General Merchandise" (日用百货) covers many daily items but NOT specialized items like "Medical Devices" or "Food".
   - "Food" does NOT cover "Electronics".
4. If the scope allows, return "success".
5. If the scope does NOT allow, return "failed" and provide a short reason (max 20 words) in Chinese.

Output Format (JSON only):
{
    "result": "success" | "failed",
    "reason": "Reason if failed, otherwise empty string"
}
`;

        try {
            const response = await fetch(DEEPSEEK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant that outputs JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1,
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const err = await response.text();
                console.error('DeepSeek API Error:', err);
                return { success: false, reason: `AI API Error: ${response.status}` };
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) {
                return { success: false, reason: 'AI returned empty response' };
            }

            try {
                const result = JSON.parse(content);
                if (result.result === 'success') {
                    return { success: true };
                } else {
                    return { success: false, reason: result.reason || 'Business scope mismatch' };
                }
            } catch (e) {
                console.error('Failed to parse AI response:', content);
                return { success: false, reason: 'AI response parsing failed' };
            }

        } catch (error) {
            console.error('DeepSeek Request Failed:', error);
            return { success: false, reason: String(error) };
        }
    }
}

export const deepseek = new DeepSeekClient();
