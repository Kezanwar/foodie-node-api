export const expAsPerc = (...args) => {
  const arg = [...args]

  let sum = 0

  for (let a of arg) {
    sum = sum + a
  }

  return sum / arg.length
}
