import * as cron from 'node-cron'
import Deal from '../models/Deal.js'

import { generalWorkerService } from '../services/workers/general.service.worker.js'

import { MIXPANEL_EVENTS, mixpanelTrack } from '../services/mixpanel/mixpanel.services.js'
import Location from '../models/Location.js'

// const dealExpireCron = () => {
//   cron.schedule(
//     '0 * * * *',
//     async () => {
//       const result = await generalWorkerService.call({
//         name: 'getTimezonesToExpire',
//       })
//       const { minusGMT, plusGMT } = result

//       const mixpanelProps = { plusGMT: {}, minusGMT: {} }

//       if (plusGMT?.length > 0) {
//         const today = todayDateString()
//         const updatePlusGMTDeals = await Deal.updateMany(
//           { end_date: { $lte: today }, timezone: { $in: plusGMT }, is_expired: false },
//           { is_expired: true }
//         )
//         mixpanelProps.plusGMT = updatePlusGMTDeals
//       }
//       if (minusGMT?.length > 0) {
//         const yesterday = yeserdayDateString()
//         const updateMinusGMTDeals = await Deal.updateMany(
//           { end_date: { $lte: yesterday }, timezone: { $in: minusGMT }, is_expired: false },
//           { is_expired: true }
//         )
//         mixpanelProps.minusGMT = updateMinusGMTDeals
//       }
//       mixpanelTrack(MIXPANEL_EVENTS.cron_deals_expired, mixpanelProps)
//     },
//     { scheduled: true }
//   )
// }
const dealExpireCron = () => {
  cron.schedule(
    '0 * * * *',
    async () => {
      const expireDate = await generalWorkerService.call({
        name: 'expireDate',
      })
      const filter = { end_date: { $lte: expireDate }, is_expired: false }
      const toExpire = await Deal.find(filter)

      const proms = toExpire.map((deal) =>
        Location.updateMany(
          {
            'restaurant.id': deal.restaurant.id,
          },
          { $pull: { active_deals: deal._id } }
        )
      )
      await Promise.all(proms)
      const expiredReq = await Deal.updateMany(filter, { is_expired: true })
      mixpanelTrack(MIXPANEL_EVENTS.cron_deals_expired, expiredReq)
    },
    { scheduled: true }
  )
}

export default dealExpireCron
