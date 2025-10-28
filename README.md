# SeoKit

> Dev tool for dynamic social media image generation and SEO

SeoKit makes it easy to generate beautiful Open Graph images for your web applications using your framework's native templating. No browser required, blazingly fast, and developer-friendly.

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

Update `seokit.config.js` with your site details and add a font file.

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

### Run

Start your dev server and the Image Engine:

```bash
# Terminal 1
npm run dev

# Terminal 2
npx seokit dev
```

Visit `http://localhost:7357/og.png?title=Test&description=Hello` to see your generated image!

## Supported Frameworks

- ✅ **SvelteKit** - Full support with `@seokit/svelte`
- 🚧 **Next.js** - Coming soon
- 🚧 **Astro** - Coming soon
- 🚧 **Nuxt** - Coming soon

## License

MIT
