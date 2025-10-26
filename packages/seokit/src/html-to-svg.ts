/**
 * HTML to SVG conversion using Satori
 */

import satori, { type Font } from "satori";
import parse from "html-react-parser";
import type { SeoKitConfig } from "./types.js";
import { loadFonts } from "./font-loader.js";
import { createSatoriConversionError } from "./errors.js";

/**
 * Convert HTML string to SVG using Satori
 * @param html HTML string to convert
 * @param config SeoKit configuration
 * @returns SVG string
 */
export async function htmlToSvg(
  html: string,
  config: SeoKitConfig
): Promise<string> {
  try {
    // Load fonts with caching
    const fonts = await loadFonts(config.fonts);

    // Parse HTML to React element structure
    // Satori expects React elements, so we use html-react-parser
    const element = parse(html);

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
          style: font.style,
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
