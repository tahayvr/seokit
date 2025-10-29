/**
 * Browser Manager for Puppeteer
 * Manages the lifecycle of a single Chromium browser instance with crash detection,
 * auto-restart, and memory monitoring capabilities.
 */

import puppeteer, { Browser } from "puppeteer";
import { getLogger } from "./logger.js";

const logger = getLogger();

export interface BrowserManagerConfig {
  headless?: boolean;
  timeout?: number;
  memoryLimit?: number;
  args?: string[];
}

export interface BrowserStats {
  status: "running" | "stopped" | "crashed" | "starting" | "restarting";
  uptime: number;
  memoryUsage?: number;
  version?: string;
}

type BrowserState =
  | { status: "stopped" }
  | { status: "starting" }
  | { status: "running"; browser: Browser; startTime: number }
  | { status: "crashed"; error: Error; crashTime: number }
  | { status: "restarting" };

export class BrowserManager {
  private state: BrowserState = { status: "stopped" };
  private config: Required<BrowserManagerConfig>;
  private restartAttempts = 0;
  private maxRestartAttempts = 3;
  private restartBackoffMs = 1000; // Initial backoff: 1 second

  constructor(config: BrowserManagerConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 10000,
      memoryLimit: config.memoryLimit ?? 1024, // 1GB in MB
      args: config.args ?? [],
    };
  }

  /**
   * Start the browser instance with optimized Chromium flags
   */
  async start(): Promise<void> {
    if (this.state.status === "running") {
      logger.warn("Browser is already running");
      return;
    }

    if (this.state.status === "starting") {
      logger.warn("Browser is already starting");
      return;
    }

    this.state = { status: "starting" };
    logger.info("Starting Chromium browser...");

    try {
      const browser = await puppeteer.launch({
        headless: this.config.headless,
        timeout: this.config.timeout,
        args: this.getOptimizedLaunchArgs(),
      });

      // Get browser version
      const version = await browser.version();
      logger.logBrowserStart(version);

      // Set up crash detection
      this.setupCrashDetection(browser);

      // Update state to running
      this.state = {
        status: "running",
        browser,
        startTime: Date.now(),
      };

      // Reset restart attempts on successful start
      this.restartAttempts = 0;

      // Start memory monitoring
      this.startMemoryMonitoring();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to start browser", {
        error: err.message,
        stack: err.stack,
      });
      this.state = { status: "crashed", error: err, crashTime: Date.now() };
      throw err;
    }
  }

  /**
   * Stop the browser instance gracefully
   */
  async stop(): Promise<void> {
    if (this.state.status !== "running") {
      logger.warn("Browser is not running", { status: this.state.status });
      return;
    }

    logger.info("Stopping browser...");

    try {
      await this.state.browser.close();
      logger.info("Browser stopped successfully");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error stopping browser", { error: err.message });
    } finally {
      this.state = { status: "stopped" };
    }
  }

  /**
   * Get the browser instance if running
   */
  getBrowser(): Browser | null {
    if (this.state.status === "running") {
      return this.state.browser;
    }
    return null;
  }

  /**
   * Check if browser is running
   */
  isRunning(): boolean {
    return this.state.status === "running";
  }

  /**
   * Restart the browser instance
   */
  async restart(): Promise<void> {
    logger.info("Restarting browser...");

    // Stop current browser if running
    if (this.state.status === "running") {
      await this.stop();
    }

    // Start new browser instance
    await this.start();
  }

  /**
   * Get browser statistics
   */
  async getStats(): Promise<BrowserStats> {
    const baseStats: BrowserStats = {
      status: this.state.status,
      uptime: 0,
    };

    if (this.state.status === "running") {
      const uptime = Date.now() - this.state.startTime;
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // Convert to MB
      const version = await this.state.browser.version();

      return {
        ...baseStats,
        status: "running",
        uptime,
        memoryUsage,
        version,
      };
    }

    return baseStats;
  }

  /**
   * Get optimized Chromium launch arguments
   * Based on GitHub's learnings for OG image generation
   */
  private getOptimizedLaunchArgs(): string[] {
    const defaultArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-first-run",
      "--safebrowsing-disable-auto-update",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      `--max-old-space-size=${Math.max(513, this.config.memoryLimit)}`,
    ];

    return [...defaultArgs, ...this.config.args];
  }

  /**
   * Set up crash detection and auto-restart logic
   */
  private setupCrashDetection(browser: Browser): void {
    browser.on("disconnected", async () => {
      const error = new Error("Browser disconnected");
      logger.logBrowserCrash(error.message);

      // Update state to crashed
      this.state = {
        status: "crashed",
        error,
        crashTime: Date.now(),
      };

      // Attempt auto-restart with exponential backoff
      await this.attemptAutoRestart();
    });
  }

  /**
   * Attempt to restart the browser with exponential backoff
   */
  private async attemptAutoRestart(): Promise<void> {
    if (this.restartAttempts >= this.maxRestartAttempts) {
      logger.error("Max restart attempts reached, giving up", {
        attempts: this.restartAttempts,
      });
      return;
    }

    this.restartAttempts++;
    const backoffMs =
      this.restartBackoffMs * Math.pow(2, this.restartAttempts - 1);

    logger.logBrowserRestart(
      this.restartAttempts,
      this.maxRestartAttempts,
      backoffMs
    );

    this.state = { status: "restarting" };

    // Wait for backoff period
    await new Promise((resolve) => setTimeout(resolve, backoffMs));

    try {
      await this.start();
      logger.logBrowserRestartSuccess();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to restart browser", {
        error: err.message,
        attempt: this.restartAttempts,
      });

      // Try again if we haven't hit max attempts
      if (this.restartAttempts < this.maxRestartAttempts) {
        await this.attemptAutoRestart();
      }
    }
  }

  /**
   * Start memory monitoring and restart if threshold exceeded
   */
  private startMemoryMonitoring(): void {
    // Check memory every 30 seconds
    const intervalMs = 30000;

    const checkMemory = async () => {
      if (this.state.status !== "running") {
        return;
      }

      const memoryUsageMB = process.memoryUsage().heapUsed / 1024 / 1024;

      if (memoryUsageMB > this.config.memoryLimit) {
        logger.logBrowserMemoryThreshold(
          memoryUsageMB,
          this.config.memoryLimit
        );

        try {
          await this.restart();
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error("Failed to restart browser due to memory threshold", {
            error: err.message,
          });
        }
      }

      // Schedule next check if still running
      if (this.state.status === "running") {
        setTimeout(checkMemory, intervalMs);
      }
    };

    // Start monitoring
    setTimeout(checkMemory, intervalMs);
  }
}

/**
 * Factory function to create a BrowserManager instance
 */
export function createBrowserManager(
  config?: BrowserManagerConfig
): BrowserManager {
  return new BrowserManager(config);
}
