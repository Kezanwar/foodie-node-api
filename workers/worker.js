import { define } from 'nanolith'
import { hasMultipleTimezones } from '../services/location/location.services'

export const worker = await define({
  hasMultipleTimezones,

  // Functions don't have to be directly defined within the
  // object, they can be defined elsewhere outside, or even
  // imported from a totally different module.
})
