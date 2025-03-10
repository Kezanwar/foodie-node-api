import dotenv from 'dotenv'
dotenv.config()
import { connect, isValidObjectId, Types } from 'mongoose'
import { CUISINES_DATA, DIETARY_REQUIREMENTS } from '#app/constants/categories.js'
import { FEED_LIMIT, METER_TO_MILE_CONVERSION, RADIUS_METRES } from '#app/constants/deals.js'
import User from '#app/models/User.js'
import Restaurant from '#app/models/Restaurant.js'
import Location from '#app/models/Location.js'
import Deal from '#app/models/Deal.js'
import Task from '#app/services/worker/index.js'
import IMG from '#app/services/image/index.js'
import Cuisine from '#app/models/Cuisine.js'
import DietaryRequirement from '#app/models/DietaryRequirement.js'
import { calculateDistancePipeline } from '#app/utilities/distance-pipeline.js'

import Permissions from '../permissions/index.js'
import { MONGO_URI, S3BaseUrl } from '#app/config/config.js'

class DB {
  //admin

  static async setCuisineOptions() {
    await Cuisine.deleteMany({})

    const data = this.#prepareOptionsForDB(CUISINES_DATA)

    for await (const d of data) {
      const option = new Cuisine(d)
      await option.save()
    }
  }

  static async setDietaryOptions() {
    await DietaryRequirement.deleteMany({})

    const data = this.#prepareOptionsForDB(DIETARY_REQUIREMENTS)

    for await (const d of data) {
      const option = new DietaryRequirement(d)
      await option.save()
    }
  }

  static async getDBBackup() {}

  //connection
  static async connect() {
    try {
      await connect(MONGO_URI, { autoIndex: true })
      console.log('mongo-db connected 🚀')
    } catch (error) {
      console.error('mongo-db failed to connect... 😡')
      // Exit proccess with failure
      process.exit(1)
    }
  }

  //usertype:common user
  static getUserByID(id) {
    return User.findById(id)
  }
  static getUserByEmail(email) {
    return User.findOne({ email: email.toLowerCase() })
  }
  static getUserByEmailWithPassword(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+password')
  }
  static async updateUser(user, data) {
    const dataArr = Object.entries(data)
    dataArr.forEach(([key, value]) => {
      user[key] = value
    })
    await user.save()
  }

  //usertype:customer
  static async saveNewUserPushToken(user, pushToken) {
    user.push_tokens.push(pushToken)
    await user.save()
  }

  static setUserGeometry(user, long, lat) {
    return User.updateOne({ _id: user._id }, { $set: { geometry: { coordinates: [long, lat] } } })
  }

  static async getUserAndRestaurantByStripeCustomerID(customer_id) {
    const res = await User.aggregate([
      { $match: { 'subscription.stripe_customer_id': customer_id } },
      {
        $lookup: {
          from: 'restaurants',
          foreignField: '_id',
          localField: 'restaurant.id',
          as: 'rest',
          pipeline: [
            {
              $project: {
                name: 1,
                super_admin: 1,
                status: 1,
                is_subscribed: 1,
                tier: 1,
              },
            },
          ],
        },
      },
      {
        $project: {
          user: {
            _id: '$_id',
            first_name: '$first_name',
            last_name: '$last_name',
            email: '$email',
            subscription: '$subscription',
          },
          restaurant: { $arrayElemAt: ['$rest', 0] },
        },
      },
    ])
    return res[0]
  }

  static async RUnsubscribeRestaurant(user_id, rest_id) {
    const user = User.updateOne(
      { _id: user_id },
      {
        $set: {
          'subscription.subscription_tier': Permissions.NOT_SUBSCRIBED,
          'subscription.has_unsubscribed': true,
        },
      }
    )

    const rest = Restaurant.updateOne({ _id: rest_id }, { is_subscribed: Permissions.NOT_SUBSCRIBED })

    const locations = Location.updateMany(
      { 'restaurant.id': rest_id },
      {
        $set: {
          'restaurant.is_subscribed': Permissions.NOT_SUBSCRIBED,
          active_deals: [],
        },
      }
    )

    const deals = Deal.updateMany({ 'restaurant.id': rest_id, end_date: new Date() }, { is_expired: true })

    await Promise.all([user, rest, locations, deals])
  }

  //usertype:common options
  static getCuisines() {
    return Cuisine.aggregate([
      {
        $project: {
          name: 1,
          slug: 1,
        },
      },
    ])
  }
  static getDietaryRequirements() {
    return DietaryRequirement.aggregate([
      {
        $project: {
          name: 1,
          slug: 1,
        },
      },
    ])
  }

  //usertype:restuarant restaurant
  static RGetRestaurantByID(id) {
    return Restaurant.findById(id)
  }
  static RGetRestaurantByIDWithSuperAdmin(id) {
    return Restaurant.findById(id).select('+super_admin')
  }
  static async RCreateNewRestaurant(company_info, user) {
    const rest = new Restaurant({
      company_info,
      super_admin: user._id,
      image_uuid: IMG.createImgUUID(),
    })
    user.restaurant = { id: rest._id, role: Permissions.ROLE_SUPER_ADMIN }

    await Promise.all([rest.save(), user.save()])
    return { restaurant: rest, user: user }
  }
  static async RUpdateApplicationRestaurant(restaurant, data) {
    const dataArr = Object.entries(data)
    dataArr.forEach(([key, value]) => {
      restaurant[key] = value
    })
    await restaurant.save()
  }
  static async RUpdateAcceptedRestaurant(restaurant, data) {
    const promises = []

    //if new data has changes that effect locations/deals
    //update locations and deals
    let dealSet = null
    let locationSet = null

    const { name, bio, cuisines, dietary_requirements, avatar, cover_photo } =
      this.#onRestUpdateCheckNewLocationAndDealDataChanges(restaurant, data)

    if (name || cuisines || dietary_requirements || avatar || cover_photo) {
      dealSet = {}
      locationSet = {}
    }

    if (name) {
      dealSet['restaurant.name'] = data.name
      locationSet['restaurant.name'] = data.name
    }

    if (avatar) {
      dealSet['restaurant.avatar'] = data.avatar
      locationSet['restaurant.avatar'] = data.avatar
    }
    if (cover_photo) {
      dealSet['restaurant.cover_photo'] = data.cover_photo
      locationSet['restaurant.cover_photo'] = data.cover_photo
    }

    if (cuisines) {
      dealSet.cuisines = data.cuisines
      locationSet.cuisines = data.cuisines
    }

    if (dietary_requirements) {
      dealSet.dietary_requirements = data.dietary_requirements
      locationSet.dietary_requirements = data.dietary_requirements
    }

    if (bio) {
      if (!locationSet) {
        locationSet = {}
      }
      locationSet['restaurant.bio'] = data.bio
    }

    if (dealSet) {
      promises.push(Deal.updateMany({ 'restaurant.id': restaurant._id }, { $set: dealSet }))
    }

    if (locationSet) {
      promises.push(Location.updateMany({ 'restaurant.id': restaurant._id }, { $set: locationSet }))
    }

    const dataArr = Object.entries(data)
    dataArr.forEach(([key, value]) => {
      restaurant[key] = value
    })

    promises.push(restaurant.save())

    await Promise.all(promises)
  }

  static RSetRestaurantIsSubscribed(rest_id, is_subscribed) {
    return Restaurant.updateOne(
      { _id: rest_id },
      {
        $set: {
          is_subscribed: is_subscribed,
        },
      }
    )
  }

  //usertype:customer restaurant
  static async CGetSingleRestaurantLocation(location_id) {
    const res = await Location.aggregate([
      {
        $match: {
          _id: DB.makeMongoIDs(location_id),
        },
      },
      {
        $lookup: {
          from: 'deals',
          foreignField: '_id',
          localField: 'active_deals.deal_id',
          pipeline: [
            {
              $project: {
                name: 1,
              },
            },
          ],
          as: 'deals',
        },
      },
      {
        $lookup: {
          from: 'restaurants',
          foreignField: '_id',
          localField: 'restaurant.id',
          pipeline: [
            {
              $project: {
                bio: 1,
                booking_link: 1,
                is_subscribed: 1,
              },
            },
          ],
          as: 'rest',
        },
      },
      {
        $project: {
          nickname: 1,
          restaurant: {
            booking_link: { $arrayElemAt: ['$rest.booking_link', 0] },
            bio: { $arrayElemAt: ['$rest.bio', 0] },
            avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
            cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
            name: '$restaurant.name',
            _id: '$restaurant.id',
            is_subscribed: { $arrayElemAt: ['$rest.is_subscribed', 0] },
          },
          address: 1,
          phone_number: 1,
          email: 1,
          opening_times: 1,
          dietary_requirements: 1,
          cuisines: 1,
          distance_miles: 1,
          active_deals: '$deals',
          coordinates: '$geometry.coordinates',
        },
      },
    ])
    return res[0]
  }

  //usertype:restaurant locations
  static RGetRestaurantLocations(id) {
    return Location.find({ 'restaurant.id': id }).select(
      '-cuisines -dietary_requirements -restaurant -active_deals -views -followers -booking_clicks'
    )
  }
  static async RCreateNewLocation(data) {
    const location = new Location(data)
    await location.save()
    return location
  }
  static async RDeleteOneLocation(rest_id, location_id) {
    //delete the locations
    const locationProm = Location.deleteOne({ _id: location_id })
    //remove from all deals
    const dealProm = Deal.updateMany(
      {
        'restaurant.id': rest_id,
      },
      {
        $pull: {
          locations: { location_id: location_id },
        },
      }
    )

    const userProm = User.bulkWrite([
      {
        updateMany: {
          filter: {},
          update: {
            $pull: {
              favourites: { location_id: location_id },
            },
          },
        },
      },
      {
        updateMany: {
          filter: {},
          update: {
            $pull: {
              following: location_id,
            },
          },
        },
      },
    ])
    //remove all favourites with location and all follows

    await Promise.all([locationProm, dealProm, userProm])
  }
  static async RUpdateOneLocation(rest_id, location_id, data) {
    const { nickname, address, phone_number, email, opening_times, long_lat } = data
    const locationID = this.makeMongoIDs(location_id)

    //update the location
    const locationUpdateProm = Location.updateOne(
      { 'restaurant.id': rest_id, _id: locationID },
      {
        $set: {
          nickname: nickname,
          address: address,
          phone_number,
          email: email,
          opening_times: opening_times,
          geometry: { coordinates: [long_lat.long, long_lat.lat] },
        },
      }
    )

    //update all deals that have this location
    const allDealUpdateProm = Deal.updateMany(
      {
        'restaurant.id': rest_id,
      },
      {
        $set: {
          'locations.$[loc].nickname': nickname,
          'locations.$[loc].geometry': { coordinates: [long_lat.long, long_lat.lat] },
        },
      },
      {
        arrayFilters: [{ 'loc.location_id': locationID }],
      }
    )
    await Promise.all([locationUpdateProm, allDealUpdateProm])
  }

  static RSetLocationsIsSubscribed(rest_id, is_subscribed) {
    return Location.updateMany(
      { 'restaurant.id': rest_id },
      {
        $set: {
          'restaurant.is_subscribed': is_subscribed,
        },
      }
    )
  }

  //usertype:restaurant dashboard
  static RGetActiveDealsCount(id) {
    return Deal.countDocuments({
      'restaurant.id': id,
      is_expired: false,
    })
  }
  static RGetExpiredDealsCount(id) {
    return Deal.countDocuments({
      'restaurant.id': id,
      $or: [{ is_expired: true }],
    })
  }
  static async RGetDealStats(id) {
    const res = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': id,
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
  static RGetRestaurantLocationsCount(id) {
    return Location.countDocuments({ 'restaurant.id': id })
  }
  static async RGetLocationStats(id) {
    const res = await Location.aggregate([
      { $match: { 'restaurant.id': id } },
      {
        $project: {
          followersLength: {
            $cond: {
              if: { $isArray: '$followers' }, // Check if the field is an array
              then: { $size: '$followers' }, // If it's an array, get its size
              else: 0, // If it's not an array (or doesn't exist), fallback to 0
            },
          },
          bookingClickLength: {
            $cond: {
              if: { $isArray: '$booking_clicks' }, // Check if the field is an array
              then: { $size: '$booking_clicks' }, // If it's an array, get its size
              else: 0, // If it's not an array (or doesn't exist), fallback to 0
            },
          },
          viewsLength: {
            $cond: {
              if: { $isArray: '$views' }, // Check if the field is an array
              then: { $size: '$views' }, // If it's an array, get its size
              else: 0, // If it's not an array (or doesn't exist), fallback to 0
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

  //usertype:restaurant deals
  static RGetDealByID(id) {
    return Deal.findById(id)
  }
  static RGetActiveDeals(id) {
    const today = new Date()
    return Deal.aggregate([
      {
        $match: {
          'restaurant.id': id,
          is_expired: false,
        },
      },
      {
        $addFields: {
          unique_views: {
            $sum: {
              $size: { $setUnion: [[], '$views'] },
            },
          },
          views: { $size: '$views' },
          favourites: { $size: '$favourites' },
          id: '$_id',
          // days_left: {
          //   $cond: {
          //     if: { $lt: ['$start_date', today] },
          //     then: {
          //       $dateDiff: {
          //         startDate: today,
          //         endDate: '$end_date',
          //         unit: 'day',
          //       },
          //     },
          //     else: {
          //       $dateDiff: {
          //         startDate: '$start_date',
          //         endDate: '$end_date',
          //         unit: 'day',
          //       },
          //     },
          //   },
          // },
          days_left: {
            $cond: {
              if: { $eq: ['$end_date', null] }, // If end_date is null, return Infinity or a string
              then: null, // Or you can use `null` or `-1` to indicate no expiration
              else: {
                $cond: {
                  if: { $lt: ['$start_date', today] },
                  then: {
                    $dateDiff: {
                      startDate: today,
                      endDate: '$end_date',
                      unit: 'day',
                    },
                  },
                  else: {
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
          days_active: {
            $cond: {
              if: { $lt: ['$start_date', today] },
              then: {
                $dateDiff: {
                  startDate: '$start_date',
                  endDate: today,
                  unit: 'day',
                },
              },
              else: 0,
            },
          },
        },
      },
      {
        $unset: ['locations', 'restaurant', 'cuisines', 'dietary_requirements', 'createdAt', 'description'],
      },
    ]).sort({ updatedAt: -1 })
  }
  static RGetExpiredDeals(id) {
    return Deal.aggregate([
      {
        $match: {
          'restaurant.id': id,
          is_expired: true,
        },
      },
      {
        $addFields: {
          unique_views: {
            $sum: {
              $size: { $setUnion: [[], '$views'] },
            },
          },
          views: { $size: '$views' },
          favourites: { $size: '$favourites' },
          id: '$_id',
          days_active: {
            $cond: {
              if: { $lt: ['$start_date', new Date()] },
              then: {
                $dateDiff: {
                  startDate: '$start_date',
                  endDate: '$end_date',
                  unit: 'day',
                },
              },
              else: 0,
            },
          },
        },
      },
      {
        $unset: ['locations', 'restaurant', 'cuisines', 'dietary_requirements', 'createdAt', 'description'],
      },
    ]).sort({ updatedAt: -1 })
  }
  static async RGetSingleDealWithStatsByID(rest_id, deal_id) {
    const deal = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': rest_id,
          _id: this.makeMongoIDs(deal_id),
        },
      },
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
      {
        $addFields: {
          counts: {
            unique_views: {
              $sum: {
                $size: { $setUnion: [[], '$views'] },
              },
            },
            views: { $size: '$views' },
            favourites: { $size: '$favourites' },
          },
        },
      },
      {
        $addFields: {
          averages: {
            unique_views: {
              $cond: {
                if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['$counts.unique_views', 1] }] },
                then: {
                  $divide: ['$counts.unique_views', '$days_active'],
                },
                else: '$counts.unique_views',
              },
            },
            views: {
              $cond: {
                if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['$counts.views', 1] }] },
                then: {
                  $divide: ['$counts.views', '$days_active'],
                },
                else: '$counts.views',
              },
            },
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
      {
        $unset: ['views', 'favourites', 'restaurant', 'cuisines', 'dietary_requirements', 'createdAt'],
      },
    ])
    return deal[0]
  }
  static async RGetDealAsTemplateByID(rest_id, deal_id) {
    const deal = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': rest_id,
          _id: this.makeMongoIDs(deal_id),
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
  static async RCreateNewDeal(rest_id, newDeal, newLocationsList) {
    //save new deal
    const dealProm = newDeal.save()

    //add deal as active to locations list
    const locProm = Location.updateMany(
      {
        'restaurant.id': rest_id,
        _id: { $in: newLocationsList },
      },
      { $push: { active_deals: { deal_id: newDeal._id, name: newDeal.name, description: newDeal.description } } }
    )

    await Promise.all([dealProm, locProm])
  }
  static async REditOneDeal(rest_id, currDeal, newData, newLocationsList) {
    const find = await Task.editDealFindLocationsToAddRemoveAndUpdate(currDeal, newLocationsList)

    const { remove, add, update } = find

    const { name, description, end_date, locations } = newData

    const promises = []

    if (remove.length) {
      //remove deal from these locations active deals
      promises.push(
        Location.updateMany(
          {
            'restaurant.id': rest_id,
            _id: { $in: remove },
          },
          { $pull: { active_deals: { deal_id: currDeal._id } } }
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
          { $push: { active_deals: { deal_id: currDeal._id, name: name, description: description } } }
        )
      )
    }

    if (update.length) {
      promises.push(
        Location.updateMany(
          {
            'restaurant.id': rest_id,
            _id: { $in: update },
            active_deals: { $elemMatch: { deal_id: currDeal._id } },
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

    currDeal.name = name
    currDeal.description = description
    currDeal.end_date = end_date
    currDeal.locations = locations

    promises.push(currDeal.save())

    await Promise.all(promises)
  }
  static async RExpireOneDeal(rest_id, deal, end_date) {
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
  static async RBulkExpireDealsFromDate(date) {
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
  static async RDeleteOneDeal(rest_id, deal) {
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
  static async RBulkAddAppUserStats(statsMap) {
    const dealUpdates = Object.entries(statsMap.deals).map(([deal_id, recent_views]) => {
      return {
        updateOne: {
          filter: {
            _id: deal_id,
          },
          update: {
            $push: {
              views: { $each: recent_views },
            },
          },
        },
      }
    })

    const locationUpdates = Object.entries(statsMap.locations).map(
      ([location_id, { views = [], booking_clicks = [] }]) => {
        return {
          updateOne: {
            filter: {
              _id: location_id,
            },
            update: {
              $push: {
                views: { $each: views },
                booking_clicks: { $each: booking_clicks },
              },
            },
          },
        }
      }
    )

    await Promise.all([Deal.bulkWrite(dealUpdates), Location.bulkWrite(locationUpdates)])
  }

  //usertype:customer deals
  static CGetFeed(user, page, long, lat, cuisines, dietary_requirements) {
    const query = { 'restaurant.is_subscribed': Permissions.SUBSCRIBED, active_deals: { $ne: [], $exists: true } }

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
          from: 'deals', // Replace with the name of your linked collection
          localField: 'active_deals.deal_id',
          foreignField: '_id',
          let: { locationId: '$_id' },
          pipeline: [
            {
              $project: {
                match_fav: {
                  $filter: {
                    input: '$favourites',
                    as: 'fav',
                    cond: {
                      $and: [{ $eq: ['$$fav.user', user._id] }, { $eq: ['$$fav.location_id', '$$locationId'] }],
                    },
                    limit: 1,
                  },
                },
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
            is_favourited: {
              $cond: {
                if: { $eq: [{ $size: { $ifNull: ['$deals.match_fav', []] } }, 1] },
                then: true,
                else: false,
              },
            },
          },
          restaurant: {
            _id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
            cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
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
  static CGetHomeFeed(user, page, long, lat, cuisines, dietary_requirements) {
    const query = { 'restaurant.is_subscribed': Permissions.SUBSCRIBED, active_deals: { $ne: [], $exists: true } }

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
            avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
            cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
          },
          location: {
            _id: '$_id',
            nickname: '$nickname',
            distance_miles: '$distance_miles',
            active_deals: '$active_deals',
          },
        },
      },
    ]).sort({ 'location.distance_miles': 1 })
  }
  static CGetSearchFeed(user, long, lat, text) {
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
        },
      },
      ...calculateDistancePipeline(lat, long, '$geometry.coordinates', 'distance_miles'),
      {
        $lookup: {
          from: 'deals', // Replace with the name of your linked collection
          localField: 'active_deals.deal_id',
          foreignField: '_id',
          let: { locationId: '$_id' },
          pipeline: [
            {
              $project: {
                match_fav: {
                  $filter: {
                    input: '$favourites',
                    as: 'fav',
                    cond: {
                      $and: [{ $eq: ['$$fav.user', user._id] }, { $eq: ['$$fav.location_id', '$$locationId'] }],
                    },
                    limit: 1,
                  },
                },
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
            is_favourited: {
              $cond: {
                if: { $eq: [{ $size: { $ifNull: ['$deals.match_fav', []] } }, 1] },
                then: true,
                else: false,
              },
            },
          },
          restaurant: {
            _id: '$restaurant.id',
            name: '$restaurant.name',
            bio: '$restaurant.bio',
            avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
            cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
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
  static CGetSingleDeal(deal_id, location_id) {
    const [dealID, locationID] = this.makeMongoIDs(deal_id, location_id)
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
          from: 'locations', // Replace with the name of your linked collection
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
          from: 'restaurants', // Replace with the name of your linked collection
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
            avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
            cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
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

  //usertype:customer discover
  static CGetDiscover(long, lat) {
    return Location.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [long, lat] },
          distanceField: 'distance_miles',
          spherical: true,
          maxDistance: RADIUS_METRES,
          distanceMultiplier: METER_TO_MILE_CONVERSION,
          query: { active_deals: { $ne: [], $exists: true } },
        },
      },
      {
        $match: {
          'restaurant.is_subscribed': Permissions.SUBSCRIBED,
        },
      },
      {
        $addFields: {
          followCount: { $size: '$followers' },
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
            avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
            cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
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

  //usertype:customer favourite
  static async CFavouriteOneDeal(user, deal_id, location_id) {
    const newDealFavourite = { user: user._id, location_id, user_geo: user.geometry.coordinates }
    const dealProm = Deal.updateOne(
      {
        _id: deal_id,
      },
      { $push: { favourites: { $each: [newDealFavourite], $position: 0 } } }
    )

    const newUserFavourite = { deal: deal_id, location_id }
    const userProm = User.updateOne(
      {
        _id: user._id,
      },
      { $push: { favourites: { $each: [newUserFavourite], $position: 0 } } }
    )

    await Promise.all([dealProm, userProm])
  }
  static async CUnfavouriteOneDeal(user, deal_id, location_id) {
    const dealProm = Deal.updateOne({ _id: deal_id }, { $pull: { favourites: { user: user._id, location_id } } })
    const userProm = User.updateOne({ _id: user._id }, { $pull: { favourites: { deal: deal_id, location_id } } })
    await Promise.all([dealProm, userProm])
  }
  static async CGetFavourites(user, page) {
    const pageStart = page === 0 ? page : page * FEED_LIMIT

    const sliced = user.favourites.slice(pageStart, pageStart + FEED_LIMIT)
    const findLocations = sliced.map((f) => f.location_id)
    const findDeals = sliced.map((f) => f.deal)

    const loctionsProm = Location.aggregate([
      {
        $match: {
          _id: { $in: findLocations },
        },
      },
      {
        $project: {
          location: {
            nickname: '$nickname',
            restaurant: '$restaurant',
            _id: '$_id',
          },
        },
      },
    ])

    const dealsProm = Deal.find({
      _id: { $in: findDeals },
    }).select('restaurant name is_expired')

    const [locations, deals] = await Promise.all([loctionsProm, dealsProm])

    const results = await Task.buildCustomerFavouritesListFromResults(sliced, locations, deals)

    return results
  }

  //usertype:customer follow
  static async CFollowOneRestauarant(user, location_id) {
    const locProm = await Location.updateOne(
      {
        _id: location_id,
      },
      { $push: { followers: { $each: [user._id], $position: 0 } } }
    )

    const userProm = User.updateOne(
      {
        _id: user._id,
      },
      { $push: { following: { $each: [location_id], $position: 0 } } }
    )

    await Promise.all([locProm, userProm])
  }
  static async CUnfollowOneRestaurant(user, location_id) {
    const locProm = Location.updateOne(
      {
        _id: location_id,
      },
      { $pull: { followers: user._id } }
    )
    const userProm = User.updateOne({ _id: user._id }, { $pull: { following: location_id } })

    await Promise.all([locProm, userProm])
  }
  static async CGetFollowing(user, page) {
    const pageStart = page === 0 ? page : page * FEED_LIMIT

    const following = user.following.slice(pageStart, pageStart + FEED_LIMIT)

    const results = await Location.aggregate([
      {
        $match: {
          _id: { $in: following },
          'restaurant.is_subscribed': Permissions.SUBSCRIBED,
        },
      },
      {
        $addFields: {
          index: {
            $indexOfArray: [following, '$_id'],
          },
        },
      },
      { $sort: { index: 1 } },
      {
        $project: {
          location: {
            nickname: '$nickname',
            _id: '$_id',
            coordinates: '$geometry.coordinates',
          },
          restaurant: {
            id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
            cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
          },
        },
      },
    ])
    return results
  }

  //notifications
  static clearPushTokenFromOtherUsers(pushToken, user_id) {
    const filter = user_id
      ? { $and: [{ push_tokens: pushToken }, { _id: { $ne: user_id } }] }
      : { push_tokens: pushToken }

    return User.updateMany(filter, { $pull: { push_tokens: pushToken } })
  }
  static async getAllDealsLocationFollowersWithPushtokens(deal) {
    //get locations
    const locations = await Location.aggregate([
      { $match: { _id: { $in: deal.locations.map((l) => l.location_id) } } },
      {
        $project: {
          restaurant_name: '$restaurant.name',
          location_name: '$nickname',
        },
      },
    ])

    //get followers pushtokens
    const followerProms = locations.map((loc) => User.find({ following: loc._id }).select('first_name push_tokens'))
    const followers = await Promise.all(followerProms)

    //combine
    followers.forEach((f, i) => {
      locations[i].followers = f
    })

    return locations
  }
  static async getAllUsersWithPushTokens() {
    return User.find({ push_tokens: { $exists: true, $not: { $size: 0 } } }).select('push_tokens first_name email')
  }

  //usertype

  //util pub
  static makeMongoIDs(...args) {
    if (args.length === 1) return new Types.ObjectId(args[0])
    else return args.map((i) => new Types.ObjectId(i))
  }
  static getID(doc) {
    if (doc._id) return doc._id.toHexString()
    if (doc.id) return doc?.id?.toHexString ? doc?.id?.toHexString() : doc.id
  }
  static isValidID(str) {
    return isValidObjectId(str)
  }

  //util priv
  static #onRestUpdateCheckNewLocationAndDealDataChanges(restaurant, data) {
    return {
      avatar: !!data.avatar,
      cover_photo: !!data.cover_photo,
      cuisines: data.cuisines && this.#haveOptionsChanged(restaurant.cuisines, data.cuisines),
      dietary_requirements:
        data.dietary_requirements &&
        this.#haveOptionsChanged(restaurant.dietary_requirements, data.dietary_requirements),
      name: restaurant.name !== data.name,
      bio: restaurant.bio !== data.bio,
    }
  }
  static #haveOptionsChanged(currentList, newList) {
    return (
      newList.length !== currentList.length ||
      !!newList.filter((nc) => !currentList.find((rc) => rc.slug === nc.slug)).length
    )
  }
  static #sortOptions(a, b) {
    return a > b ? 1 : -1
  }
  static #prepareOptionsForDB(options) {
    return options.sort(this.#sortOptions).map((c) => ({
      name: c,
      slug: c.split(' ').join('-').toLowerCase().replace(/&/g, 'and'),
    }))
  }
}

export default DB
