import { defineCollection, defineContentConfig, z } from '@nuxt/content'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: dateSchema,
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false)
      }),
      indexes: [
        { columns: ['date'] },
        { columns: ['draft'] }
      ]
    }),
    now: defineCollection({
      type: 'page',
      source: 'now/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: dateSchema,
        summary: z.string(),
        draft: z.boolean().default(false)
      }),
      indexes: [
        { columns: ['date'] },
        { columns: ['draft'] }
      ]
    })
  }
})
