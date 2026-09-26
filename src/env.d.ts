/// <reference types="vite/client" />

/** Ambient module definition for CSS asset imports. */
declare module '*.css' {
  const content: string;
  export default content;
}

/** Ambient interface augmenting the global browser Window object with Next.js payload. */
interface Window {
  /** Next.js server-rendered application state payload. */
  __NEXT_DATA__?: {
    props?: Record<string, unknown>;
    page?: string;
    query?: {
      unit?: string;
      [key: string]: unknown;
    };
    buildId?: string;
  };
}
