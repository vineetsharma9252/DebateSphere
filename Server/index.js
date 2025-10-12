import express from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import user from "./models/Users.js"; // Your Mongoose model
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Room from "./models/Room.js" ;
import User from "./models/Users.js";
dotenv.config(); // Loads variables from .env into process.env

// Connect to MongoDB
mongoose
  .connect(`${process.env.MONGOOSE_CONNECTION_STRING}`)
  .then(() => console.log("✅ Database connected successfully"))
  .catch((error) => console.log("❌ DB connection error: " + error));

// Message Schema for storing messages and images
const messageSchema = new mongoose.Schema({
  text: { type: String, default: "" },
  image: { type: String, default: "" }, // Store base64 image string
  sender: { type: String, required: true },
  roomId: { type: String, required: true },
  time: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: String }, // Track who deleted the message
});

const Message = mongoose.model("Message", messageSchema);

// Setup Express
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// HTTP server required for socket.io
const server = http.createServer(app);

// Initialize socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("join_room", async (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);

    // Send system message to room
    io.to(roomId).emit("receive_message", {
      text: `A user has joined the room`,
      sender: "System",
      roomId,
      time: new Date().toISOString(),
      isSystem: true,
    });

    // Send previous messages
    try {
      const messages = await Message.find({ roomId })
        .sort({ time: 1 })
        .limit(50)
        .lean();

      const formattedMessages = messages.map((msg) => ({
        id: msg._id.toString(),
        text: msg.isDeleted ? "This message was deleted" : msg.text,
        image: msg.isDeleted ? null : msg.image,
        sender: msg.sender,
        roomId: msg.roomId,
        time: msg.time.toISOString(),
        isDeleted: msg.isDeleted,
        isSystem: msg.sender === "System",
      }));

      socket.emit("previous_messages", formattedMessages);
    } catch (err) {
      console.error("Error fetching previous messages:", err);
      socket.emit("receive_message", {
        text: "Error loading previous messages",
        sender: "System",
        roomId,
        time: new Date().toISOString(),
        isSystem: true,
      });
    }
  });

  socket.on("send_message", async (data, callback) => {
    // data = { roomId, sender, text, image, time }
    console.log(`💬 Message from ${data.sender} in room ${data.roomId}: ${data.text || "Image"}`);

    // Validate image if present
    if (data.image) {
      if (!data.image.startsWith("data:image/")) {
        if (callback) callback({ status: "error", error: "Invalid image format" });
        return;
      }
      // Approximate base64 size check (5MB limit, accounting for base64 overhead)
      if (data.image.length > 7 * 1024 * 1024) { // ~5MB after base64 decoding
        if (callback) callback({ status: "error", error: "Image size exceeds 5MB" });
        return;
      }
    }

    try {
      // Save message to database
      const messageData = {
        text: data.text || "",
        image: data.image || "",
        sender: data.sender,
        roomId: data.roomId,
        time: new Date(data.time),
        isDeleted: false,
      };
      const savedMessage = await new Message(messageData).save();

      // Broadcast message to room
      const broadcastMessage = {
        id: savedMessage._id.toString(),
        text: savedMessage.text,
        image: savedMessage.image,
        sender: savedMessage.sender,
        roomId: savedMessage.roomId,
        time: savedMessage.time.toISOString(),
        isDeleted: false,
      };
      io.to(data.roomId).emit("receive_message", broadcastMessage);

      // Acknowledge receipt
      if (callback) callback({ status: "ok", id: savedMessage._id });
    } catch (err) {
      console.error("Error saving message:", err);
      if (callback) callback({ status: "error", error: err.message });
    }
  });

  // Handle message deletion
  socket.on("delete_message", async (data, callback) => {
    const { messageId, roomId} = data;
    const username  = "User" ;
    console.log(`🗑️ Delete request for message ${messageId} by ${username} in room ${roomId}`);

    try {
      // Find the message
      const message = await Message.findById(messageId);

      if (!message) {
        if (callback) callback({ success: false, error: "Message not found" });
        return;
      }

      // Check if user is the sender (only allow users to delete their own messages)
      console.log("Message Sender is " + message.sender) ;
      console.log("Username is " + username) ;
      if (message.sender !== username) {
        if (callback) callback({ success: false, error: "You can only delete your own messages" });
        return;
      }

      // Check if message is already deleted
      if (message.isDeleted) {
        if (callback) callback({ success: false, error: "Message already deleted" });
        return;
      }

      // Soft delete the message (preserve in database but mark as deleted)
      message.text = "This message was deleted";
      message.image = "";
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deletedBy = username;

      await message.save();

      // Broadcast deletion to all clients in the room
      const deletedMessage = {
        id: message._id.toString(),
        text: "This message was deleted",
        image: null,
        sender: message.sender,
        roomId: message.roomId,
        time: message.time.toISOString(),
        isDeleted: true,
        deletedAt: message.deletedAt.toISOString(),
        deletedBy: username,
      };

      io.to(roomId).emit("message_deleted", deletedMessage);

      // Send system message about deletion
      io.to(roomId).emit("receive_message", {
        text: `${username} deleted a message`,
        sender: "System",
        roomId,
        time: new Date().toISOString(),
        isSystem: true,
      });

      if (callback) callback({ success: true, message: "Message deleted successfully" });

    } catch (err) {
      console.error("Error deleting message:", err);
      if (callback) callback({ success: false, error: err.message });
    }
  });

  // Handle message reporting
  socket.on("report_message", async (data, callback) => {
    const { messageId, roomId, reporter, reason } = data;

    console.log(`🚨 Message ${messageId} reported by ${reporter} in room ${roomId}: ${reason}`);

    // Here you can implement your reporting logic:
    // - Save report to database
    // - Notify moderators
    // - Auto-moderation checks

    // For now, just log and acknowledge
    if (callback) callback({ success: true, message: "Message reported to moderators" });

    // You can also notify moderators in real-time
    socket.to("moderators").emit("message_reported", {
      messageId,
      roomId,
      reporter,
      reason,
      time: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// REST API routes for message management

// Get messages for a room (with deleted messages filtered or marked)
app.get("/api/rooms/:roomId/messages", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { includeDeleted = "false" } = req.query;

    let query = { roomId };

    // Filter out deleted messages unless explicitly requested
    if (includeDeleted === "false") {
      query.isDeleted = false;
    }

    const messages = await Message.find(query)
      .sort({ time: -1 })
      .limit(100)
      .lean();

    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      text: msg.isDeleted ? "This message was deleted" : msg.text,
      image: msg.isDeleted ? null : msg.image,
      sender: msg.sender,
      roomId: msg.roomId,
      time: msg.time.toISOString(),
      isDeleted: msg.isDeleted,
      deletedAt: msg.deletedAt ? msg.deletedAt.toISOString() : null,
      deletedBy: msg.deletedBy || null,
    }));

    res.json({ success: true, messages: formattedMessages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete message via REST API (for moderators)
app.delete("/api/messages/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { username, isModerator = false } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }

    // Check permissions - either user is sender or is moderator
    if (message.sender !== username && !isModerator) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ success: false, error: "Message already deleted" });
    }

    // Soft delete
    message.text = "This message was deleted";
    message.image = "";
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = username;

    await message.save();

    // Broadcast deletion
    const deletedMessage = {
      id: message._id.toString(),
      text: "This message was deleted",
      image: null,
      sender: message.sender,
      roomId: message.roomId,
      time: message.time.toISOString(),
      isDeleted: true,
    };

    io.to(message.roomId).emit("message_deleted", deletedMessage);

    res.json({ success: true, message: "Message deleted successfully" });
  } catch (err) {
    console.error("Error deleting message via API:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get message statistics (for admin/moderators)
app.get("/api/rooms/:roomId/stats", async (req, res) => {
  try {
    const { roomId } = req.params;

    const totalMessages = await Message.countDocuments({ roomId });
    const deletedMessages = await Message.countDocuments({ roomId, isDeleted: true });
    const activeMessages = totalMessages - deletedMessages;

    res.json({
      success: true,
      stats: {
        totalMessages,
        deletedMessages,
        activeMessages,
        deletionRate: totalMessages > 0 ? (deletedMessages / totalMessages) * 100 : 0,
      },
    });
  } catch (err) {
    console.error("Error fetching room stats:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Signup Route
app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const existingUser = await user.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new user({ username, password: hashedPassword, email });
  await newUser.save();

  res.status(201).json({ message: "User registered", user: newUser._id });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const findUser = await User.findOne({ username });
    if (!findUser) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, findUser.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.status(200).json({ message: 'Login successful', username: findUser.username });
  } catch (error) {
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const { topic } = req.query;
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    const rooms = await Room.find({ topic });
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Server error and error is '+error });
  }
});

app.put("/api/update_desc", async (req, res) => {
    const desc = req.body.desc;
    const username = req.body.username;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        user.desc = desc;
        await user.save();
        res.json({ message: "Description updated successfully" });
    } catch (error) {
        console.error("Error updating description:", error);
    }
});

app.post("/api/get_details" , async(req, res)=>{
    const username = req.body.username ;

    if(!username){
    res.status(400).json({error: "Username is required"});
    }
     try{
        const user = await User.findOne({username});
        if(!user){
            return res.status(404).json({error: "User not found"});
        }
        res.json({user_data :user}) ;
     }
     catch(error){
     console.error("Something went wrong !") ;
     }
}) ;

// PUT /api/update_user_image
import multer from 'multer';
import path from 'path';

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Create this folder in your project root
  },
  filename: function (req, file, cb) {
    // Create unique filename: profile_username_timestamp.jpg
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile_' + req.body.username + '_' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

app.put('/api/update_user_image', upload.single('image'), async (req, res) => {
  try {
    const { username } = req.body;
    let user_image = '';

    if (req.file) {
      // Handle uploaded image - store the file path or URL
      user_image = `/uploads/${req.file.filename}`; // or store in cloud storage
    } else {
      // Handle default image selection
      user_image = req.body.user_image;
    }

    const updatedUser = await User.findOneAndUpdate(
      { username },
      { user_image },
      { new: true }
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/get_desc" , async (req, res)=>{
        const username = req.body.username ;
        try {
        const user = await User.findOne({username});
        console.log(user) ;
        if (!user){
            return res.status(404).json({error: "User not found"})
        }
        console.log("User Description is "+ user.desc) ;
        res.json({desc: user.desc},{message : "Description is "+user.desc});
        }
        catch(error){
        console.error("Error getting description:", error);
        }
});

app.get('/api/all_rooms' , async (req , res) => {
    try{
    const rooms = await Room.find();
    res.json(rooms);
    console.log("All room send successfully! ");
    }
    catch(err){
    res.status(500).json({error:err.message}) ;
    }
}) ;

// Health check route
app.get("/", (req, res) => {
  res.send("Chat server is running");
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});