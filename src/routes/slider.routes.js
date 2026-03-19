const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/* ================= MODEL ================= */
const sliderSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Slider = mongoose.model('Slider', sliderSchema);

/* ================= CREATE ================= */
// POST /admin/sliders
router.post('/', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'Image URL is required' });
    }

    const slider = await Slider.create({ image });

    return res.json({
      message: 'Slider created successfully',
      slider,
    });
  } catch (err) {
    console.error('create slider error', err);
    return res.status(500).json({
      message: 'Internal server error',
      error: err.message,
    });
  }
});

/* ================= GET ALL ================= */
// GET /admin/sliders
router.get('/', async (req, res) => {
  try {
    const sliders = await Slider.find().sort({ createdAt: -1 });

    return res.json(sliders);
  } catch (err) {
    console.error('get sliders error', err);
    return res.status(500).json({
      message: 'Internal server error',
      error: err.message,
    });
  }
});

/* ================= DELETE ================= */
// DELETE /admin/sliders/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid slider id' });
    }

    const slider = await Slider.findByIdAndDelete(id);

    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }

    return res.json({ message: 'Slider deleted successfully' });
  } catch (err) {
    console.error('delete slider error', err);
    return res.status(500).json({
      message: 'Internal server error',
      error: err.message,
    });
  }
});

module.exports = router;