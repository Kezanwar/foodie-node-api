export const createOTP = () => {
  const arr = []
  let start = 0
  while (start <= 5) {
    arr.push(Math.floor(Math.random() * 10))
    start++
  }
  return arr.join('')
}
