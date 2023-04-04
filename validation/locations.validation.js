import { boolean, number, object, string } from 'yup'

const openingTimesErr = 'Opening times are required'

export const checkLocationSchema = object({
  body: object({
    nickname: string().required('Nickname is required'),
    phone_number: string().required('Phone number is required'),
    email: string().required('Email is required'),
    address: object({
      address_line_1: string().required('Address - line 1 is required'),
      postcode: string().required('Address - postcode is required'),
      city: string().required('Address - city is required'),
      country: string().required('Address - country required'),
    }),
    opening_times: object({
      mon: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      tue: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      wed: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      thu: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      fri: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      sat: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      sun: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
    }),
  }),
})

export const addLocationSchema = object({
  body: object({
    nickname: string().required('Nickname is required'),
    phone_number: string().required('Phone number is required'),
    email: string().required('Email is required'),
    address: object({
      address_line_1: string().required('Address - line 1 is required'),
      postcode: string().required('Address - postcode is required'),
      city: string().required('Address - city is required'),
      country: string().required('Address - country required'),
    }),
    opening_times: object({
      mon: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      tue: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      wed: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      thu: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      fri: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      sat: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
      sun: object({
        is_open: boolean().required(openingTimesErr),
        open: string().required(openingTimesErr),
        close: string().required(openingTimesErr),
      }),
    }),
    long_lat: object({
      long: number().required(),
      lat: number().required(),
    }),
  }),
})

export const deleteLocationSchema = object({
  body: object({
    id: string().required('Location ID is required'),
  }),
})
