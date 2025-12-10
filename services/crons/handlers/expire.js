import Err from '#app/services/error/index.js'
import Mixpanel from '#app/services/mixpanel/index.js'
import DealRepo from '#app/repositories/deal/index.js'
import { addMinutes } from 'date-fns'

const expireDealsHandler = async () => {
  try {
    const expiredResults = await DealRepo.BulkExpireDealsFromDate(addMinutes(new Date(), 1))
    Mixpanel.trackExpiredDeals(expiredResults)
  } catch (error) {
    Err.log(error)
  }
}

export default expireDealsHandler
