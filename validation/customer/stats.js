import { object } from 'yup'

export const syncStatSchema = object({
  body: object({
    stats: object({
      deals: object().required(),
      locations: object().required(),
      booking_clicks: object().required(),
    }),
  }),
})
