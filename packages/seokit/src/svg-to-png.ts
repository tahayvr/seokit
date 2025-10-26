/**
 * SVG to PNG conversion using Sharp
 */

import sharp from "sharp";
import { createSharpConversionError } from "./errors.js";

/**
 * Convert SVG string to PNG buffer
 * @param svg SVG string to convert
 * @param quality PNG quality (0-100, default: 90)
 * @returns PNG buffer
 */
export async function svgToPng(
  svg: string,
  quality: number = 90
): Promise<Buffer> {
  try {
    // Convert SVG string to Buffer
    const svgBuffer = Buffer.from(svg);

    // Use Sharp to convert SVG to PNG
    const pngBuffer = await sharp(svgBuffer)
      .png({
        quality,
        compressionLevel: 9, // Maximum compression
        adaptiveFiltering: true,
      })
      .toBuffer();

    return pngBuffer;
  } catch (error) {
    if (error instanceof Error) {
      throw createSharpConversionError(error);
    }

    throw createSharpConversionError(new Error(String(error)));
  }
}
