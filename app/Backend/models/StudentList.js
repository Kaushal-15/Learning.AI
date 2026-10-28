const mongoose = require('mongoose');

const studentItemSchema = new mongoose.Schema({
  registerNumber: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const studentListSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  students: {
    type: [studentItemSchema],
    default: [],
    validate: [
      function (val) {
        return val.length <= 2000;
      },
      'Student list cannot exceed 2000 students',
    ],
  },
}, {
  timestamps: true,
});

// Enforce unique name per owner
studentListSchema.index({ ownerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('StudentList', studentListSchema);
