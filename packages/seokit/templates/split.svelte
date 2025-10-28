<script lang="ts">
  export let title: string = "Untitled";
  export let description: string = "";
  export let siteName: string = "";
</script>

<div class="og-container">
  <div class="split-layout">
    <div class="left-panel"></div>

    <div class="right-panel">
      {#if siteName}
        <div class="site-name">{siteName}</div>
      {/if}

      <h1 class="title">{title}</h1>

      {#if description}
        <p class="description">{description}</p>
      {/if}

      <div class="corner-accent"></div>
    </div>
  </div>
</div>

<style>
  .og-container {
    width: 1200px;
    height: 630px;
    background: #ffffff;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    position: relative;
    overflow: hidden;
  }

  .split-layout {
    display: flex;
    height: 100%;
  }

  .left-panel {
    width: 45%;
    background: linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #fb923c 100%);
  }

  .right-panel {
    width: 55%;
    padding: 80px 70px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    background: #ffffff;
  }

  .site-name {
    font-size: 18px;
    font-weight: 700;
    color: #ec4899;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin-bottom: 30px;
  }

  .title {
    font-size: 64px;
    font-weight: 900;
    margin: 0 0 25px 0;
    line-height: 1.1;
    color: #0f172a;
    letter-spacing: -0.03em;
  }

  .description {
    font-size: 24px;
    line-height: 1.6;
    color: #64748b;
    margin: 0;
    font-weight: 400;
  }

  .corner-accent {
    position: absolute;
    bottom: 60px;
    right: 60px;
    width: 80px;
    height: 80px;
    border-right: 6px solid #ec4899;
    border-bottom: 6px solid #ec4899;
  }
</style>
