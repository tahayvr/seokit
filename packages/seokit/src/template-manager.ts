/**
 * Template Manager - Handles built-in template discovery and copying
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { BuiltInTemplate } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the built-in templates directory
 */
export function getTemplatesDir(): string {
  // Templates are in the package root, one level up from dist/src
  return join(__dirname, "../../templates");
}

/**
 * Get the content of a built-in template
 * @param templateName Name of the template (without extension)
 * @returns Template content as string
 */
export function getTemplateContent(templateName: string): string {
  const templatesDir = getTemplatesDir();
  const templatePath = join(templatesDir, `${templateName}.svelte`);

  if (!existsSync(templatePath)) {
    throw new Error(
      `Template "${templateName}" not found. Available templates: default, minimal, minimal-dark, card, split, retro`
    );
  }

  return readFileSync(templatePath, "utf-8");
}

/**
 * Check if a template exists
 * @param templateName Name of the template (without extension)
 * @returns True if template exists
 */
export function templateExists(templateName: string): boolean {
  const templatesDir = getTemplatesDir();
  const templatePath = join(templatesDir, `${templateName}.svelte`);
  return existsSync(templatePath);
}

/**
 * Get list of all available built-in templates
 * @returns Array of template names
 */
export function getAvailableTemplates(): BuiltInTemplate[] {
  return ["default", "minimal", "minimal-dark", "card", "split", "retro"];
}

/**
 * Get template description for display
 * @param templateName Name of the template
 * @returns Description of the template
 */
export function getTemplateDescription(templateName: BuiltInTemplate): string {
  const descriptions: Record<BuiltInTemplate, string> = {
    default: "Modern gradient design with decorative orbs and grid pattern",
    minimal: "Clean, minimalist design with white background",
    "minimal-dark": "Clean, minimalist design with black background",
    card: "Bold card-style design with vibrant gradient background",
    split: "Split-screen layout with colorful left panel",
    retro: "Vintage-inspired design with warm colors and texture",
  };

  return descriptions[templateName] || "Custom template";
}
