const express = require('express');
const router = express.Router();
const { getSystemLogs } = require('../controllers/systemLogController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/', requireAuth, getSystemLogs);

module.exports = router;
