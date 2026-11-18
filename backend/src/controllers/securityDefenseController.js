const securityDefenseService = require('../services/securityDefenseService');

// GET /api/security/playbooks
const getPlaybooks = async (req, res, next) => {
  try {
    const playbooks = securityDefenseService.getPlaybooks();
    return res.json({
      success: true,
      count: playbooks.length,
      playbooks,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/security/defenses
const getDefenses = async (req, res, next) => {
  try {
    const { status, defenseType, category, search, limit = 50, page = 1 } = req.query;
    const result = await securityDefenseService.getDefenses({
      status,
      defenseType,
      category,
      search,
      limit,
      page,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/security/apply
const applyDefense = async (req, res, next) => {
  try {
    const {
      alertId,
      nodeId,
      category,
      target,
      defenseType,
      actionTaken,
      notes,
    } = req.body;

    if (!target) {
      return res.status(400).json({
        success: false,
        message: 'Target (IP address, Hash, or Identifier) is required to apply security defense.',
      });
    }

    const appliedBy = req.user?.name || req.user?.email || 'SOC Analyst';

    const result = await securityDefenseService.applyDefense({
      alertId,
      nodeId,
      category: category || 'Manual',
      target,
      defenseType: defenseType || 'BLOCK_IP',
      actionTaken,
      appliedBy,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: `Security defense applied successfully: ${result.defense.actionTaken}`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/security/defenses/:id
const revokeDefense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const revokedBy = req.user?.name || req.user?.email || 'SOC Analyst';

    const defense = await securityDefenseService.revokeDefense(id, revokedBy);

    return res.json({
      success: true,
      message: `Security defense ${defense.defenseId} revoked. Target ${defense.target} unblocked.`,
      defense,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/security/target/:target
const checkTargetDefense = async (req, res, next) => {
  try {
    const { target } = req.params;
    const result = await securityDefenseService.getDefenses({
      target,
      status: 'Active',
      limit: 5,
    });

    const isDefended = result.defenses.length > 0;

    return res.json({
      success: true,
      target,
      isDefended,
      activeDefenses: result.defenses,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPlaybooks,
  getDefenses,
  applyDefense,
  revokeDefense,
  checkTargetDefense,
};
