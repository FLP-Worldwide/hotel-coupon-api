require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.route');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

// Global rate limiter (light)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120
});
app.use(limiter);

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => res.send('OTP Auth API is running'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
