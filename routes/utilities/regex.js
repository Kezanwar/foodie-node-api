/* eslint-disable no-useless-escape */
/* eslint-disable quotes */
export const matchAllCases = (str) => new RegExp(`^${str}$`, 'i')

export function createUrlFromString(str) {
  return str.replace(/\s+/g, '-').toLowerCase()
}
