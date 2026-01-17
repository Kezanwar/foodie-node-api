import Location from '#app/models/location.js'
import Permissions from '#app/services/permissions/index.js'
import AWS from '#app/services/aws/index.js'
import { FEED_LIMIT, METER_TO_MILE_CONVERSION, RADIUS_METRES } from '#app/constants/deals.js'
import { calculateDistancePipeline } from '#app/utilities/distance-pipeline.js'

class FeedRepo {
  static GetDealFeed(page, long, lat, cuisines, dietary_requirements) {
    const query = {
      'restaurant.is_subscribed': Permissions.SUBSCRIBED,
      active_deals: { $ne: [], $exists: true },
      archived: false,
    }

    if (cuisines) {
      query.cuisines = {
        $elemMatch: {
          slug: { $in: typeof cuisines === 'string' ? [cuisines] : cuisines },
        },
      }
    }
    if (dietary_requirements) {
      query.dietary_requirements = {
        $elemMatch: {
          slug: { $in: typeof dietary_requirements === 'string' ? [dietary_requirements] : dietary_requirements },
        },
      }
    }

    return Location.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [long, lat] },
          distanceField: 'distance_miles',
          spherical: true,
          maxDistance: RADIUS_METRES,
          distanceMultiplier: METER_TO_MILE_CONVERSION,
          query: query,
        },
      },
      {
        $skip: page * FEED_LIMIT,
      },
      {
        $limit: FEED_LIMIT,
      },
      {
        $lookup: {
          from: 'deals',
          localField: 'active_deals.deal_id',
          foreignField: '_id',
          let: { locationId: '$_id' },
          pipeline: [
            {
              $project: {
                name: 1,
                start_date: 1,
                end_date: 1,
              },
            },
          ],
          as: 'deals',
        },
      },
      { $unwind: '$deals' },
      {
        $project: {
          deal: {
            name: '$deals.name',
            _id: '$deals._id',
          },
          restaurant: {
            _id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.avatar'] },
            cover_photo: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.cover_photo'] },
          },
          location: {
            _id: '$_id',
            nickname: '$nickname',
            distance_miles: '$distance_miles',
          },
        },
      },
    ]).sort({ 'location.distance_miles': 1 })
  }

  static GetLocationFeed(page, long, lat, cuisines, dietary_requirements) {
    const query = {
      'restaurant.is_subscribed': Permissions.SUBSCRIBED,
      active_deals: { $ne: [], $exists: true },
      archived: false,
    }

    if (cuisines) {
      query.cuisines = {
        $elemMatch: {
          slug: { $in: typeof cuisines === 'string' ? [cuisines] : cuisines },
        },
      }
    }
    if (dietary_requirements) {
      query.dietary_requirements = {
        $elemMatch: {
          slug: { $in: typeof dietary_requirements === 'string' ? [dietary_requirements] : dietary_requirements },
        },
      }
    }

    return Location.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [long, lat] },
          distanceField: 'distance_miles',
          spherical: true,
          maxDistance: RADIUS_METRES,
          distanceMultiplier: METER_TO_MILE_CONVERSION,
          query: query,
        },
      },
      {
        $skip: page * FEED_LIMIT,
      },
      {
        $limit: FEED_LIMIT,
      },
      {
        $project: {
          restaurant: {
            _id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.avatar'] },
            cover_photo: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.cover_photo'] },
          },
          location: {
            _id: '$_id',
            nickname: '$nickname',
            distance_miles: '$distance_miles',
            active_deals: {
              $map: {
                input: '$active_deals',
                as: 'deal',
                in: {
                  deal_id: '$$deal.deal_id',
                  name: '$$deal.name',
                },
              },
            },
          },
        },
      },
    ]).sort({ 'location.distance_miles': 1 })
  }

  static GetSearchFeed(long, lat, text) {
    return Location.aggregate([
      {
        $search: {
          index: 'default',
          compound: {
            must: [
              {
                text: {
                  query: text,
                  path: {
                    wildcard: '*',
                  },
                  fuzzy: {
                    maxEdits: 1,
                  },
                },
              },
              {
                geoWithin: {
                  circle: {
                    center: {
                      type: 'Point',
                      coordinates: [long, lat],
                    },
                    radius: RADIUS_METRES,
                  },
                  path: 'geometry',
                },
              },
            ],
          },
        },
      },
      {
        $match: {
          'restaurant.is_subscribed': Permissions.SUBSCRIBED,
          archived: false,
        },
      },
      ...calculateDistancePipeline(lat, long, '$geometry.coordinates', 'distance_miles'),
      {
        $lookup: {
          from: 'deals',
          localField: 'active_deals.deal_id',
          foreignField: '_id',
          let: { locationId: '$_id' },
          pipeline: [
            {
              $project: {
                name: 1,
                description: 1,
                start_date: 1,
                end_date: 1,
              },
            },
          ],
          as: 'deals',
        },
      },
      { $unwind: '$deals' },
      {
        $project: {
          deal: {
            name: '$deals.name',
            description: '$deals.description',
            _id: '$deals._id',
          },
          restaurant: {
            _id: '$restaurant.id',
            name: '$restaurant.name',
            bio: '$restaurant.bio',
            avatar: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.avatar'] },
            cover_photo: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.cover_photo'] },
            cuisines: '$cuisines',
            dietary: '$dietary_requirements',
          },
          location: {
            _id: '$_id',
            nickname: '$nickname',
            distance_miles: '$distance_miles',
          },
        },
      },
    ])
  }

  static GetDiscover(long, lat) {
    return Location.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [long, lat] },
          distanceField: 'distance_miles',
          spherical: true,
          maxDistance: RADIUS_METRES,
          distanceMultiplier: METER_TO_MILE_CONVERSION,
          query: { active_deals: { $ne: [], $exists: true }, archived: false },
        },
      },
      {
        $match: {
          'restaurant.is_subscribed': Permissions.SUBSCRIBED,
        },
      },
      {
        $lookup: {
          from: 'location_followers',
          let: { locationId: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$location_id', '$$locationId'] } } }, { $count: 'count' }],
          as: 'followerCount',
        },
      },
      {
        $addFields: {
          followCount: { $ifNull: [{ $arrayElemAt: ['$followerCount.count', 0] }, 0] },
        },
      },
      {
        $sort: {
          followCount: -1,
        },
      },
      {
        $project: {
          restaurant: {
            id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.avatar'] },
            cover_photo: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.cover_photo'] },
            cuisines: '$cuisines',
            dietary: '$dietary_requirements',
          },
          location: {
            _id: '$_id',
            nickname: '$nickname',
            distance_miles: '$distance_miles',
          },
        },
      },
    ])
  }
}

export default FeedRepo
