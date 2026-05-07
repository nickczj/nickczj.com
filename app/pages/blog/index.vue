<script setup lang="ts">
const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium',
  timeZone: 'UTC'
})

const formatDate = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00.000Z`))

const { data: posts } = await useAsyncData('blog-posts', () => {
  return queryCollection('blog')
    .where('draft', '=', false)
    .order('date', 'DESC')
    .all()
})

useSeoMeta({
  title: 'Blog | nickczj.com',
  description: 'Technical notes on software, infrastructure, homelab work, and anything else on my mind..'
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <p class="eyebrow ornament" aria-hidden="true">
        <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </p>
      <h1>Blog</h1>
    </header>

    <ul v-if="posts?.length" class="entry-list">
      <li v-for="post in posts" :key="post.path" class="entry-card">
        <div class="entry-meta">
          <time :datetime="post.date">{{ formatDate(post.date) }}</time>
          <span v-if="post.tags.length" class="tag-list" aria-label="Tags">
            <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
          </span>
        </div>
        <h2>
          <NuxtLink :to="post.path">{{ post.title }}</NuxtLink>
        </h2>
        <p>{{ post.description }}</p>
      </li>
    </ul>

    <div v-else class="empty-state">
      <p>No published posts yet. Draft outlines are in the repo so the writing can start from real topics instead of a blank page.</p>
    </div>
  </section>
</template>

<style scoped>
h1 {
  font-size: clamp(1.8rem, 5vw, 3rem);
}

.eyebrow.ornament svg {
  stroke-dasharray: 54;
  stroke-dashoffset: 54;
  animation: draw-ornament 0.9s ease-out forwards;
  animation-delay: 0.15s;
}

@keyframes draw-ornament {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
