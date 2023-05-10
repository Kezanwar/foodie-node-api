import dotenv from 'dotenv'
dotenv.config()
import { mongo } from 'mongoose'

import sharp from 'sharp'
import _ from 'lodash'
const { upperCase } = _

import User from '../../models/User.js'

export function ArrayIsEmpty(array) {
  return !array.length > 0
}

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
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

export async function getUser(id) {
  if (!id) throw new Error('no ID passed')
  const user = await User.findById(id)
  if (!user) throw new Error('Authentication error: user doesnt exist')
  return user
}

export async function findUserByEmail(email) {
  if (!email) throw new Error('no email found')
  const sEmail = email.toLowerCase()
  const user = await User.findOne({ email: sEmail })
  return user
}

export async function findUserByEmailWithPassword(email) {
  if (!email) throw new Error('no email found')
  const sEmail = email.toLowerCase()
  const user = await User.findOne({ email: sEmail }).select('+password')
  return user
}

export function createImageName(obj, item, image) {
  const type = image.mimetype.split('/')[1]
  return `${obj.image_uuid}-${item}.${type}`
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
  return `${process.env.S3_BUCKET_BASE_URL}${imageName}?${d.toTimeString().split(' ').join('').split('GMT')[0]}`
}

export const allCapsNoSpace = (str) => {
  return upperCase(str).split(' ').join('')
}

export const getID = (doc) => {
  return doc?._id?.toHexString ? doc?._id?.toHexString() : doc?.id?.toHexString()
}

export const fakeLongLoadPromise = (duration = 5000) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, duration)
  })

export const createImgUUID = () => {
  return new mongo.ObjectId().toHexString()
}
