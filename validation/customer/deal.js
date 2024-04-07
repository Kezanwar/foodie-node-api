import { object, string } from 'yup'
import mongoose from 'mongoose'

//field is either params or body
export const singleDealSchema = object({
  query: object({
    location_id: string()
      .required('Location ID is required')
      .test('Location ID must be a valid ID', function (val) {
        return mongoose.isValidObjectId(val)
      }),
    deal_id: string()
      .required('Deal ID is required')
      .test('Deal ID must be a valid ID', function (val) {
        return mongoose.isValidObjectId(val)
      }),
    lat: string()
      .required('Lat is required')
      .test('Lat must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
    long: string()
      .required('Long is required')
      .test('Long must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
  }),
})

export const favouriteDealSchema = object({
  body: object({
    location_id: string()
      .required('Location ID is required')
      .test('Location ID must be a valid ID', function (val) {
        return mongoose.isValidObjectId(val)
      }),
    deal_id: string()
      .required('Deal ID is required')
      .test('Deal ID must be a valid ID', function (val) {
        return mongoose.isValidObjectId(val)
      }),
  }),
})

export const regularFeedSchema = object({
  query: object({
    page: string()
      .required('Page is required')
      .test('Page must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
    lat: string()
      .required('Lat is required')
      .test('Lat must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
    long: string()
      .required('Long is required')
      .test('Long must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
  }),
})

export const searchFeedSchema = object({
  query: object({
    page: string()
      .required('Page is required')
      .test('Page must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
    text: string().required(),
    lat: string()
      .required('Lat is required')
      .test('Lat must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
    long: string()
      .required('Long is required')
      .test('Long must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
  }),
})

export const discoverSchema = object({
  query: object({
    lat: string()
      .required('Lat is required')
      .test('Lat must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
    long: string()
      .required('Long is required')
      .test('Long must be able to cast to a number', function (val) {
        return !isNaN(val)
      }),
  }),
})
