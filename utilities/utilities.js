import dotenv from 'dotenv'
dotenv.config()

export function ArrayIsEmpty(array) {
  return !array.length > 0
}

export const fakeLongLoadPromise = (duration = 5000) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
