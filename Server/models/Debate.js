const mongoose = require('mongoose');


const debateSchema = new mongoose.Schema({
    roomId : {type:String , required:true} ,
    DebateName : {type:String , required:false} ,
    userId : { type: mongoose.Schema.Types.ObjectId, ref:'User' },
    argument : {type:String , default:"--"} ,
    pointAfterEvaluation: {type:Number, default:0} ,
    team : {type:String , default:"neutral",  required:true} ,
    messageAt : {type:Date , default:Date.now }
});

module.exports = mongoose.model("debateSchema",debateSchema) ;