const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const StudentList = require('../models/StudentList');

// Require admin authentication for all student-list endpoints
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * Deduplicate and sanitize student array
 */
function sanitizeStudents(rawStudents = []) {
  if (!Array.isArray(rawStudents)) return [];

  const seen = new Set();
  const cleaned = [];

  for (const item of rawStudents) {
    if (!item) continue;
    const registerNumber = (item.registerNumber || '').trim().toUpperCase();
    const name = (item.name || '').trim();

    if (!registerNumber || !name) continue;

    if (!seen.has(registerNumber)) {
      seen.add(registerNumber);
      cleaned.push({ registerNumber, name });
    }
  }

  return cleaned.slice(0, 2000);
}

/**
 * POST /api/student-lists
 * Create a new saved student list (Owner isolated)
 */
router.post('/', async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id;
    const name = (req.body.name || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'List name is required' });
    }

    const students = sanitizeStudents(req.body.students || []);

    const existing = await StudentList.findOne({ ownerId, name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A student list with this name already exists in your account'
      });
    }

    const studentList = new StudentList({
      ownerId,
      name,
      students,
    });

    await studentList.save();

    res.status(201).json({
      success: true,
      message: 'Student list saved successfully',
      data: {
        _id: studentList._id,
        name: studentList.name,
        studentCount: studentList.students.length,
        students: studentList.students,
        createdAt: studentList.createdAt,
        updatedAt: studentList.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating student list:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/student-lists
 * List all saved student lists for the authenticated admin with student counts
 */
router.get('/', async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id;
    const lists = await StudentList.find({ ownerId }).sort('-updatedAt');

    const summary = lists.map(l => ({
      _id: l._id,
      name: l.name,
      studentCount: l.students ? l.students.length : 0,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt
    }));

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching student lists:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/student-lists/:id
 * Retrieve a specific saved student list (Owner isolated)
 */
router.get('/:id', async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id;
    const list = await StudentList.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ success: false, message: 'Student list not found' });
    }

    if (String(list.ownerId) !== String(ownerId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this student list' });
    }

    res.status(200).json({
      success: true,
      data: list
    });
  } catch (error) {
    console.error('Error fetching student list:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/student-lists/:id
 * Update or rename a saved student list (Owner isolated)
 */
router.put('/:id', async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id;
    const list = await StudentList.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ success: false, message: 'Student list not found' });
    }

    if (String(list.ownerId) !== String(ownerId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this student list' });
    }

    if (req.body.name) {
      const newName = req.body.name.trim();
      if (!newName) {
        return res.status(400).json({ success: false, message: 'List name cannot be empty' });
      }

      if (newName !== list.name) {
        const conflict = await StudentList.findOne({ ownerId, name: newName });
        if (conflict) {
          return res.status(400).json({ success: false, message: 'A list with this name already exists' });
        }
        list.name = newName;
      }
    }

    if (Array.isArray(req.body.students)) {
      list.students = sanitizeStudents(req.body.students);
    }

    await list.save();

    res.status(200).json({
      success: true,
      message: 'Student list updated successfully',
      data: {
        _id: list._id,
        name: list.name,
        studentCount: list.students.length,
        students: list.students,
        updatedAt: list.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating student list:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/student-lists/:id
 * Delete a saved student list (Owner isolated)
 */
router.delete('/:id', async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id;
    const list = await StudentList.findById(req.params.id);

    if (!list) {
      return res.status(404).json({ success: false, message: 'Student list not found' });
    }

    if (String(list.ownerId) !== String(ownerId)) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not own this student list' });
    }

    await StudentList.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Student list deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student list:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
