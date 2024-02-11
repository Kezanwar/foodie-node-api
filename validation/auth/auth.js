import { object, string } from 'yup'

export const loginUserSchema = object({
  body: object({
    email: string().email().required(),
    password: string()
      .min(8, 'Password must be minimum 8 characters')
      .max(32, 'Password must be maximum 32 characters')
      .required('Password is required'),
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

export const changePasswordSchema = object({
  body: object({
    password: string().min(8).max(32).required(),
  }),
})
