import { format } from 'date-fns'
import { decode } from 'html-entities'

class Str {
  static dateStringRegEx = new RegExp('((?:19|20)\\d\\d)-(0?[1-9]|1[012])-([12][0-9]|3[01]|0?[1-9])', 'i')

  static matchesDateString(str) {
    return this.dateStringRegEx.test(str)
  }

  static capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  static capitalizeSentence(str) {
    return str
      .split(' ')
      .map((word) => this.capitalizeFirstLetter(word))
      .join(' ')
  }

  static removeTags(str) {
    if (str === null || str === '') return false
    else str = str.toString()
    // Regular expression to identify HTML tags in
    // the input string. Replacing the identified
    // HTML tag with a null string.
    return decode(str.replace(/(<([^>]+)>)/gi, ''))
  }

  static createUrlFromLink(str) {
    if (!str.includes('http')) return `https://${str}`
    else return str
  }

  static ValidURL(str) {
    /* eslint-disable no-useless-escape */
    const regex = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/
    return regex.test(str)
  }

  static formatTimestampToUKDateString(timestamp) {
    return format(new Date(timestamp), 'dd/MM/yyyy')
  }
}

export default Str
