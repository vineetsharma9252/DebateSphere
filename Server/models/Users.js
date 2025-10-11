import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String},
  rank : { type : Number, default:99999} ,
  created_at: { type: Date, default: Date.now },
  user_image : {type:String, default: ""},
  desc : {type:String , default:"Hi there i am using Debate Sphere"},
  total_debates : {type : Number , default:0 } ,
  debates_won : {type:Number , default:0} ,


});

const user = mongoose.model("User", userSchema);

export default user;
