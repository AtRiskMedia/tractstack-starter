// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user?: {
      isAuthenticated: boolean;
      isAdmin: boolean;
      isOpenDemo: boolean;
    };
  }
}
