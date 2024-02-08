import { define } from 'nanolith'
import { hasMultipleTimezones, findCountryPhoneCode } from '#app/utilities/locations.js'
import { getTimezonesToExpire, expireDate } from '#app/utilities/date.js'
import { resizeImg } from '#app/utilities/images.js'
import { filterDealsByDistance } from '#app/utilities/deals.js'
import { hasFavouritedDealAndFollowedRest } from '#app/utilities/deals.js'

export const worker = await define({
  hasMultipleTimezones,
  getTimezonesToExpire,
  resizeImg,
  findCountryPhoneCode,
  expireDate,
  filterDealsByDistance,
  hasFavouritedDealAndFollowedRest,

  // Functions don't have to be directly defined within the
  // object, they can be defined elsewhere outside, or even
  // imported from a totally different module.
})
