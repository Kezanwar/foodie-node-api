import mongoose from 'mongoose'
import GeoSchema from './GeoSchema.js'

const LocationSchema = new mongoose.Schema(
  {
    nickname: {
      type: String,
    },
    address: {
      type: Object,
      address_line_1: {
        type: String,
      },
      address_line_2: {
        type: String,
      },
      postcode: {
        type: String,
      },
      city: {
        type: String,
      },
      country: {
        type: String,
      },
    },
    phone_number: {
      type: String,
    },
    email: {
      type: String,
    },
    opening_times: {
      type: Object,
      mon: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      tue: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      wed: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      thu: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      fri: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      sat: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
      sun: {
        type: Object,
        is_open: { type: Boolean },
        open: { type: String },
        close: { type: String },
      },
    },
    geometry: GeoSchema,
  },
  { timestamps: true }
)

export default LocationSchema
