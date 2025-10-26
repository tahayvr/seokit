// Configuration helper for SvelteKit
// Provides utilities to access seokit config in SvelteKit context

export interface SeoKitClientConfig {
  imageEngineUrl: string;
  baseUrl: string;
  siteName: string;
  twitterHandle?: string;
}

/**
 * Get the image engine URL based on environment
 * In development, uses localhost:7357
 * In production, should use the production URL
 */
export function getImageEngineUrl(
  isDevelopment: boolean = true,
  productionUrl?: string
): string {
  if (isDevelopment) {
    return "http://localhost:7357";
  }
  return productionUrl || "http://localhost:7357";
}

/**
 * Create a client-safe config object from seokit.config.ts
 * This should be called in a SvelteKit load function or server-side code
 */
export function createClientConfig(
  config: {
    baseUrl: string;
    defaults: {
      siteName: string;
      twitterHandle?: string;
    };
    server?: {
      port?: number;
      host?: string;
    };
  },
  isDevelopment: boolean = true
): SeoKitClientConfig {
  const port = config.server?.port || 7357;
  const host = config.server?.host || "localhost";

  return {
    imageEngineUrl: getImageEngineUrl(
      isDevelopment,
      isDevelopment ? `http://${host}:${port}` : undefined
    ),
    baseUrl: config.baseUrl,
    siteName: config.defaults.siteName,
    twitterHandle: config.defaults.twitterHandle,
  };
}

/**
 * Template for seokit-config.ts that gets scaffolded in user's project
 * This file should be created in src/lib/ by the init command
 */
export const seoKitConfigTemplate = `// SeoKit configuration helper
// This file provides access to seokit config in your SvelteKit app

import type { SeoKitClientConfig } from '@seokit/svelte';

// In development, the Image Engine runs on localhost:7357
// In production, you should deploy the Image Engine and update this URL
const isDevelopment = process.env.NODE_ENV !== 'production';

export const seoKitConfig: SeoKitClientConfig = {
  imageEngineUrl: isDevelopment 
    ? 'http://localhost:7357' 
    : 'https://your-image-engine.example.com',
  baseUrl: 'https://your-site.example.com',
  siteName: 'Your Site Name',
  twitterHandle: '@yourhandle',
};
`;
