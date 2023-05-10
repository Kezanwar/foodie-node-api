import * as cron from 'node-cron'

import Voucher from '../models/Voucher.js'
import { generalWorkerService } from '../services/workers/general.service.worker.js'
import { todayDateString, yeserdayDateString } from '../services/date/date.services.js'
import { MIXPANEL_EVENTS, mixpanelTrack } from '../services/mixpanel/mixpanel.services.js'

const voucherExpireCron = () => {
  cron.schedule(
    '0 * * * *',
    async () => {
      const mixpanelProps = { plusGMT: {}, minusGMT: {} }
      const result = await generalWorkerService.call({
        name: 'getTimezonesToExpire',
      })
      const { minusGMT, plusGMT } = result

      if (plusGMT?.length > 0) {
        const today = todayDateString()
        const updatePlusGMTVouchers = await Voucher.updateMany(
          { end_date: { $lte: today }, timezone: { $in: plusGMT }, is_expired: false },
          { is_expired: true }
        )
        mixpanelProps.plusGMT = updatePlusGMTVouchers
      }
      if (minusGMT?.length > 0) {
        const yesterday = yeserdayDateString()
        const updateMinusGMTVouchers = await Voucher.updateMany(
          { end_date: { $lte: yesterday }, timezone: { $in: minusGMT }, is_expired: false },
          { is_expired: true }
        )
        mixpanelProps.minusGMT = updateMinusGMTVouchers
      }
      mixpanelTrack(MIXPANEL_EVENTS.cron_vouchers_expired, mixpanelProps)
    },
    { scheduled: true }
  )
}

export default voucherExpireCron
