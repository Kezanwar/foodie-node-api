import * as cron from 'node-cron'
import expireDeals from './handlers/expire.js'

class Crons {
  static #expireDeals() {
    cron.schedule('0 * * * *', expireDeals, { scheduled: true })
  }
  static start() {
    this.#expireDeals()
  }
}

export default Crons
