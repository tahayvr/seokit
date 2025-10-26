<script>
  /** Page title for <title> tag */
  export let title;
  
  /** Meta description for search engines */
  export let description;
  
  /** Canonical URL for the page */
  export let canonical = undefined;
  
  /** Props to pass to the OG image template for dynamic generation */
  export let ogProps = {};
  
  /** URL of the Image Engine server (default: http://localhost:7357) */
  export let imageEngineUrl = 'http://localhost:7357';
  
  /** Static image URL to use instead of dynamic generation (e.g., "/og-default.png") */
  export let staticImage = undefined;

  // Use static image if provided, otherwise build dynamic OG image URL
  let ogImageUrl;
  if (staticImage) {
    ogImageUrl = staticImage;
  } else {
    const ogImageParams = new URLSearchParams(ogProps);
    ogImageUrl = `${imageEngineUrl}/og.png?${ogImageParams.toString()}`;
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />

  {#if canonical}
    <link rel="canonical" href={canonical} />
  {/if}

  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImageUrl} />
  <meta property="og:type" content="website" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImageUrl} />
</svelte:head>
