import express from "express";
import mongoose from "mongoose";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import user from "./models/Users.js"; // Your Mongoose model
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Room from "./models/Room.js" ;

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
});

const Message = mongoose.model("Message", messageSchema);

// Setup Express
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
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
    });

    // Send previous messages
    try {
      const messages = await Message.find({ roomId })
        .sort({ time: 1 })
        .limit(50)
        .lean();
      socket.emit("receive_message", messages.map((msg) => ({
        id: msg._id.toString(),
        text: msg.text,
        image: msg.image,
        sender: msg.sender,
        roomId: msg.roomId,
        time: msg.time.toISOString(),
      })));
    } catch (err) {
      console.error("Error fetching previous messages:", err);
      socket.emit("receive_message", {
        text: "Error loading previous messages",
        sender: "System",
        roomId,
        time: new Date().toISOString(),
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
      };
      io.to(data.roomId).emit("receive_message", broadcastMessage);

      // Acknowledge receipt
      if (callback) callback({ status: "ok", id: savedMessage._id });
    } catch (err) {
      console.error("Error saving message:", err);
      if (callback) callback({ status: "error", error: err.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
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

// Health check route
app.get("/", (req, res) => {
  res.send("Chat server is running");
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});