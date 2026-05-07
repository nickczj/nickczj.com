<script setup lang="ts">
const route = useRoute()
const slug = Array.isArray(route.params.slug) ? route.params.slug.join('/') : route.params.slug
const postPath = `/blog/${slug}`

const dateFormatter = new Intl.DateTimeFormat('en-SG', {
  dateStyle: 'medium',
  timeZone: 'UTC'
})

const formatDate = (value: string) => dateFormatter.format(new Date(`${value}T00:00:00.000Z`))

const { data: post } = await useAsyncData(`blog-post-${postPath}`, () => {
  return queryCollection('blog')
    .path(postPath)
    .where('draft', '=', false)
    .first()
})

if (!post.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Post not found'
  })
}

useSeoMeta({
  title: () => post.value ? `${post.value.title} | nickczj.com` : 'Blog | nickczj.com',
  description: () => post.value?.description ?? 'Technical notes from nickczj.com.'
})
</script>

<template>
  <article v-if="post" class="page">
    <NuxtLink class="back-link" to="/blog">Back to blog</NuxtLink>

    <header class="page-header">
      <p class="eyebrow ornament" aria-hidden="true">
        <svg width="42" height="5" viewBox="0 0 42 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 2.5h16l3-2 3 2h20" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </p>
      <h1>{{ post.title }}</h1>
      <div class="entry-meta">
        <time :datetime="post.date">{{ formatDate(post.date) }}</time>
        <span v-if="post.tags.length" class="tag-list" aria-label="Tags">
          <span v-for="tag in post.tags" :key="tag" class="tag">{{ tag }}</span>
        </span>
      </div>
      <p class="lede">{{ post.description }}</p>
    </header>

    <ContentRenderer class="prose" :value="post" />
  </article>
</template>

<style scoped>
h1 {
  font-size: clamp(1.5rem, 3.5vw, 2.2rem);
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
