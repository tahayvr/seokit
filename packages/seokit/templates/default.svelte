<script lang="ts">
  export let title: string = "Untitled";
  export let description: string = "";
  export let siteName: string = "";
</script>

<div
  style="width: 1200px; height: 630px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0f172a, #1e293b, #334155); padding: 80px; position: relative; overflow: hidden;"
>
  <!-- Decorative elements -->
  <div
    style="position: absolute; width: 500px; height: 500px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); opacity: 0.3; top: -200px; right: -100px;"
  ></div>
  <div
    style="position: absolute; width: 400px; height: 400px; border-radius: 50%; background: linear-gradient(135deg, #06b6d4, #3b82f6); opacity: 0.3; bottom: -150px; left: -100px;"
  ></div>
  <div
    style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px); background-size: 50px 50px;"
  ></div>

  <div
    style="display: flex; flex-direction: column; position: relative; max-width: 900px; width: 100%;"
  >
    {#if siteName}
      <div
        style="display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, 0.1); padding: 12px 24px; border-radius: 100px; margin-bottom: 40px; border: 1px solid rgba(255, 255, 255, 0.2);"
      >
        <div
          style="width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); box-shadow: 0 0 12px rgba(59, 130, 246, 0.6);"
        ></div>
        <span
          style="font-size: 20px; font-weight: 600; color: rgba(255, 255, 255, 0.95); letter-spacing: 0.5px; text-transform: uppercase;"
          >{siteName}</span
        >
      </div>
    {/if}

    <h1
      style="font-size: 72px; font-weight: 800; margin: 0 0 30px 0; line-height: 1.1; color: #ffffff; letter-spacing: -0.02em; background: linear-gradient(135deg, #ffffff, #e2e8f0); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent;"
    >
      {title}
    </h1>

    {#if description}
      <p
        style="font-size: 28px; line-height: 1.5; color: rgba(255, 255, 255, 0.75); margin: 0 0 50px 0; font-weight: 400;"
      >
        {description}
      </p>
    {/if}

    <div style="display: flex; align-items: center; gap: 20px;">
      <div
        style="height: 4px; width: 120px; background: linear-gradient(90deg, #3b82f6, #8b5cf6);"
      ></div>
    </div>
  </div>
</div>
