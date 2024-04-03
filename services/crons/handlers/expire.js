import Deal from '#app/models/Deal.js'

import WorkerService from '#app/services/worker/index.js'

import Location from '#app/models/Location.js'
import Err from '#app/services/error/index.js'
import Mixpanel from '#app/services/mixpanel/index.js'

const expireDeals = async () => {
  try {
    const expireDate = await WorkerService.call({
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
    Mixpanel.trackExpiredDeals(expiredReq)
  } catch (error) {
    Err.log(error)
  }
}

export default expireDeals
