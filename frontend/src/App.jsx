import { useEffect, useState } from 'react'
import './App.css'

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

const times = ['10:00 AM', '1:30 PM', '5:00 PM', '8:30 PM']

const posterStyles = [
  { emoji: '🚀', color: '#182d50' },
  { emoji: '🦇', color: '#34313e' },
  { emoji: '🌃', color: '#4c2857' },
  { emoji: '🏜️', color: '#8c4c27' },
  { emoji: '🕷️', color: '#572b43' },
  { emoji: '🌌', color: '#185c78' },
]

export default function App() {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedSeats, setSelectedSeats] = useState([])
  const [booking, setBooking] = useState(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookedSeats, setBookedSeats] = useState([])
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [seatsError, setSeatsError] = useState('')

  // Load movies from MongoDB through the backend.
  useEffect(() => {
    async function fetchMovies() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_URL}/movies`)

        if (!response.ok) {
          throw new Error(`Could not load movies (${response.status})`)
        }

        const data = await response.json()

        const formattedMovies = data.map((movie, index) => ({
          ...movie,
          id: movie._id,
          genre: movie.genre || 'Movie',
          rating: movie.rating ?? 'N/A',
          price: Number(movie.price) || 0,
          ...posterStyles[index % posterStyles.length],
        }))

        setMovies(formattedMovies)
      } catch (err) {
        console.error('Error fetching movies:', err)
        setError(
          'Unable to load movies. Make sure your backend and MongoDB are running on port 5001.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
  }, [])

  // Load seats already booked for the selected movie and showtime.
  useEffect(() => {
    let cancelled = false

    async function fetchBookedSeats() {
      if (!selectedMovie?._id || !selectedTime) {
        setBookedSeats([])
        setSeatsError('')
        setSeatsLoading(false)
        return
      }

      setSeatsLoading(true)
      setSeatsError('')

      try {
        const params = new URLSearchParams({
          movieId: selectedMovie._id,
          showtime: selectedTime,
        })

        const response = await fetch(
          `${API_URL}/bookings/seats?${params.toString()}`
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Could not load booked seats.')
        }

        if (!cancelled) {
          const seats = Array.isArray(data.seats) ? data.seats : []
          setBookedSeats(seats)

          // Remove any seats that have since been booked by someone else.
          setSelectedSeats(current =>
            current.filter(seat => !seats.includes(seat))
          )
        }
      } catch (err) {
        console.error('Error fetching booked seats:', err)

        if (!cancelled) {
          setBookedSeats([])
          setSeatsError(
            err.message || 'Unable to load booked seats. Please try again.'
          )
        }
      } finally {
        if (!cancelled) {
          setSeatsLoading(false)
        }
      }
    }

    fetchBookedSeats()

    return () => {
      cancelled = true
    }
  }, [selectedMovie?._id, selectedTime, booking])

  const visibleMovies = movies.filter(movie =>
    movie.title.toLowerCase().includes(search.toLowerCase())
  )

  function toggleSeat(seat) {
    if (
      bookedSeats.includes(seat) ||
      seatsLoading ||
      seatsError ||
      !selectedTime
    ) {
      return
    }

    setSelectedSeats(current =>
      current.includes(seat)
        ? current.filter(item => item !== seat)
        : [...current, seat]
    )

    setBookingError('')
  }

  async function bookTickets() {
    if (!selectedMovie || !selectedTime || selectedSeats.length === 0) {
      setBookingError('Please select a showtime and at least one seat.')
      return
    }

    if (seatsLoading || seatsError) {
      setBookingError('Please load the booked seats successfully before booking.')
      return
    }

    setBookingLoading(true)
    setBookingError('')

    try {
      const response = await fetch(`${API_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: selectedMovie._id,
          showtime: selectedTime,
          seats: selectedSeats,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          // Another booking may have taken one of these seats.
          setSelectedSeats([])
          setBookingError(
            data.message ||
              'One or more seats are already booked. Please choose again.'
          )
        } else {
          throw new Error(data.message || 'Booking failed. Please try again.')
        }

        return
      }

      setBooking({
        id: data.bookingReference,
        movie: data.movieTitle,
        time: data.showtime,
        seats: data.seats,
        total: data.total,
      })
    } catch (err) {
      console.error('Booking error:', err)
      setBookingError(err.message || 'Could not complete your booking.')
    } finally {
      setBookingLoading(false)
    }
  }

  function goHome() {
    setSelectedMovie(null)
    setSelectedTime('')
    setSelectedSeats([])
    setBooking(null)
    setBookingError('')
    setBookedSeats([])
    setSeatsError('')
    setSeatsLoading(false)
  }

  function selectMovie(movie) {
    setSelectedMovie(movie)
    setSelectedTime('')
    setSelectedSeats([])
    setBookedSeats([])
    setBooking(null)
    setBookingError('')
    setSeatsError('')
  }

  function selectShowtime(time) {
    setSelectedTime(time)
    setSelectedSeats([])
    setBookingError('')
    setSeatsError('')
  }

  async function retryBookedSeats() {
    if (!selectedMovie?._id || !selectedTime) return

    setSeatsError('')
    setSeatsLoading(true)

    try {
      const params = new URLSearchParams({
        movieId: selectedMovie._id,
        showtime: selectedTime,
      })

      const response = await fetch(
        `${API_URL}/bookings/seats?${params.toString()}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not load booked seats.')
      }

      setBookedSeats(Array.isArray(data.seats) ? data.seats : [])
    } catch (err) {
      console.error('Error refreshing booked seats:', err)
      setSeatsError(err.message || 'Unable to load booked seats.')
    } finally {
      setSeatsLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="navbar">
        <button className="logo" onClick={goHome}>
          i<span>Movies</span>
        </button>

        <nav>
          <a href="#home">Home</a>
          <a href="#movies">Movies</a>
          <a href="#about">About</a>
        </nav>

        <a className="nav-button" href="#movies">
          Book tickets
        </a>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <p className="eyebrow">YOUR CINEMA EXPERIENCE STARTS HERE</p>

            <h1>
              Big stories.
              <br />
              Bigger <span>screen.</span>
            </h1>

            <p className="hero-description">
              Discover your next favourite movie and book your seats in minutes.
            </p>

            <a href="#movies" className="primary-button">
              Explore movies ↗
            </a>
          </div>

          <div className="hero-art" aria-label="Movie camera illustration">
            <span>🎬</span>
            <div className="hero-art-caption">YOUR NEXT MOVIE NIGHT</div>
          </div>
        </section>

        {booking ? (
          <section className="confirmation">
            <div className="success-icon">✓</div>
            <p className="eyebrow">BOOKING CONFIRMATION</p>
            <h2>Your movie night awaits!</h2>
            <p className="muted">Booking reference: {booking.id}</p>

            <div className="ticket">
              <h3>{booking.movie}</h3>
              <p>Showtime: {booking.time}</p>
              <p>Seats: {booking.seats.join(', ')}</p>
              <h3>₹{booking.total}</h3>
            </div>

            <p className="muted">
              Reservation saved successfully. No payment has been taken.
            </p>

            <button className="primary-button" onClick={goHome}>
              Back to movies
            </button>
          </section>
        ) : selectedMovie ? (
          <section className="booking-section">
            <button className="back-button" onClick={goHome}>
              ← All movies
            </button>

            <div className="movie-detail">
              <div
                className="poster large-poster"
                style={{ background: selectedMovie.color }}
              >
                {selectedMovie.emoji}
              </div>

              <div>
                <p className="eyebrow">NOW SHOWING</p>
                <h2>{selectedMovie.title}</h2>
                <p className="muted">{selectedMovie.genre}</p>

                {selectedMovie.rating !== 'N/A' && (
                  <p>★ {selectedMovie.rating} / 10</p>
                )}

                <p>Ticket price: ₹{selectedMovie.price}</p>
              </div>
            </div>

            <h3>Choose a showtime</h3>

            <div className="times">
              {times.map(time => (
                <button
                  key={time}
                  className={selectedTime === time ? 'time active' : 'time'}
                  onClick={() => selectShowtime(time)}
                  disabled={bookingLoading}
                >
                  {time}
                </button>
              ))}
            </div>

            <h3>Select your seats</h3>
            <div className="screen">SCREEN THIS WAY</div>

            {seatsLoading && selectedTime && (
              <p role="status">Loading booked seats...</p>
            )}

            {seatsError && (
              <div>
                <p role="alert">{seatsError}</p>
                <button
                  className="primary-button"
                  onClick={retryBookedSeats}
                  disabled={seatsLoading}
                >
                  {seatsLoading ? 'Loading...' : 'Retry loading seats'}
                </button>
              </div>
            )}

            <div className="seat-grid">
              {Array.from({ length: 40 }, (_, i) => {
                const seat =
                  String.fromCharCode(65 + Math.floor(i / 8)) +
                  (i % 8 + 1)

                // Only seats returned by the backend are marked occupied.
                const occupied = bookedSeats.includes(seat)
                const chosen = selectedSeats.includes(seat)

                return (
                  <button
                    key={seat}
                    disabled={
                      occupied ||
                      !selectedTime ||
                      bookingLoading ||
                      seatsLoading ||
                      Boolean(seatsError)
                    }
                    onClick={() => toggleSeat(seat)}
                    className={`seat ${occupied ? 'occupied' : ''} ${
                      chosen ? 'chosen' : ''
                    }`}
                    title={
                      occupied
                        ? 'Already booked'
                        : chosen
                          ? 'Selected'
                          : seat
                    }
                    aria-pressed={chosen}
                    aria-label={`Seat ${seat}${
                      occupied
                        ? ', already booked'
                        : chosen
                          ? ', selected'
                          : ''
                    }`}
                  >
                    {seat}
                  </button>
                )
              })}
            </div>

            <p className="muted">
              Grey: booked · Green: selected · Dark: available
            </p>

            {selectedTime && !seatsLoading && !seatsError && (
              <p className="muted">
                {bookedSeats.length} seat
                {bookedSeats.length === 1 ? '' : 's'} already booked for{' '}
                {selectedTime}.
              </p>
            )}

            {bookingError && (
              <p className="muted" role="alert">
                {bookingError}
              </p>
            )}

            <div className="booking-summary">
              <div>
                <p>{selectedSeats.length} seats selected</p>
                <h2>₹{selectedSeats.length * selectedMovie.price}</h2>
              </div>

              <button
                className="primary-button"
                onClick={bookTickets}
                disabled={
                  bookingLoading ||
                  seatsLoading ||
                  Boolean(seatsError) ||
                  !selectedTime ||
                  selectedSeats.length === 0
                }
              >
                {bookingLoading ? 'Booking...' : 'Confirm booking'}
              </button>
            </div>
          </section>
        ) : (
          <section className="movies-section" id="movies">
            <div className="section-heading">
              <div>
                <p className="eyebrow">HANDPICKED FOR YOU</p>
                <h2>Now showing</h2>
              </div>

              <input
                aria-label="Search movies"
                placeholder="Search movies..."
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>

            {loading ? (
              <p>Loading movies from MongoDB...</p>
            ) : error ? (
              <div>
                <p role="alert">{error}</p>
                <button
                  className="primary-button"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="movie-grid">
                {visibleMovies.map(movie => (
                  <article className="movie-card" key={movie.id}>
                    <div
                      className="poster"
                      style={{ background: movie.color }}
                    >
                      <span>{movie.emoji}</span>

                      {movie.rating !== 'N/A' && (
                        <span className="rating">★ {movie.rating}</span>
                      )}
                    </div>

                    <div className="movie-info">
                      <h3>{movie.title}</h3>
                      <p className="muted">{movie.genre}</p>

                      <div className="movie-bottom">
                        <strong>From ₹{movie.price}</strong>
                        <button onClick={() => selectMovie(movie)}>
                          Book →
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {visibleMovies.length === 0 && (
                  <p>
                    {search
                      ? 'No movies found. Try another title.'
                      : 'No movies available yet. Add a movie to your database to get started.'}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        <section className="about" id="about">
          <p className="eyebrow">MOVIE MAGIC, MADE SIMPLE</p>
          <h2>Your next great story is one click away.</h2>
          <p className="muted">
            Browse films, pick your seats and plan your next cinema visit with
            iMovies.
          </p>
        </section>
      </main>

      <footer>© 2026 iMovies · Your cinema experience starts here.</footer>
    </div>
  )
}