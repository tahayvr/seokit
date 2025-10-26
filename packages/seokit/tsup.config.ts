import { defineConfig } from "tsup";
import { chmod } from "node:fs/promises";
import { join } from "node:path";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  shims: true,
  // Ensure CLI binary has proper permissions
  onSuccess: async () => {
    try {
      await chmod(join("dist", "cli.js"), 0o755);
      console.log("✓ CLI binary permissions set");
    } catch (error) {
      console.warn("Warning: Could not set CLI binary permissions:", error);
    }
  },
});
