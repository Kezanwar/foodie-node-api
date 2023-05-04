import { isBefore, isPast } from 'date-fns'
import { object, string, array } from 'yup'

export const addVoucherSchema = object({
  body: object({
    start_date: string()
      .required('Start date is required')
      .test('start_date', 'Start Date: Must not be in the past', (val) => {
        const date = new Date(val)
        if (!date) return false
        else return !isPast(new Date(val))
      }),
    end_date: string().test(
      'end_date',
      'End Date: Must not be in the past and must be after the start date',
      function (val) {
        const endDate = new Date(val)
        const startDate = new Date(this.parent.start_date)
        if (!endDate || !startDate) return false
        if (isPast(endDate)) return false
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
