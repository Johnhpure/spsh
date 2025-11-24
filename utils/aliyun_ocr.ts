import { v4 as uuidv4 } from 'uuid';
import { storage } from 'wxt/storage';
import OSS from 'ali-oss';

interface AliyunConfig {
    accessKeyId: string;
    accessKeySecret: string;
    endpoint: string;
}

// Configuration
const CONFIG: AliyunConfig = {
    accessKeyId: import.meta.env.WXT_ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: import.meta.env.WXT_ALIYUN_ACCESS_KEY_SECRET,
    endpoint: "ocr.cn-shanghai.aliyuncs.com",
};

export class AliyunOcrClient {
    private config: AliyunConfig;

    constructor(config: AliyunConfig = CONFIG) {
        this.config = config;
    }

    private async getCredentials(): Promise<AliyunConfig> {
        const stored = await storage.getItem<AliyunConfig>('local:aliyun_config');
        if (stored && stored.accessKeyId && stored.accessKeySecret) {
            return {
                ...this.config,
                accessKeyId: stored.accessKeyId.trim(),
                accessKeySecret: stored.accessKeySecret.trim()
            };
        }
        return this.config;
    }

    private percentEncode(str: string): string {
        return encodeURIComponent(str)
            .replace(/!/g, '%21')
            .replace(/'/g, '%27')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/\*/g, '%2A');
    }

    private async computeSignature(params: Record<string, string>, method: string, secret: string): Promise<string> {
        const sortedKeys = Object.keys(params).sort();
        const canonicalizedQueryString = sortedKeys.map(key => {
            return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
        }).join('&');

        const stringToSign = `${method}&${this.percentEncode('/')}&${this.percentEncode(canonicalizedQueryString)}`;

        const key = `${secret}&`;
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

    async recognizeBusinessLicense(imageUrl: string): Promise<{ success: boolean; businessScope?: string; error?: string }> {
        const config = await this.getCredentials();

        try {
            // 1. Get OSS STS Token
            const stsToken = await this.getOssStsToken(config);
            if (!stsToken) {
                return { success: false, error: 'Failed to get OSS STS Token' };
            }

            // 2. Upload Image to Temp OSS
            const ossUrl = await this.uploadToTempOss(stsToken, imageUrl, config.accessKeyId);
            if (!ossUrl) {
                return { success: false, error: 'Failed to upload image to OSS' };
            }
            console.log('Image uploaded to OSS:', ossUrl);

            // 3. Call RecognizeBusinessLicense with OSS URL
            const params: Record<string, string> = {
                AccessKeyId: config.accessKeyId,
                Action: 'RecognizeBusinessLicense',
                Format: 'JSON',
                RegionId: 'cn-shanghai',
                ImageURL: ossUrl,
                SignatureMethod: 'HMAC-SHA1',
                SignatureNonce: uuidv4(),
                SignatureVersion: '1.0',
                Timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
                Version: '2019-12-30',
            };

            // Signature generation
            const signature = await this.computeSignature(params, 'POST', config.accessKeySecret);
            params['Signature'] = signature;

            // Construct body
            const body = Object.keys(params).map(key => {
                return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
            }).join('&');

            console.log('Aliyun OCR Request URL:', `https://${config.endpoint}/`);

            const response = await fetch(`https://${config.endpoint}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Aliyun OCR API Error:', response.statusText, errorText);
                return { success: false, error: `API Error: ${response.statusText} - ${errorText}` };
            }

            const data = await response.json();
            console.log('Aliyun OCR Response:', data);

            if (data.Data && (data.Data.Business || data.Data.BusinessScope)) {
                return { success: true, businessScope: data.Data.Business || data.Data.BusinessScope };
            } else if (data.Message) {
                return { success: false, error: data.Message };
            } else {
                return { success: false, error: 'Failed to recognize business scope' };
            }

        } catch (error) {
            console.error('Aliyun OCR Request Failed:', error);
            return { success: false, error: String(error) };
        }
    }

    private async getOssStsToken(config: AliyunConfig): Promise<any> {
        const params: Record<string, string> = {
            AccessKeyId: config.accessKeyId,
            Action: 'GetOssStsToken',
            Format: 'JSON',
            RegionId: 'cn-shanghai',
            SignatureMethod: 'HMAC-SHA1',
            SignatureNonce: uuidv4(),
            SignatureVersion: '1.0',
            Timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
            Version: '2020-04-01', // Correct version for viapi-utils
        };

        const signature = await this.computeSignature(params, 'POST', config.accessKeySecret);
        params['Signature'] = signature;

        const body = Object.keys(params).map(key => {
            return `${this.percentEncode(key)}=${this.percentEncode(params[key])}`;
        }).join('&');

        try {
            const response = await fetch('https://viapiutils.cn-shanghai.aliyuncs.com/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body,
            });
            if (!response.ok) {
                console.error('GetOssStsToken Failed:', await response.text());
                return null;
            }
            const data = await response.json();
            return data.Data;
        } catch (e) {
            console.error('GetOssStsToken Error:', e);
            return null;
        }
    }

    private async uploadToTempOss(stsToken: any, imageUrl: string, accessKeyId: string): Promise<string | null> {
        try {
            // Fetch image blob
            const imgRes = await fetch(imageUrl);
            const blob = await imgRes.blob();
            const fileName = `${uuidv4()}.jpg`; // Generate a random filename
            const objectName = `${accessKeyId}/${uuidv4()}/${fileName}`;

            // Initialize OSS Client
            // @ts-ignore
            const client = new OSS({
                accessKeyId: stsToken.AccessKeyId,
                accessKeySecret: stsToken.AccessKeySecret,
                stsToken: stsToken.SecurityToken,
                region: 'oss-cn-shanghai',
                bucket: 'viapi-customer-temp',
                secure: true,
            });

            const result = await client.put(objectName, blob);
            return result.url;
        } catch (e) {
            console.error('OSS Upload Error:', e);
            return null;
        }
    }
}

export const aliyunOcr = new AliyunOcrClient();
