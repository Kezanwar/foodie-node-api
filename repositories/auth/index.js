import User from '#app/models/user.js'
import Location from '#app/models/location.js'
import Deal from '#app/models/deal.js'

class AuthRepo {
  static GetUserByID(id) {
    return User.findById(id)
  }

  static GetUserByEmail(email) {
    return User.findOne({ email: email.toLowerCase() })
  }

  static GetUserByEmailWithPassword(email) {
    return User.findOne({ email: email.toLowerCase() }).select('+password')
  }

  static async SaveNewUserPushToken(user, pushToken) {
    user.push_tokens.push(pushToken)
    await user.save()
  }

  static ClearPushTokenFromOtherUsers(pushToken, user_id) {
    const filter = user_id
      ? { $and: [{ push_tokens: pushToken }, { _id: { $ne: user_id } }] }
      : { push_tokens: pushToken }

    return User.updateMany(filter, { $pull: { push_tokens: pushToken } })
  }

  static async DeleteUserByID(id) {
    const locProm = Location.updateMany({}, { $pull: { followers: id } })

    const dealProm = Deal.updateMany({}, { $pull: { favourites: { user: id } } })

    await Promise.all([dealProm, locProm])
    await User.deleteOne({ _id: id })
  }
}

export default AuthRepo
