const express = require('express');
const router = express.Router();
const { getMlStatus, predictAnomaly, triggerRetrain } = require('../controllers/mlController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/status', requireAuth, getMlStatus);
router.post('/predict', requireAuth, predictAnomaly);
router.post('/retrain', requireAuth, triggerRetrain);

module.exports = router;
