import * as cron from 'node-cron'

import expireDealsHandler from './handlers/expire.js'
import checkoutFeedNotificationHandler from './handlers/notifications.js'

const SCHEDULES = {
  DAILY_EVERY_HOUR: '0 * * * *',
  DAILY_2PM: '0 14 * * *',
  DAILY_MIDNIGHT: '0 0 * * *',
}

class Crons {
  static #expireDeals() {
    cron.schedule(SCHEDULES.DAILY_EVERY_HOUR, expireDealsHandler)
  }

  static #checkoutFeedNotification() {
    cron.schedule(SCHEDULES.DAILY_2PM, checkoutFeedNotificationHandler)
  }

  static start() {
    this.#expireDeals()
    // this.#checkoutFeedNotification()
  }
}

export default Crons
