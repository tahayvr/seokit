// Template for SvelteKit Template Endpoint
// This file is scaffolded by `seokit init` to src/routes/api/seokit-html/+server.ts

export const templateEndpointCode = `import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { render } from 'svelte/server';

// Import all available templates
import DefaultTemplate from '$lib/seokit/templates/default.svelte';
import MinimalTemplate from '$lib/seokit/templates/minimal.svelte';
import MinimalDarkTemplate from '$lib/seokit/templates/minimal-dark.svelte';
import CardTemplate from '$lib/seokit/templates/card.svelte';
import SplitTemplate from '$lib/seokit/templates/split.svelte';
import RetroTemplate from '$lib/seokit/templates/retro.svelte';

// Template map for dynamic selection
const templates = {
  default: DefaultTemplate,
  minimal: MinimalTemplate,
  'minimal-dark': MinimalDarkTemplate,
  card: CardTemplate,
  split: SplitTemplate,
  retro: RetroTemplate,
};

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Extract query parameters
    const params = Object.fromEntries(url.searchParams);
    
    // Get template name from query params or use 'default'
    const templateName = params.template || 'default';
    delete params.template; // Remove template from props
    
    // Select the template
    const Template = templates[templateName as keyof typeof templates] || templates.default;

    // Render template to HTML
    const result = render(Template, {
      props: params,
    });

    // Return as JSON
    return json({
      html: result.html || result.body,
      css: result.css?.code || '',
    });
  } catch (error) {
    console.error('Template rendering error:', error);
    return json(
      { error: 'Failed to render template' },
      { status: 500 }
    );
  }
};
`;
