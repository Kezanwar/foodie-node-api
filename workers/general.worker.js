import { define } from 'nanolith'
import { hasMultipleTimezones } from '../services/location/location.services.js'
import { getTimezonesToExpire } from '../services/date/date.services.js'
import { resizeImg } from '../services/images/images.services.js'

const generalWorker = await define({
  hasMultipleTimezones,
  getTimezonesToExpire,
  resizeImg,

  // Functions don't have to be directly defined within the
  // object, they can be defined elsewhere outside, or even
  // imported from a totally different module.
})

export default generalWorker
