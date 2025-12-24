const mongoose = require('mongoose');

const debateResultSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  debateTitle: { type: String },

  // Debate timing
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  isActive: { type: Boolean, default: true },
  totalRounds: { type: Number, default: 0 },

  // Team statistics
  teamScores: {
    favor: {
      totalPoints: { type: Number, default: 0 },
      argumentCount: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      participants: [{ type: String }] // User IDs
    },
    against: {
      totalPoints: { type: Number, default: 0 },
      argumentCount: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      participants: [{ type: String }]
    },
    neutral: {
      totalPoints: { type: Number, default: 0 },
      argumentCount: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      participants: [{ type: String }]
    }
  },

  // Individual awards
  awards: {
    bestArgument: {
      userId: String,
      username: String,
      score: Number,
      argumentExcerpt: String
    },
    mostPersuasive: {
      userId: String,
      username: String,
      score: Number
    },
    mostActive: {
      userId: String,
      username: String,
      argumentCount: Number
    }
  },

  // Winner information
  winningTeam: {
    type: String,
    enum: ['favor', 'against', 'neutral', 'tie', 'undecided', 'disqualified'],
    default: 'undecided'
  },
  marginOfVictory: { type: Number },
  calculatedAt: { type: Date },

  // Debate settings
  settings: {
    maxDuration: { type: Number, default: 1800 }, // 30 minutes in seconds
    maxArguments: { type: Number, default: 50 },
    minArgumentsPerTeam: { type: Number, default: 3 },
    winMarginThreshold: { type: Number, default: 10 } // Percentage
  }
});

module.exports = mongoose.model('DebateResult', debateResultSchema);