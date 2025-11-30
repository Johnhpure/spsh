import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
    console.log('Background loaded');

    // Listen for API requests from content scripts to avoid Mixed Content issues
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'API_REQUEST') {
            handleApiRequest(message.payload).then(sendResponse);
            return true; // Indicates async response
        }
    });
});

async function handleApiRequest(payload: { url: string; options: RequestInit }) {
    try {
        console.log(`[Background] Proxying request to ${payload.url}`);
        const response = await fetch(payload.url, payload.options);

        // Check for non-OK status codes that might return text/html instead of JSON
        if (!response.ok) {
            // Try to parse error as JSON, fallback to status text
            try {
                const errorData = await response.json();
                return { success: true, data: errorData }; // Let the caller handle the API-level error structure
            } catch (e) {
                return { success: false, error: `HTTP Error ${response.status}: ${response.statusText}` };
            }
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error('[Background] Request failed:', error);
        return { success: false, error: String(error) };
    }
}
