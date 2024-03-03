import { object, string } from 'yup'

export const singleRestaurantSchema = object({
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
