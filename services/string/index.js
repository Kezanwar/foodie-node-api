import { decode } from 'html-entities'

class StringService {
  dateStringRegEx = new RegExp('((?:19|20)\\d\\d)-(0?[1-9]|1[012])-([12][0-9]|3[01]|0?[1-9])', 'i')

  matchesDateString(str) {
    return this.dateStringRegEx.test(str)
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }
  capitalizeSentence(str) {
    return str
      .split(' ')
      .map((word) => this.capitalizeFirstLetter(word))
      .join(' ')
  }

  removeTags(str) {
    if (str === null || str === '') return false
    else str = str.toString()
    // Regular expression to identify HTML tags in
    // the input string. Replacing the identified
    // HTML tag with a null string.
    return decode(str.replace(/(<([^>]+)>)/gi, ''))
  }

  createUrlFromLink(str) {
    if (!str.includes('http')) return `https://${str}`
    else return str
  }

  ValidURL(str) {
    /* eslint-disable no-useless-escape */
    const regex = /(?:https?):\/\/(\w+:?\w*)?(\S+)(:\d+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/
    return regex.test(str)
  }
}

const Str = new StringService()

export default Str
