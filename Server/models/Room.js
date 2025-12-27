// models/Room.js - Add these fields
const mongoose = require("mongoose");
const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  topic: { type: String, required: true, index: true },
  title: { type: String, required: true },
  desc: { type: String, default: "" },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },

  // Add these fields for debate management
  debateStatus: {
    type: String,
    enum: ['active', 'ended', 'cancelled'],
    default: 'active'
  },
  endedAt: { type: Date },
  winner: {
    type: String,
    enum: ['favor', 'against', 'neutral', 'tie', 'undecided', 'draw', null],
    default: null
  },

  // Add settings field
  settings: {
    maxDuration: { type: Number, default: 30 }, // minutes
    maxArguments: { type: Number, default: 50 },
    winMarginThreshold: { type: Number, default: 10 }
  }
});

module.exports = mongoose.model("Room", roomSchema);