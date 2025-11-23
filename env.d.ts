declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly WXT_ALIYUN_ACCESS_KEY_ID: string
    readonly WXT_ALIYUN_ACCESS_KEY_SECRET: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
