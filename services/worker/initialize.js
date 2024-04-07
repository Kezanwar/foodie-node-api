import { define } from 'nanolith'
import { resizeImg } from './tasks/image.js'
import {
  orderSearchDealsByTextMatchRelevance,
  checkSingleDealFollowAndFav,
  checkSingleRestaurantFollowAndFav,
} from './tasks/deals.js'
import { getPopularRestaurantsAndCuisines } from './tasks/discover.js'
import { editDealFindLocationsToAddRemoveAndUpdate, findCountryPhoneCode } from './tasks/locations.js'

export const workerConfig = await define({
  resizeImg,
  findCountryPhoneCode,
  checkSingleDealFollowAndFav,
  checkSingleRestaurantFollowAndFav,
  getPopularRestaurantsAndCuisines,
  orderSearchDealsByTextMatchRelevance,
  editDealFindLocationsToAddRemoveAndUpdate,
  // Functions don't have to be directly defined within the
  // object, they can be defined elsewhere outside, or even
  // imported from a totally different module.
})

export default workerConfig
