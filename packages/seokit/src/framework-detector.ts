import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type FrameworkType = "sveltekit" | "next" | "astro" | "nuxt" | "unknown";

export interface FrameworkInfo {
  type: FrameworkType;
  version?: string;
  name: string;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Detects the web framework used in the project by examining package.json
 * @param projectRoot - The root directory of the project (defaults to current working directory)
 * @returns Framework information including type, version, and display name
 */
export function detectFramework(
  projectRoot: string = process.cwd()
): FrameworkInfo {
  const packageJsonPath = join(projectRoot, "package.json");

  // Check if package.json exists
  if (!existsSync(packageJsonPath)) {
    return {
      type: "unknown",
      name: "Unknown",
    };
  }

  try {
    // Read and parse package.json
    const packageJsonContent = readFileSync(packageJsonPath, "utf-8");
    const packageJson: PackageJson = JSON.parse(packageJsonContent);

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    // Check for SvelteKit
    if (allDeps["@sveltejs/kit"]) {
      return {
        type: "sveltekit",
        version: allDeps["@sveltejs/kit"],
        name: "SvelteKit",
      };
    }

    // Check for Next.js
    if (allDeps["next"]) {
      return {
        type: "next",
        version: allDeps["next"],
        name: "Next.js",
      };
    }

    // Check for Astro
    if (allDeps["astro"]) {
      return {
        type: "astro",
        version: allDeps["astro"],
        name: "Astro",
      };
    }

    // Check for Nuxt
    if (allDeps["nuxt"]) {
      return {
        type: "nuxt",
        version: allDeps["nuxt"],
        name: "Nuxt",
      };
    }

    // No supported framework detected
    return {
      type: "unknown",
      name: "Unknown",
    };
  } catch (error) {
    // Error reading or parsing package.json
    console.error(`Error reading package.json: ${error}`);
    return {
      type: "unknown",
      name: "Unknown",
    };
  }
}
