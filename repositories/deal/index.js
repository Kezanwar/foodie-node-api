import Deal from '#app/models/deal.js'
import Location from '#app/models/location.js'
import User from '#app/models/user.js'
import Task from '#app/services/worker/index.js'
import RepoUtil from '../util.js'
import { FEED_LIMIT } from '#app/constants/deals.js'

class DealRepo {
  static GetDealByID(deal_id) {
    return Deal.findById(deal_id)
  }
  static GetActiveDeals(rest_id) {
    const today = new Date()
    return Deal.aggregate([
      {
        $match: {
          'restaurant.id': rest_id,
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
  static GetActiveDealsCount(rest_id) {
    return Deal.countDocuments({
      'restaurant.id': rest_id,
      is_expired: false,
    })
  }
  static GetExpiredDeals(rest_id) {
    return Deal.aggregate([
      {
        $match: {
          'restaurant.id': rest_id,
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
  static async GetSingleDealWithStatsByID(rest_id, deal_id) {
    const deal = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': rest_id,
          _id: RepoUtil.makeMongoIDs(deal_id),
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
  static async GetDealAsTemplateByID(rest_id, deal_id) {
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

  static async FavouriteOneDeal(user, deal_id, location_id) {
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

  static async UnfavouriteOneDeal(user, deal_id, location_id) {
    const dealProm = Deal.updateOne({ _id: deal_id }, { $pull: { favourites: { user: user._id, location_id } } })
    const userProm = User.updateOne({ _id: user._id }, { $pull: { favourites: { deal: deal_id, location_id } } })
    await Promise.all([dealProm, userProm])
  }

  static async GetFavourites(user, page) {
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
}

export default DealRepo
