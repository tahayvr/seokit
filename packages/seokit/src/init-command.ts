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
import {
  getTemplateContent,
  getAvailableTemplates,
  getTemplateDescription,
} from "./template-manager.js";

/**
 * Detects if the project uses TypeScript
 */
function detectTypeScript(projectRoot: string): boolean {
  // Check for tsconfig.json
  if (existsSync(join(projectRoot, "tsconfig.json"))) {
    return true;
  }

  // Check package.json for TypeScript dependency
  const packageJsonPath = join(projectRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      if (deps.typescript) {
        return true;
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  return false;
}

/**
 * Generates the seokit.config.js template (works for both TS and JS projects)
 */
function generateConfigTemplateJS(): string {
  return `/** @type {import('seokit').SeoKitConfig} */
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

  // Template to use for OG images (optional)
  // Options: 'default', 'minimal', 'minimal-dark', 'card', 'split', 'retro'
  // Or use a custom template by specifying the filename (e.g., 'MyCustomTemplate')
  template: "default",

  // Font configuration for Satori
  fonts: [
    {
      name: "Inter",
      path: "./fonts/Inter-Regular.ttf",
      weight: 400,
      style: "normal",
    },
    {
      name: "Inter",
      path: "./fonts/Inter-Bold.ttf",
      weight: 700,
      style: "normal",
    },
  ],

  // Image Engine server configuration (optional)
  server: {
    port: 7357,
    host: "localhost",
  },

  // Image generation options (optional)
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
 * Generates the default OG template for SvelteKit (TypeScript)
 */
function generateSvelteKitTemplateTS(): string {
  return `<script lang="ts">
  export let title: string = 'Untitled';
  export let description: string = '';
  export let siteName: string = '';
</script>

<div class="og-container">
  <div class="content">
    {#if siteName}
      <div class="site-name">{siteName}</div>
    {/if}
    <h1 class="title">{title}</h1>
    {#if description}
      <p class="description">{description}</p>
    {/if}
  </div>
</div>

<style>
  .og-container {
    width: 1200px;
    height: 630px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 80px;
    box-sizing: border-box;
  }

  .content {
    color: white;
  }

  .site-name {
    font-size: 24px;
    opacity: 0.9;
    margin-bottom: 20px;
  }

  .title {
    font-size: 64px;
    font-weight: bold;
    margin: 0 0 20px 0;
    line-height: 1.2;
  }

  .description {
    font-size: 32px;
    opacity: 0.9;
    margin: 0;
  }
</style>
`;
}

/**
 * Generates the default OG template for SvelteKit (JavaScript)
 */
function generateSvelteKitTemplateJS(): string {
  return `<script>
  export let title = 'Untitled';
  export let description = '';
  export let siteName = '';
</script>

<div class="og-container">
  <div class="content">
    {#if siteName}
      <div class="site-name">{siteName}</div>
    {/if}
    <h1 class="title">{title}</h1>
    {#if description}
      <p class="description">{description}</p>
    {/if}
  </div>
</div>

<style>
  .og-container {
    width: 1200px;
    height: 630px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 80px;
    box-sizing: border-box;
  }

  .content {
    color: white;
  }

  .site-name {
    font-size: 24px;
    opacity: 0.9;
    margin-bottom: 20px;
  }

  .title {
    font-size: 64px;
    font-weight: bold;
    margin: 0 0 20px 0;
    line-height: 1.2;
  }

  .description {
    font-size: 32px;
    opacity: 0.9;
    margin: 0;
  }
</style>
`;
}

/**
 * Generates the Template Endpoint for SvelteKit
 */
function generateSvelteKitEndpoint(): string {
  return `import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { render } from "svelte/server";

// Import all available templates
import DefaultTemplate from "$lib/seokit/templates/default.svelte";
import MinimalTemplate from "$lib/seokit/templates/minimal.svelte";
import MinimalDarkTemplate from "$lib/seokit/templates/minimal-dark.svelte";
import CardTemplate from "$lib/seokit/templates/card.svelte";
import SplitTemplate from "$lib/seokit/templates/split.svelte";
import RetroTemplate from "$lib/seokit/templates/retro.svelte";

// Template map for dynamic selection
const templates = {
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
      console.log("✓ Updated .gitignore");
    } else {
      console.log("✓ .gitignore already contains seokit-assets entry");
    }
  } else {
    writeFileSync(gitignorePath, `${entry}\n`);
    console.log("✓ Created .gitignore");
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

  // Add framework-specific helper
  if (frameworkType === "sveltekit") {
    packages.push("@seokit/svelte");
  }

  console.log(`\nInstalling dependencies with ${packageManager}...`);

  try {
    const installCmd =
      packageManager === "npm"
        ? `npm install --save-dev ${packages.join(" ")}`
        : packageManager === "yarn"
        ? `yarn add --dev ${packages.join(" ")}`
        : `pnpm add -D ${packages.join(" ")}`;

    execSync(installCmd, { cwd: projectRoot, stdio: "inherit" });
    console.log("✓ Dependencies installed");
  } catch (error) {
    console.error("✗ Failed to install dependencies");
    console.error("  Please run manually:");
    console.error(
      `  ${packageManager} ${
        packageManager === "npm" ? "install --save-dev" : "add -D"
      } ${packages.join(" ")}`
    );
  }
}

/**
 * Main init command implementation
 */
export async function initCommand(): Promise<void> {
  try {
    const projectRoot = process.cwd();

    console.log("🚀 Initializing SeoKit...\n");

    // Detect framework
    const framework = detectFramework(projectRoot);
    console.log(`Detected framework: ${framework.name}`);

    if (framework.type === "unknown") {
      console.log(
        "⚠️  No supported framework detected. Creating generic template.\n"
      );
    }

    // Always create .js config (works for both TS and JS projects with JSDoc)
    const configPath = join(projectRoot, "seokit.config.js");
    const tsConfigPath = join(projectRoot, "seokit.config.ts");

    // Check if config already exists (either .js or .ts)
    if (existsSync(configPath)) {
      console.log("⚠️  seokit.config.js already exists, skipping...");
    } else if (existsSync(tsConfigPath)) {
      console.log("⚠️  seokit.config.ts already exists, skipping...");
    } else {
      writeFileSync(configPath, generateConfigTemplateJS());
      console.log("✓ Created seokit.config.js");
    }

    // Detect TypeScript for template generation
    const useTypeScript = detectTypeScript(projectRoot);

    // Determine templates directory based on framework
    let templatesDir: string;
    let templatesRelativePath: string;

    if (framework.type === "sveltekit") {
      // SvelteKit: src/lib/seokit/templates
      templatesDir = join(projectRoot, "src/lib/seokit/templates");
      templatesRelativePath = "src/lib/seokit/templates";
    } else {
      // Other frameworks: templates/ in root
      templatesDir = join(projectRoot, "templates");
      templatesRelativePath = "templates";
    }

    // Create templates directory
    if (!existsSync(templatesDir)) {
      mkdirSync(templatesDir, { recursive: true });
      console.log(`✓ Created ${templatesRelativePath}/ directory`);
    }

    // Create framework-specific template
    const templateExt = framework.type === "sveltekit" ? "svelte" : "html";
    const templatePath = join(templatesDir, `OgDefault.${templateExt}`);

    if (existsSync(templatePath)) {
      console.log(
        `⚠️  ${templatesRelativePath}/OgDefault.${templateExt} already exists, skipping...`
      );
    } else {
      let templateContent: string;
      if (framework.type === "sveltekit") {
        // Use the built-in 'default' template
        try {
          templateContent = getTemplateContent("default");
          console.log("Using built-in 'default' template");
        } catch (error) {
          // Fallback to generated template if built-in not found
          templateContent = useTypeScript
            ? generateSvelteKitTemplateTS()
            : generateSvelteKitTemplateJS();
        }
      } else {
        templateContent = generateGenericTemplate();
      }
      writeFileSync(templatePath, templateContent);
      console.log(
        `✓ Created ${templatesRelativePath}/OgDefault.${templateExt}`
      );
    }

    // Copy all built-in templates for easy access
    if (framework.type === "sveltekit") {
      const availableTemplates = getAvailableTemplates();
      console.log("\nCopying built-in templates...");
      for (const template of availableTemplates) {
        const destPath = join(templatesDir, `${template}.svelte`);
        if (!existsSync(destPath)) {
          try {
            const content = getTemplateContent(template);
            writeFileSync(destPath, content);
            console.log(
              `  ✓ ${template}.svelte - ${getTemplateDescription(template)}`
            );
          } catch (error) {
            console.log(`  ⚠️  Failed to copy ${template}.svelte`);
          }
        }
      }
    }

    // Create framework-specific endpoint
    if (framework.type === "sveltekit") {
      const endpointDir = join(projectRoot, "src/routes/api/seokit-html");
      if (!existsSync(endpointDir)) {
        mkdirSync(endpointDir, { recursive: true });
      }

      const endpointPath = join(endpointDir, "+server.ts");
      if (existsSync(endpointPath)) {
        console.log("⚠️  Template Endpoint already exists, skipping...");
      } else {
        writeFileSync(endpointPath, generateSvelteKitEndpoint());
        console.log(
          "✓ Created Template Endpoint at src/routes/api/seokit-html/+server.ts"
        );
      }
    }

    // Update .gitignore
    updateGitignore(projectRoot);

    // Install dependencies
    installDependencies(framework.type, projectRoot);

    // Display success message
    console.log("\n✨ SeoKit initialized successfully!\n");
    console.log("Next steps:");
    console.log("  1. Update seokit.config.js with your site details");
    console.log("  2. Add font files to your project (referenced in config)");
    console.log("  3. Start your dev server");
    console.log("  4. Run: seokit dev");

    if (framework.type === "sveltekit") {
      console.log("\nFor SvelteKit, use the <SeoKit> component in your pages:");
      console.log(
        '  <SeoKit title="Page Title" description="..." ogProps={{ title: "..." }} />'
      );
      console.log("\n📐 Available templates:");
      console.log(
        "  Change the 'template' field in seokit.config.js to use different designs:"
      );
      const templates = getAvailableTemplates();
      templates.forEach((template) => {
        console.log(`  - '${template}' - ${getTemplateDescription(template)}`);
      });
      console.log(
        `\n  All templates are in ${templatesRelativePath}/ - customize them as needed!`
      );
    } else if (framework.type === "unknown") {
      console.log("\n⚠️  Manual setup required:");
      console.log(
        "  - Create a server endpoint that renders templates/OgDefault.html"
      );
      console.log("  - Return JSON: { html: string, css?: string }");
      console.log("  - Update htmlSourceUrl in seokit.config.js");
    }

    console.log("\nDocumentation: https://github.com/tahayvr/seokit\n");
  } catch (error) {
    // Use the CLI error formatter for user-friendly error messages
    handleCliError(error);
  }
}
