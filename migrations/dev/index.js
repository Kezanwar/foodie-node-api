import { isDev } from '#app/config/config.js'
import Deal from '#app/models/Deal.js'
import Location from '#app/models/Location.js'
import Restaurant from '#app/models/Restaurant.js'
import User from '#app/models/User.js'
import DB from '#app/services/db/index.js'

import { addMonths } from 'date-fns'

//! DO NOT USE THESE IN PROD

class DevMigrations {
  async setOptions() {
    await DB.setCuisineOptions()
    await DB.setDietaryOptions()
  }
  // sets all deals to live and end dates in a month
  async setAllDealsLive() {
    try {
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
    } catch (error) {
      console.error(error)
    }
  }

  async expireAllDeals() {
    await Deal.updateMany({}, { is_expired: true })
    await Location.updateMany({}, { active_deals: [] })
  }

  // clears all deals from the platform
  async clearDeals() {
    try {
      await Location.updateMany({}, { active_deals: [] })
      await Deal.deleteMany({})
    } catch (error) {
      console.error(error)
    }
  }

  // sets locations rest bio
  async setLocationsRestBio() {
    try {
      const locations = await Location.find({})

      for await (const l of locations) {
        const rest = await Restaurant.findById(l.restaurant.id)
        l.restaurant.bio = rest.bio
        await l.save()
      }
    } catch (error) {
      console.error(error)
    }
  }

  async removeAllUserFavourites() {
    try {
      await User.updateMany({}, { favourites: [], following: [] })
      await Deal.updateMany({}, { favourites: [] })
      await Location.updateMany({}, { followers: [] })
    } catch (error) {
      console.error(error)
    }
  }

  async setAllUserPushTokens() {
    try {
      await User.updateMany({}, { push_tokens: [] })
    } catch (error) {
      console.error(error)
    }
  }

  async changePushTokensToSnakeCase() {
    try {
      await User.updateMany({}, { $unset: { pushTokens: 1 } })
    } catch (error) {
      console.error(error)
    }
  }

  async addArchivedAndDeletedKeys() {
    try {
      await Deal.updateMany({}, { deleted: false })
      await Location.updateMany({}, { deleted: false, archived: false })
      await Location.updateMany({ active_deals: { $size: 0 } }, { archived: true })
    } catch (error) {
      console.error(error)
    }
  }

  async setEmailPrivateDefault() {
    try {
      await User.updateMany({}, { email_private: false })
    } catch (error) {
      console.error(error)
    }
  }

  async unsubscribeAllRestaurants() {
    const users = await User.find({
      'subscription.subscribed': true,
    })
    for (let u of users) {
      await DB.RUnsubscribeRestaurant(u._id, u.restaurant.id)
    }
  }
}

const devMigrations = isDev ? new DevMigrations() : null

export default devMigrations
