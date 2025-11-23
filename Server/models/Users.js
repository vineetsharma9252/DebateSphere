const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String },
  email: { type: String, required: true },
  phone: { type: String },
  rank: { type: Number, default: 99999 },
  created_at: { type: Date, default: Date.now },
  user_image: { type: String, default: "" },
  desc: { type: String, default: "Hi there i am using Debate Sphere" },
  total_debates: { type: Number, default: 0 },
  debates_won: { type: Number, default: 0 },
  googleId: { type: String },
  profilePicture: { type: String, default: "" },
  isVerified: { type: Boolean, default: false }
});

const User = mongoose.model("User", userSchema);

module.exports = User; // Use CommonJS export