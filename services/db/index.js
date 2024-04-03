import dotenv from 'dotenv'
dotenv.config()
import { connect, Types } from 'mongoose'

import User from '#app/models/User.js'
import { S3BaseUrl } from '#app/services/aws/index.js'
import Restaurant from '#app/models/Restaurant.js'
import Location from '#app/models/Location.js'
import Deal from '#app/models/Deal.js'

const MONGO_URI = process.env.MONGO_URI

class DBService {
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

  //util
  makeMongoIDs(...args) {
    if (args.length === 1) return new Types.ObjectId(args[0])
    else return args.map((i) => new Types.ObjectId(i))
  }

  getID(doc) {
    if (doc._id) return doc._id.toHexString()
    if (doc.id) return doc?.id?.toHexString ? doc?.id?.toHexString() : doc.id
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

  //usertype:customer user
  async CGetUserWithFavAndFollow(id) {
    const user = await User.aggregate([
      {
        $match: {
          _id: this.makeMongoIDs(id),
        },
      },
      {
        $lookup: {
          from: 'deals', // Replace with the name of your linked collection
          localField: 'favourites.deal',
          foreignField: '_id',
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
          as: 'favourited_deals',
        },
      },
      {
        $lookup: {
          from: 'locations', // Replace with the name of your linked collection
          localField: 'following.location_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                location: {
                  nickname: '$nickname',
                  _id: '$_id',
                },
                restaurant: {
                  id: '$restaurant.id',
                  name: '$restaurant.name',
                  avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
                  cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
                },
              },
            },
          ],
          as: 'following_locations',
        },
      },
      {
        $project: {
          user: '$$ROOT',
          favourites: '$favourited_deals',
          following: '$following_locations',
        },
      },
    ])
    return user[0]
  }

  //usertype:restuarant restaurant
  RGetRestaurantByID(id) {
    return Restaurant.findById(id)
  }
  RGetRestaurantByIDWithSuperAdmin(id) {
    return Restaurant.findById(id).select('+super_admin')
  }

  //usertype:restaurant locations
  RGetRestaurantLocations(id) {
    return Location.find({ 'restaurant.id': id }).select('-cuisines -dietary_requirements -restaurant -active_deals')
  }
  RAddActiveDealToSelectedLocations(rest_id, locations, deal) {
    return Location.updateMany(
      {
        'restaurant.id': rest_id,
        _id: { $in: locations },
      },
      { $push: { active_deals: { deal_id: deal._id, name: deal.name, description: deal.description } } }
    )
  }
  RRemoveActiveDealInSelectedLocations(rest_id, locations, deal) {
    return Location.updateMany(
      {
        'restaurant.id': rest_id,
        _id: { $in: locations },
      },
      { $pull: { active_deals: { deal_id: deal._id } } }
    )
  }
  RUpdateActiveDealInSelectedLocations(rest_id, locations, deal) {
    Location.updateMany(
      {
        'restaurant.id': rest_id,
        _id: { $in: locations },
        active_deals: { $elemMatch: { deal_id: deal._id } },
      },
      {
        $set: {
          'active_deals.$.name': deal.trimmedName,
          'active_deals.$.description': deal.trimmedDescription,
        },
      }
    )
  }
  RRemoveDealFromAllLocationsActiveDeals(rest_id, deal) {
    return Location.updateMany(
      {
        'restaurant.id': rest_id,
      },
      { $pull: { active_deals: { deal_id: deal._id } } }
    )
  }
  RDeleteLocationByID(id) {
    return Location.deleteOne({ _id: id })
  }
  RRemoveAllInstancesOfLocationFromDeals(rest_id, location_id) {
    return Deal.updateMany(
      {
        'restaurant.id': rest_id,
      },
      {
        $pull: {
          locations: { location_id: location_id },
        },
      }
    )
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
    await Promise.all(locationUpdateProm, allDealUpdateProm)
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
}

const DB = new DBService()

export default DB
