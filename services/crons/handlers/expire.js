import Err from '#app/services/error/index.js'
import Mixpanel from '#app/services/mixpanel/index.js'
import DB from '#app/services/db/index.js'

const expireDealsHandler = async () => {
  try {
    const expiredResults = await DB.RBulkExpireDealsFromDate(new Date())
    Mixpanel.trackExpiredDeals(expiredResults)
  } catch (error) {
    Err.log(error)
  }
}

export default expireDealsHandler
