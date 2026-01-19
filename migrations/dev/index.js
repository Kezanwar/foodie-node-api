import { isDev } from '#app/config/config.js'
import Deal from '#app/models/deal.js'
import Location from '#app/models/location.js'
import Restaurant from '#app/models/restaurant.js'
import User from '#app/models/user.js'
import OptionsRepo from '#app/repositories/options/index.js'
import SubscriptionRepo from '#app/repositories/subscription/index.js'

import { addMonths } from 'date-fns'

//! DO NOT USE THESE IN PROD

class DevMigrations {
  async setOptions() {
    await OptionsRepo.setCuisineOptions()
    await OptionsRepo.setDietaryOptions()
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
      await SubscriptionRepo.UnsubscribeRestaurant(u._id, u.restaurant.id)
    }
  }

  async nukeOldStatsPattern() {
    console.log('Starting nukeOldStatsPattern migration...')

    const locResult = await Location.updateMany(
      {},
      { $unset: { followers: 1, views: 1, booking_clicks: 1 } },
      { strict: false }
    )
    console.log(`Updated ${locResult.modifiedCount} locations`)

    const userResult = await User.updateMany(
      {},
      { $unset: { following: 1, favourites: 1 } },
      { strict: false }
    )
    console.log(`Updated ${userResult.modifiedCount} users`)

    const dealResult = await Deal.updateMany(
      {},
      { $unset: { favourites: 1, views: 1 } },
      { strict: false }
    )
    console.log(`Updated ${dealResult.modifiedCount} deals`)

    console.log('Migration complete!')
  }
}

const devMigrations = isDev ? new DevMigrations() : null

export default devMigrations
