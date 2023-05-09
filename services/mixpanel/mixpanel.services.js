import mixpanel from 'mixpanel'
const MIX = mixpanel.init(process.env.MIXPANEL_TOKEN, { host: 'api-eu.mixpanel.com' })

export const MIXPANEL_EVENTS = {
  cron_vouchers_expired: 'be_cron_vouchers_expired',
}

export async function mixpanelTrack(eventName, props) {
  const _props = props ?? {}
  const _eventName = eventName ?? ''
  try {
    MIX.track(_eventName, _props)
  } catch (error) {
    console.log(error)
  }
}
