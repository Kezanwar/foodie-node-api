import { define } from 'nanolith'
import { hasMultipleTimezones } from '../services/location/location.services.js'
import { getTimezonesToExpire } from '../services/date/date.services.js'

export const worker = await define({
  hasMultipleTimezones,
  getTimezonesToExpire,

  // Functions don't have to be directly defined within the
  // object, they can be defined elsewhere outside, or even
  // imported from a totally different module.
})
