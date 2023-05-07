import { isBefore, isPast } from 'date-fns'
import { object, string, array } from 'yup'
import { matchesDateString } from '../routes/utilities/regex.js'
import { isInPastWithinTimezone } from '../services/date/date.services.js'

export const addVoucherSchema = object({
  body: object({
    timezone: string().required('Timezone is required'),
    start_date: string()
      .required('Start date is required')
      .test('start_date', 'Start Date: Must be in yyyy-mm-dd format and must not be in the past', function (val) {
        if (!matchesDateString(val)) return false
        const date = new Date(val)
        if (!date) return false
        else return !isInPastWithinTimezone(val, this.parent.timezone)
      }),
    end_date: string().test(
      'end_date',
      'End Date: Must be in yyyy-mm-dd format, must not be in the past and must be after the start date',
      function (val) {
        if (!matchesDateString(val)) return false
        const endDate = new Date(val)
        const startDate = new Date(this.parent.start_date)
        if (!endDate || !startDate) return false
        if (isInPastWithinTimezone(val, this.parent.timezone)) return false
        else return !isBefore(endDate, startDate)
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
