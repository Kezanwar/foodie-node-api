import { define } from 'nanolith'
import { hasMultipleTimezones, findCountryPhoneCode } from '../services/location/location.services.js'
import { getTimezonesToExpire, expireDate } from '../services/date/date.services.js'
import { resizeImg } from '../services/images/images.services.js'
import { filterDealsByDistance } from '../services/deals/deal.services.js'

const generalWorker = await define({
  hasMultipleTimezones,
  getTimezonesToExpire,
  resizeImg,
  findCountryPhoneCode,
  expireDate,
  filterDealsByDistance,

  // Functions don't have to be directly defined within the
  // object, they can be defined elsewhere outside, or even
  // imported from a totally different module.
})

export default generalWorker
