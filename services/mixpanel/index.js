import mixpanel from 'mixpanel'

class MixpanelService {
  #client = null

  async connect() {
    try {
      this.#client = mixpanel.init(process.env.MIXPANEL_TOKEN, { host: 'api-eu.mixpanel.com' })
      console.log('mixpanel connected 🚀')
    } catch (error) {
      console.log('mixpanel failed to connect.')
      process.exit(1)
    }
  }

  #events = { cron_deals_expired: 'be_cron_deals_expired' }

  #track(eventName, props) {
    const _props = props ?? {}
    const _eventName = eventName ?? ''
    try {
      this.#client.track(_eventName, _props)
    } catch (error) {
      console.log(error)
    }
  }

  trackExpiredDeals(expiredResp) {
    this.#track(this.#events.cron_deals_expired, expiredResp)
  }
}

const Mixpanel = new MixpanelService()

export default Mixpanel
