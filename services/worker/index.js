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
  static getPopularRestaurantsAndCuisines(discoverResults) {
    return worker.call({
      name: 'getPopularRestaurantsAndCuisines',
      params: [JSON.stringify(discoverResults)],
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
  static parseAppUserStatsForSyncing(recently_viewed, user) {
    return worker.call({
      name: 'parseAppUserStatsForSyncing',
      params: [JSON.stringify(recently_viewed), JSON.stringify(user)],
    })
  }
}

export default Task
