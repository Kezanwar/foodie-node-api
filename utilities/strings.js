import pkg from 'lodash'
const { upperCase } = pkg

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const capitalizeSentence = (str) => {
  return str
    .split(' ')
    .map((word) => capitalizeFirstLetter(word))
    .join(' ')
}

export const allCapsNoSpace = (str) => {
  return upperCase(str).split(' ').join('')
}
