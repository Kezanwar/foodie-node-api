import mongoose from 'mongoose'
import { object, string } from 'yup'

export const followRestSchema = object({
  body: object({
    location_id: string()
      .required('Location ID is required')
      .test('Location ID must be a valid ID', function (val) {
        return mongoose.isValidObjectId(val)
      }),
    rest_id: string()
      .required('Restaurant ID is required')
      .test('Restaurant ID must be a valid ID', function (val) {
        return mongoose.isValidObjectId(val)
      }),
  }),
})
