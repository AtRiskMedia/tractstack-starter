export const AUTH_COOKIE_NAME = "auth_token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours
export const MS_BETWEEN_UNDO = 6000;
export const MAX_HISTORY_LENGTH = 10;
export const MAX_LENGTH_CONTENT = 10000;

export const toolAddModes = [
  "p",
  "h2",
  "h3",
  "h4",
  "img",
  "signup",
  "yt",
  "bunny",
  "belief",
  "identify",
  "toggle",
  "aside",
] as const;

export const knownBrand: Record<string, string> = {
  default: "10120d,fcfcfc,f58333,c8df8c,293f58,a7b1b7,393d34,e3e3e3",
  monet: "0f1912,f6f4f3,cfae97,ded2c3,24423c,a8cd20,452a3d,f3f5f6",
  dali: "150c02,fffef9,e2e5d4,fef6d1,4b3703,dddcca,382c0d,fefcee",
  hiphop: "0d0d09,faf7f3,ffd201,a3bfd4,39304d,f6e5ce,3c2a25,f0e7d5",
  grey: "101010,f0f0f0,888888,aaaaaa,333333,bbbbbb,444444,dddddd",
};

export const PUBLIC_THEME = `light-bold`;

export const SHORT_SCREEN_THRESHOLD = 900;
export const SMALL_SCREEN_WIDTH = 600;
export const MIN_SCROLL_THRESHOLD = 220;
export const HYSTERESIS = 200;

export const CONCIERGE_SYNC_INTERVAL = 4000;
export const THRESHOLD_READ = 42000;
export const THRESHOLD_GLOSSED = 7000;
export const JWT_LIFETIME = 15 * 60 * 1000;
