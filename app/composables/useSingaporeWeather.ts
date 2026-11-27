// WMO weather interpretation codes used by Open-Meteo.
const CONDITIONS: Record<number, string> = {
  0: 'clear',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
  61: 'rain', 63: 'rain', 65: 'heavy rain',
  80: 'rain showers', 81: 'rain showers', 82: 'heavy showers',
  95: 'thunderstorm', 96: 'thunderstorm', 99: 'thunderstorm'
}

const SINGAPORE = { latitude: 1.3521, longitude: 103.8198 }

export type SingaporeWeather = {
  temperature: number
  condition: string
  pm25: number | null
}

type ForecastResponse = { current?: { temperature_2m?: number; weather_code?: number } }
type AirQualityResponse = { current?: { pm2_5?: number } }

/**
 * Current Singapore weather and PM2.5 from Open-Meteo, fetched in the browser
 * on mount and every five minutes after. Stays null if Open-Meteo is down.
 */
export function useSingaporeWeather(options: { refreshMs?: number } = {}) {
  const weather = ref<SingaporeWeather | null>(null)

  async function load() {
    const [forecast, air] = await Promise.allSettled([
      $fetch<ForecastResponse>('https://api.open-meteo.com/v1/forecast', {
        query: { ...SINGAPORE, current: 'temperature_2m,weather_code' }
      }),
      $fetch<AirQualityResponse>('https://air-quality-api.open-meteo.com/v1/air-quality', {
        query: { ...SINGAPORE, current: 'pm2_5' }
      })
    ])

    const current = forecast.status === 'fulfilled' ? forecast.value.current : undefined
    if (typeof current?.temperature_2m !== 'number') return

    const pm25 = air.status === 'fulfilled' ? air.value.current?.pm2_5 : undefined
    weather.value = {
      temperature: Math.round(current.temperature_2m),
      condition: CONDITIONS[current.weather_code ?? -1] ?? 'unknown',
      pm25: typeof pm25 === 'number' ? Math.round(pm25) : null
    }
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    load()
    timer = setInterval(load, options.refreshMs ?? 300_000)
  })
  onBeforeUnmount(() => clearInterval(timer))

  return { weather }
}
