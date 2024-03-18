import Deal from '#app/models/Deal.js'
import Location from '#app/models/Location.js'
import { addMonths } from 'date-fns'

class DevMigrations {
  // sets all deals to live and end dates in a month
  async setAllDealsLive() {
    const deals = await Deal.find()

    for await (const d of deals) {
      d.is_expired = false
      d.end_date = addMonths(new Date(), 1).toISOString()
      const locProms = d.locations.map((l) =>
        Location.findByIdAndUpdate(l.location_id, { $addToSet: { active_deals: d._id } })
      )
      locProms.push(d.save())
      await Promise.all(locProms)
    }
  }
}

const devMigrations = new DevMigrations()

export default devMigrations
