/**
 * Page Pool for Puppeteer
 * Manages a pool of reusable browser pages for concurrent request handling
 * with queuing, timeout, and health monitoring capabilities.
 */

import { Browser, Page } from "puppeteer";
import { getLogger } from "./logger.js";

const logger = getLogger();

export interface PagePoolConfig {
  size: number;
  timeout: number;
  maxWaitTime: number;
}

export interface PagePoolStats {
  total: number;
  available: number;
  inUse: number;
  waitingRequests: number;
}

interface PageInfo {
  id: string;
  page: Page;
  inUse: boolean;
  lastUsed: number;
  requestCount: number;
}

interface PoolRequest {
  resolve: (page: Page) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeoutId?: NodeJS.Timeout;
}

/**
 * Simple Queue implementation for managing pages and requests
 */
class Queue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  get size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

export class PagePool {
  private pages: Map<string, PageInfo> = new Map();
  private availablePages: Queue<string> = new Queue();
  private waitingRequests: Queue<PoolRequest> = new Queue();
  private config: PagePoolConfig;
  private browser: Browser | null = null;
  private pageIdCounter = 0;
  private isInitialized = false;

  constructor(config: Partial<PagePoolConfig> = {}) {
    this.config = {
      size: config.size ?? 2,
      timeout: config.timeout ?? 10000,
      maxWaitTime: config.maxWaitTime ?? 30000,
    };
  }

  /**
   * Initialize the page pool with a browser instance
   */
  async initialize(browser: Browser): Promise<void> {
    if (this.isInitialized) {
      logger.warn("Page pool is already initialized");
      return;
    }

    this.browser = browser;
    logger.info("Initializing page pool", { size: this.config.size });

    try {
      // Create initial pool of pages
      for (let i = 0; i < this.config.size; i++) {
        const page = await browser.newPage();
        const pageId = this.generatePageId();

        const pageInfo: PageInfo = {
          id: pageId,
          page,
          inUse: false,
          lastUsed: Date.now(),
          requestCount: 0,
        };

        this.pages.set(pageId, pageInfo);
        this.availablePages.enqueue(pageId);

        logger.debug("Created page in pool", { pageId });
      }

      this.isInitialized = true;
      logger.logPagePoolInitialized(this.pages.size);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Failed to initialize page pool", {
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }
  }

  /**
   * Acquire a page from the pool
   * If no pages are available, the request will be queued with a timeout
   */
  async acquire(): Promise<Page> {
    if (!this.isInitialized || !this.browser) {
      throw new Error("Page pool is not initialized");
    }

    const acquireStartTime = Date.now();

    // Try to get an available page immediately
    const pageId = this.availablePages.dequeue();

    if (pageId) {
      const pageInfo = this.pages.get(pageId);
      if (pageInfo) {
        pageInfo.inUse = true;
        pageInfo.lastUsed = Date.now();
        pageInfo.requestCount++;

        const waitTime = Date.now() - acquireStartTime;
        logger.logPageAcquired(pageId, pageInfo.requestCount, waitTime);

        return pageInfo.page;
      }
    }

    // No pages available, queue the request with timeout
    return this.queueRequest(acquireStartTime);
  }

  /**
   * Release a page back to the pool
   */
  async release(page: Page): Promise<void> {
    // Find the page info
    let pageInfo: PageInfo | undefined;
    let pageId: string | undefined;

    for (const [id, info] of this.pages.entries()) {
      if (info.page === page) {
        pageInfo = info;
        pageId = id;
        break;
      }
    }

    if (!pageInfo || !pageId) {
      logger.warn("Attempted to release unknown page");
      return;
    }

    try {
      // Reset the page before returning to pool
      await this.resetPage(page);

      pageInfo.inUse = false;
      pageInfo.lastUsed = Date.now();

      logger.logPageReleased(pageId);

      // Check if there are waiting requests
      const waitingRequest = this.waitingRequests.dequeue();

      if (waitingRequest) {
        // Clear the timeout
        if (waitingRequest.timeoutId) {
          clearTimeout(waitingRequest.timeoutId);
        }

        // Immediately assign to waiting request
        pageInfo.inUse = true;
        pageInfo.requestCount++;

        logger.logPageAssignedToWaiting(pageId);

        waitingRequest.resolve(page);
      } else {
        // Return to available pool
        this.availablePages.enqueue(pageId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error("Error releasing page", {
        error: err.message,
        pageId,
      });

      // Still mark as not in use to avoid deadlock
      pageInfo.inUse = false;
      this.availablePages.enqueue(pageId);
    }
  }

  /**
   * Drain the pool by closing all pages
   */
  async drain(): Promise<void> {
    logger.logPagePoolDrained(this.pages.size);

    // Reject all waiting requests
    let waitingRequest = this.waitingRequests.dequeue();
    while (waitingRequest) {
      if (waitingRequest.timeoutId) {
        clearTimeout(waitingRequest.timeoutId);
      }
      waitingRequest.reject(new Error("Page pool is being drained"));
      waitingRequest = this.waitingRequests.dequeue();
    }

    // Close all pages
    const closePromises: Promise<void>[] = [];

    for (const [pageId, pageInfo] of this.pages.entries()) {
      closePromises.push(
        pageInfo.page.close().catch((error) => {
          logger.error("Error closing page during drain", {
            pageId,
            error: error instanceof Error ? error.message : String(error),
          });
        })
      );
    }

    await Promise.all(closePromises);

    // Clear all state
    this.pages.clear();
    this.availablePages.clear();
    this.waitingRequests.clear();
    this.isInitialized = false;

    logger.info("Page pool drained successfully");
  }

  /**
   * Get pool statistics
   */
  getStats(): PagePoolStats {
    const inUse = Array.from(this.pages.values()).filter((p) => p.inUse).length;

    return {
      total: this.pages.size,
      available: this.availablePages.size,
      inUse,
      waitingRequests: this.waitingRequests.size,
    };
  }

  /**
   * Queue a request when pool is exhausted
   */
  private queueRequest(acquireStartTime: number): Promise<Page> {
    return new Promise<Page>((resolve, reject) => {
      const request: PoolRequest = {
        resolve: (page: Page) => {
          // Calculate wait time when page is finally acquired
          const waitTime = Date.now() - acquireStartTime;

          // Find page ID for logging
          for (const [id, info] of this.pages.entries()) {
            if (info.page === page) {
              logger.logPageAcquired(id, info.requestCount, waitTime);
              break;
            }
          }

          resolve(page);
        },
        reject,
        timestamp: Date.now(),
      };

      // Set up timeout
      const timeoutId = setTimeout(() => {
        // Remove from queue
        this.removeRequestFromQueue(request);

        const error = new Error(
          `Page acquisition timeout after ${this.config.maxWaitTime}ms. ` +
            `Pool exhausted with ${this.pages.size} pages in use.`
        );
        error.name = "PageAcquisitionTimeoutError";

        logger.logPageAcquisitionTimeout(
          this.config.maxWaitTime,
          this.waitingRequests.size
        );

        reject(error);
      }, this.config.maxWaitTime);

      request.timeoutId = timeoutId;

      this.waitingRequests.enqueue(request);

      logger.debug("Request queued", {
        waitingRequests: this.waitingRequests.size,
      });
    });
  }

  /**
   * Remove a request from the waiting queue
   */
  private removeRequestFromQueue(targetRequest: PoolRequest): void {
    // This is a simple implementation - in production you might want a more efficient data structure
    const tempQueue = new Queue<PoolRequest>();
    let request = this.waitingRequests.dequeue();

    while (request) {
      if (request !== targetRequest) {
        tempQueue.enqueue(request);
      }
      request = this.waitingRequests.dequeue();
    }

    // Restore the queue without the target request
    this.waitingRequests = tempQueue;
  }

  /**
   * Reset page state between uses
   */
  private async resetPage(page: Page): Promise<void> {
    try {
      // Clear cookies, localStorage, sessionStorage
      await page.evaluate(() => {
        // @ts-ignore - localStorage and sessionStorage are available in browser context
        if (typeof localStorage !== "undefined") localStorage.clear();
        // @ts-ignore - localStorage and sessionStorage are available in browser context
        if (typeof sessionStorage !== "undefined") sessionStorage.clear();
      });

      // Clear cookies
      const client = await page.target().createCDPSession();
      await client.send("Network.clearBrowserCookies");
      await client.send("Network.clearBrowserCache");
      await client.detach();

      // Reset viewport to configured dimensions
      await page.setViewport({ width: 1200, height: 630 });

      // Remove all listeners
      page.removeAllListeners("console");
      page.removeAllListeners("pageerror");
      page.removeAllListeners("requestfailed");

      logger.debug("Page reset completed");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.warn("Error during page reset", { error: err.message });
      // Don't throw - we still want to reuse the page
    }
  }

  /**
   * Generate a unique page ID
   */
  private generatePageId(): string {
    return `page-${++this.pageIdCounter}`;
  }
}

/**
 * Factory function to create a PagePool instance
 */
export function createPagePool(config?: Partial<PagePoolConfig>): PagePool {
  return new PagePool(config);
}
