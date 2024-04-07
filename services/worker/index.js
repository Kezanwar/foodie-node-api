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
  resizeCoverPhoto(buffer) {
    return worker.call({
      name: 'resizeImg',
      params: [buffer, { width: 1000 }],
    })
  }
  resizeAvatar(buffer) {
    return worker.call({
      name: 'resizeImg',
      params: [buffer, { width: 500 }],
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
}

const Task = new TaskService()

export default Task
