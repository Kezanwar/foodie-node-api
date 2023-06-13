import { isBefore } from 'date-fns'
import { object, string, array } from 'yup'
import { matchesDateString } from '../routes/utilities/regex.js'

export const addDealSchema = object({
  body: object({
    start_date: string()
      .required('Start date is required')
      .test('start_date', 'Start Date: Must be in yyyy-mm-dd format and must not be in the past', function (val) {
        if (!matchesDateString(val)) return false
        const date = new Date(val)
        return !!date
      }),
    end_date: string().test(
      'end_date',
      'End Date: Must be in yyyy-mm-dd format, must not be in the past and must be after the start date',
      function (val) {
        if (!matchesDateString(val)) return false
        const endDate = new Date(val)
        const startDate = new Date(this.parent.start_date)
        if (!endDate || !startDate) return false
        else return isBefore(startDate, endDate)
      }
    ),
    name: string().max(30, 'Name can be maximum 30 characters').required('Name is required'),
    description: string()
      .min(50, 'Description is minimum 50 characters')
      .max(500, 'Description can be maximum 500 characters')
      .required('Description is required'),
    locations: array().min(1, 'Minimum 1 location required').required('Locations are required'),
  }),
})

export const editDealSchema = object({
  body: object({
    end_date: string().test(
      'end_date',
      'End Date: Must be in yyyy-mm-dd format, must not be in the past and must be after the start date',
      function (val) {
        if (!matchesDateString(val)) return false
        const endDate = new Date(val)
        return !!endDate
        // have to run more validation on the end date within the route, when we have access to the deal
      }
    ),
    name: string().max(30, 'Name can be maximum 30 characters').required('Name is required'),
    description: string()
      .min(50, 'Description is minimum 50 characters')
      .max(500, 'Description can be maximum 500 characters')
      .required('Description is required'),
  }),
})
