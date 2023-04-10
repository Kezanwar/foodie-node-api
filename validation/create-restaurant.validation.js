import { object, string, boolean } from 'yup'

export const companyInfoSchema = object({
  body: object({
    company_name: string().required('Company name is required'),
    company_number: string().required('Company number is required'),
    company_address: object({
      address_line_1: string().required('Company address line 1 is required'),
      postcode: string().required('Company address postcode is required'),
      city: string().required('Company address city is required'),
      country: string().required('Company address country required'),
    }),
  }),
})

export const restaurantDetailsSchema = object({
  body: object({
    name: string().required('Restaurant name is required').min(1).max(32),
    bio: string().required('Restaurant bio is required').min(140).max(500),
  }),
})

export const restaurantSubmitApplicationSchema = object({
  body: object({
    terms_and_conditions: boolean()
      .required('The terms and conditions must be accepted.')
      .oneOf([true], 'The terms and conditions must be accepted.'),
    privacy_policy: boolean()
      .required('The privacy policy must be accepted.')
      .oneOf([true], 'The privacy policy must be accepted.'),
  }),
})
