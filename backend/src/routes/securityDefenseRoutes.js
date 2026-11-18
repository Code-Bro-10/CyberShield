const express = require('express');
const router = express.Router();
const {
  getPlaybooks,
  getDefenses,
  applyDefense,
  revokeDefense,
  checkTargetDefense,
} = require('../controllers/securityDefenseController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/playbooks', requireAuth, getPlaybooks);
router.get('/defenses', requireAuth, getDefenses);
router.post('/apply', requireAuth, applyDefense);
router.delete('/defenses/:id', requireAuth, revokeDefense);
router.get('/target/:target', requireAuth, checkTargetDefense);

module.exports = router;
