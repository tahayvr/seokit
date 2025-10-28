<script lang="ts">
  export let title: string = "Untitled";
  export let description: string = "";
  export let siteName: string = "";
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
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 100px;
    box-sizing: border-box;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  .content {
    max-width: 900px;
  }

  .site-name {
    font-size: 20px;
    font-weight: 500;
    color: #999999;
    margin-bottom: 40px;
    letter-spacing: 1px;
  }

  .title {
    font-size: 72px;
    font-weight: 600;
    margin: 0 0 30px 0;
    line-height: 1.1;
    color: #000000;
    letter-spacing: -0.02em;
  }

  .description {
    font-size: 26px;
    line-height: 1.5;
    color: #666666;
    margin: 0;
    font-weight: 400;
  }
</style>
