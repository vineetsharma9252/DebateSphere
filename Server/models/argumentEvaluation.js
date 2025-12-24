const mongoose = require('mongoose');

const argumentEvaluationSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  team: {
    type: String,
    required: true,
    enum: ['favor', 'against', 'neutral']
  },
  argument: { type: String, required: true },

  // Individual criterion scores (1-10)
  scores: {
    clarity: { type: Number, min: 1, max: 10 },
    relevance: { type: Number, min: 1, max: 10 },
    logic: { type: Number, min: 1, max: 10 },
    evidence: { type: Number, min: 1, max: 10 },
    persuasiveness: { type: Number, min: 1, max: 10 },
    rebuttal: { type: Number, min: 1, max: 10 }
  },

  totalScore: { type: Number, required: true },
  feedback: { type: String },

  // Metadata
  evaluatedAt: { type: Date, default: Date.now },
  messageId: { type: String }, // Link to original message
  aiConfidence: { type: Number, default: 0 }
});

module.exports = mongoose.model('ArgumentEvaluation', argumentEvaluationSchema);