import { z } from "zod";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { SeoKitConfig } from "./types.js";
import {
  createConfigMissingError,
  createConfigInvalidError,
  createFontFileNotFoundError,
} from "./errors.js";

// Zod schema for configuration validation
const FontConfigSchema = z.object({
  name: z.string().min(1, "Font name is required"),
  path: z.string().min(1, "Font path is required"),
  weight: z.number().optional(),
  style: z.enum(["normal", "italic"]).optional(),
});

const ServerConfigSchema = z.object({
  port: z.number().int().positive().optional(),
  host: z.string().optional(),
});

const ImageConfigSchema = z.object({
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.enum(["png", "jpeg"]).optional(),
});

const SeoKitDefaultsSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  twitterHandle: z.string().optional(),
  locale: z.string().optional(),
});

const SeoKitConfigSchema = z.object({
  baseUrl: z.string().url("baseUrl must be a valid URL"),
  defaults: SeoKitDefaultsSchema,
  htmlSourceUrl: z.string().url("htmlSourceUrl must be a valid URL"),
  fonts: z.array(FontConfigSchema),
  template: z.string().optional(),
  server: ServerConfigSchema.optional(),
  image: ImageConfigSchema.optional(),
});

// Default values for optional configuration
const DEFAULT_SERVER_CONFIG = {
  port: 7357,
  host: "localhost",
};

const DEFAULT_IMAGE_CONFIG = {
  width: 1200,
  height: 630,
  format: "png" as const,
};

/**
 * Load and validate configuration from seokit.config.ts
 * @param configPath Path to the configuration file (defaults to seokit.config.ts in cwd)
 * @returns Validated configuration with defaults applied
 */
export async function loadConfig(configPath?: string): Promise<SeoKitConfig> {
  const cwd = process.cwd();
  let resolvedPath: string;

  if (configPath) {
    resolvedPath = resolve(cwd, configPath);
  } else {
    // Try .js first, then .ts
    const jsPath = resolve(cwd, "seokit.config.js");
    const tsPath = resolve(cwd, "seokit.config.ts");

    if (existsSync(jsPath)) {
      resolvedPath = jsPath;
    } else if (existsSync(tsPath)) {
      resolvedPath = tsPath;
    } else {
      resolvedPath = tsPath; // Default to .ts for error message
    }
  }

  // Check if config file exists
  if (!existsSync(resolvedPath)) {
    throw createConfigMissingError(resolvedPath);
  }

  try {
    // Dynamically import the configuration file
    // Add timestamp to bust ESM module cache on reload
    const configUrl = pathToFileURL(resolvedPath).href;
    const cacheBustedUrl = `${configUrl}?t=${Date.now()}`;
    const configModule = await import(cacheBustedUrl);
    const rawConfig = configModule.default || configModule.config;

    if (!rawConfig) {
      throw new Error(
        `Configuration file at ${resolvedPath} must export a default configuration object or named 'config' export.`
      );
    }

    // Validate configuration
    const validationResult = SeoKitConfigSchema.safeParse(rawConfig);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(
        (err) => `${String(err.path.join("."))}: ${err.message}`
      );

      throw createConfigInvalidError(resolvedPath, errors);
    }

    // Apply defaults for optional fields
    const config: SeoKitConfig = {
      ...validationResult.data,
      server: {
        ...DEFAULT_SERVER_CONFIG,
        ...validationResult.data.server,
      },
      image: {
        ...DEFAULT_IMAGE_CONFIG,
        ...validationResult.data.image,
      },
    };

    return config;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw our custom errors
      if (error.message.includes("Invalid configuration")) {
        throw error;
      }
      // Handle import errors
      throw new Error(
        `Failed to load configuration from ${resolvedPath}:\n\n` +
          `${error.message}\n\n` +
          `Make sure the file is valid TypeScript and exports a configuration object.`
      );
    }
    throw error;
  }
}

/**
 * Validate font paths exist on the file system
 * @param config Configuration to validate
 */
export function validateFontPaths(config: SeoKitConfig): void {
  const missingFonts: Array<{ name: string; path: string }> = [];

  for (const font of config.fonts) {
    const fontPath = resolve(process.cwd(), font.path);
    if (!existsSync(fontPath)) {
      missingFonts.push({ name: font.name, path: font.path });
    }
  }

  if (missingFonts.length > 0) {
    throw createFontFileNotFoundError(missingFonts);
  }
}

/**
 * Validate complete configuration including file system checks
 * @param config Configuration to validate
 */
export function validateConfig(config: SeoKitConfig): void {
  // Validate font paths exist
  validateFontPaths(config);

  // Additional validation can be added here
  // For example: check if URLs are reachable, validate port ranges, etc.
}
