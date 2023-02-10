import { object, string } from 'yup'

export const loginUserSchema = object({
  body: object({
    email: string().email().required(),
    password: string().min(8).max(32).required(),
  }),
})

export const registerUserSchema = object({
  body: object({
    first_name: string().required(),
    last_name: string().required(),
    email: string().email().required(),
    password: string().min(8).max(32).required(),
  }),
})

export const forgotPasswordUserSchema = object({
  body: object({
    email: string().email().required(),
  }),
})
