import Deal from '#app/models/deal.js'
import Location from '#app/models/location.js'
import User from '#app/models/user.js'
import RepoUtil from '../util.js'
import Permissions from '#app/services/permissions/index.js'
import AWS from '#app/services/aws/index.js'
import { FEED_LIMIT } from '#app/constants/deals.js'

class LocationRepo {
  static GetAll(rest_id) {
    return Location.find({ 'restaurant.id': rest_id })
      .select('-cuisines -dietary_requirements -restaurant -active_deals -views -followers -booking_clicks')
      .lean()
  }

  static async CreateNew(data) {
    const location = new Location(data)
    await location.save()
    return location
  }

  static async ArchiveOne(rest_id, loc_id) {
    //mark location as archived
    const locationProm = Location.updateOne({ _id: loc_id }, { archived: true, active_deals: [] })
    //remove from all deals
    const dealProm = Deal.updateMany(
      {
        'restaurant.id': rest_id,
      },
      {
        $pull: {
          locations: { location_id: loc_id },
        },
      }
    )

    await Promise.all([locationProm, dealProm])
  }

  static async UnarchiveOne(loc_id) {
    //delete the locations
    return Location.updateOne({ _id: loc_id }, { archived: false })
  }

  static async HardDeleteOne(rest_id, loc_id) {
    //delete the locations
    const locationProm = Location.deleteOne({ _id: loc_id })
    //remove from all deals
    const dealProm = Deal.updateMany(
      {
        'restaurant.id': rest_id,
      },
      {
        $pull: {
          locations: { location_id: loc_id },
        },
      }
    )

    const userProm = User.bulkWrite([
      {
        updateMany: {
          filter: {},
          update: {
            $pull: {
              favourites: { location_id: loc_id },
            },
          },
        },
      },
      {
        updateMany: {
          filter: {},
          update: {
            $pull: {
              following: loc_id,
            },
          },
        },
      },
    ])
    //remove all favourites with location and all follows

    await Promise.all([locationProm, dealProm, userProm])
  }

  static async UpdateOne(rest_id, loc_id, data) {
    const { nickname, address, phone_number, email, opening_times, long_lat } = data
    const locationID = RepoUtil.makeMongoIDs(loc_id)

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

  static GetCount(loc_id) {
    return Location.countDocuments({ 'restaurant.id': loc_id })
  }

  static async GetStats(rest_id) {
    const res = await Location.aggregate([
      { $match: { 'restaurant.id': rest_id } },
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

  static async FollowLocation(user, location_id) {
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

  static async UnfollowLocation(user, location_id) {
    const locProm = Location.updateOne(
      {
        _id: location_id,
      },
      { $pull: { followers: user._id } }
    )
    const userProm = User.updateOne({ _id: user._id }, { $pull: { following: location_id } })

    await Promise.all([locProm, userProm])
  }

  static async GetFollowing(user, page) {
    const pageStart = page === 0 ? page : page * FEED_LIMIT

    const following = user.following.slice(pageStart, pageStart + FEED_LIMIT)

    const results = await Location.aggregate([
      {
        $match: {
          _id: { $in: following },
          'restaurant.is_subscribed': Permissions.SUBSCRIBED,
          archived: false,
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
            avatar: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.avatar'] },
            cover_photo: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.cover_photo'] },
          },
        },
      },
    ])
    return results
  }

  static async GetCustomerViewLocation(location_id) {
    const res = await Location.aggregate([
      {
        $match: {
          _id: RepoUtil.makeMongoIDs(location_id),
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
            avatar: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.avatar'] },
            cover_photo: { $concat: [AWS.USER_IMAGE_PREFIX, '$restaurant.cover_photo'] },
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
}

export default LocationRepo
