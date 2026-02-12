// global.d.ts
export {};

declare global {
  interface Window {
    __ACCESS_TOKEN__?: string | null;
    __USER_ID__?: string | null;
  }
}
