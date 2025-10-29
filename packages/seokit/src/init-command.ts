import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  appendFileSync,
} from "fs";
import { join } from "path";
import { detectFramework, type FrameworkType } from "./framework-detector.js";
import { execSync } from "child_process";
import { handleCliError } from "./cli-error-formatter.js";
import { getTemplateContent } from "./template-manager.js";

/**
 * Generates the seokit.config.js template (works for both TS and JS projects)
 */
function generateConfigTemplateJS(): string {
  return `import { getBundledFontPath } from "seokit";

/** @type {import('seokit').SeoKitConfig} */
const config = {
  // Base URL for your production site
  baseUrl: "https://example.com",

  // Site-wide defaults
  defaults: {
    siteName: "My Site",
    twitterHandle: "@mysite",
    locale: "en_US",
  },

  // URL where the Template Endpoint is running (your dev server)
  htmlSourceUrl: "http://localhost:5173/api/seokit-html",

  // Template to use for OG images
  // Options: 'custom' (your editable template), 'default', 'minimal', 'minimal-dark', 'card', 'split', 'retro'
  template: "custom",

  // Font configuration
  // Using bundled Open Sans font - to use custom fonts, replace with your own font files
  fonts: [
    {
      name: "Open Sans",
      path: getBundledFontPath("OpenSans-Regular.ttf"),
      weight: 400,
      style: "normal",
    },
  ],

  // Image Engine server configuration
  server: {
    port: 7357,
  },

  // Image generation options
  image: {
    width: 1200,
    height: 630,
    format: "png",
  },
};

export default config;
`;
}

/**
 * Generates the Template Endpoint for SvelteKit
 */
function generateSvelteKitEndpoint(): string {
  return `import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { render } from "svelte/server";

// Import your customizable template
import CustomTemplate from "$lib/seokit/templates/custom.svelte";

// Import built-in templates from seokit package
import DefaultTemplate from "seokit/templates/default.svelte";
import MinimalTemplate from "seokit/templates/minimal.svelte";
import MinimalDarkTemplate from "seokit/templates/minimal-dark.svelte";
import CardTemplate from "seokit/templates/card.svelte";
import SplitTemplate from "seokit/templates/split.svelte";
import RetroTemplate from "seokit/templates/retro.svelte";

// Template map for dynamic selection
const templates = {
  custom: CustomTemplate,
  default: DefaultTemplate,
  minimal: MinimalTemplate,
  "minimal-dark": MinimalDarkTemplate,
  card: CardTemplate,
  split: SplitTemplate,
  retro: RetroTemplate,
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Extract query parameters
    const params = Object.fromEntries(url.searchParams);
    
    // Get template name from query params or use 'default'
    const templateName = params.template || "default";
    delete params.template; // Remove template from props
    
    // Select the template
    const Template = templates[templateName as keyof typeof templates] || templates.default;

    // Render template to HTML
    const { html, css } = render(Template, {
      props: params,
    });

    // Return as JSON
    return json({
      html: html,
      css: css?.code || "",
    });
  } catch (error) {
    console.error("Template rendering error:", error);
    return json({ error: "Failed to render template" }, { status: 500 });
  }
};
`;
}

/**
 * Generates a generic template for unsupported frameworks
 */
function generateGenericTemplate(): string {
  return `<!-- 
  Generic OG Image Template
  
  This is a placeholder template. SeoKit currently has full support for:
  - SvelteKit
  
  For other frameworks, you'll need to:
  1. Create a server endpoint that renders this template to HTML
  2. Return the HTML as JSON with { html: string, css?: string }
  3. Update htmlSourceUrl in seokit.config.js to point to your endpoint
-->

<div style="
  width: 1200px;
  height: 630px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 80px;
  box-sizing: border-box;
  color: white;
  font-family: system-ui, -apple-system, sans-serif;
">
  <div>
    <div style="font-size: 24px; opacity: 0.9; margin-bottom: 20px;">
      {{siteName}}
    </div>
    <h1 style="font-size: 64px; font-weight: bold; margin: 0 0 20px 0; line-height: 1.2;">
      {{title}}
    </h1>
    <p style="font-size: 32px; opacity: 0.9; margin: 0;">
      {{description}}
    </p>
  </div>
</div>
`;
}

/**
 * Updates or creates .gitignore with seokit-assets entry
 */
function updateGitignore(projectRoot: string): void {
  const gitignorePath = join(projectRoot, ".gitignore");
  const entry = "/seokit-assets/";

  if (existsSync(gitignorePath)) {
    const content = readFileSync(gitignorePath, "utf-8");
    if (!content.includes(entry)) {
      appendFileSync(gitignorePath, `\n${entry}\n`);
    }
  } else {
    writeFileSync(gitignorePath, `${entry}\n`);
  }
}

/**
 * Detects the package manager being used
 */
function detectPackageManager(projectRoot: string): "npm" | "pnpm" | "yarn" {
  if (existsSync(join(projectRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(join(projectRoot, "yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}

/**
 * Installs dependencies based on framework
 */
function installDependencies(
  frameworkType: FrameworkType,
  projectRoot: string
): void {
  const packageManager = detectPackageManager(projectRoot);
  const packages = ["seokit"];

  if (frameworkType === "sveltekit") {
    packages.push("@seokit/svelte");
  }

  try {
    const installCmd =
      packageManager === "npm"
        ? `npm install --save-dev ${packages.join(" ")}`
        : packageManager === "yarn"
        ? `yarn add --dev ${packages.join(" ")}`
        : `pnpm add -D ${packages.join(" ")}`;

    execSync(installCmd, { cwd: projectRoot, stdio: "ignore" });
  } catch (error) {
    console.error(
      `\nFailed to install. Run manually: ${packageManager} ${
        packageManager === "npm" ? "install --save-dev" : "add -D"
      } ${packages.join(" ")}\n`
    );
  }
}

/**
 * Main init command implementation
 */
export async function initCommand(): Promise<void> {
  try {
    const projectRoot = process.cwd();
    const framework = detectFramework(projectRoot);

    // Create config file
    const configPath = join(projectRoot, "seokit.config.js");
    const tsConfigPath = join(projectRoot, "seokit.config.ts");

    if (!existsSync(configPath) && !existsSync(tsConfigPath)) {
      writeFileSync(configPath, generateConfigTemplateJS());
    }

    // Determine templates directory
    let templatesDir: string;
    if (framework.type === "sveltekit") {
      templatesDir = join(projectRoot, "src/lib/seokit/templates");
    } else {
      templatesDir = join(projectRoot, "templates");
    }

    // Create templates directory
    if (!existsSync(templatesDir)) {
      mkdirSync(templatesDir, { recursive: true });
    }

    // Create templates
    if (framework.type === "sveltekit") {
      const customTemplatePath = join(templatesDir, "custom.svelte");
      if (!existsSync(customTemplatePath)) {
        const content = getTemplateContent("default");
        writeFileSync(customTemplatePath, content);
      }

      // Create template endpoint
      const endpointDir = join(projectRoot, "src/routes/api/seokit-html");
      const endpointPath = join(endpointDir, "+server.ts");
      if (!existsSync(endpointPath)) {
        mkdirSync(endpointDir, { recursive: true });
        writeFileSync(endpointPath, generateSvelteKitEndpoint());
      }
    } else {
      const templatePath = join(templatesDir, "OgDefault.html");
      if (!existsSync(templatePath)) {
        writeFileSync(templatePath, generateGenericTemplate());
      }
    }

    // Update .gitignore
    updateGitignore(projectRoot);

    // Install dependencies
    installDependencies(framework.type, projectRoot);

    // Success message
    console.log("\n✨ SeoKit initialized\n");
    console.log("Next steps:");
    console.log("  1. Update seokit.config.js");
    console.log("  2. Run: seokit dev\n");
  } catch (error) {
    handleCliError(error);
  }
}
