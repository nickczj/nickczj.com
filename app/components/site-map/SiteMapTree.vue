<script setup lang="ts">
import type { SiteMapNode } from '#shared/site-map'

// One level of the site map, drawn as a tree with dotted connector lines (a
// nod to the old Explorer-style site maps). Nested levels render recursively.
defineProps<{ nodes: SiteMapNode[] }>()
</script>

<template>
  <ul class="tree">
    <li v-for="node in nodes" :key="node.href ?? node.label">
      <a v-if="node.external" :href="node.href" target="_blank" rel="noopener">{{ node.label }}<span aria-hidden="true"> ↗</span></a>
      <NuxtLink v-else-if="node.href" :to="node.href">{{ node.label }}</NuxtLink>
      <span v-else>{{ node.label }}</span>
      <SiteMapTree v-if="node.children?.length" :nodes="node.children" />
    </li>
  </ul>
</template>

<style scoped>
.tree {
  margin: 0;
  padding: 0;
  list-style: none;
  line-height: 1.6;
}

.tree li {
  position: relative;
  padding-left: 1.4rem;
}

/* The trunk: runs the full height of each item, and stops at the elbow on the
   last one so the branch ends in an └ rather than a ├. */
.tree li::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0.4rem;
  border-left: 1px dotted var(--muted);
}

.tree li:last-child::before {
  bottom: auto;
  height: 0.8em;
}

/* The branch into each item, level with its first line of text. */
.tree li::after {
  content: '';
  position: absolute;
  top: 0.8em;
  left: 0.4rem;
  width: 0.7rem;
  border-top: 1px dotted var(--muted);
}

.tree a {
  text-decoration: none;
}

.tree a:hover {
  text-decoration: underline;
}
</style>
