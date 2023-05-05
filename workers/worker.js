import { define } from 'nanolith'

export const worker = await define({
  add(x, y) {
    return x + y
  },

  // Functions don't have to be directly defined within the
  // object, they can be defined elsewhere outside, or even
  // imported from a totally different module.
})
