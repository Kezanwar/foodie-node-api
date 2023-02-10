import sharp from 'sharp'
import _ from 'lodash'

import Store from '../../models/Store.js'
import { STORE_ROLES } from '../../constants/store.js'

export function ArrayIsEmpty(array) {
  if (array.length > 0) return false
  else return true
}

export function SendError(res, err, statusCode = 500) {
  res.status(statusCode).json({ message: err?.message || 'Internal server error' })
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function mapValidationErrorArray(errors) {
  return errors?.errors.map((err) => err.msg)
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

export function isAdmin(user) {
  if (!user) throw new Error('No user')
  if (!user.store) throw new Error('No store associated with this user')
  if (!user.store.role !== STORE_ROLES.admin || !user.store.role !== STORE_ROLES.super_admin) return false
  else return true
}

export async function getUserStoreAndRole(id) {
  if (!id) throw new Error('no ID passed')
  const user = await Store.findById(id)
  const store = user?.store?.store_id ? await Store.findById(user?.store?.store_id) : undefined
  const role = user?.store?.role
  return {
    user,
    store,
    role,
  }
}

export async function getUser(id) {
  if (!id) throw new Error('no ID passed')
  const user = await Store.findById(id).select('-_id')
  return user
}

export function createUrlFromString(str) {
  return str.replace(/\s+/g, '-').toLowerCase()
}

export function createImageName(obj, item, image) {
  const type = image.mimetype.split('/')[1]
  return `${obj.id}-${item}.${type}`
}

export async function resizeProfilePhoto(buffer) {
  try {
    const resizedBuffer = await sharp(buffer).resize({ height: 500, width: 500, fit: 'contain' }).toBuffer()
    return resizedBuffer
  } catch (error) {
    console.error(error)
    throw new Error(error)
  }
}
