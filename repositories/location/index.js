import Deal from '#app/models/deal.js'
import Location, { LocationFollowers } from '#app/models/location.js'
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

  static async FollowLocation(user_id, location_id) {
    const location = await Location.findById(location_id)
    const follow = new LocationFollowers({
      location_id: location_id,
      restaurant_id: location.restaurant.id,
      user_id: user_id,
    })
    await follow.save()
  }

  static async UnfollowLocation(user_id, location_id) {
    await LocationFollowers.deleteOne({
      location_id: location_id,
      user_id: user_id,
    })
  }

  static async UserFollowsLocation(user_id, location_id) {
    const follow = await LocationFollowers.findOne({
      user_id: user_id,
      location_id: location_id,
    })
    return !!follow
  }

  static async GetFollowing(user, page) {
    const pageStart = page === 0 ? page : page * FEED_LIMIT

    const results = await LocationFollowers.aggregate([
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
          'locationData.restaurant.is_subscribed': Permissions.SUBSCRIBED,
          'locationData.archived': false,
          'locationData.deleted': false,
        },
      },
      { $skip: pageStart },
      { $limit: FEED_LIMIT },
      {
        $project: {
          location: {
            nickname: '$locationData.nickname',
            _id: '$locationData._id',
            coordinates: '$locationData.geometry.coordinates',
          },
          restaurant: {
            id: '$locationData.restaurant.id',
            name: '$locationData.restaurant.name',
            avatar: { $concat: [AWS.USER_IMAGE_PREFIX, '$locationData.restaurant.avatar'] },
            cover_photo: { $concat: [AWS.USER_IMAGE_PREFIX, '$locationData.restaurant.cover_photo'] },
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
