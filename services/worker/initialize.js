import { define } from 'nanolith'

import {
  orderSearchDealsByTextMatchRelevance,
  checkSingleDealFollowAndFav,
  checkSingleRestaurantFollowAndFav,
  buildCustomerFavouritesListFromResults,
} from './tasks/deals.js'

import { userFollowsRestaurant, userHasFavouritedDeal } from './tasks/user.js'

import { getPopularRestaurantsAndCuisines } from './tasks/discover.js'

import { editDealFindLocationsToAddRemoveAndUpdate, findCountryPhoneCode } from './tasks/locations.js'

import { createNewDealNotificationMessages, chunkPushNotificationReceiptIds } from './tasks/notifications.js'

export const workerConfig = await define({
  findCountryPhoneCode,
  checkSingleDealFollowAndFav,
  checkSingleRestaurantFollowAndFav,
  getPopularRestaurantsAndCuisines,
  orderSearchDealsByTextMatchRelevance,
  editDealFindLocationsToAddRemoveAndUpdate,
  buildCustomerFavouritesListFromResults,
  userFollowsRestaurant,
  userHasFavouritedDeal,
  createNewDealNotificationMessages,
  chunkPushNotificationReceiptIds,
  // Functions don't have to be directly defined within the
  // object, they can be defined elsewhere outside, or even
  // imported from a totally different module.
})

export default workerConfig
