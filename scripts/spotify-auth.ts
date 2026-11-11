#!/usr/bin/env bun
// Re-authorize Spotify and update SPOTIFY_REFRESH_TOKEN in .env.
//
//   1. bun run scripts/spotify-auth.ts
//   2. Open the printed URL, approve access, then copy the `code` parameter
//      from the https://nickczj.com/callback?code=... URL.
//   3. bun run scripts/spotify-auth.ts <code>
//   4. Push the new token to Cloudflare Pages:
//      bunx wrangler pages secret put SPOTIFY_REFRESH_TOKEN --project-name nickczj-com
import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const REDIRECT_URI = 'https://nickczj.com/callback'
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state']
const envPath = new URL('../.env', import.meta.url)

const clientId = process.env.SPOTIFY_CLIENT_ID
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env')
  process.exit(1)
}

const code = process.argv[2]

if (!code) {
  const url = new URL('https://accounts.spotify.com/authorize')
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    state: randomBytes(16).toString('hex')
  }).toString()

  console.log(url.toString())
  console.log('\nAfter approving, copy the code parameter from the callback URL and run:')
  console.log('  bun run scripts/spotify-auth.ts <code>')
  process.exit(0)
}

const res = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI
  }).toString()
})

const body = await res.text()

if (!res.ok) {
  console.error(`Spotify token exchange failed: HTTP ${res.status}`)
  console.error(body.replace(/"access_token":"[^"]+"/, '"access_token":"<redacted>"').slice(0, 500))
  process.exit(1)
}

const data = JSON.parse(body) as { refresh_token?: string }
if (!data.refresh_token) {
  console.error('Spotify did not return a refresh token. Re-run the authorization flow.')
  process.exit(1)
}

const env = await readFile(envPath, 'utf8')
const next = /^SPOTIFY_REFRESH_TOKEN=/m.test(env)
  ? env.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, `SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`)
  : `${env.replace(/\s*$/, '')}\nSPOTIFY_REFRESH_TOKEN=${data.refresh_token}\n`

await writeFile(envPath, next)

console.log('Updated SPOTIFY_REFRESH_TOKEN in .env.')
console.log('Next: bunx wrangler pages secret put SPOTIFY_REFRESH_TOKEN --project-name nickczj-com')
