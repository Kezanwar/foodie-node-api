import { define } from 'nanolith'
import { hasMultipleTimezones, findCountryPhoneCode } from '../../utilities/locations.js'
import { getTimezonesToExpire, expireDate } from '../../utilities/date.js'
import { resizeImg } from '../../utilities/images.js'
import { filterDealsByDistance } from '../../utilities/deals.js'

export const worker = await define({
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
