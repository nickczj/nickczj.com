export interface GlossaryEntry {
  short: string
}

const glossary: Record<string, GlossaryEntry> = {
  'lactate-threshold': {
    short: 'The exercise intensity at which blood lactate begins to accumulate faster than it can be cleared — typically 75–85% of VO₂max in trained athletes.',
  },
  economy: {
    short: 'The oxygen cost of moving at a given submaximal pace. Two runners with identical VO₂max can differ by 20%+ in how much oxygen they need to hold 4 min/km.',
  },
  power: {
    short: 'The rate of force production, especially relevant for the final kick or hill surges. Distinct from strength — measured in watts, not kilograms.',
  },
}

export default glossary
