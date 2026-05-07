export interface Source {
  authors: string
  year: number
  title: string
  edition?: string
  publisher?: string
  venue?: string
  pages?: string
  url?: string
}

const sources: Record<string, Source> = {
  astrand1986: {
    authors: 'Åstrand, P-O. & Rodahl, K.',
    year: 1986,
    title: 'Textbook of Work Physiology',
    edition: '3rd ed.',
    publisher: 'McGraw-Hill',
    pages: '295–353',
  },

  fick1870: {
    authors: 'Fick, A.',
    year: 1870,
    title: 'Über die Messung des Blutquantums in den Herzventrikeln',
    venue: 'Sitzungsberichte der Physikalisch-Medizinischen Gesellschaft zu Würzburg',
  },
}

export default sources
