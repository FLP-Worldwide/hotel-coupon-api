// src/middlewares/upload.js
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ensure upload folder exists
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const HOTEL_UPLOAD_PATH = path.join(UPLOAD_ROOT, 'hotels');
fs.mkdirSync(HOTEL_UPLOAD_PATH, { recursive: true });

// disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, HOTEL_UPLOAD_PATH);
  },
  filename: function (req, file, cb) {
    // timestamp + random + original ext
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    const filename = `${Date.now()}-${Math.floor(Math.random()*1e6)}-${name}${ext}`;
    cb(null, filename);
  }
});

// only allow images
function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  if (allowed.test(ext) && (mime.startsWith('image/'))) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB per file
  }
});

module.exports = upload;
module.exports.HOTEL_UPLOAD_PATH = HOTEL_UPLOAD_PATH;
