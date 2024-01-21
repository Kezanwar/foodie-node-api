import { object, string } from 'yup'
import mongoose from 'mongoose'

export const singleDealSchema = object({
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
