import User from '#app/models/User.js'
import Err from '#app/services/error/index.js'

export async function findUserByEmailWithPassword(email) {
  if (!email) Err.throw('no email found')
  const sEmail = email.toLowerCase()
  const user = await User.findOne({ email: sEmail }).select('+password')
  return user
}
