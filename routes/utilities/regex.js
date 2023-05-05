/* eslint-disable no-useless-escape */
/* eslint-disable quotes */
export const matchAllCases = (str) => new RegExp(`^${str}$`, 'i')

export function createUrlFromString(str) {
  return str.replace(/\s+/g, '-').toLowerCase()
}

const dateStringRegEx = new RegExp('((?:19|20)\\d\\d)-(0?[1-9]|1[012])-([12][0-9]|3[01]|0?[1-9])', 'i')

export function matchesDateString(str) {
  return dateStringRegEx.test(str)
}
