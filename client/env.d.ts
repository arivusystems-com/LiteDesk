/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// Type declaration for process.env (used in DEV-ONLY guards)
declare const process: {
  env: {
    NODE_ENV: string;
  };
};
