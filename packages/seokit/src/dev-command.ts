import { loadConfig, validateConfig } from "./config.js";
import { startServer } from "./server.js";
import { watchConfig } from "./config-watcher.js";
import { handleCliError } from "./cli-error-formatter.js";

/**
 * Implementation of the `seokit dev` command
 * Starts the Image Engine server with configuration hot-reloading
 */
export async function devCommand(): Promise<void> {
  console.log("🔧 Starting SeoKit Image Engine...\n");

  try {
    // Load and validate initial configuration
    console.log("📋 Loading configuration...");
    const config = await loadConfig();
    validateConfig(config);
    console.log("✅ Configuration loaded and validated\n");

    // Start the Image Engine server
    const serverInstance = await startServer(config);

    // Start configuration file watcher
    const { watcher } = await watchConfig({
      onReload: async (newConfig) => {
        console.log(
          "🔄 Configuration updated - changes will apply to new requests"
        );
        // Note: We don't restart the server, just reload config
        // The server will use the new config for subsequent requests
      },
      onError: (error) => {
        console.error("❌ Configuration reload error:", error.message);
        console.log("⚠️  Server continues running with previous configuration");
      },
    });

    // Keep the process running
    console.log("Press Ctrl+C to stop the server\n");

    // Handle cleanup on exit
    const cleanup = async () => {
      await watcher.stop();
      await serverInstance.stop();
    };

    // Ensure cleanup happens on exit
    process.on("beforeExit", cleanup);
  } catch (error) {
    // Use the CLI error formatter for user-friendly error messages
    handleCliError(error);
  }
}
