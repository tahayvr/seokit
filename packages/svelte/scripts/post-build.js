import { copyFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function postBuild() {
  try {
    // Copy Svelte component
    await copyFile(join("src", "SeoKit.svelte"), join("dist", "SeoKit.svelte"));

    // Generate type declaration for Svelte component
    const svelteTypeDef = `import { SvelteComponent } from 'svelte';

export interface SeoKitProps {
  title: string;
  description: string;
  canonical?: string;
  ogProps?: Record<string, string>;
}

export default class SeoKit extends SvelteComponent<SeoKitProps> {}
`;
    await writeFile(join("dist", "SeoKit.svelte.d.ts"), svelteTypeDef);
    console.log("✓ Svelte component and types copied");
  } catch (error) {
    console.error("Error in post-build:", error);
    process.exit(1);
  }
}

postBuild();
