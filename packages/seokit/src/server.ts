import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import type { SeoKitConfig } from "./types.js";
import { fetchTemplateHtml } from "./template-fetcher.js";
import { htmlToSvg } from "./html-to-svg.js";
import { svgToPng } from "./svg-to-png.js";
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
  host: string;
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
export function createServer(config: SeoKitConfig) {
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

    // Check 2: Template Endpoint reachability
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

      // Step 2: Convert HTML to SVG using Satori
      const satoriStartTime = Date.now();
      const svg = await htmlToSvg(html, config);
      const satoriDuration = Date.now() - satoriStartTime;
      logger.logImageGeneration("HTML to SVG", {
        svgLength: svg.length,
        durationMs: satoriDuration,
      });

      // Step 3: Convert SVG to PNG using Sharp
      const sharpStartTime = Date.now();
      const png = await svgToPng(svg);
      const sharpDuration = Date.now() - sharpStartTime;
      logger.logImageGeneration("SVG to PNG", {
        pngSize: png.length,
        durationMs: sharpDuration,
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
        seoKitError.statusCode as 500 | 502 | 504
      );
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
  const app = createServer(config);
  const port = config.server?.port || 7357;
  const host = config.server?.host || "localhost";

  return new Promise((resolve, reject) => {
    try {
      const server = serve(
        {
          fetch: app.fetch,
          port,
          hostname: host,
        },
        (info: { address: string; port: number }) => {
          console.log(`\n🚀 Image Engine started successfully!\n`);
          console.log(`   Local:   http://${info.address}:${info.port}`);
          console.log(`   Health:  http://${info.address}:${info.port}/health`);
          console.log(
            `   Image:   http://${info.address}:${info.port}/og.png\n`
          );

          // Set up graceful shutdown handlers
          const shutdown = async () => {
            console.log("\n🛑 Shutting down Image Engine...");
            try {
              await new Promise<void>((resolveClose) => {
                server.close(() => {
                  console.log("✅ Server closed successfully");
                  resolveClose();
                });
              });
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
              return new Promise<void>((resolveStop) => {
                server.close(() => {
                  resolveStop();
                });
              });
            },
            port: info.port,
            host: info.address,
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
