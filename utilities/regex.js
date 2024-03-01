import { decode } from 'html-entities'

export const matchAllCases = (str) => new RegExp(`^${str}$`, 'i')

export function createUrlFromString(str) {
  return str.replace(/\s+/g, '-').toLowerCase()
}

const dateStringRegEx = new RegExp('((?:19|20)\\d\\d)-(0?[1-9]|1[012])-([12][0-9]|3[01]|0?[1-9])', 'i')

export function matchesDateString(str) {
  return dateStringRegEx.test(str)
}

export function removeTags(str) {
  if (str === null || str === '') return false
  else str = str.toString()

  // Regular expression to identify HTML tags in
  // the input string. Replacing the identified
  // HTML tag with a null string.
  return decode(str.replace(/(<([^>]+)>)/gi, ''))
}
