/**
 * HTML to PNG Converter using Puppeteer
 * Converts HTML content to PNG images with custom page load detection,
 * console error capture, and comprehensive error handling.
 */

import { Page } from "puppeteer";
import { getLogger } from "./logger.js";
import {
  createBrowserTimeoutError,
  createResourceLoadError,
  createRenderError,
} from "./errors.js";

const logger = getLogger();

export interface RenderOptions {
  width: number;
  height: number;
  quality?: number;
  timeout?: number;
}

interface PerformanceMetrics {
  setContentMs: number;
  waitForReadyMs: number;
  screenshotMs: number;
  totalMs: number;
}

/**
 * Convert HTML to PNG using Puppeteer
 *
 * @param html - The HTML content to render
 * @param page - The Puppeteer page instance to use
 * @param options - Rendering options (dimensions, quality, timeout)
 * @returns PNG buffer
 */
export async function htmlToPng(
  html: string,
  page: Page,
  options: RenderOptions
): Promise<Buffer> {
  const startTime = Date.now();
  const timeout = options.timeout ?? 10000;
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];

  // Set up console error capture
  const consoleHandler = (msg: any) => {
    const type = msg.type();
    const text = msg.text();

    if (type === "error") {
      consoleErrors.push(text);
      logger.debug("Browser console error", { error: text });
    } else if (type === "warning") {
      consoleWarnings.push(text);
      logger.debug("Browser console warning", { warning: text });
    }
  };

  page.on("console", consoleHandler);

  try {
    // Wrap the entire rendering process in a timeout
    const pngBuffer = await Promise.race([
      renderWithMetrics(html, page, options),
      createTimeoutPromise(timeout),
    ]);

    return pngBuffer;
  } catch (error) {
    // Include console errors in the error context
    if (consoleErrors.length > 0) {
      throw createRenderError(
        error instanceof Error ? error.message : String(error),
        consoleErrors
      );
    }
    throw error;
  } finally {
    // Clean up console listener
    page.off("console", consoleHandler);

    // Log performance metrics
    const totalMs = Date.now() - startTime;
    logger.debug("HTML to PNG conversion completed", {
      totalMs,
      consoleErrors: consoleErrors.length,
      consoleWarnings: consoleWarnings.length,
    });
  }
}

/**
 * Render HTML to PNG with performance metrics tracking
 */
async function renderWithMetrics(
  html: string,
  page: Page,
  options: RenderOptions
): Promise<Buffer> {
  const metrics: Partial<PerformanceMetrics> = {};
  let stepStart = Date.now();

  // Step 1: Set HTML content
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  metrics.setContentMs = Date.now() - stepStart;

  // Step 2: Wait for page to be ready (custom logic)
  stepStart = Date.now();
  await waitForPageReady(page);
  metrics.waitForReadyMs = Date.now() - stepStart;

  // Step 3: Take screenshot
  stepStart = Date.now();
  const screenshot = await page.screenshot({
    type: "png",
    clip: {
      x: 0,
      y: 0,
      width: options.width,
      height: options.height,
    },
    omitBackground: false,
    quality: options.quality,
  });
  metrics.screenshotMs = Date.now() - stepStart;

  // Log performance breakdown
  logger.info("Render performance", {
    setContentMs: metrics.setContentMs,
    waitForReadyMs: metrics.waitForReadyMs,
    screenshotMs: metrics.screenshotMs,
    totalMs:
      (metrics.setContentMs ?? 0) +
      (metrics.waitForReadyMs ?? 0) +
      (metrics.screenshotMs ?? 0),
  });

  return Buffer.from(screenshot);
}

/**
 * Wait for page to be ready with custom resource loading detection
 * This is optimized to be faster than networkidle0 by checking specific resources
 *
 * Based on GitHub's optimization approach:
 * - Wait for DOM content loaded (already done in setContent)
 * - Check all images are loaded
 * - Check all fonts are ready
 */
async function waitForPageReady(page: Page): Promise<void> {
  try {
    // Code inside evaluate() runs in browser context where DOM types are available
    // TypeScript doesn't know this, so we need to suppress the errors
    await page.evaluate(async () => {
      // @ts-expect-error - document is available in browser context
      const images = Array.from(document.querySelectorAll("img"));
      const failedImages: string[] = [];

      // Wait for all images to load
      const imagePromises = images.map((img: any) => {
        // If already loaded, check if it loaded successfully
        if (img.complete) {
          if (img.naturalHeight === 0) {
            failedImages.push(img.src || img.currentSrc || "unknown");
            return Promise.reject(
              new Error(`Image failed to load: ${img.src}`)
            );
          }
          return Promise.resolve();
        }

        // Wait for image to load
        return new Promise<void>((resolve, reject) => {
          img.addEventListener("load", () => {
            if (img.naturalHeight === 0) {
              failedImages.push(img.src || img.currentSrc || "unknown");
              reject(new Error(`Image failed to load: ${img.src}`));
            } else {
              resolve();
            }
          });

          img.addEventListener("error", () => {
            failedImages.push(img.src || img.currentSrc || "unknown");
            reject(new Error(`Image failed to load: ${img.src}`));
          });
        });
      });

      // Wait for fonts to be ready
      // @ts-expect-error - document is available in browser context
      const fontsReady = document.fonts.ready;

      // Wait for all resources
      await Promise.all([fontsReady, ...imagePromises]);
    });

    logger.debug("Page ready - all resources loaded");
  } catch (error) {
    // Extract failed resource URLs from the error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const failedResources: string[] = [];

    // Parse error message to extract failed image URLs
    const match = errorMessage.match(/Image failed to load: (.+)/);
    if (match) {
      failedResources.push(match[1]);
    }

    logger.error("Resource load failed", {
      error: errorMessage,
      failedResources,
    });

    throw createResourceLoadError(
      failedResources.length > 0 ? failedResources : [errorMessage]
    );
  }
}

/**
 * Create a promise that rejects after the specified timeout
 */
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(createBrowserTimeoutError(timeoutMs));
    }, timeoutMs);
  });
}
