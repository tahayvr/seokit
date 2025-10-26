#!/usr/bin/env node

import { Command } from "commander";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { handleCliError } from "./cli-error-formatter.js";

// Get package.json for version
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
);

const program = new Command();

program
  .name("seokit")
  .description(
    "Standalone CLI tool for SEO metadata and dynamic social media image generation"
  )
  .version(packageJson.version);

// Init command
program
  .command("init")
  .description("Initialize SeoKit in your project")
  .action(async () => {
    const { initCommand } = await import("./init-command.js");
    await initCommand();
    process.exit(0);
  });

// Dev command
program
  .command("dev")
  .description("Start the Image Engine development server")
  .action(async () => {
    const { devCommand } = await import("./dev-command.js");
    await devCommand();
    // Keep process running - devCommand handles its own lifecycle
  });

// Parse arguments and handle errors
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error: any) {
  if (error.code === "commander.help" || error.code === "commander.version") {
    // Help and version are not errors
    process.exit(0);
  }

  // Use the CLI error formatter for user-friendly error messages
  handleCliError(error);
}
