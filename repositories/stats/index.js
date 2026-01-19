import Deal, { DealViews, DealFavourites } from '#app/models/deal.js'
import Location, { LocationViews, LocationBookingClicks, LocationFollowers } from '#app/models/location.js'

class StatsRepo {
  static GetActiveDealsCount(rest_id) {
    return Deal.countDocuments({
      'restaurant.id': rest_id,
      is_expired: false,
    })
  }

  static GetExpiredDealsCount(rest_id) {
    return Deal.countDocuments({
      'restaurant.id': rest_id,
      $or: [{ is_expired: true }],
    })
  }

  static async GetDealStats(rest_id) {
    const [views_count, favourites_count] = await Promise.all([
      DealViews.countDocuments({ restaurant_id: rest_id }),
      DealFavourites.countDocuments({ restaurant_id: rest_id }),
    ])

    return { views_count, favourites_count }
  }

  static GetLocationsCount(rest_id) {
    return Location.countDocuments({ 'restaurant.id': rest_id })
  }

  static async GetLocationStats(rest_id) {
    const [followers_count, booking_clicks_count, views_count] = await Promise.all([
      LocationFollowers.countDocuments({ restaurant_id: rest_id }),
      LocationBookingClicks.countDocuments({ restaurant_id: rest_id }),
      LocationViews.countDocuments({ restaurant_id: rest_id }),
    ])

    return { followers_count, booking_clicks_count, views_count }
  }

  static async BulkAddAppUserStats(statsMap) {
    // Get unique location IDs from both views and booking clicks
    const locationIds = [
      ...new Set([
        ...statsMap.locationViews.map((v) => v.location_id),
        ...statsMap.locationBookingClicks.map((c) => c.location_id),
        ...statsMap.dealViews.map((v) => v.location_id),
      ]),
    ]

    // Fetch restaurant IDs for all locations
    const locationRestaurantMap = {}
    if (locationIds.length > 0) {
      const locations = await Location.find({ _id: { $in: locationIds } })
        .select('_id restaurant.id')
        .lean()

      locations.forEach((loc) => {
        locationRestaurantMap[loc._id.toString()] = loc.restaurant.id
      })
    }

    // Add restaurant IDs to location views
    const locationViewDocs = statsMap.locationViews
      .map((view) => {
        const restaurant_id = locationRestaurantMap[view.location_id]
        if (!restaurant_id) return null
        return { ...view, restaurant_id }
      })
      .filter(Boolean)

    // Add restaurant IDs to location booking clicks
    const locationBookingClickDocs = statsMap.locationBookingClicks
      .map((click) => {
        const restaurant_id = locationRestaurantMap[click.location_id]
        if (!restaurant_id) return null
        return { ...click, restaurant_id }
      })
      .filter(Boolean)

    // Add restaurant IDs to location views

    const dealViewDocs = statsMap.dealViews
      .map((view) => {
        const restaurant_id = locationRestaurantMap[view.location_id]
        if (!restaurant_id) return null
        return { ...view, restaurant_id }
      })
      .filter(Boolean)

    // console.log({ dealViewDocs, locationBookingClickDocs, locationViewDocs })

    const promises = []

    if (locationViewDocs.length > 0) {
      promises.push(LocationViews.insertMany(locationViewDocs))
    }

    if (locationBookingClickDocs.length > 0) {
      promises.push(LocationBookingClicks.insertMany(locationBookingClickDocs))
    }

    if (dealViewDocs.length > 0) {
      promises.push(DealViews.insertMany(dealViewDocs))
    }

    await Promise.all(promises)
  }
}

export default StatsRepo
