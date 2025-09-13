// scripts/seed-admins.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

const SALT_ROUNDS = 10;

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@example.com';
  const adminPass = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';
  const hotelEmail = process.env.HOTEL_DEFAULT_EMAIL || 'hotel@example.com';
  const hotelPass = process.env.HOTEL_DEFAULT_PASSWORD || 'Hotel@123';

  // create super admin
  let a = await Admin.findOne({ email: adminEmail });
  if (!a) {
    const hash = await bcrypt.hash(adminPass, SALT_ROUNDS);
    a = await Admin.create({ email: adminEmail, username: 'superadmin', passwordHash: hash, name: 'Super Admin', role: 'admin' });
    console.log('Created admin:', a.email);
  } else {
    console.log('Admin exists:', adminEmail);
  }

  // create hotel user
  let h = await Admin.findOne({ email: hotelEmail });
  if (!h) {
    const hashH = await bcrypt.hash(hotelPass, SALT_ROUNDS);
    h = await Admin.create({ email: hotelEmail, username: 'hoteluser', passwordHash: hashH, name: 'Hotel User', role: 'hotel' });
    console.log('Created hotel user:', h.email);
  } else {
    console.log('Hotel user exists:', hotelEmail);
  }

  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
