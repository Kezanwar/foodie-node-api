import User from '#src/models/User.js'
import { throwErr } from './error.js'

export async function getUser(id) {
  if (!id) throwErr('no ID passed')
  const user = await User.findById(id)
  if (!user) throwErr('User doesnt exist', 401)
  return user
}

export async function findUserByEmail(email) {
  if (!email) throwErr('no email found')
  const sEmail = email.toLowerCase()
  const user = await User.findOne({ email: sEmail })
  return user
}

export async function findUserByEmailWithPassword(email) {
  if (!email) throwErr('no email found')
  const sEmail = email.toLowerCase()
  const user = await User.findOne({ email: sEmail }).select('+password')
  return user
}
