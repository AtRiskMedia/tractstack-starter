// eslint-disable-next-line @typescript-eslint/triple-slash-reference
// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: {
      isAuthenticated: boolean;
    };
  }
}
