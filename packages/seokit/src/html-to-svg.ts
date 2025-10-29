/**
 * HTML to SVG conversion using Satori
 */

import satori, { type Font } from "satori";
import parse from "html-react-parser";
import type { SeoKitConfig } from "./types.js";
import { loadFonts } from "./font-loader.js";
import { createSatoriConversionError } from "./errors.js";

/**
 * Clean HTML for Satori by removing Svelte hydration comments
 * @param html HTML string to clean
 * @returns Cleaned HTML
 */
function cleanHtmlForSatori(html: string): string {
  // Remove Svelte hydration comments
  return html
    .replace(/<!--\[-->/g, "")
    .replace(/<!--\]-->/g, "")
    .replace(/<!--.*?-->/g, "");
}

/**
 * Convert HTML string to SVG using Satori
 * @param html HTML string to convert
 * @param config SeoKit configuration
 * @param _css Optional CSS (currently not used - templates should use inline styles)
 * @returns SVG string
 */
export async function htmlToSvg(
  html: string,
  config: SeoKitConfig,
  _css?: string
): Promise<string> {
  try {
    // Load fonts with caching
    const fonts = await loadFonts(config.fonts);

    // Clean HTML for Satori
    const cleanedHtml = cleanHtmlForSatori(html);

    // Parse HTML to React element structure
    // Satori expects React elements, so we use html-react-parser
    const element = parse(cleanedHtml);

    // Get image dimensions from config
    const width = config.image?.width || 1200;
    const height = config.image?.height || 630;

    // Generate SVG using Satori
    const svg = await satori(element as React.ReactElement, {
      width,
      height,
      fonts: fonts.map((font) => {
        const fontOptions: Font = {
          name: font.name,
          data: font.data,
          style: font.style || "normal",
        };
        // Only add weight if it's defined
        if (font.weight !== undefined) {
          fontOptions.weight = font.weight as Font["weight"];
        }
        return fontOptions;
      }),
    });

    return svg;
  } catch (error) {
    if (error instanceof Error) {
      throw createSatoriConversionError(error);
    }

    throw createSatoriConversionError(new Error(String(error)));
  }
}
