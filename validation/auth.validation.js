const yup = require('yup')

const loginUserSchema = yup.object({
  body: yup.object({
    email: yup.string().email().required(),
    password: yup.string().min(8).max(32).required(),
  }),
})

const registerUserSchema = yup.object({
  body: yup.object({
    first_name: yup.string().required(),
    last_name: yup.string().required(),
    email: yup.string().email().required(),
    password: yup.string().min(8).max(32).required(),
  }),
})

const forgotPasswordUserSchema = yup.object({
  body: yup.object({
    email: yup.string().email().required(),
  }),
})

module.exports = {
  loginUserSchema,
  registerUserSchema,
  forgotPasswordUserSchema,
}
