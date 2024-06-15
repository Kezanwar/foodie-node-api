import Err from '../error/index.js'
import workerConfig from './initialize.js'

export const worker = await workerConfig.launchService({
  exceptionHandler({ error }) {
    console.error('worker:', error)
    Err.throw(error)
  },
})

class Task {
  static editDealFindLocationsToAddRemoveAndUpdate(deal, newLocationIdList) {
    return worker.call({
      name: 'editDealFindLocationsToAddRemoveAndUpdate',
      params: [JSON.stringify(deal), newLocationIdList],
    })
  }
  static findCountryPhoneCode(country) {
    return worker.call({
      name: 'findCountryPhoneCode',
      params: [country],
    })
  }
  static orderSearchDealsByTextMatchRelevance(results, text) {
    return worker.call({
      name: 'orderSearchDealsByTextMatchRelevance',
      params: [JSON.stringify(results), text],
    })
  }
  static checkSingleDealFollowAndFav(user, deal_id, location_id) {
    return worker.call({
      name: 'checkSingleDealFollowAndFav',
      params: [JSON.stringify(user), deal_id, location_id],
    })
  }
  static getPopularRestaurantsAndCuisines(discoverResults) {
    return worker.call({
      name: 'getPopularRestaurantsAndCuisines',
      params: [JSON.stringify(discoverResults)],
    })
  }
  static checkSingleRestaurantFollowAndFav(user, location) {
    return worker.call({
      name: 'checkSingleRestaurantFollowAndFav',
      params: [JSON.stringify(user), JSON.stringify(location)],
    })
  }
  static buildCustomerFavouritesListFromResults(sliced, locations, deals) {
    return worker.call({
      name: 'buildCustomerFavouritesListFromResults',
      params: [JSON.stringify(sliced), JSON.stringify(locations), JSON.stringify(deals)],
    })
  }
  static userFollowsRestaurant(user, location_id) {
    return worker.call({
      name: 'userFollowsRestaurant',
      params: [JSON.stringify(user), location_id],
    })
  }
  static userHasFavouritedDeal(user, deal_id, location_id) {
    return worker.call({
      name: 'userHasFavouritedDeal',
      params: [JSON.stringify(user), deal_id, location_id],
    })
  }
  static createNewDealNotificationMessages(locations, deal) {
    return worker.call({
      name: 'createNewDealNotificationMessages',
      params: [JSON.stringify(locations), JSON.stringify(deal)],
    })
  }
  static createCheckoutFeedNotificationMessages(users) {
    return worker.call({
      name: 'createCheckoutFeedNotificationMessages',
      params: [JSON.stringify(users)],
    })
  }
  static chunkPushNotificationReceiptIds(receiptIds) {
    return worker.call({
      name: 'chunkPushNotificationReceiptIds',
      params: [JSON.stringify(receiptIds)],
    })
  }
  static parseRecentlyViewedStatsIntoDealViews(recently_viewed, user_id) {
    return worker.call({
      name: 'parseRecentlyViewedStatsIntoDealViews',
      params: [JSON.stringify(recently_viewed), user_id],
    })
  }
}

export default Task
