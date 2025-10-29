import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import type { SeoKitConfig } from "./types.js";
import { fetchTemplateHtml } from "./template-fetcher.js";
import { htmlToPng } from "./html-to-png.js";
import {
  createBrowserManager,
  type BrowserManager,
} from "./browser-manager.js";
import { createPagePool, type PagePool } from "./page-pool.js";
import {
  isSeoKitError,
  toSeoKitError,
  createPortInUseError,
  createPortAccessDeniedError,
} from "./errors.js";
import { getLogger } from "./logger.js";

export interface ServerInstance {
  stop: () => Promise<void>;
  port: number;
}

/**
 * Get appropriate cache headers based on environment
 * @param config SeoKit configuration
 * @returns Cache-Control header value
 */
function getCacheHeaders(config: SeoKitConfig): string {
  const isDevelopment = process.env.NODE_ENV !== "production";

  if (isDevelopment) {
    // Use configured development cache or default to no-cache
    return config.cache?.development || "no-cache, no-store, must-revalidate";
  } else {
    // Use configured production cache or default to long-lived cache
    return config.cache?.production || "public, max-age=31536000, immutable";
  }
}

/**
 * Create and configure the Image Engine Hono server
 */
export function createServer(
  config: SeoKitConfig,
  browserManager: BrowserManager,
  pagePool: PagePool
) {
  const app = new Hono();

  // Configure CORS for development
  app.use(
    "/*",
    cors({
      origin: "*",
      allowMethods: ["GET", "OPTIONS"],
      allowHeaders: ["Content-Type", "Accept"],
    })
  );

  // Health check endpoint
  app.get("/health", async (c) => {
    const logger = getLogger();
    const checks: Record<string, { status: string; message?: string }> = {};
    let overallStatus = "ok";

    // Check 1: Config validation
    try {
      // Import validateConfig dynamically to avoid circular dependencies
      const { validateConfig } = await import("./config.js");
      validateConfig(config);
      checks.config = { status: "ok" };
    } catch (error) {
      checks.config = {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      };
      overallStatus = "degraded";
      logger.warn("Health check: Config validation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Check 2: Browser status
    const browserStats = await browserManager.getStats();
    if (browserStats.status === "running") {
      checks.browser = { status: "ok" };
    } else {
      checks.browser = {
        status: "error",
        message: `Browser is ${browserStats.status}`,
      };
      overallStatus = "degraded";
    }

    // Check 3: Page pool status
    const poolStats = pagePool.getStats();
    if (poolStats.total > 0) {
      checks.pagePool = { status: "ok" };
    } else {
      checks.pagePool = {
        status: "error",
        message: "No pages available in pool",
      };
      overallStatus = "degraded";
    }

    // Check 4: Template Endpoint reachability
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(config.htmlSourceUrl, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok || response.status === 404 || response.status === 405) {
        // 404 or 405 means the server is reachable, just the endpoint might not accept HEAD
        checks.templateEndpoint = { status: "ok" };
      } else {
        checks.templateEndpoint = {
          status: "warning",
          message: `Returned status ${response.status}`,
        };
        overallStatus = overallStatus === "ok" ? "degraded" : overallStatus;
      }
    } catch (error) {
      checks.templateEndpoint = {
        status: "error",
        message:
          error instanceof Error
            ? error.name === "AbortError"
              ? "Timeout"
              : error.message
            : "Unreachable",
      };
      overallStatus = "degraded";
      logger.warn("Health check: Template endpoint unreachable", {
        url: config.htmlSourceUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return c.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
        browser: {
          status: browserStats.status,
          version: browserStats.version,
          uptime: browserStats.uptime,
          memoryUsage: browserStats.memoryUsage,
        },
        pagePool: {
          total: poolStats.total,
          available: poolStats.available,
          inUse: poolStats.inUse,
          waiting: poolStats.waitingRequests,
        },
        config: {
          htmlSourceUrl: config.htmlSourceUrl,
          imageSize: `${config.image?.width || 1200}x${
            config.image?.height || 630
          }`,
          port: config.server?.port || 7357,
          environment: process.env.NODE_ENV || "development",
        },
      },
      overallStatus === "ok" ? 200 : 503
    );
  });

  // Main image generation endpoint
  app.get("/og.png", async (c) => {
    const logger = getLogger();
    const startTime = Date.now();
    let page = null;

    try {
      // Extract query parameters from the request URL
      const url = new URL(c.req.url);
      const params = url.searchParams;

      // Log incoming request
      logger.logRequest("GET", "/og.png", params);

      // Step 1: Fetch HTML from Template Endpoint
      const templateStartTime = Date.now();

      // Add template parameter if specified in config
      if (config.template) {
        params.set("template", config.template);
      }

      const { html } = await fetchTemplateHtml(config.htmlSourceUrl, params);
      const templateDuration = Date.now() - templateStartTime;
      logger.logTemplateResponse(
        config.htmlSourceUrl,
        html.length,
        templateDuration
      );

      // Step 2: Acquire page from pool
      const pageAcquireStartTime = Date.now();
      page = await pagePool.acquire();
      const pageAcquireDuration = Date.now() - pageAcquireStartTime;
      logger.debug("Page acquired from pool", {
        durationMs: pageAcquireDuration,
      });

      // Step 3: Render HTML to PNG using Puppeteer
      const renderStartTime = Date.now();
      const png = await htmlToPng(html, page, {
        width: config.image?.width || 1200,
        height: config.image?.height || 630,
        timeout: config.puppeteer?.timeout || 10000,
      });
      const renderDuration = Date.now() - renderStartTime;
      logger.logImageGeneration("HTML to PNG", {
        pngSize: png.length,
        durationMs: renderDuration,
      });

      const totalDuration = Date.now() - startTime;
      logger.logImageComplete(totalDuration, png.length);

      // Determine cache headers based on environment
      const cacheControl = getCacheHeaders(config);

      // Return PNG with proper headers
      // Convert Buffer to Uint8Array for Hono compatibility
      return c.body(new Uint8Array(png), 200, {
        "Content-Type": "image/png",
        "Cache-Control": cacheControl,
        "Content-Length": png.length.toString(),
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const logger = getLogger();

      // Convert to SeoKitError for consistent handling
      const seoKitError = toSeoKitError(error);

      // Log error with appropriate detail level
      logger.logImageError(seoKitError.code, duration, {
        message: seoKitError.message,
        statusCode: seoKitError.statusCode,
        ...(seoKitError.context && { context: seoKitError.context }),
      });

      // Return formatted error response
      return c.json(
        {
          error: seoKitError.code,
          message: seoKitError.message,
          ...(seoKitError.context && { context: seoKitError.context }),
        },
        seoKitError.statusCode as 500 | 502 | 503 | 504
      );
    } finally {
      // Always release page back to pool
      if (page) {
        await pagePool.release(page);
        logger.debug("Page released back to pool");
      }
    }
  });

  // Global error handler middleware
  app.onError((err, c) => {
    const logger = getLogger();

    // Convert to SeoKitError for consistent handling
    const seoKitError = isSeoKitError(err) ? err : toSeoKitError(err);

    // Log error with appropriate detail level
    logger.error("Unhandled error", {
      code: seoKitError.code,
      message: seoKitError.message,
      statusCode: seoKitError.statusCode,
      ...(seoKitError.context && { context: seoKitError.context }),
    });

    // Check if response already sent
    if (c.res) {
      return c.res;
    }

    // Return formatted error response
    return c.json(
      {
        error: seoKitError.code,
        message: seoKitError.message,
        ...(seoKitError.context && { context: seoKitError.context }),
      },
      seoKitError.statusCode as 500
    );
  });

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: "Not found",
        message: `Route ${c.req.path} not found`,
      },
      404
    );
  });

  return app;
}

/**
 * Start the Image Engine server
 * @param config SeoKit configuration
 * @returns ServerInstance with stop method
 */
export async function startServer(
  config: SeoKitConfig
): Promise<ServerInstance> {
  const logger = getLogger();

  // Initialize BrowserManager
  logger.info("Initializing browser manager...");
  const browserManager = createBrowserManager(config.puppeteer);
  await browserManager.start();

  // Initialize PagePool
  logger.info("Initializing page pool...");
  const pagePool = createPagePool({
    size: config.puppeteer?.poolSize || 2,
    timeout: config.puppeteer?.timeout || 10000,
    maxWaitTime: 30000,
  });

  const browser = browserManager.getBrowser();
  if (!browser) {
    throw new Error("Failed to get browser instance after starting");
  }

  await pagePool.initialize(browser);

  const app = createServer(config, browserManager, pagePool);
  const port = config.server?.port || 7357;

  return new Promise((resolve, reject) => {
    try {
      const server = serve(
        {
          fetch: app.fetch,
          port,
          hostname: "127.0.0.1",
        },
        (info: { address: string; port: number }) => {
          // Always display as localhost for better UX (like other dev tools)
          // Works regardless of whether we bind to 127.0.0.1, ::1, or 0.0.0.0
          const displayHost = "localhost";

          console.log(`\n🚀 Image Engine started successfully!\n`);
          console.log(`   Local:   http://${displayHost}:${info.port}`);
          console.log(`   Health:  http://${displayHost}:${info.port}/health`);
          console.log(
            `   Image:   http://${displayHost}:${info.port}/og.png\n`
          );

          // Set up graceful shutdown handlers
          const shutdown = async () => {
            console.log("\n🛑 Shutting down Image Engine...");
            try {
              // Step 1: Stop accepting new requests
              await new Promise<void>((resolveClose) => {
                server.close(() => {
                  console.log("✅ Server closed successfully");
                  resolveClose();
                });
              });

              // Step 2: Drain page pool
              console.log("🔄 Draining page pool...");
              await pagePool.drain();
              console.log("✅ Page pool drained");

              // Step 3: Stop browser
              console.log("🔄 Stopping browser...");
              await browserManager.stop();
              console.log("✅ Browser stopped");

              process.exit(0);
            } catch (error) {
              console.error("Error during shutdown:", error);
              process.exit(1);
            }
          };

          // Handle shutdown signals
          process.on("SIGINT", shutdown);
          process.on("SIGTERM", shutdown);

          resolve({
            stop: async () => {
              return new Promise<void>(async (resolveStop) => {
                // Graceful shutdown sequence
                server.close(async () => {
                  await pagePool.drain();
                  await browserManager.stop();
                  resolveStop();
                });
              });
            },
            port: info.port,
          });
        }
      );

      // Handle server errors
      server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          reject(createPortInUseError(port));
        } else if (error.code === "EACCES") {
          reject(createPortAccessDeniedError(port));
        } else {
          reject(toSeoKitError(error));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}
