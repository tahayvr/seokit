// Font configuration for Satori
export interface FontConfig {
  name: string;
  path: string;
  weight?: number;
  style?: "normal" | "italic";
}

// Server configuration
export interface ServerConfig {
  port?: number;
  host?: string;
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
  fonts: FontConfig[];
  server?: ServerConfig;
  image?: ImageConfig;
  cache?: CacheConfig;
}
