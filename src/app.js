const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser'); // <<< add this

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept','X-Requested-With'],
}));

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



// phone pay

const axios = require('axios');
const crypto = require('crypto');

const merchantId = 'PGTESTPAYUAT86';
const saltKey = '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399';
const saltIndex = '1';

// Create order endpoint
app.post('/api/create-order', async (req, res) => {
  const { amount, merchantUserId, mobileNumber } = req.body;
  if (!amount || !merchantUserId || !mobileNumber) {
    return res.status(400).json({ error: 'Missing parameters' });
  }
  // Use unique transaction id per order
  const merchantTransactionId = `T${Date.now()}${Math.floor(Math.random() * 10000)}`;
  const payload = {
    merchantId,
    merchantTransactionId,
    merchantUserId,
    amount: parseInt(amount, 10) * 100, // Amount in paise
    mobileNumber,
    callbackUrl: "https://webhook.site/YOUR_WEBHOOK_ID", // Change for production
    paymentInstrument: { type: "PAY_PAGE" }
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const apiPath = "/pg/v1/pay";
  const checksum = crypto.createHash('sha256')
    .update(payloadBase64 + apiPath + saltKey).digest('hex') + "###" + saltIndex;

  try {
    const { data } = await axios.post(
      'https://api-preprod.phonepe.com/apis/pg-sandbox' + apiPath,
      { request: payloadBase64 },
      { headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum }
    });
    // Send result to app
    res.json({
      merchantId,
      merchantTransactionId,
      orderId: data.data.merchantTransactionId,
      token: data.data.transactionId
    });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Health check
app.get('/', (req, res) => res.send('API is running 🚀'));
module.exports = app;
