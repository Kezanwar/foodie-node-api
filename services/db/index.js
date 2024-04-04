import dotenv from 'dotenv'
dotenv.config()
import { connect, Types } from 'mongoose'

import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES, RESTAURANT_STATUS } from '#app/constants/restaurant.js'

import User from '#app/models/User.js'
import { S3BaseUrl } from '#app/services/aws/index.js'
import Restaurant from '#app/models/Restaurant.js'
import Location from '#app/models/Location.js'
import Deal from '#app/models/Deal.js'
import Task from '#app/services/worker/index.js'
import IMG from '#app/services/image/index.js'

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
  async RUpdateRestaurant(restaurant, data) {
    const promises = []

    //if new data has cuisines and cuisines arent the same as the current
    //update locations and deals cuisines
    let set = { $set: null }

    if (
      data.cuisines &&
      (data.cuisines.length !== restaurant.cuisines.length ||
        data.cuisines.filter((nc) => !restaurant.cuisines.find((rc) => rc.slug === nc.slug)).length)
    ) {
      set = { $set: { cuisines: data.cuisines } }
    }

    //if new data has dietary_requirements and dietary_requirements arent the same as the current
    //update locations and deals dietary_requirements
    if (
      data.dietary_requirements &&
      (data.dietary_requirements.length !== restaurant.dietary_requirements.length ||
        data.dietary_requirements.filter((nc) => !restaurant.dietary_requirements.find((rc) => rc.slug === nc.slug))
          .length)
    ) {
      if (set.$set === null) {
        set = { $set: { dietary_requirements: data.dietary_requirements } }
      } else {
        set.$set.dietary_requirements = data.dietary_requirements
      }
    }

    console.log('set:', set)

    if (set.$set !== null) {
      console.log('set runs')
      promises.push(Location.updateMany({ 'restaurant.id': restaurant._id }, set))
      promises.push(Deal.updateMany({ 'restaurant.id': restaurant._id }, set))
    }

    const dataArr = Object.entries(data)
    dataArr.forEach(([key, value]) => {
      restaurant[key] = value
    })
    promises.push(restaurant.save())
    await Promise.all(promises)
  }

  //usertype:restaurant locations
  RGetRestaurantLocations(id) {
    return Location.find({ 'restaurant.id': id }).select('-cuisines -dietary_requirements -restaurant -active_deals')
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

    await Promise.all([locationProm, dealProm])
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
    console.log(currDeal)
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

    await Promise.all([dealProm, locationsProm])
  }
}

const DB = new DBService()

export default DB
