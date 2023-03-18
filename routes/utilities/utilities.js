import dotenv from 'dotenv'
dotenv.config()

import sharp from 'sharp'
import _ from 'lodash'
const { capitalize, upperCase } = _

import { STORE_ROLES } from '../../constants/store.js'
import User from '../../models/User.js'
import axios from 'axios'

export function ArrayIsEmpty(array) {
  if (array.length > 0) return false
  else return true
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

export async function getUser(id) {
  if (!id) throw new Error('no ID passed')
  const user = await User.findById(id)
  if (!user) throw new Error('Authentication error: user doesnt exist')
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

export const throwErr = (msg, code) => {
  const exception = new Error(msg)
  exception.code = code ?? 500
  throw exception
}

export function SendError(res, err) {
  console.error(err)
  res.status(err.code ?? 500).json({ message: err?.message || 'Internal server error' })
}

export const prefixImageWithBaseUrl = (imageName) => {
  const d = new Date()
  return `${process.env.S3_BUCKET_BASE_URL}${imageName}?${d.toTimeString().split(' ').join('')}`
}

export const allCapsNoSpace = (str) => {
  return upperCase(str).split(' ').join('')
}

export const getID = (doc) => {
  return doc?._id?.toHexString()
}

export const getLongLat = async (address) => {
  try {
    if (!address.postcode || !address.address_line_1)
      throwErr('Need postcode and address line 1 to get geographical data', 500)

    const sPostcode = upperCase(address.postcode)
    const sAddresLine1 = capitalize(address.address_line_1)

    const response = await axios.get('https://address-from-to-latitude-longitude.p.rapidapi.com/geolocationapi', {
      params: { address: `${sAddresLine1} ${sPostcode}` },
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_KEY,
        'X-RapidAPI-Host': 'address-from-to-latitude-longitude.p.rapidapi.com',
      },
    })

    const results = response?.data?.Results

    let tryJustPost = false

    if (!results?.length) tryJustPost = true

    if (results.length) {
      const firstResultsMatchingPostcode = results.find(
        (r) => r.postalcode.split(' ').join('') === sPostcode.split(' ').join('')
      )
      if (!firstResultsMatchingPostcode) tryJustPost = true
      else return { long: firstResultsMatchingPostcode.longitude, lat: firstResultsMatchingPostcode.latitude }
    }

    if (tryJustPost) {
      const justPostResponse = await axios.get(
        'https://address-from-to-latitude-longitude.p.rapidapi.com/geolocationapi',
        {
          params: { address: sPostcode },
          headers: {
            'X-RapidAPI-Key': process.env.RAPID_KEY,
            'X-RapidAPI-Host': 'address-from-to-latitude-longitude.p.rapidapi.com',
          },
        }
      )

      const justPostResults = justPostResponse?.data?.Results

      if (!justPostResults?.length) return undefined

      const justPostResultsMatchingPostcode = justPostResults.find(
        (r) => r.postalcode.split(' ').join('') === sPostcode.split(' ').join('')
      )

      if (!justPostResultsMatchingPostcode) return undefined
      else return { long: justPostResultsMatchingPostcode.longitude, lat: justPostResultsMatchingPostcode.latitude }
    }

    return undefined
  } catch (error) {
    throwErr(error, 500)
  }
}

export const fakeLongLoadPromise = (duration = 5000) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
