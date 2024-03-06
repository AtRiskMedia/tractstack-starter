import type socialIcons from "@assets/socialIcons";

export type Site = {
  website: string;
  author: string;
  desc: string;
  title: string;
  ogImage?: string;
};

export type SocialObjects = {
  name: keyof typeof socialIcons;
  href: string;
  active: boolean;
  linkTitle: string;
}[];

// for drupal

export interface Path {
  alias: string;
  pid: number;
  langcode: string;
}

export interface DrupalNode extends Record<string, any> {
  id: string;
  type: string;
  langcode: string;
  status: boolean;
  drupal_internal__nid: number;
  drupal_internal__vid: number;
  changed: string;
  created: string;
  title: string;
  default_langcode: boolean;
  sticky: boolean;
  path: Path;
}

export interface DrupalFile extends Record<string, any> {
  id: string;
  type: string;
  langcode: string;
  status: boolean;
  drupal_internal__fid: string;
  changed: string;
  created: string;
  filename: string;
  uri: {
    value: string;
    url: string;
  };
  filesize: number;
  filemime: string;
  resourceIdObjMeta?: DrupalFileMeta;
  path: Path;
}

export interface DrupalFileMeta extends Record<string, any> {
  alt?: string;
  title?: string;
  width: number;
  height: number;
}
