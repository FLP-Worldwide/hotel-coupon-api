// src/middlewares/upload.js
const path = require("path");
const fs = require("fs");
const multer = require("multer");

// 🔥 Detect Lambda
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// ✅ Base upload directory
const BASE_UPLOAD_DIR = isLambda
  ? "/tmp/uploads"                  // ✅ Lambda writable
  : path.join(__dirname, "..", "uploads"); // ✅ Local / EC2

const HOTEL_UPLOAD_PATH = path.join(BASE_UPLOAD_DIR, "hotels");

// ✅ Ensure directory exists
if (!fs.existsSync(HOTEL_UPLOAD_PATH)) {
  fs.mkdirSync(HOTEL_UPLOAD_PATH, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, HOTEL_UPLOAD_PATH);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "");

    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}-${name}${ext}`);
  }
});

// Only images
function fileFilter(req, file, cb) {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
module.exports.HOTEL_UPLOAD_PATH = HOTEL_UPLOAD_PATH;
