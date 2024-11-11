// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: {
      isAuthenticated: boolean;
    };
  }
}
