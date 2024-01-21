import { object, string } from 'yup'
import mongoose from 'mongoose'

//field is either params or body
export const singleDealSchema = (field) =>
  object({
    [field]: object({
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
