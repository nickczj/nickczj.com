import { defineEventHandler, setHeader } from 'h3'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REFRESH_TOKEN not set')
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${auth}`
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString()
  })

  if (!res.ok) {
    throw new Error(`Spotify token exchange failed: ${res.status}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  }
  return cachedToken.token
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-cache')

  try {
    const token = await getAccessToken()
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.status === 204) {
      return { playing: false }
    }

    if (!res.ok) {
      throw new Error(`Spotify API returned ${res.status}`)
    }

    const track = (await res.json()) as {
      item: { name: string; artists: Array<{ name: string }>; external_urls: { spotify: string } }
    }

    return {
      playing: true,
      track: track.item.name,
      artist: track.item.artists.map((a) => a.name).join(', '),
      url: track.item.external_urls.spotify
    }
  } catch (e) {
    console.error('spotify/now error:', (e as Error).message)
    return { playing: false, error: true }
  }
})
