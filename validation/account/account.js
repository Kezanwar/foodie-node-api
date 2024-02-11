import { object, string } from 'yup'

export const patchProfileSchema = object({
  body: object({
    first_name: string().required(),
    last_name: string().required(),
  }),
})
