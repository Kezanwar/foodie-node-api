import User from '#app/models/User.js'
import Err from '#app/services/error/index.js'

export async function getUser(id) {
  if (!id) Err.throw('no ID passed')
  const user = await User.findById(id)
  if (!user) Err.throw('User doesnt exist', 401)
  return user
}

export async function findUserByEmail(email) {
  if (!email) Err.throw('no email found')
  const sEmail = email.toLowerCase()
  const user = await User.findOne({ email: sEmail })
  return user
}

export async function findUserByEmailWithPassword(email) {
  if (!email) Err.throw('no email found')
  const sEmail = email.toLowerCase()
  const user = await User.findOne({ email: sEmail }).select('+password')
  return user
}
