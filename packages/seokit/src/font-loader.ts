/**
 * Font loading and caching functionality
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { FontConfig } from "./types.js";
import { createFontLoadError } from "./errors.js";

// In-memory font cache
const fontCache = new Map<string, ArrayBuffer>();

/**
 * Font data structure for Satori
 */
export interface SatoriFont {
  name: string;
  data: ArrayBuffer;
  weight?: number;
  style?: "normal" | "italic";
}

/**
 * Load a single font file from disk
 * @param fontPath Path to the font file
 * @returns ArrayBuffer containing font data
 */
async function loadFontFile(fontPath: string): Promise<ArrayBuffer> {
  const resolvedPath = resolve(process.cwd(), fontPath);

  // Check if file exists
  if (!existsSync(resolvedPath)) {
    throw createFontLoadError(
      fontPath,
      new Error(`File not found at ${resolvedPath}`)
    );
  }

  try {
    const buffer = await readFile(resolvedPath);
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
  } catch (error) {
    if (error instanceof Error) {
      throw createFontLoadError(fontPath, error);
    }
    throw createFontLoadError(fontPath, new Error(String(error)));
  }
}

/**
 * Load fonts from configuration with caching
 * @param fonts Font configuration array
 * @returns Array of fonts ready for Satori
 */
export async function loadFonts(fonts: FontConfig[]): Promise<SatoriFont[]> {
  const loadedFonts: SatoriFont[] = [];

  for (const font of fonts) {
    try {
      // Check cache first
      let fontData = fontCache.get(font.path);

      if (!fontData) {
        // Load from disk if not cached
        fontData = await loadFontFile(font.path);
        // Cache for future use
        fontCache.set(font.path, fontData);
      }

      loadedFonts.push({
        name: font.name,
        data: fontData,
        weight: font.weight,
        style: font.style,
      });
    } catch (error) {
      // Clear cache entry if loading failed
      fontCache.delete(font.path);
      throw error;
    }
  }

  return loadedFonts;
}

/**
 * Clear the font cache
 * Useful when configuration changes
 */
export function clearFontCache(): void {
  fontCache.clear();
}

/**
 * Get cache statistics
 * @returns Number of cached fonts
 */
export function getFontCacheSize(): number {
  return fontCache.size;
}
