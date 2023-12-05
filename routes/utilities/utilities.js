import dotenv from 'dotenv'
dotenv.config()

import _ from 'lodash'
const { upperCase } = _

import User from '../../models/User.js'
import Location from '../../models/Location.js'

export function ArrayIsEmpty(array) {
  return !array.length > 0
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const capitalizeSentence = (str) => {
  return str
    .split(' ')
    .map((word) => capitalizeFirstLetter(word))
    .join(' ')
}

export function getDocumentValues(arrayOfRequiredKeys, document) {
  if (!arrayOfRequiredKeys || !Array.isArray(arrayOfRequiredKeys || !document))
    throw new Error(
      'getDocumentValues expects an array of values as its first argument and the MGDB/Document to pull from as the second'
    )

  const object = document.toObject()

  return _.pick(object, arrayOfRequiredKeys)
}

export function removeDocumentValues(arrayOfUnrequiredKeys, document) {
  if (!arrayOfUnrequiredKeys || !Array.isArray(arrayOfUnrequiredKeys || !document))
    throw new Error(
      'removeDocumentValues expects an array of values as its first argument and the MGDB/Document to omit from as the second'
    )
  const object = document.toObject()
  return _.omit(object, arrayOfUnrequiredKeys)
}
export function removeObjectValues(arrayOfUnrequiredKeys, object) {
  return _.omit(object, arrayOfUnrequiredKeys)
}

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

export async function findRestaurantsLocations(
  rest_id,
  select = '-cuisines -dietary_requirements -restaurant -active_deals'
) {
  if (!rest_id) throwErr('No Restaurant / Locations found')
  if (!select) {
    const locationsNoSelect = await Location.find({ 'restaurant.id': rest_id })
    return locationsNoSelect
  }
  const locations = await Location.find({ 'restaurant.id': rest_id }).select(select)
  return locations
}

export const throwErr = (msg, code) => {
  const exception = new Error(msg)
  exception.code = code ?? 500
  exception.from_admin = true
  throw exception
}

export function SendError(res, err) {
  console.error(err)
  res
    .status(err.code ?? 500)
    .json({ message: err?.from_admin ? err?.message || 'Internal server error' : 'Internal server error' })
}

export const allCapsNoSpace = (str) => {
  return upperCase(str).split(' ').join('')
}

export const getID = (doc) => {
  return doc?._id?.toHexString ? doc?._id?.toHexString() : doc?.id?.toHexString() || doc?.id
}

export const createOTP = () => {
  const arr = []
  let start = 0
  while (start <= 5) {
    arr.push(Math.floor(Math.random() * 10))
    start++
  }
  return arr.join('')
}

export const fakeLongLoadPromise = (duration = 5000) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
