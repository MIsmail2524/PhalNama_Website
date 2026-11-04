import type { SVGProps } from "react";

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
type P = SVGProps<SVGSVGElement>;

export const IconSearch = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>);
export const IconBag = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>);
export const IconUser = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>);
export const IconMenu = (p: P) => (<svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}><path d="M3 7h18M3 12h18M3 17h12" /></svg>);
export const IconClose = (p: P) => (<svg viewBox="0 0 24 24" width="22" height="22" {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>);
export const IconArrow = (p: P) => (<svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}><path d="M4 12h16m-6-6 6 6-6 6" /></svg>);
export const IconPlus = (p: P) => (<svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>);
export const IconMinus = (p: P) => (<svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}><path d="M5 12h14" /></svg>);
export const IconHeart = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>);
export const IconGift = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><rect x="4" y="9" width="16" height="11" /><path d="M3 9h18M12 9v11M12 9c-1.5-3-5-4-5-1.5S10 9 12 9Zm0 0c1.5-3 5-4 5-1.5S14 9 12 9Z" /></svg>);
export const IconLeaf = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15" /><path d="M5 19 13 11" /></svg>);
export const IconPin = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.5" /></svg>);
export const IconQr = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" /></svg>);
export const IconBox = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" /><path d="m3 7.5 9 4.5 9-4.5M12 12v9" /></svg>);
export const IconHand = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><path d="M7 11V6a1.5 1.5 0 0 1 3 0v4m0 0V4.5a1.5 1.5 0 0 1 3 0V10m0-4a1.5 1.5 0 0 1 3 0v5m0-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 14a1.5 1.5 0 0 1 2.5-1.7L7 14" /></svg>);
export const IconChat = (p: P) => (<svg viewBox="0 0 24 24" width="20" height="20" {...base} {...p}><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20Z" /></svg>);
export const IconCheck = (p: P) => (<svg viewBox="0 0 24 24" width="18" height="18" {...base} {...p}><path d="m5 12 4.5 4.5L19 7" /></svg>);
export const IconWhatsApp = (p: P) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" {...p}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);
