// app.js
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Global rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120
});
app.use(limiter);

// Mount routes
app.use('/api', require('./routes/index.route'));


// Health check / root
app.get('/', (req, res) => res.send('OTP Auth API is running 🚀'));

module.exports = app;
