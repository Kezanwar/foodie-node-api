export const fakeLongLoadPromise = (duration = 5000) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
