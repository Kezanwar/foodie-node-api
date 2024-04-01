import * as cron from 'node-cron'
import expireDeals from './deals/expire.js'

class CronService {
  #expireDeals() {
    cron.schedule('0 * * * *', expireDeals, { scheduled: true })
  }
  run() {
    this.#expireDeals()
  }
}

const Crons = new CronService()

export default Crons
