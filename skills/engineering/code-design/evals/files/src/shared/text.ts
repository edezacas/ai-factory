export const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`

export const amount = (cents: number): string => {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')} EUR`
}

export const truncate = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`
