// Default OgDefault.svelte template
// This file is scaffolded by `seokit init` to templates/OgDefault.svelte

export const ogDefaultTemplate = `<script lang="ts">
  export let title: string = 'Untitled';
  export let description: string = '';
  export let siteName: string = '';
</script>

<div class="og-container">
  <!-- Decorative elements -->
  <div class="gradient-orb orb-1"></div>
  <div class="gradient-orb orb-2"></div>
  <div class="grid-pattern"></div>
  
  <div class="content-wrapper">
    {#if siteName}
      <div class="site-badge">
        <div class="badge-dot"></div>
        <span class="site-name">{siteName}</span>
      </div>
    {/if}
    
    <h1 class="title">{title}</h1>
    
    {#if description}
      <p class="description">{description}</p>
    {/if}
    
    <div class="bottom-bar">
      <div class="accent-line"></div>
    </div>
  </div>
</div>

<style>
  .og-container {
    width: 1200px;
    height: 630px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
    padding: 80px;
    box-sizing: border-box;
    position: relative;
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
  }

  /* Decorative gradient orbs */
  .gradient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.3;
    pointer-events: none;
  }

  .orb-1 {
    width: 500px;
    height: 500px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    top: -200px;
    right: -100px;
  }

  .orb-2 {
    width: 400px;
    height: 400px;
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
    bottom: -150px;
    left: -100px;
  }

  /* Subtle grid pattern */
  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
  }

  .content-wrapper {
    position: relative;
    z-index: 1;
    max-width: 900px;
    width: 100%;
  }

  .site-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 12px 24px;
    border-radius: 100px;
    margin-bottom: 40px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .badge-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);
  }

  .site-name {
    font-size: 20px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .title {
    font-size: 72px;
    font-weight: 800;
    margin: 0 0 30px 0;
    line-height: 1.1;
    color: #ffffff;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .description {
    font-size: 28px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.75);
    margin: 0 0 50px 0;
    font-weight: 400;
  }

  .bottom-bar {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .accent-line {
    height: 4px;
    width: 120px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6, transparent);
    border-radius: 2px;
  }
</style>
`;
