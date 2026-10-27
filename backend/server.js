const express = require('express')
const mongoose = require('mongoose');
const cors = require('cors')


require('dotenv').config()

const app = express()
const Booking = require('./models/Booking');
const Movie = require('./models/Movie');

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));
  
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the IMovies API!' })
})




app.get('/api/movies', async (req, res) => {
  try {
    const movies = await Movie.find({ isActive: true });
    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/movies', async (req, res) => {
  try {
    const movie = await Movie.create(req.body);
    res.status(201).json(movie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


app.post('/api/bookings', async (req, res) => {
  try {
    const { movieId, showtime, seats } = req.body

    if (
      !movieId ||
      !showtime ||
      !Array.isArray(seats) ||
      seats.length === 0 ||
      seats.some(seat => typeof seat !== 'string') ||
      new Set(seats).size !== seats.length
    ) {
      return res.status(400).json({
        message: 'Please provide a movie, showtime and unique seats.',
      })
    }

    const validTimes = ['10:00 AM', '1:30 PM', '5:00 PM', '8:30 PM']

    if (!validTimes.includes(showtime)) {
      return res.status(400).json({
        message: 'Invalid showtime.',
      })
    }

    if (!mongoose.isValidObjectId(movieId)) {
      return res.status(400).json({
        message: 'Invalid movie ID.',
      })
    }

    const movie = await Movie.findOne({
      _id: movieId,
      isActive: true,
    })

    if (!movie) {
      return res.status(404).json({
        message: 'Movie not found.',
      })
    }

    // Check whether any requested seats are already booked
    // for this movie and showtime.
    const existingBooking = await Booking.findOne({
      movie: movie._id,
      showtime,
      status: 'confirmed',
      seats: { $in: seats },
    })

    if (existingBooking) {
      return res.status(409).json({
        message: 'One or more selected seats are already booked. Please choose other seats.',
      })
    }

    const booking = await Booking.create({
      bookingReference:
        'IM' + new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase(),
      movie: movie._id,
      movieTitle: movie.title,
      showtime,
      seats,
      total: seats.length * movie.price,
    })

    res.status(201).json(booking)
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Please try booking again.',
      })
    }

    console.error('Booking error:', error)

    res.status(500).json({
      message: 'Unable to create booking.',
    })
  }
})

app.get('/api/bookings/seats', async (req, res) => {
  try {
    const { movieId, showtime } = req.query

    if (!mongoose.isValidObjectId(movieId) || !showtime) {
      return res.status(400).json({
        message: 'A valid movieId and showtime are required.',
      })
    }

    const bookings = await Booking.find({
      movie: movieId,
      showtime,
      status: 'confirmed',
    }).select('seats')

    const seats = [...new Set(bookings.flatMap(booking => booking.seats))]

    res.json({ seats })
  } catch (error) {
    res.status(500).json({ message: 'Unable to retrieve booked seats.' })
  }
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`IMovies server running on http://localhost:${PORT}`)
})