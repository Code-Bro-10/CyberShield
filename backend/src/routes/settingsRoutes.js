const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.get('/', requireAuth, getSettings);
router.post('/', requireAuth, requireRole('admin'), updateSettings);

module.exports = router;
