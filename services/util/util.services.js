/* eslint-disable no-useless-escape */
export function ValidURL(str) {
  const regex = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/
  return regex.test(str)
}

export function hasHttp(str) {
  return str.includes('http')
}

export function createUrlFromLink(str) {
  if (!hasHttp(str)) return `https://${str}`
  else return str
}
