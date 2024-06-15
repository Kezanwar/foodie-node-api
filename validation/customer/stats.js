import { array, object } from 'yup'

export const recentlyViewedSchema = object({
  body: object({
    recently_viewed: object().required(),
  }),
})
