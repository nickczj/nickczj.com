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
  description: 'Technical notes on software, infrastructure, homelab work, and Singapore finance tools.'
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <p class="eyebrow">Notes</p>
      <h1>Blog</h1>
      <p class="lede">
        Technical write-ups from the workbench: distributed systems, infra decisions, migrations, homelab notes, and Singapore finance math.
      </p>
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
