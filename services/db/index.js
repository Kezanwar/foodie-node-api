import dotenv from 'dotenv'
dotenv.config()
import { connect, isValidObjectId, Types } from 'mongoose'

import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES, RESTAURANT_STATUS } from '#app/constants/restaurant.js'
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

const MONGO_URI = process.env.MONGO_URI
import { S3BaseUrl } from '#app/services/aws/index.js'

class DBService {
  //admin

  async setCuisineOptions() {
    await Cuisine.deleteMany({})

    const data = this.#prepareOptionsForDB(CUISINES_DATA)

    for await (const d of data) {
      const option = new Cuisine(d)
      await option.save()
    }
  }

  async setDietaryOptions() {
    await DietaryRequirement.deleteMany({})

    const data = this.#prepareOptionsForDB(DIETARY_REQUIREMENTS)

    for await (const d of data) {
      const option = new DietaryRequirement(d)
      await option.save()
    }
  }

  //connection
  async connect() {
    try {
      await connect(MONGO_URI)
      console.log('mongo-db connected 🚀')
    } catch (error) {
      console.error(error)
      // Exit proccess with failure
      process.exit(1)
    }
  }

  //usertype:common user
  getUserByID(id) {
    return User.findById(id)
  }
  getUserByEmail(email) {
    return User.findOne({ email: email.toLowerCase() })
  }
  getUserByEmailWithPassword(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+password')
  }
  async updateUser(user, data) {
    const dataArr = Object.entries(data)
    dataArr.forEach(([key, value]) => {
      user[key] = value
    })
    await user.save()
  }

  //usertype:common options
  getCuisines() {
    return Cuisine.aggregate([
      {
        $project: {
          name: 1,
          slug: 1,
        },
      },
    ])
  }
  getDietaryRequirements() {
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
  RGetRestaurantByID(id) {
    return Restaurant.findById(id)
  }
  RGetRestaurantByIDWithSuperAdmin(id) {
    return Restaurant.findById(id).select('+super_admin')
  }
  async RCreateNewRestaurant(company_info, user) {
    const rest = new Restaurant({
      company_info,
      super_admin: user._id,
      registration_step: RESTAURANT_REG_STEPS.STEP_1_COMPLETE,
      status: RESTAURANT_STATUS.APPLICATION_PENDING,
      image_uuid: IMG.createImgUUID(),
    })
    user.restaurant = { id: rest._id, role: RESTAURANT_ROLES.SUPER_ADMIN }

    await Promise.all([rest.save(), user.save()])
    return { restaurant: rest, user: user }
  }
  async RUpdateApplicationRestaurant(restaurant, data) {
    const dataArr = Object.entries(data)
    dataArr.forEach(([key, value]) => {
      restaurant[key] = value
    })
    await restaurant.save()
  }
  async RUpdateAcceptedRestaurant(restaurant, data) {
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

  //usertype:customer restaurant
  CGetSingleRestaurantLocation(location_id) {
    return Location.aggregate([
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
  }

  //usertype:restaurant locations
  RGetRestaurantLocations(id) {
    return Location.find({ 'restaurant.id': id }).select('-cuisines -dietary_requirements -restaurant -active_deals')
  }
  async RCreateNewLocation(data) {
    const location = new Location(data)
    await location.save()
    return location
  }
  async RDeleteOneLocation(rest_id, location_id) {
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
  async RUpdateOneLocation(rest_id, location_id, data) {
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

  //usertype:restaurant dashboard
  RGetActiveDealsCount(id, current_date) {
    return Deal.countDocuments({
      'restaurant.id': id,
      $or: [{ is_expired: false }, { end_date: { $gt: current_date } }],
    })
  }
  RGetExpiredDealsCount(id, current_date) {
    return Deal.countDocuments({
      'restaurant.id': id,
      $or: [{ is_expired: true }, { end_date: { $lte: current_date } }],
    })
  }
  RGetRestaurantImpressionsViewFavouritesStats(id) {
    return Deal.aggregate([
      {
        $match: {
          'restaurant.id': id,
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
        },
      },
      {
        $group: {
          _id: null,
          impressions: {
            $sum: '$unique_views',
          },
          views: { $sum: '$views' },
          favourites: { $sum: '$favourites' },
        },
      },
    ])
  }
  RGetRestaurantLocationsCount(id) {
    return Location.countDocuments({ 'restaurant.id': id })
  }
  async RGetTotalRestaurantFollowersCount(id) {
    const res = await Location.aggregate([
      { $match: { 'restaurant.id': id } },
      {
        $project: {
          followerLength: {
            $cond: {
              if: { $isArray: '$followers' }, // Check if the field is an array
              then: { $size: '$followers' }, // If it's an array, get its size
              else: 0, // If it's not an array (or doesn't exist), fallback to 0
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: '$followerLength' },
        },
      },
    ])
    return res[0].count
  }

  //usertype:restaurant deals
  RGetDealByID(id) {
    return Deal.findById(id)
  }
  RGetActiveDeals(id, current_date) {
    return Deal.aggregate([
      {
        $match: {
          'restaurant.id': id,
          $or: [{ is_expired: false }, { end_date: { $gt: current_date } }],
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
          days_left: {
            $cond: {
              if: { $lt: ['$start_date', current_date] },
              then: {
                $dateDiff: {
                  startDate: current_date,
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
          days_active: {
            $cond: {
              if: { $lt: ['$start_date', current_date] },
              then: {
                $dateDiff: {
                  startDate: '$start_date',
                  endDate: current_date,
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
  RGetExpiredDeals(id, current_date) {
    return Deal.aggregate([
      {
        $match: {
          'restaurant.id': id,
          $or: [{ is_expired: true }, { end_date: { $lte: current_date } }],
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
              if: { $lt: ['$start_date', current_date] },
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
  async RGetSingleDealWithStatsByID(rest_id, deal_id, current_date) {
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
              endDate: current_date,
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
  async RGetDealAsTemplateByID(rest_id, deal_id) {
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
  async RCreateNewDeal(rest_id, newDeal, newLocationsList) {
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
  async REditOneDeal(rest_id, currDeal, newData, newLocationsList) {
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
  async RExpireOneDeal(rest_id, deal, end_date) {
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
  async RBulkExpireDealsFromDate(date) {
    const filter = { end_date: { $lte: date }, is_expired: false }
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
    return expiredReq
  }
  async RDeleteOneDeal(rest_id, deal) {
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

  //usertype:customer deals
  CGetFeed(user, page, long, lat, cuisines, dietary_requirements) {
    const query = { active_deals: { $ne: [], $exists: true } }
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
  CGetSearchFeed(user, long, lat, text) {
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
  CGetSingleDeal(deal_id, location_id) {
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
  CGetDiscover(long, lat) {
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
        $lookup: {
          from: 'restaurants', // Replace with the name of your linked collection
          localField: 'restaurant.id',
          foreignField: '_id',
          let: { locationId: '$_id' },
          pipeline: [
            {
              $project: {
                followMatch: {
                  $filter: {
                    input: '$followers',
                    as: 'foll',
                    cond: {
                      $eq: ['$$foll.location_id', '$$locationId'],
                    },
                  },
                },
              },
            },
          ],
          as: 'rest',
        },
      },
      {
        $addFields: {
          followCount: { $size: { $arrayElemAt: ['$rest.followMatch', 0] } },
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
            followers: '$followCount',
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
  async CFavouriteOneDeal(user, deal_id, location_id) {
    const newDealFavourite = { user: user._id, location_id }
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
  async CUnfavouriteOneDeal(user, deal_id, location_id) {
    const dealProm = Deal.updateOne({ _id: deal_id }, { $pull: { favourites: { user: user._id, location_id } } })
    const userProm = User.updateOne({ _id: user._id }, { $pull: { favourites: { deal: deal_id, location_id } } })
    await Promise.all([dealProm, userProm])
  }
  async CGetFavourites(user, page) {
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
  async CFollowOneRestauarant(user, location_id) {
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
  async CUnfollowOneRestaurant(user, location_id) {
    const locProm = Location.updateOne(
      {
        _id: location_id,
      },
      { $pull: { followers: user._id } }
    )
    const userProm = User.updateOne({ _id: user._id }, { $pull: { following: location_id } })

    await Promise.all([locProm, userProm])
  }
  async CGetFollowing(user, page) {
    const pageStart = page === 0 ? page : page * FEED_LIMIT

    const following = user.following.slice(pageStart, pageStart + FEED_LIMIT)

    const results = await Location.aggregate([
      {
        $match: {
          _id: { $in: following },
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

  //usertype

  //util pub
  makeMongoIDs(...args) {
    if (args.length === 1) return new Types.ObjectId(args[0])
    else return args.map((i) => new Types.ObjectId(i))
  }
  getID(doc) {
    if (doc._id) return doc._id.toHexString()
    if (doc.id) return doc?.id?.toHexString ? doc?.id?.toHexString() : doc.id
  }
  isValidID(str) {
    return isValidObjectId(str)
  }

  //util priv
  #onRestUpdateCheckNewLocationAndDealDataChanges(restaurant, data) {
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
  #haveOptionsChanged(currentList, newList) {
    return (
      newList.length !== currentList.length ||
      !!newList.filter((nc) => !currentList.find((rc) => rc.slug === nc.slug)).length
    )
  }
  #sortOptions(a, b) {
    return a > b ? 1 : -1
  }
  #prepareOptionsForDB(options) {
    return options.sort(this.#sortOptions).map((c) => ({
      name: c,
      slug: c.split(' ').join('-').toLowerCase().replace(/&/g, 'and'),
    }))
  }
}

const DB = new DBService()

export default DB
