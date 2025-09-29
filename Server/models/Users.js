import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  username: { type: String, requried: true },
  password: { type: String, requried: true },
  email: { type: String, requried: true },
  phone: { type: String, requried: true },
});

const user = mongoose.model("User", userSchema);

export default user;
