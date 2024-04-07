import { formatInTimeZone } from 'date-fns-tz'

import Err from '#app/services/error/index.js'
import Mixpanel from '#app/services/mixpanel/index.js'
import DB from '#app/services/db/index.js'

export const createExpiryDate = () => {
  return formatInTimeZone(new Date(), 'Etc/GMT+12', 'yyyy-MM-dd')
}

const expireDeals = async () => {
  try {
    const expireFrom = createExpiryDate()
    const expiredResults = await DB.RBulkExpireDealsFromDate(expireFrom)
    Mixpanel.trackExpiredDeals(expiredResults)
  } catch (error) {
    Err.log(error)
  }
}

export default expireDeals
