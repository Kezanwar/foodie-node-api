import User from '#app/models/user.js'
import Restaurant from '#app/models/restaurant.js'
import Location from '#app/models/location.js'
import Deal from '#app/models/deal.js'
import Permissions from '#app/services/permissions/index.js'
import { startOfDay } from 'date-fns'

class SubscriptionRepo {
  static GetUserByID(id) {
    return User.findById(id)
  }

  static async GetUserAndRestaurantByStripeCustomerID(customer_id) {
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
          restaurant: { $first: '$rest' },
        },
      },
    ])
    return res[0]
  }

  static async UnsubscribeRestaurant(user_id, rest_id) {
    const end_date = startOfDay(new Date())
    const user = User.updateOne(
      { _id: user_id },
      {
        $set: {
          'subscription.subscription_tier': Permissions.NOT_SUBSCRIBED,
          'subscription.subscribed': false,
          'subscription.cancelled_period_end': end_date,
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
          archived: true,
        },
      }
    )

    const deals = Deal.updateMany({ 'restaurant.id': rest_id }, { is_expired: true, end_date: end_date })

    await Promise.all([user, rest, locations, deals])
  }

  static async CancelSubscriptionEndOfPeriod(user_id, cancelled_period_end) {
    return User.updateOne(
      { _id: user_id },
      {
        $set: {
          'subscription.has_cancelled': true,
          'subscription.cancelled_period_end': cancelled_period_end,
        },
      }
    )
  }

  static async AddPastSubscription(user_id, subscriptionId) {
    await User.updateOne(
      { _id: user_id },
      {
        $push: { past_subscriptions: subscriptionId },
      }
    )
  }

  static async DowngradeRestaurant(rest_id) {
    await Location.updateMany(
      { 'restaurant.id': rest_id },
      {
        $set: {
          archived: true,
          active_deals: [],
        },
      }
    )
    await Deal.updateMany({ 'restaurant.id': rest_id }, { is_expired: true, end_date: new Date() })
  }

  static SetLocationsIsSubscribed(rest_id, is_subscribed) {
    return Location.updateMany(
      { 'restaurant.id': rest_id },
      {
        $set: {
          'restaurant.is_subscribed': is_subscribed,
        },
      }
    )
  }
}

export default SubscriptionRepo
