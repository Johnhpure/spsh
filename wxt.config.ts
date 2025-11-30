import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifest: {
        permissions: ['activeTab', 'scripting', 'storage'],
        host_permissions: [
            'https://admin.pinhaopin.com/*', 
            'https://*.aliyuncs.com/*',
            'http://localhost:*/*',
            'http://127.0.0.1:*/*'
        ],
        name: "Product Audit Assistant",
        description: "Automates product audit on admin.pinhaopin.com",
    }
});
