/* eslint-disable no-useless-escape */
/* eslint-disable quotes */
export const matchAllCases = (str) => new RegExp(`^${str}$`, 'i')

export const matchEmail = (str) => {
  const [a, b] = str.split('@')
  const c = a.split('+')[0]
  const [d, e] = b.split('.')
  return new RegExp(`^${c}\+[a-z0-9]+@${d}\.${e}$`, 'i')
}

export function createUrlFromString(str) {
  return str.replace(/\s+/g, '-').toLowerCase()
}
