const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // parse JSON
app.use(express.urlencoded({ extended: true })); // parse URL-encoded bodies (form posts)

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global rate limiter
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120
});
app.use(limiter);

// Mount routes
app.use('/api', require('./routes/index.route'));

// Health check / root
app.get('/', (req, res) => res.send('API is running 🚀'));

module.exports = app;
