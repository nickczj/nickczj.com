import { defineEventHandler, setHeader } from 'h3'

const USERNAME = 'nickczj'
const GITHUB_API = 'https://api.github.com/graphql'
const CACHE_TTL = 5 * 60 * 1000

interface ContributionDay {
  contributionCount: number
  date: string
}

interface ContributionWeek {
  contributionDays: ContributionDay[]
}

interface GitHubResponse {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number
          weeks: ContributionWeek[]
        }
      }
    }
  }
}

interface CellData {
  level: number
  count: number
}

interface SuccessPayload {
  totalContributions: number
  streak: number
  longestStreak: number
  weeks: CellData[][]
  fetchedAt: string
}

interface ErrorPayload {
  unavailable: true
  error?: string
}

type Payload = SuccessPayload | ErrorPayload

let cache: { data: SuccessPayload; expiresAt: number } | null = null
let staleCache: { data: SuccessPayload } | null = null

function computeLevels(counts: number[]): [number, number, number] {
  const nonZero = counts.filter((c) => c > 0).sort((a, b) => a - b)
  if (nonZero.length === 0) return [0, 0, 0]
  const q1 = nonZero[Math.floor(nonZero.length * 0.25)]
  const q2 = nonZero[Math.floor(nonZero.length * 0.5)]
  const q3 = nonZero[Math.floor(nonZero.length * 0.75)]
  return [q1, q2, q3]
}

function levelForCount(count: number, q: [number, number, number]): number {
  if (count === 0) return 0
  if (count <= q[0]) return 1
  if (count <= q[1]) return 2
  if (count <= q[2]) return 3
  return 4
}

function computeStreak(days: { count: number; date: string }[]): number {
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  for (const day of sorted) {
    if (day.count > 0) streak++
    else break
  }
  return streak
}

function computeLongestStreak(days: { count: number; date: string }[]): number {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  let max = 0
  let current = 0
  for (const day of sorted) {
    if (day.count > 0) {
      current++
      if (current > max) max = current
    } else {
      current = 0
    }
  }
  return max
}

async function fetchContributions(token: string): Promise<SuccessPayload> {
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `

  const res = await fetch(GITHUB_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables: { username: USERNAME } })
  })

  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`)
  }

  const json = (await res.json()) as GitHubResponse

  if (!json.data?.user?.contributionsCollection?.contributionCalendar) {
    throw new Error('Unexpected GitHub API response shape')
  }

  const cal = json.data.user.contributionsCollection.contributionCalendar

  const allDays: { count: number; date: string }[] = []
  const weeks: CellData[][] = []

  let allCounts: number[] = []
  for (const week of cal.weeks) {
    const weekCells: CellData[] = []
    for (const day of week.contributionDays) {
      allDays.push({ count: day.contributionCount, date: day.date })
      allCounts.push(day.contributionCount)
      weekCells.push({ count: day.contributionCount, level: 0 })
    }
    weeks.push(weekCells)
  }

  const q = computeLevels(allCounts)

  for (const week of weeks) {
    for (const cell of week) {
      cell.level = levelForCount(cell.count, q)
    }
  }

  return {
    totalContributions: cal.totalContributions,
    streak: computeStreak(allDays),
    longestStreak: computeLongestStreak(allDays),
    weeks,
    fetchedAt: new Date().toISOString()
  }
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

  if (cache && Date.now() < cache.expiresAt) {
    return cache.data
  }

  const token = process.env.GITHUB_TOKEN
  if (!token) {
    if (staleCache) return { ...staleCache.data, stale: true }
    return { unavailable: true, error: 'GITHUB_TOKEN not configured' } satisfies ErrorPayload
  }

  try {
    const data = await fetchContributions(token)
    cache = { data, expiresAt: Date.now() + CACHE_TTL }
    staleCache = { data }
    return data
  } catch (e) {
    console.error('github/contributions error:', (e as Error).message)
    if (staleCache) return { ...staleCache.data, stale: true }
    return { unavailable: true, error: (e as Error).message } satisfies ErrorPayload
  }
})
