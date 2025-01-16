/// <reference types="vite/client" />

// Suppress dynamic import warnings
declare module 'virtual:*' {
  const result: any;
  export default result;
}

declare module '*.svg' {
  const content: any;
  export default content;
}

// Add support for import.meta
interface ImportMeta {
  url: string;
  hot: {
    accept: Function;
    dispose: Function;
  };
} 