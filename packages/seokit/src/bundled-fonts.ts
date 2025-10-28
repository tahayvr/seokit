/**
 * Bundled Fonts - Provides access to fonts shipped with SeoKit
 */

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { FontConfig } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the bundled fonts directory
 */
export function getBundledFontsDir(): string {
  // Fonts are in the package root, one level up from dist
  return join(__dirname, "../fonts");
}

/**
 * Get the path to a bundled font file
 * @param fontName Name of the font file (e.g., 'OpenSans.ttf')
 */
export function getBundledFontPath(fontName: string): string {
  return join(getBundledFontsDir(), fontName);
}

/**
 * Default font configuration using bundled OpenSans
 * This is used when users don't specify fonts in their config
 */
export function getDefaultFontConfig(): FontConfig[] {
  return [
    {
      name: "Open Sans",
      path: getBundledFontPath("OpenSans.ttf"),
      weight: 400,
      style: "normal",
    },
  ];
}

/**
 * Check if a font path is using a bundled font
 * @param fontPath Path to check
 */
export function isBundledFont(fontPath: string): boolean {
  return fontPath.includes("node_modules/seokit/fonts/");
}
