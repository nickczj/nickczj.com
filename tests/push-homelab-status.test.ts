import { describe, expect, test } from 'bun:test'
import {
  parseCpuStat,
  parseDockerInspect,
  parseLoadAverage,
  parseMemoryPercent,
  parseSensorsTemperature,
  parseUptimeSeconds
} from '../scripts/push-homelab-status'

describe('homelab pusher parsers', () => {
  test('parses cpu stat totals', () => {
    expect(parseCpuStat('cpu  100 0 50 850 0 0 0 0 0 0\n')?.total).toBe(1000)
    expect(parseCpuStat('cpu  100 0 50 850 0 0 0 0 0 0\n')?.idle).toBe(850)
  })

  test('parses memory percent from meminfo', () => {
    const percent = parseMemoryPercent([
      'MemTotal:       1000000 kB',
      'MemAvailable:    250000 kB'
    ].join('\n'))

    expect(percent).toBe(75)
  })

  test('parses load and uptime', () => {
    expect(parseLoadAverage('1.23 0.75 0.50 1/200 12345')).toBe(1.23)
    expect(parseUptimeSeconds('123.45 67.89')).toBe(123.45)
  })

  test('parses max sensor temperature', () => {
    const temp = parseSensorsTemperature(JSON.stringify({
      coretemp: {
        'Package id 0': { temp1_input: 51.5 },
        'Core 0': { temp2_input: 48.1 }
      },
      nvme: {
        Composite: { temp1_input: 44 }
      }
    }))

    expect(temp).toBe(51.5)
  })

  test('maps docker inspect output to service states', () => {
    const startedAt = new Date(Date.now() - 90_000).toISOString()
    const output = [
      JSON.stringify({ Name: '/traefik', State: { Running: true, StartedAt: startedAt } }),
      JSON.stringify({ Name: '/jellyfin', State: { Running: true, StartedAt: startedAt, Health: { Status: 'starting' } } }),
      JSON.stringify({ Name: '/grafana', State: { Running: false } })
    ].join('\n')

    const services = parseDockerInspect(output, ['traefik', 'grafana', 'jellyfin', 'cf-tunnel'])
    expect(services.map((service) => [service.name, service.state, service.detail])).toEqual([
      ['traefik', 'up', 'up'],
      ['grafana', 'down', 'down'],
      ['jellyfin', 'slow', 'starting'],
      ['cf-tunnel', 'down', 'not found']
    ])
  })
})
