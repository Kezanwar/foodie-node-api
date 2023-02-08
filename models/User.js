const mongoose = require('mongoose')

const UserSchema = mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    email_confirmed: {
      type: Boolean,
      default: false,
      required: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    restaurant: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'restaurant',
      },
      role: {
        type: String,
      },
    },
  },
  { timestamps: true }
)

module.exports = User = mongoose.model('user', UserSchema)
