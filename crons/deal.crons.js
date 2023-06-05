import * as cron from 'node-cron'
import Deal from '../models/Deal.js'

import { generalWorkerService } from '../services/workers/general.service.worker.js'

import { todayDateString, yeserdayDateString } from '../services/date/date.services.js'
import { MIXPANEL_EVENTS, mixpanelTrack } from '../services/mixpanel/mixpanel.services.js'

const dealExpireCron = () => {
  cron.schedule(
    '0 * * * *',
    async () => {
      const result = await generalWorkerService.call({
        name: 'getTimezonesToExpire',
      })
      const { minusGMT, plusGMT } = result

      const mixpanelProps = { plusGMT: {}, minusGMT: {} }

      if (plusGMT?.length > 0) {
        const today = todayDateString()
        const updatePlusGMTDeals = await Deal.updateMany(
          { end_date: { $lte: today }, timezone: { $in: plusGMT }, is_expired: false },
          { is_expired: true }
        )
        mixpanelProps.plusGMT = updatePlusGMTDeals
      }
      if (minusGMT?.length > 0) {
        const yesterday = yeserdayDateString()
        const updateMinusGMTDeals = await Deal.updateMany(
          { end_date: { $lte: yesterday }, timezone: { $in: minusGMT }, is_expired: false },
          { is_expired: true }
        )
        mixpanelProps.minusGMT = updateMinusGMTDeals
      }
      mixpanelTrack(MIXPANEL_EVENTS.cron_deals_expired, mixpanelProps)
    },
    { scheduled: true }
  )
}

export default dealExpireCron
