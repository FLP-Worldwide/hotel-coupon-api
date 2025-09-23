const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser'); // <<< add this

const app = express();

// const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
// app.use(cors({
//   origin: CLIENT_ORIGIN,
//   credentials: true,
//   methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
//   allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With'],
// }));

// Allow CORS for all origins
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser MUST be before your routes so req.cookies is available
app.use(cookieParser());

// Static uploads
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiter
const limiter = rateLimit({ windowMs: 60*1000, max: 120 });
app.use(limiter);

// Routes
app.use('/api', require('./routes/index.route'));

// Health check
app.get('/', (req, res) => res.send('API is running 🚀'));
module.exports = app;
