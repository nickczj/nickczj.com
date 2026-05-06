export interface Project {
  slug: string
  title: string
  description: string
  date: string
  status: 'active' | 'archived' | 'experimental'
  techs: string[]
  image?: string
  repo?: string
  live?: string
  draft: boolean
}

export const projects: Project[] = [
  {
    slug: 'homelab',
    title: 'Homelab',
    description: 'A Raspberry Pi 5 based homelab running Docker, Pi-hole, Homebridge, Tailscale, and various self-hosted services behind Traefik.',
    date: '2026-05-06',
    status: 'active',
    techs: ['Raspberry Pi 5', 'Docker', 'Traefik', 'Tailscale', 'Pi-hole', 'Homebridge', 'Nginx'],
    image: '/projects/homelab/rack.jpg',
    draft: false
  },
  {
    slug: 'fire-finance-math',
    title: 'FIRE Finance Math',
    description: 'Singapore-focused financial independence tools: CPF bonus interest calculator, SSB vs T-Bill comparison, and FIRE number projection with local cost-of-living defaults.',
    date: '2026-05-01',
    status: 'experimental',
    techs: ['Nuxt', 'TypeScript', 'LaTeX'],
    image: '/projects/fire-finance-math/screenshot.png',
    draft: false
  },
  {
    slug: 'esp32-heltec-wireless-paper',
    title: 'ESPHome for Heltec Wireless Paper',
    description: 'Adding ESPHome device support for the Heltec Wireless Paper e-ink display board, enabling Home Assistant integration for low-power dashboard displays.',
    date: '2026-04-15',
    status: 'active',
    techs: ['ESP32', 'ESPHome', 'C++', 'Home Assistant', 'E-Ink'],
    image: '/projects/esp32-heltec/device.jpg',
    repo: 'https://github.com/nickczj/esphome-heltec-wireless-paper',
    draft: false
  },
  {
    slug: 'esp32-eink-spectra6',
    title: 'DIY E-Ink Dashboard with Spectra 6',
    description: 'Building a custom e-ink information display from scratch using Waveshare Spectra 6 panels and ESP32, with a focus on low-power always-on dashboards.',
    date: '2026-03-20',
    status: 'experimental',
    techs: ['ESP32', 'Spectra 6', 'E-Ink', 'KiCad', '3D Printing'],
    image: '/projects/esp32-eink/prototype.jpg',
    draft: false
  }
]

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}

export const publishedProjects = projects.filter((p) => !p.draft)
