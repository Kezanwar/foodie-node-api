import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'

export const handleEndOfPeriodCancelledSubscriptions = async () => {
  try {
    await DB.RBulkUnsubscribeRestaurant()
  } catch (error) {
    Err.log(error)
  }
}
