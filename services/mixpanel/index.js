import { MIXPANEL_TOKEN } from '#app/config/config.js'
import mixpanel from 'mixpanel'

class Mixpanel {
  static #client = null

  static async connect() {
    try {
      this.#client = mixpanel.init(MIXPANEL_TOKEN, { host: 'api-eu.mixpanel.com' })
      console.log('mixpanel connected 🚀')
    } catch (error) {
      console.log('mixpanel failed to connect.')
      process.exit(1)
    }
  }

  static #events = { cron_deals_expired: 'be_cron_deals_expired' }

  static #track(eventName, props) {
    const _props = props ?? {}
    const _eventName = eventName ?? ''
    try {
      this.#client.track(_eventName, _props)
    } catch (error) {
      console.log(error)
    }
  }

  static trackExpiredDeals(expiredResp) {
    this.#track(this.#events.cron_deals_expired, expiredResp)
  }
}

export default Mixpanel
