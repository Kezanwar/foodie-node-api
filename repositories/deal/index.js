import Deal, { DealFavourites } from '#app/models/deal.js'
import Location from '#app/models/location.js'
import User from '#app/models/user.js'
import Task from '#app/services/worker/index.js'
import RepoUtil from '../util.js'
import AWS from '#app/services/aws/index.js'
import { FEED_LIMIT } from '#app/constants/deals.js'

class DealRepo {
  static GetDealByID(deal_id) {
    return Deal.findById(deal_id)
  }
  static GetActiveDeals(rest_id) {
    const today = new Date()
    return Deal.aggregate([
      // Step 1: Match only active (non-expired) deals for this restaurant
      {
        $match: {
          'restaurant.id': rest_id,
          is_expired: false,
        },
      },
      // Step 2: Lookup view statistics from deal_views collection
      // Using a pipeline for efficiency - only returns aggregated counts, not all documents
      {
        $lookup: {
          from: 'deal_views',
          let: { deal_id: '$_id' }, // Pass the deal ID as a variable
          pipeline: [
            // Filter views for this specific deal
            { $match: { $expr: { $eq: ['$deal_id', '$$deal_id'] } } },
            // Aggregate: count total views and collect unique user IDs
            { $group: { _id: null, count: { $sum: 1 }, unique_users: { $addToSet: '$user' } } },
          ],
          as: 'view_stats', // Results stored in view_stats array
        },
      },
      // Step 3: Lookup favourite statistics from deal_favourites collection
      {
        $lookup: {
          from: 'deal_favourites',
          let: { deal_id: '$_id' },
          pipeline: [
            // Filter favourites for this specific deal
            { $match: { $expr: { $eq: ['$deal_id', '$$deal_id'] } } },
            // Count favourites (more efficient than fetching all docs)
            { $count: 'count' },
          ],
          as: 'favourite_stats',
        },
      },
      // Step 4: Add computed fields for statistics and time calculations
      {
        $addFields: {
          // Count unique users who viewed this deal
          unique_views: {
            $size: { $ifNull: [{ $arrayElemAt: ['$view_stats.unique_users', 0] }, []] },
          },
          // Total view count
          views: { $ifNull: [{ $arrayElemAt: ['$view_stats.count', 0] }, 0] },
          // Total favourite count
          favourites: { $ifNull: [{ $arrayElemAt: ['$favourite_stats.count', 0] }, 0] },
          // Add id field for convenience
          id: '$_id',
          // Calculate days remaining until expiry
          days_left: {
            $cond: {
              if: { $eq: ['$end_date', null] }, // No expiry date
              then: null,
              else: {
                $cond: {
                  if: { $lt: ['$start_date', today] }, // Deal already started
                  then: {
                    // Days from today until end_date
                    $dateDiff: {
                      startDate: today,
                      endDate: '$end_date',
                      unit: 'day',
                    },
                  },
                  else: {
                    // Deal hasn't started yet - calculate total duration
                    $dateDiff: {
                      startDate: '$start_date',
                      endDate: '$end_date',
                      unit: 'day',
                    },
                  },
                },
              },
            },
          },
          // Calculate how many days the deal has been active
          days_active: {
            $cond: {
              if: { $lt: ['$start_date', today] }, // Deal has started
              then: {
                // Days from start_date until today
                $dateDiff: {
                  startDate: '$start_date',
                  endDate: today,
                  unit: 'day',
                },
              },
              else: 0, // Deal hasn't started yet
            },
          },
        },
      },
      // Step 5: Remove unnecessary fields from the response
      {
        $unset: [
          'locations',
          'restaurant',
          'cuisines',
          'dietary_requirements',
          'createdAt',
          'description',
          'view_stats', // Remove temporary stats arrays
          'favourite_stats',
        ],
      },
    ]).sort({ updatedAt: -1 }) // Sort by most recently updated
  }
  static GetActiveDealsCount(rest_id) {
    return Deal.countDocuments({
      'restaurant.id': rest_id,
      is_expired: false,
    })
  }
  static GetExpiredDeals(rest_id) {
    return Deal.aggregate([
      // Step 1: Match only expired deals for this restaurant
      {
        $match: {
          'restaurant.id': rest_id,
          is_expired: true,
        },
      },
      // Step 2: Lookup view statistics from deal_views collection
      // Using a pipeline for efficiency - only returns aggregated counts, not all documents
      {
        $lookup: {
          from: 'deal_views',
          let: { deal_id: '$_id' }, // Pass the deal ID as a variable
          pipeline: [
            // Filter views for this specific deal
            { $match: { $expr: { $eq: ['$deal', '$$deal_id'] } } },
            // Aggregate: count total views and collect unique user IDs
            { $group: { _id: null, count: { $sum: 1 }, unique_users: { $addToSet: '$user' } } },
          ],
          as: 'view_stats', // Results stored in view_stats array
        },
      },
      // Step 3: Lookup favourite statistics from deal_favourites collection
      {
        $lookup: {
          from: 'deal_favourites',
          let: { deal_id: '$_id' },
          pipeline: [
            // Filter favourites for this specific deal
            { $match: { $expr: { $eq: ['$deal', '$$deal_id'] } } },
            // Count favourites (more efficient than fetching all docs)
            { $count: 'count' },
          ],
          as: 'favourite_stats',
        },
      },
      // Step 4: Add computed fields for statistics and time calculations
      {
        $addFields: {
          // Count unique users who viewed this deal
          unique_views: {
            $size: { $ifNull: [{ $arrayElemAt: ['$view_stats.unique_users', 0] }, []] },
          },
          // Total view count
          views: { $ifNull: [{ $arrayElemAt: ['$view_stats.count', 0] }, 0] },
          // Total favourite count
          favourites: { $ifNull: [{ $arrayElemAt: ['$favourite_stats.count', 0] }, 0] },
          // Add id field for convenience
          id: '$_id',
          // Calculate how long the deal was active (from start to end)
          days_active: {
            $cond: {
              if: { $lt: ['$start_date', new Date()] }, // Deal had started
              then: {
                // Days from start_date to end_date
                $dateDiff: {
                  startDate: '$start_date',
                  endDate: '$end_date',
                  unit: 'day',
                },
              },
              else: 0, // Deal was never active (edge case)
            },
          },
        },
      },
      // Step 5: Remove unnecessary fields from the response
      {
        $unset: [
          'locations',
          'restaurant',
          'cuisines',
          'dietary_requirements',
          'createdAt',
          'description',
          'view_stats', // Remove temporary stats arrays
          'favourite_stats',
        ],
      },
    ]).sort({ updatedAt: -1 }) // Sort by most recently updated
  }
  static async GetSingleDealWithStatsByID(rest_id, deal_id) {
    const deal = await Deal.aggregate([
      // Step 1: Match the specific deal by restaurant and deal ID
      {
        $match: {
          'restaurant.id': rest_id,
          _id: RepoUtil.makeMongoIDs(deal_id),
        },
      },
      // Step 2: Calculate how many days the deal has been active
      {
        $addFields: {
          days_active: {
            $dateDiff: {
              startDate: '$start_date',
              endDate: new Date(),
              unit: 'day',
            },
          },
        },
      },
      // Step 3: Lookup view statistics from deal_views collection
      // Using a pipeline for efficiency - only returns aggregated counts, not all documents
      {
        $lookup: {
          from: 'deal_views',
          let: { deal_id: '$_id' }, // Pass the deal ID as a variable
          pipeline: [
            // Filter views for this specific deal
            { $match: { $expr: { $eq: ['$deal_id', '$$deal_id'] } } },
            // Aggregate: count total views and collect unique user IDs
            { $group: { _id: null, count: { $sum: 1 }, unique_users: { $addToSet: '$user' } } },
          ],
          as: 'view_stats', // Results stored in view_stats array
        },
      },
      // Step 4: Lookup favourite statistics from deal_favourites collection
      {
        $lookup: {
          from: 'deal_favourites',
          let: { deal_id: '$_id' },
          pipeline: [
            // Filter favourites for this specific deal
            { $match: { $expr: { $eq: ['$deal_id', '$$deal_id'] } } },
            // Count favourites (more efficient than fetching all docs)
            { $count: 'count' },
          ],
          as: 'favourite_stats',
        },
      },
      // Step 5: Extract the counts into a counts object
      {
        $addFields: {
          counts: {
            // Count unique users who viewed this deal
            unique_views: {
              $size: { $ifNull: [{ $arrayElemAt: ['$view_stats.unique_users', 0] }, []] },
            },
            // Total view count
            views: { $ifNull: [{ $arrayElemAt: ['$view_stats.count', 0] }, 0] },
            // Total favourite count
            favourites: { $ifNull: [{ $arrayElemAt: ['$favourite_stats.count', 0] }, 0] },
          },
        },
      },
      // Step 6: Calculate daily averages for each metric
      // Average = total count / days_active (only if days_active >= 1)
      {
        $addFields: {
          averages: {
            // Average unique views per day
            unique_views: {
              $cond: {
                if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['$counts.unique_views', 1] }] },
                then: {
                  $divide: ['$counts.unique_views', '$days_active'],
                },
                else: '$counts.unique_views', // If less than 1 day active, use raw count
              },
            },
            // Average total views per day
            views: {
              $cond: {
                if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['$counts.views', 1] }] },
                then: {
                  $divide: ['$counts.views', '$days_active'],
                },
                else: '$counts.views',
              },
            },
            // Average favourites per day
            favourites: {
              $cond: {
                if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['$counts.favourites', 1] }] },
                then: {
                  $divide: ['$counts.favourites', '$days_active'],
                },
                else: '$counts.favourites',
              },
            },
          },
        },
      },
      // Step 7: Remove unnecessary fields from the response
      {
        $unset: [
          'restaurant',
          'cuisines',
          'dietary_requirements',
          'createdAt',
          'view_stats', // Remove temporary stats arrays
          'favourite_stats',
        ],
      },
    ])
    return deal[0]
  }
  static async GetDealAsTemplateByID(rest_id, deal_id) {
    const deal = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': rest_id,
          _id: RepoUtil.makeMongoIDs(deal_id),
        },
      },
      {
        $unset: [
          'views',
          'favourites',
          'restaurant',
          'cuisines',
          'dietary_requirements',
          'createdAt',
          'updatedAt',
          'is_expired',
          'start_date',
          'end_date',
          'locations',
        ],
      },
    ])
    return deal[0]
  }
  static async CreateNewDeal(rest_id, new_deal, locations) {
    //save new deal
    const dealProm = new_deal.save()

    //add deal as active to locations list
    const locProm = Location.updateMany(
      {
        'restaurant.id': rest_id,
        _id: { $in: locations },
      },
      { $push: { active_deals: { deal_id: new_deal._id, name: new_deal.name, description: new_deal.description } } }
    )

    await Promise.all([dealProm, locProm])
  }
  static async EditDeal(rest_id, deal, new_data, new_locations) {
    const find = await Task.editDealFindLocationsToAddRemoveAndUpdate(deal, new_locations)

    const { remove, add, update } = find

    const { name, description, end_date, locations } = new_data

    const promises = []

    if (remove.length) {
      //remove deal from these locations active deals
      promises.push(
        Location.updateMany(
          {
            'restaurant.id': rest_id,
            _id: { $in: remove },
          },
          { $pull: { active_deals: { deal_id: deal._id } } }
        )
      )
    }

    if (add.length) {
      //add updated deal to new locations
      promises.push(
        Location.updateMany(
          {
            'restaurant.id': rest_id,
            _id: { $in: add },
          },
          { $push: { active_deals: { deal_id: deal._id, name: name, description: description } } }
        )
      )
    }

    if (update.length) {
      promises.push(
        Location.updateMany(
          {
            'restaurant.id': rest_id,
            _id: { $in: update },
            active_deals: { $elemMatch: { deal_id: deal._id } },
          },
          {
            $set: {
              'active_deals.$.name': name,
              'active_deals.$.description': description,
            },
          }
        )
      )
    }

    deal.name = name
    deal.description = description
    deal.end_date = end_date
    deal.locations = locations

    promises.push(deal.save())

    await Promise.all(promises)
  }
  static async ExpireDeal(rest_id, deal, end_date) {
    //remove from location active deals
    const locationsProm = Location.updateMany(
      {
        'restaurant.id': rest_id,
      },
      { $pull: { active_deals: { deal_id: deal._id } } }
    )
    //save deal
    deal.is_expired = true
    deal.end_date = end_date
    await Promise.all([locationsProm, deal.save()])
  }
  static async HardDeleteDeal(rest_id, deal) {
    // delete the deal
    const dealProm = deal.deleteOne()

    //remove from location active deals
    const locationsProm = Location.updateMany(
      {
        'restaurant.id': rest_id,
      },
      { $pull: { active_deals: { deal_id: deal._id } } }
    )

    //remove the deal from user favourites
    const userProm = User.updateMany({}, { $pull: { favourites: { deal: deal._id } } })

    await Promise.all([dealProm, locationsProm, userProm])
  }

  static async DoesFavouriteExist(user, deal_id, location_id) {
    return DealFavourites.exists({
      deal_id: deal_id,
      user_id: user._id,
      location_id: location_id,
    })
  }

  static async FavouriteOneDeal(user, deal_id, location_id) {
    const deal = await Deal.findById(deal_id).select('restaurant.id').lean()

    const favourite = new DealFavourites({
      deal_id: deal_id,
      user_id: user._id,
      restaurant_id: deal.restaurant.id,
      location_id: location_id,
      user_geo: user.geometry?.coordinates || null,
    })

    await favourite.save()
  }

  static async UnfavouriteOneDeal(user, deal_id, location_id) {
    await DealFavourites.deleteOne({
      user_id: user._id,
      location_id: location_id,
      deal_id: deal_id,
    })
  }

  static async GetFavourites(user, page) {
    const pageStart = page === 0 ? page : page * FEED_LIMIT

    const results = await DealFavourites.aggregate([
      {
        $match: {
          user_id: user._id,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'locations',
          localField: 'location_id',
          foreignField: '_id',
          as: 'locationData',
        },
      },
      { $unwind: '$locationData' },
      {
        $match: {
          'locationData.restaurant.is_subscribed': { $exists: true, $ne: null },
          'locationData.archived': false,
        },
      },
      {
        $lookup: {
          from: 'deals',
          localField: 'deal_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                name: 1,
                is_expired: 1,
                deleted: 1,
                restaurant: 1,
              },
            },
          ],
          as: 'dealData',
        },
      },
      { $unwind: '$dealData' },
      {
        $match: {
          'dealData.is_expired': { $ne: true },
          'dealData.deleted': { $ne: true },
        },
      },
      { $skip: pageStart },
      { $limit: FEED_LIMIT },
      {
        $project: {
          restaurant: {
            id: '$dealData.restaurant.id',
            name: '$dealData.restaurant.name',
            avatar: { $concat: [AWS.USER_IMAGE_PREFIX, '$dealData.restaurant.avatar'] },
            cover_photo: { $concat: [AWS.USER_IMAGE_PREFIX, '$dealData.restaurant.cover_photo'] },
            is_subscribed: '$dealData.restaurant.is_subscribed',
          },
          deal: {
            _id: '$dealData._id',
            name: '$dealData.name',
            is_expired: '$dealData.is_expired',
          },
          location: {
            _id: '$locationData._id',
            nickname: '$locationData.nickname',
            restaurant: '$locationData.restaurant',
          },
        },
      },
    ])

    return results
  }

  static GetCustomerViewSingleDeal(deal_id, location_id) {
    const [dealID, locationID] = RepoUtil.makeMongoIDs(deal_id, location_id)
    return Deal.aggregate([
      {
        $match: {
          _id: dealID,
        },
      },
      {
        $addFields: {
          matchedLocation: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$locations',
                  as: 'location',
                  cond: { $eq: ['$$location.location_id', locationID] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $lookup: {
          from: 'locations',
          localField: 'matchedLocation.location_id',
          foreignField: '_id',
          as: 'loc',
          pipeline: [
            {
              $project: {
                _id: 1,
                opening_times: 1,
                address: 1,
                phone_number: 1,
                email: 1,
                coordinates: '$geometry.coordinates',
                nickname: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'restaurants',
          localField: 'restaurant.id',
          foreignField: '_id',
          as: 'rest',
          pipeline: [
            {
              $project: {
                bio: 1,
                booking_link: 1,
                is_subscribed: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          restaurant: {
            id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.avatar'] },
            cover_photo: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.cover_photo'] },
            bio: '$restaurant.bio',
            booking_link: { $arrayElemAt: ['$rest.booking_link', 0] },
            is_subscribed: { $arrayElemAt: ['$rest.is_subscribed', 0] },
          },
          name: 1,
          description: 1,
          location: { $arrayElemAt: ['$loc', 0] },
          cuisines: 1,
          dietary_requirements: 1,
          is_expired: 1,
          end_date: 1,
        },
      },
    ])
  }

  static async BulkExpireDealsFromDate(date) {
    const filter = { end_date: { $ne: null, $lte: date }, is_expired: false }
    const toExpire = await Deal.find(filter)
    const proms = toExpire.map((deal) =>
      Location.updateMany(
        {
          'restaurant.id': deal.restaurant.id,
        },
        { $pull: { active_deals: { deal_id: deal._id } } }
      )
    )
    await Promise.all(proms)
    const expiredReq = await Deal.updateMany(filter, { is_expired: true })
    return expiredReq
  }

  static async GetAllDealsLocationFollowersWithPushtokens(deal) {
    const locationIds = deal.locations.map((l) => l.location_id)

    //get locations with their followers and user push tokens
    const locations = await Location.aggregate([
      { $match: { _id: { $in: locationIds } } },
      {
        $lookup: {
          from: 'location_followers',
          localField: '_id',
          foreignField: 'location_id',
          as: 'locationFollowers',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'locationFollowers.user_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                first_name: 1,
                push_tokens: 1,
              },
            },
          ],
          as: 'followers',
        },
      },
      {
        $project: {
          restaurant_name: '$restaurant.name',
          location_name: '$nickname',
          followers: 1,
        },
      },
    ])

    return locations
  }
}

export default DealRepo
