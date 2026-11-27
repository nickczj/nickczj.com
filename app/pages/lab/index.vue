<script setup lang="ts">
// Homepage experiments. Everything under app/pages/lab/ exists on the dev
// server only: nuxt.config.ts ignores this folder in production builds.
definePageMeta({ layout: false })

useSeoMeta({ title: 'Lab | nickczj.com', robots: 'noindex' })

const experiments = useRouter().getRoutes()
  .filter((route) => route.path.startsWith('/lab/'))
  .map((route) => route.path)
  .sort()
</script>

<template>
  <main class="lab">
    <p class="eyebrow">Dev server only</p>
    <h1>Lab</h1>
    <p class="lede">Homepage experiments. Production builds leave this folder out, so try anything.</p>

    <ul v-if="experiments.length" class="lab-list">
      <li v-for="path in experiments" :key="path">
        <NuxtLink :to="path">{{ path.replace('/lab/', '') }}</NuxtLink>
      </li>
    </ul>

    <section class="lab-notes" aria-label="How the lab works">
      <p>New experiment: add <code>app/pages/lab/&lt;name&gt;.vue</code> with <code>definePageMeta({ layout: false })</code> for a bare canvas, or leave it out to keep the site header.</p>
      <p>Reference images: anything in <code>.design-refs/</code> is served at <code>/_refs/</code> in dev, for example <code>/_refs/stars.png</code>. The folder is gitignored, so it never ships.</p>
      <p>On your phone: run <code>bun run dev --host</code> and open the Network URL it prints.</p>
      <p>When one sticks, move it to <code>app/pages/index.vue</code>, along with any images it needs (into <code>public/</code>, if their licence allows).</p>
    </section>
  </main>
</template>

<style scoped>
.lab {
  display: grid;
  gap: 1rem;
  box-sizing: border-box;
  width: min(100% - 2rem, 44rem);
  margin: 0 auto;
  padding: 3rem 0 5rem;
}

.lab-list {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 1rem 0;
  border-block: 1px solid var(--rule);
  list-style: none;
  font-size: 1.1rem;
  font-weight: 650;
}

.lab-notes {
  color: var(--lede);
  font-size: 0.95rem;
}

.lab-notes p {
  margin: 0 0 0.6rem;
}

code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.88em;
}
</style>
