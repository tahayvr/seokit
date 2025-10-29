// Puppeteer configuration
export interface PuppeteerConfig {
  headless?: boolean;
  timeout?: number;
  poolSize?: number;
  memoryLimit?: number;
  launchArgs?: string[];
}

// Server configuration
export interface ServerConfig {
  port?: number;
}

// Image generation configuration
export interface ImageConfig {
  width?: number;
  height?: number;
  format?: "png" | "jpeg";
}

// Site-wide defaults
export interface SeoKitDefaults {
  siteName: string;
  twitterHandle?: string;
  locale?: string;
}

// Cache configuration
export interface CacheConfig {
  development?: string;
  production?: string;
}

// Main configuration interface
export interface SeoKitConfig {
  baseUrl: string;
  defaults: SeoKitDefaults;
  htmlSourceUrl: string;
  template?: string; // Template name to use (e.g., 'default', 'minimal', 'card', etc.)
  server?: ServerConfig;
  image?: ImageConfig;
  cache?: CacheConfig;
  puppeteer?: PuppeteerConfig;
}

// Available built-in templates
export type BuiltInTemplate =
  | "default"
  | "minimal"
  | "minimal-dark"
  | "card"
  | "split"
  | "retro";

export const BUILT_IN_TEMPLATES: readonly BuiltInTemplate[] = [
  "default",
  "minimal",
  "minimal-dark",
  "card",
  "split",
  "retro",
] as const;
