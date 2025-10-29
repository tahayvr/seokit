# SeoKit

> Dev tool for dynamic social media image generation and SEO

SeoKit makes it easy to generate beautiful Open Graph images for your web applications using your framework's native templating. Powered by Puppeteer for pixel-perfect rendering with full CSS support.

## Quick Start

### Installation

```bash
npm install -D seokit @seokit/svelte
```

### Initialize

```bash
npx seokit init
```

### Configure

Update `seokit.config.js` with your site details.

Choose from built-in templates:

- `default` - Modern gradient design
- `minimal` - Clean, minimalist light design
- `minimal-dark` - Clean, minimalist dark design
- `card` - Bold card-style with vibrant gradient
- `split` - Split-screen layout with colorful panel
- `retro` - Vintage with warm colors

```js
// seokit.config.js
export default {
  // ... other config
  template: "minimal", // Change this to use different templates
};
```

### Use in Your Pages

```svelte
<script>
  import SeoKit from '@seokit/svelte/SeoKit.svelte';
</script>

<SeoKit
  title="My Page"
  description="Page description"
  ogProps={{
    title: 'My Page',
    description: 'Beautiful OG image',
    siteName: 'My Site'
  }}
/>
```

## How It Works

SeoKit uses **Puppeteer** (headless Chromium) to render your templates with full CSS support:

1. Your framework renders the template to HTML/CSS
2. SeoKit loads the HTML in a headless browser page
3. Puppeteer captures a pixel-perfect screenshot
4. The PNG image is returned and cached

This approach provides:

- ✅ **Full CSS support** - Grid, Flexbox, pseudo-elements, animations
- ✅ **Pixel-perfect rendering** - Exactly what you see in the browser
- ✅ **Web fonts** - Automatic support for Google Fonts and custom fonts
- ✅ **Fast performance** - Page pooling and optimized load detection (~1s generation)

### Requirements

SeoKit requires **Chromium** to be available on your system. It's automatically installed with Puppeteer during setup.

For Docker deployments, ensure Chromium dependencies are installed (see MIGRATION.md for details).

### Run

Start your dev server and the Image Engine:

```bash
# Terminal 1
npm run dev

# Terminal 2
npx seokit dev
```

Visit `http://localhost:7357/og.png?title=Test&description=Hello` to see your generated image!

## Configuration

The `seokit.config.js` file supports Puppeteer-specific options:

```js
export default {
  baseUrl: "http://localhost:5173",
  defaults: {
    siteName: "My Site",
  },
  htmlSourceUrl: "http://localhost:5173/api/seokit-html",
  template: "default",

  // Optional Puppeteer configuration
  puppeteer: {
    headless: true, // Run in headless mode (default: true)
    poolSize: 2, // Number of concurrent browser pages (default: 2)
    timeout: 10000, // Page load timeout in ms (default: 10000)
  },
};
```

## Performance

- **Cold start**: ~2-3s (first image, includes browser launch)
- **Warm generation**: <1s (subsequent images with page pooling)
- **Concurrent requests**: Handled via page pool (configurable size)
- **Memory usage**: ~600MB active (includes Chromium process)

## Supported Frameworks

- ✅ **SvelteKit** - Full support with `@seokit/svelte`
- 🚧 **Next.js** - Coming soon
- 🚧 **Astro** - Coming soon
- 🚧 **Nuxt** - Coming soon

## Migration from Satori

If you're upgrading from a previous version that used Satori, see [MIGRATION.md](./MIGRATION.md) for details on:

- Removed font configuration requirements
- New Puppeteer configuration options
- Docker deployment considerations

## License

MIT
