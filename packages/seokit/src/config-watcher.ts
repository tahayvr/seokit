import chokidar, { type FSWatcher } from "chokidar";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { loadConfig, validateFontPaths } from "./config.js";
import { clearFontCache } from "./font-loader.js";
import type { SeoKitConfig } from "./types.js";

export type ConfigChangeCallback = (
  config: SeoKitConfig
) => void | Promise<void>;

export interface ConfigWatcherOptions {
  configPath?: string;
  debounceMs?: number;
  onReload?: ConfigChangeCallback;
  onError?: (error: Error) => void;
}

/**
 * Configuration file watcher that monitors seokit.config.ts for changes
 * and hot-reloads the configuration without server restart
 */
export class ConfigWatcher {
  private watcher: FSWatcher | null = null;
  private configPath: string;
  private debounceMs: number;
  private debounceTimer: NodeJS.Timeout | null = null;
  private onReload?: ConfigChangeCallback;
  private onError?: (error: Error) => void;
  private currentConfig: SeoKitConfig | null = null;

  constructor(options: ConfigWatcherOptions = {}) {
    const cwd = process.cwd();

    if (options.configPath) {
      this.configPath = resolve(cwd, options.configPath);
    } else {
      // Try .js first, then .ts
      const jsPath = resolve(cwd, "seokit.config.js");
      const tsPath = resolve(cwd, "seokit.config.ts");

      if (existsSync(jsPath)) {
        this.configPath = jsPath;
      } else if (existsSync(tsPath)) {
        this.configPath = tsPath;
      } else {
        this.configPath = tsPath; // Default to .ts for error message
      }
    }

    this.debounceMs = options.debounceMs ?? 300;
    this.onReload = options.onReload;
    this.onError = options.onError;
  }

  /**
   * Start watching the configuration file
   * @returns The initial loaded configuration
   */
  async start(): Promise<SeoKitConfig> {
    // Load initial configuration
    this.currentConfig = await this.loadAndValidateConfig();

    // Set up file watcher
    this.watcher = chokidar.watch(this.configPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // Handle file changes
    this.watcher.on("change", () => {
      this.handleConfigChange();
    });

    // Handle watcher errors
    this.watcher.on("error", (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const err = new Error(`Config watcher error: ${errorMessage}`);
      if (this.onError) {
        this.onError(err);
      } else {
        console.error(err);
      }
    });

    console.log(`📋 Watching configuration file: ${this.configPath}`);

    return this.currentConfig;
  }

  /**
   * Stop watching the configuration file
   */
  async stop(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log("📋 Stopped watching configuration file");
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): SeoKitConfig | null {
    return this.currentConfig;
  }

  /**
   * Handle configuration file changes with debouncing
   */
  private handleConfigChange(): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new debounce timer
    this.debounceTimer = setTimeout(async () => {
      try {
        console.log("🔄 Configuration file changed, reloading...");

        // Clear the module cache to force reload
        this.clearModuleCache();

        // Clear font cache to reload fonts with new config
        clearFontCache();

        // Load and validate new configuration
        const newConfig = await this.loadAndValidateConfig();

        // Update current config
        this.currentConfig = newConfig;

        console.log("✅ Configuration reloaded successfully");

        // Call reload callback if provided
        if (this.onReload) {
          await this.onReload(newConfig);
        }
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error("Unknown error during config reload");

        console.error("❌ Failed to reload configuration:", err.message);

        if (this.onError) {
          this.onError(err);
        }
      }
    }, this.debounceMs);
  }

  /**
   * Load and validate configuration
   */
  private async loadAndValidateConfig(): Promise<SeoKitConfig> {
    const config = await loadConfig(this.configPath);
    validateFontPaths(config);
    return config;
  }

  /**
   * Clear Node.js module cache for the config file
   * This ensures we get the latest version on reload
   */
  private clearModuleCache(): void {
    // Get all cached module paths
    const cacheKeys = Object.keys(require.cache);

    // Find and delete the config module from cache
    for (const key of cacheKeys) {
      if (key.includes(this.configPath)) {
        delete require.cache[key];
      }
    }

    // Also clear import cache for ESM modules
    // Note: This is a workaround as ESM doesn't have a standard cache clearing mechanism
    // The dynamic import with timestamp query param in loadConfig helps with this
  }
}

/**
 * Create and start a configuration watcher
 * @param options Watcher options
 * @returns ConfigWatcher instance and initial configuration
 */
export async function watchConfig(
  options: ConfigWatcherOptions = {}
): Promise<{ watcher: ConfigWatcher; config: SeoKitConfig }> {
  const watcher = new ConfigWatcher(options);
  const config = await watcher.start();
  return { watcher, config };
}
