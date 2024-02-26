/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
declare module "astro-htmx";
declare namespace App {
  interface Locals {
    jwt: string;
  }
}
