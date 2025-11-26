const mongoose = require('mongoose');

const userStanceSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  stance: {
    type: String,
    required: true,
    enum: ['against', 'favor', 'neutral']
  },
  stanceLabel: {
    type: String,
    required: true
  },
  userImage: {
    type: String,
    default: ''
  },
  selectedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index to ensure one stance per user per room
userStanceSchema.index({ roomId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('UserStance', userStanceSchema);