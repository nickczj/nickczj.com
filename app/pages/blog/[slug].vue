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
      <p class="eyebrow">Blog</p>
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
