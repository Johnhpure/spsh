import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifest: {
        permissions: ['activeTab', 'scripting', 'storage'],
        host_permissions: [
            'https://admin.pinhaopin.com/*',
            'https://*.aliyuncs.com/*',
            'http://localhost:3000/*'
        ],
        name: "Product Audit Assistant",
        description: "Automates product audit on admin.pinhaopin.com",
    },
    dev: {
        server: {
            port: 3002,
            hostname: 'localhost',
            // https: true, // Not supported in this type definition
        }
    }
});
