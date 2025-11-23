const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  topic: { type: String, required: true, index: true },
  title: { type: String, required: true },
  desc: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Room', roomSchema);