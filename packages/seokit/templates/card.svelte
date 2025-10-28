<script lang="ts">
  export let title: string = "Untitled";
  export let description: string = "";
  export let siteName: string = "";
</script>

<div class="og-container">
  <div class="content">
    <div class="card">
      {#if siteName}
        <div class="site-tag">
          {siteName}
        </div>
      {/if}

      <h1 class="title">{title}</h1>

      {#if description}
        <p class="description">{description}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .og-container {
    width: 1200px;
    height: 630px;
    background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px;
    box-sizing: border-box;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    position: relative;
    overflow: hidden;
  }

  .content {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 950px;
  }

  .card {
    background: rgba(255, 255, 255, 0.98);
    border-radius: 32px;
    padding: 70px 80px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.5) inset;
    backdrop-filter: blur(20px);
  }

  .site-tag {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #dc2626;
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 30px;
    padding: 10px 20px;
    background: rgba(220, 38, 38, 0.1);
    border-radius: 12px;
  }

  .title {
    font-size: 68px;
    font-weight: 900;
    margin: 0 0 25px 0;
    line-height: 1.1;
    color: #1a1a1a;
    letter-spacing: -0.02em;
  }

  .description {
    font-size: 28px;
    line-height: 1.5;
    color: #4a5568;
    margin: 0;
    font-weight: 400;
  }
</style>
