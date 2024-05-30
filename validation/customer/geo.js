import { number, object, string } from 'yup'

export const geoSchema = object({
  body: object({
    lat: number().required('Lat is required'),
    long: string().required('Long is requied'),
  }),
})
