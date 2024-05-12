import Err from '../error/index.js'
import workerConfig from './initialize.js'

export const worker = await workerConfig.launchService({
  exceptionHandler({ error }) {
    console.error('worker:', error)
    Err.throw(error)
  },
})

class TaskService {
  editDealFindLocationsToAddRemoveAndUpdate(deal, newLocationIdList) {
    return worker.call({
      name: 'editDealFindLocationsToAddRemoveAndUpdate',
      params: [JSON.stringify(deal), newLocationIdList],
    })
  }
  findCountryPhoneCode(country) {
    return worker.call({
      name: 'findCountryPhoneCode',
      params: [country],
    })
  }
  orderSearchDealsByTextMatchRelevance(results, text) {
    return worker.call({
      name: 'orderSearchDealsByTextMatchRelevance',
      params: [JSON.stringify(results), text],
    })
  }
  checkSingleDealFollowAndFav(user, deal_id, location_id) {
    return worker.call({
      name: 'checkSingleDealFollowAndFav',
      params: [JSON.stringify(user), deal_id, location_id],
    })
  }
  getPopularRestaurantsAndCuisines(discoverResults) {
    return worker.call({
      name: 'getPopularRestaurantsAndCuisines',
      params: [JSON.stringify(discoverResults)],
    })
  }
  checkSingleRestaurantFollowAndFav(user, location) {
    return worker.call({
      name: 'checkSingleRestaurantFollowAndFav',
      params: [JSON.stringify(user), JSON.stringify(location)],
    })
  }
  buildCustomerFavouritesListFromResults(sliced, locations, deals) {
    return worker.call({
      name: 'buildCustomerFavouritesListFromResults',
      params: [JSON.stringify(sliced), JSON.stringify(locations), JSON.stringify(deals)],
    })
  }
  userFollowsRestaurant(user, location_id) {
    return worker.call({
      name: 'userFollowsRestaurant',
      params: [JSON.stringify(user), location_id],
    })
  }
  userHasFavouritedDeal(user, deal_id, location_id) {
    return worker.call({
      name: 'userHasFavouritedDeal',
      params: [JSON.stringify(user), deal_id, location_id],
    })
  }
}

const Task = new TaskService()

export default Task
