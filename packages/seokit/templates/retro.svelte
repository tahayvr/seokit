<script lang="ts">
  export let title: string = "Untitled";
  export let description: string = "";
  export let siteName: string = "";
</script>

<div class="og-container">
  <div class="noise-overlay"></div>

  <div class="content">
    {#if siteName}
      <div class="site-header">
        <span class="site-name">{siteName}</span>
      </div>
    {/if}

    <div class="title-wrapper">
      <div class="title-bg"></div>
      <h1 class="title">{title}</h1>
    </div>

    {#if description}
      <p class="description">{description}</p>
    {/if}

    <div class="decorative-dots">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
  </div>
</div>

<style>
  .og-container {
    width: 1200px;
    height: 630px;
    background: linear-gradient(180deg, #fef3c7 0%, #fde68a 100%);
    padding: 70px;
    box-sizing: border-box;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    position: relative;
    overflow: hidden;
  }

  .noise-overlay {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.03;
    pointer-events: none;
  }

  .content {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .site-header {
    display: flex;
    align-items: center;
  }

  .site-name {
    font-size: 22px;
    font-weight: 700;
    color: #78350f;
    letter-spacing: 0.5px;
  }

  .title-wrapper {
    position: relative;
    margin: 40px 0;
  }

  .title-bg {
    position: absolute;
    top: -20px;
    left: -30px;
    right: -30px;
    bottom: -20px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 20px;
    border: 3px solid #78350f;
    transform: rotate(-1deg);
  }

  .title {
    position: relative;
    font-size: 70px;
    font-weight: 900;
    margin: 0;
    line-height: 1.15;
    color: #78350f;
    letter-spacing: -0.02em;
    text-shadow: 2px 2px 0px rgba(245, 158, 11, 0.2);
  }

  .description {
    font-size: 26px;
    line-height: 1.5;
    color: #92400e;
    margin: 0;
    font-weight: 500;
    max-width: 800px;
  }

  .decorative-dots {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }

  .dot {
    width: 16px;
    height: 16px;
    background: #f59e0b;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
  }

  .dot:nth-child(2) {
    background: #d97706;
  }

  .dot:nth-child(3) {
    background: #b45309;
  }
</style>
