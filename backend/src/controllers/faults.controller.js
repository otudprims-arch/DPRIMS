// src/controllers/faults.controller.js
import mongoose from 'mongoose';
import Fault from '../models/Fault.js';

function buildFaultFilter(query = {}) {
  const filter = {};

  if (query.status) filter.status = String(query.status);
  if (query.severity) filter.severity = String(query.severity);
  if (query.type) filter.defect_type = String(query.type);
  if (query.camera) filter.camera = String(query.camera);
  if (query.sleeper) filter.nearest_sleeper = String(query.sleeper);
  if (query.zone) filter.track_zone = String(query.zone);
  if (query.train_id) filter.train_id = String(query.train_id);
  if (query.session_id) filter.session_id = String(query.session_id);
  if (query.assigned_to) filter.assigned_to = String(query.assigned_to);

  if (query.railJoint === 'true') filter.is_on_rail_joint = true;
  if (query.railJoint === 'false') filter.is_on_rail_joint = false;

  const minPriority = Number(query.minPriority);
  const maxPriority = Number(query.maxPriority);

  if (!Number.isNaN(minPriority) || !Number.isNaN(maxPriority)) {
    filter.priority_score = {};
    if (!Number.isNaN(minPriority)) filter.priority_score.$gte = minPriority;
    if (!Number.isNaN(maxPriority)) filter.priority_score.$lte = maxPriority;
  }

  return filter;
}

function getPagination(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit || 50), 1), 200);
  const page = Math.max(Number(query.page || 1), 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

function pushHistory(fault, action, body = {}, toStatus = null) {
  fault.history.push({
    action,
    by: body.by || 'operator',
    notes: body.notes || '',
    from_status: fault.status,
    to_status: toStatus || fault.status,
    at: new Date(),
  });
}

export async function getFaults(req, res) {
  try {
    const filter = buildFaultFilter(req.query);
    const { limit, page, skip } = getPagination(req.query);

    const [items, total] = await Promise.all([
      Fault.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('alert_ref')
        .lean(),
      Fault.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      filter,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      data: items,
    });
  } catch (err) {
    console.error('[GET FAULTS ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to fetch faults',
      error: err.message,
    });
  }
}

export async function getFaultById(req, res) {
  try {
    const { id } = req.params;

    const fault = mongoose.Types.ObjectId.isValid(id)
      ? await Fault.findById(id).populate('alert_ref')
      : await Fault.findOne({ fault_id: id }).populate('alert_ref');

    if (!fault) {
      return res.status(404).json({
        success: false,
        message: 'Fault not found',
      });
    }

    return res.json({
      success: true,
      data: fault,
    });
  } catch (err) {
    console.error('[GET FAULT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to fetch fault',
      error: err.message,
    });
  }
}

export async function assignFault(req, res) {
  try {
    const fault = await Fault.findById(req.params.id);

    if (!fault) {
      return res.status(404).json({
        success: false,
        message: 'Fault not found',
      });
    }

    fault.assigned_to = req.body.assigned_to || req.body.technician || 'maintenance-team';
    fault.assigned_at = new Date();
    pushHistory(fault, 'assign', req.body, 'assigned');
    fault.status = 'assigned';

    await fault.save();

    return res.json({
      success: true,
      message: 'Fault assigned',
      data: fault,
    });
  } catch (err) {
    console.error('[ASSIGN FAULT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to assign fault',
      error: err.message,
    });
  }
}

export async function startRepairFault(req, res) {
  try {
    const fault = await Fault.findById(req.params.id);

    if (!fault) {
      return res.status(404).json({
        success: false,
        message: 'Fault not found',
      });
    }

    fault.repair_started_at = new Date();
    fault.repair_notes = req.body.notes || fault.repair_notes;
    pushHistory(fault, 'start_repair', req.body, 'in_progress');
    fault.status = 'in_progress';

    await fault.save();

    return res.json({
      success: true,
      message: 'Fault repair started',
      data: fault,
    });
  } catch (err) {
    console.error('[START REPAIR FAULT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to start repair',
      error: err.message,
    });
  }
}

export async function markRepairedFault(req, res) {
  try {
    const fault = await Fault.findById(req.params.id);

    if (!fault) {
      return res.status(404).json({
        success: false,
        message: 'Fault not found',
      });
    }

    fault.repaired_at = new Date();
    fault.repair_notes = req.body.notes || fault.repair_notes;

    if (req.body.after_images) {
      fault.after_images = {
        front: req.body.after_images.front || fault.after_images.front,
        rear: req.body.after_images.rear || fault.after_images.rear,
      };
    }

    pushHistory(fault, 'mark_repaired', req.body, 'repaired');
    fault.status = 'repaired';

    await fault.save();

    return res.json({
      success: true,
      message: 'Fault marked as repaired',
      data: fault,
    });
  } catch (err) {
    console.error('[MARK REPAIRED FAULT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to mark repaired',
      error: err.message,
    });
  }
}

export async function verifyFault(req, res) {
  try {
    const fault = await Fault.findById(req.params.id);

    if (!fault) {
      return res.status(404).json({
        success: false,
        message: 'Fault not found',
      });
    }

    fault.verified_at = new Date();
    fault.verification_notes = req.body.notes || fault.verification_notes;
    pushHistory(fault, 'verify', req.body, 'verified');
    fault.status = 'verified';

    await fault.save();

    return res.json({
      success: true,
      message: 'Fault verified',
      data: fault,
    });
  } catch (err) {
    console.error('[VERIFY FAULT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to verify fault',
      error: err.message,
    });
  }
}

export async function closeFault(req, res) {
  try {
    const fault = await Fault.findById(req.params.id);

    if (!fault) {
      return res.status(404).json({
        success: false,
        message: 'Fault not found',
      });
    }

    fault.closed_at = new Date();
    pushHistory(fault, 'close', req.body, 'closed');
    fault.status = 'closed';

    await fault.save();

    return res.json({
      success: true,
      message: 'Fault closed',
      data: fault,
    });
  } catch (err) {
    console.error('[CLOSE FAULT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to close fault',
      error: err.message,
    });
  }
}

export async function rejectFault(req, res) {
  try {
    const fault = await Fault.findById(req.params.id);

    if (!fault) {
      return res.status(404).json({
        success: false,
        message: 'Fault not found',
      });
    }

    pushHistory(fault, 'reject', req.body, 'rejected');
    fault.status = 'rejected';

    await fault.save();

    return res.json({
      success: true,
      message: 'Fault rejected',
      data: fault,
    });
  } catch (err) {
    console.error('[REJECT FAULT ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to reject fault',
      error: err.message,
    });
  }
}

export async function getFaultStats(req, res) {
  try {
    const [
      total,
      open,
      critical,
      byStatus,
      bySeverity,
      byType,
      bySleeper,
      byZone,
      recent,
    ] = await Promise.all([
      Fault.countDocuments({}),
      Fault.countDocuments({
        status: { $nin: ['closed', 'rejected'] },
      }),
      Fault.countDocuments({ severity: 'critical' }),

      Fault.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Fault.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 }, maxPriority: { $max: '$priority_score' } } },
        { $sort: { count: -1 } },
      ]),

      Fault.aggregate([
        { $group: { _id: '$defect_type', count: { $sum: 1 }, avgConfidence: { $avg: '$confidence' } } },
        { $sort: { count: -1 } },
      ]),

      Fault.aggregate([
        { $match: { nearest_sleeper: { $ne: null } } },
        { $group: { _id: '$nearest_sleeper', count: { $sum: 1 }, criticalCount: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),

      Fault.aggregate([
        { $group: { _id: '$track_zone', count: { $sum: 1 }, criticalCount: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } } } },
        { $sort: { count: -1 } },
      ]),

      Fault.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        total,
        open,
        critical,
        byStatus,
        bySeverity,
        byType,
        bySleeper,
        byZone,
        recent,
      },
    });
  } catch (err) {
    console.error('[FAULT STATS ERROR]', err);

    return res.status(500).json({
      success: false,
      message: 'failed to fetch fault stats',
      error: err.message,
    });
  }
}