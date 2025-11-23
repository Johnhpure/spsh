import { v4 as uuidv4 } from 'uuid';

interface AliyunConfig {
    accessKeyId: string;
    accessKeySecret: string;
    endpoint: string;
}

// Configuration
// Configuration
const CONFIG: AliyunConfig = {
    accessKeyId: "YOUR_ACCESS_KEY_ID",
    accessKeySecret: "YOUR_ACCESS_KEY_SECRET",
    endpoint: "green-cip.cn-shanghai.aliyuncs.com",
};

export interface ModerationResult {
    code: number;
    msg: string;
    data?: {
        reason?: string;
        [key: string]: any;
    };
}

export class AliyunGreenClient {
    private config: AliyunConfig;

    constructor(config: AliyunConfig = CONFIG) {
        this.config = config;
    }

    private percentEncode(str: string): string {
        return encodeURIComponent(str)
            .replace(/!/g, '%21')
            .replace(/'/g, '%27')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/\*/g, '%2A');
    }

    private async computeSignature(params: Record<string, string>, method: string): Promise<string> {
        const sortedKeys = Object.keys(params).sort();
        const canonicalizedQueryString = sortedKeys.map(key => {
            return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
        }).join('&');

        const stringToSign = `${method}&${this.percentEncode('/')}&${this.percentEncode(canonicalizedQueryString)}`;

        const key = `${this.config.accessKeySecret}&`;
        const encoder = new TextEncoder();
        const keyData = encoder.encode(key);
        const msgData = encoder.encode(stringToSign);

        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
        return btoa(String.fromCharCode(...new Uint8Array(signature)));
    }

    async textModeration(content: string): Promise<{ isSafe: boolean; response: any }> {
        const params: Record<string, string> = {
            AccessKeyId: this.config.accessKeyId,
            Action: 'TextModerationPlus',
            Format: 'JSON',
            RegionId: 'cn-shanghai',
            Service: 'ad_compliance_detection_pro',
            ServiceParameters: JSON.stringify({ content: content }),
            SignatureMethod: 'HMAC-SHA1',
            SignatureNonce: uuidv4(),
            SignatureVersion: '1.0',
            Timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
            Version: '2022-03-02',
        };

        // Signature generation
        const signature = await this.computeSignature(params, 'POST');
        params['Signature'] = signature;

        // Construct body
        const body = Object.keys(params).map(key => {
            return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
        }).join('&');

        try {
            const response = await fetch(`https://${this.config.endpoint}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body,
            });

            if (!response.ok) {
                console.error('Aliyun API Error:', response.statusText);
                return { isSafe: false, response: { error: response.statusText } };
            }

            const data = await response.json();
            console.log('Aliyun Response:', data);

            // Check result
            if (data.Code === 200) {
                if (data.Data && data.Data.Reason) {
                    return { isSafe: false, response: data }; // Failed audit
                }
                return { isSafe: true, response: data }; // Passed

            }
            return { isSafe: false, response: data };
        } catch (error) {
            console.error('Aliyun API Request Failed:', error);
            return { isSafe: false, response: { error: String(error) } };
        }
    }

    async imageModeration(imageUrl: string): Promise<{ isSafe: boolean; response: any }> {
        const params: Record<string, string> = {
            AccessKeyId: this.config.accessKeyId,
            Action: 'ImageModeration',
            Format: 'JSON',
            RegionId: 'cn-shanghai',
            Service: 'advertisingCheck',
            ServiceParameters: JSON.stringify({ imageUrl: imageUrl }),
            SignatureMethod: 'HMAC-SHA1',
            SignatureNonce: uuidv4(),
            SignatureVersion: '1.0',
            Timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
            Version: '2022-03-02',
        };

        // Signature generation
        const signature = await this.computeSignature(params, 'POST');
        params['Signature'] = signature;

        // Construct body
        const body = Object.keys(params).map(key => {
            return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
        }).join('&');

        try {
            const response = await fetch(`https://${this.config.endpoint}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body,
            });

            if (!response.ok) {
                console.error('Aliyun Image API Error:', response.statusText);
                return { isSafe: false, response: { error: response.statusText } };
            }

            const data = await response.json();
            console.log('Aliyun Image Response:', data);

            if (data.Code === 200) {
                if (data.Data && data.Data.Result && Array.isArray(data.Data.Result)) {
                    const results = data.Data.Result;
                    const hasRisk = results.some((r: any) => r.Label && r.Label !== 'normal' && r.Label !== 'nonLabel');
                    if (hasRisk) {
                        return { isSafe: false, response: data };
                    }
                }
                return { isSafe: true, response: data };
            }
            return { isSafe: false, response: data };

        } catch (error) {
            console.error('Aliyun Image Request Failed:', error);
            return { isSafe: false, response: { error: String(error) } };
        }
    }
}

export const aliyunGreen = new AliyunGreenClient();
