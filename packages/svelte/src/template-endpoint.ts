// Template for SvelteKit Template Endpoint
// This file is scaffolded by `seokit init` to src/routes/api/seokit-html/+server.ts

export const templateEndpointCode = `import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { render } from 'svelte/server';

// Import the user's template
import OgTemplate from '../../../../templates/OgDefault.svelte';

export const GET: RequestHandler = async ({ url }) => {
  try {
    // Extract query parameters
    const params = Object.fromEntries(url.searchParams);

    // Render template to HTML
    const result = render(OgTemplate, {
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
