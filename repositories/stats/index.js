import Deal from '#app/models/deal.js'
import Location from '#app/models/location.js'

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
    const res = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': rest_id,
        },
      },
      {
        $addFields: {
          views: { $size: '$views' },
          favourites: { $size: '$favourites' },
        },
      },
      {
        $group: {
          _id: null,
          views_count: { $sum: '$views' },
          favourites_count: { $sum: '$favourites' },
        },
      },
    ])
    return res[0] ? res[0] : { views_count: 0, favourites_count: 0 }
  }

  static GetLocationsCount(rest_id) {
    return Location.countDocuments({ 'restaurant.id': rest_id })
  }

  static async GetLocationStats(rest_id) {
    const res = await Location.aggregate([
      { $match: { 'restaurant.id': rest_id } },
      {
        $project: {
          followersLength: {
            $cond: {
              if: { $isArray: '$followers' },
              then: { $size: '$followers' },
              else: 0,
            },
          },
          bookingClickLength: {
            $cond: {
              if: { $isArray: '$booking_clicks' },
              then: { $size: '$booking_clicks' },
              else: 0,
            },
          },
          viewsLength: {
            $cond: {
              if: { $isArray: '$views' },
              then: { $size: '$views' },
              else: 0,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          followers_count: { $sum: '$followersLength' },
          booking_clicks_count: { $sum: '$bookingClickLength' },
          views_count: { $sum: '$viewsLength' },
        },
      },
    ])
    return res[0] ? res[0] : { views_count: 0, booking_clicks_count: 0, followers_count: 0 }
  }
}

export default StatsRepo
