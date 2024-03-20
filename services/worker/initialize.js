import { define } from 'nanolith'
import { hasMultipleTimezones, findCountryPhoneCode } from '#app/utilities/locations.js'
import { getTimezonesToExpire, expireDate } from '#app/utilities/date.js'
import { resizeImg } from '#app/utilities/images.js'
import { filterDealsByDistance, orderSearchDealsByTextMatchRelevance } from '#app/utilities/deals.js'
import { checkSingleDealFollowAndFav, checkSingleRestaurantFollowAndFav } from '#app/utilities/deals.js'
import { getPopularRestaurantsAndCuisines } from '#app/utilities/discover.js'

export const worker = await define({
  hasMultipleTimezones,
  getTimezonesToExpire,
  resizeImg,
  findCountryPhoneCode,
  expireDate,
  filterDealsByDistance,
  checkSingleDealFollowAndFav,
  checkSingleRestaurantFollowAndFav,
  getPopularRestaurantsAndCuisines,
  orderSearchDealsByTextMatchRelevance,
  // Functions don't have to be directly defined within the
  // object, they can be defined elsewhere outside, or even
  // imported from a totally different module.
})
