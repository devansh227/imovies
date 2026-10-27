
const mongoose = require('mongoose')

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movie',
      required: true,
    },
    movieTitle: {
      type: String,
      required: true,
    },
    showtime: {
      type: String,
      required: true,
    },
    seats: {
      type: [String],
      required: true,
      validate: {
        validator: seats => seats.length > 0 &&
          new Set(seats).size === seats.length,
        message: 'Select at least one unique seat.',
      },
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Booking', bookingSchema)
