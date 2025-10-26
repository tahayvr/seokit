// Default OgDefault.svelte template
// This file is scaffolded by `seokit init` to templates/OgDefault.svelte

export const ogDefaultTemplate = `<script lang="ts">
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
