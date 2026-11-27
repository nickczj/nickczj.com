// Hand-entered rates from May 2026. Not a live feed: wiring live rates is on
// the roadmap. Shown on /projects/fire-finance-math and by the homelab
// terminal's `yields` command.
export const SG_YIELDS_AS_OF = 'May 2026'

export const SG_YIELDS = [
  { id: 'ssb', label: 'Singapore Savings Bond, May 2026 issue', short: "ssb may'26", rate: '2.81%', change: '+0.02' },
  { id: 'tbill-6m', label: '6-month T-bill', short: '6m t-bill', rate: '3.04%', change: '−0.04' },
  { id: 'cpf-oa', label: 'CPF Ordinary Account', short: 'cpf oa', rate: '2.50%', change: '0.00' },
  { id: 'cpf-sa', label: 'CPF Special Account', short: 'cpf sa', rate: '4.04%', change: '+0.00' }
] as const
