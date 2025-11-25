const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const Room = require("./models/Room.js");
const User = require("./models/Users.js"); // Import User model
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

// Connect to MongoDB
mongoose
  .connect(`${process.env.MONGOOSE_CONNECTION_STRING}`)
  .then(() => console.log("✅ Database connected successfully"))
  .catch((error) => console.log("❌ DB connection error: " + error));

// Message Schema for storing messages and images
const messageSchema = new mongoose.Schema({
    text: String,
    image: String,
    sender: String,
    userId: String,        // Add this field
    userImage: String,     // Add this field
    roomId: String,
    time: Date,
    isDeleted: Boolean,
    aiDetected: Boolean,   // Add this field
    aiConfidence: Number   // Add this field
});

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      email: user.email
    },
    process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production',
    { expiresIn: '7d' }
  );
};

const Message = mongoose.model("Message", messageSchema);
const onlineUsers = new Map();

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
    origin: "*",
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

    io.to(roomId).emit("receive_message", {
      text: `A user has joined the room`,
      sender: "System",
      roomId,
      time: new Date().toISOString(),
      isSystem: true,
    });

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
    console.log(`💬 Message from ${data.sender} in room ${data.roomId}: ${data.text || "Image"}`);
    console.log("Message data received:", {
        sender: data.sender,
        userId: data.userId,
        userImage: data.userImage,
        roomId: data.roomId,
        hasText: !!data.text,
        hasImage: !!data.image
    });

    if (data.image) {
        if (!data.image.startsWith("data:image/")) {
            if (callback) callback({ status: "error", error: "Invalid image format" });
            return;
        }
        if (data.image.length > 7 * 1024 * 1024) {
            if (callback) callback({ status: "error", error: "Image size exceeds 5MB" });
            return;
        }
    }

    try {
        const messageData = {
            text: data.text || "",
            image: data.image || "",
            sender: data.sender,
            userId: data.userId || "", // Add userId
            userImage: data.userImage || "", // Add userImage
            roomId: data.roomId,
            time: new Date(data.time),
            isDeleted: false,
            aiDetected: data.aiDetected || false, // Add AI detection fields
            aiConfidence: data.aiConfidence || 0
        };

        console.log("Saving message with user data:", {
            userId: messageData.userId,
            userImage: messageData.userImage,
            sender: messageData.sender
        });

        const savedMessage = await new Message(messageData).save();

        const broadcastMessage = {
            id: savedMessage._id.toString(),
            text: savedMessage.text,
            image: savedMessage.image,
            sender: savedMessage.sender,
            userId: savedMessage.userId, // Include userId in broadcast
            userImage: savedMessage.userImage, // Include userImage in broadcast
            roomId: savedMessage.roomId,
            time: savedMessage.time.toISOString(),
            isDeleted: false,
            aiDetected: savedMessage.aiDetected,
            aiConfidence: savedMessage.aiConfidence
        };

        console.log("Broadcasting message with user data:", {
            userId: broadcastMessage.userId,
            userImage: broadcastMessage.userImage
        });

        io.to(data.roomId).emit("receive_message", broadcastMessage);

        if (callback) callback({ status: "ok", id: savedMessage._id });
    } catch (err) {
        console.error("Error saving message:", err);
        if (callback) callback({ status: "error", error: err.message });
    }
});

  socket.on("delete_message", async (data, callback) => {
    const { messageId, roomId, username } = data;
    console.log(`🗑️ Delete request for message ${messageId} by ${username} in room ${roomId}`);

    try {
      const message = await Message.findById(messageId);

      if (!message) {
        if (callback) callback({ success: false, error: "Message not found" });
        return;
      }

      console.log("Message Sender is " + message.sender);
      console.log("Username is " + username);
      if (message.sender !== username) {
        if (callback) callback({ success: false, error: "You can only delete your own messages" });
        return;
      }

      if (message.isDeleted) {
        if (callback) callback({ success: false, error: "Message already deleted" });
        return;
      }

      message.text = "This message was deleted";
      message.image = "";
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deletedBy = username;

      await message.save();

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

  socket.on('user_online', (userData) => {
    const { username, userId } = userData;
    onlineUsers.set(socket.id, { username, userId, socketId: socket.id, lastSeen: new Date() });

    io.emit('online_users_update', {
      onlineCount: onlineUsers.size,
      users: Array.from(onlineUsers.values())
    });

    console.log(`👤 ${username} is now online. Total online: ${onlineUsers.size}`);
  });

  socket.on('join_debate_room', (roomId) => {
    socket.join(roomId);
    const user = onlineUsers.get(socket.id);
    if (user) {
      socket.to(roomId).emit('user_joined_room', {
        username: user.username,
        roomId: roomId
      });
    }
  });

  socket.on('create_room', async (roomData, callback) => {
    try {
      const { title, desc, topic, createdBy } = roomData;

      if (!title || !topic) {
        if (callback) callback({ success: false, error: 'Title and topic are required' });
        return;
      }

      if (!createdBy) {
        if (callback) callback({ success: false, error: 'User ID is required' });
        return;
      }

      const roomId = `room_${uuidv4()}`;

      const newRoom = new Room({
        roomId,
        title: title.trim(),
        desc: desc?.trim() || '',
        topic: topic.trim(),
        createdBy,
        isActive: true,
        createdAt: new Date()
      });

      await newRoom.save();
      await newRoom.populate('createdBy', 'username');

      io.emit('room_created', newRoom);

      if (callback) callback({
        success: true,
        message: 'Room created successfully',
        room: newRoom
      });

    } catch (error) {
      console.error('Socket create room error:', error);
      if (callback) callback({
        success: false,
        error: error.code === 11000 ? 'Room ID already exists' : 'Internal server error'
      });
    }
  });

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      io.emit('online_users_update', {
        onlineCount: onlineUsers.size,
        users: Array.from(onlineUsers.values())
      });
      console.log(`🔴 ${user.username} disconnected. Total online: ${onlineUsers.size}`);
    }
  });

  socket.on('user_offline', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      io.emit('online_users_update', {
        onlineCount: onlineUsers.size,
        users: Array.from(onlineUsers.values())
      });
    }
  });

  socket.on("report_message", async (data, callback) => {
    const { messageId, roomId, reporter, reason } = data;

    console.log(`🚨 Message ${messageId} reported by ${reporter} in room ${roomId}: ${reason}`);

    if (callback) callback({ success: true, message: "Message reported to moderators" });

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

// REST API routes
// Backend endpoint to get user by ID

app.post('/api/get_user_by_id', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (user) {
      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          user_image: user.user_image
        }
      });
    } else {
      res.json({
        success: false,
        error: 'User not found'
      });
    }
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});


app.get('/api/online_users', (req, res) => {
  res.json({
    onlineCount: onlineUsers.size,
    users: Array.from(onlineUsers.values())
  });
});

// Create Room API Endpoint
app.post('/api/create_room', async (req, res) => {
  try {
    const { title, desc, topic, createdBy } = req.body;

    if (!title || !topic) {
      return res.status(400).json({ error: 'Title and topic are required' });
    }

    if (!createdBy) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (title.length > 100) {
      return res.status(400).json({ error: 'Title too long (max 100 characters)' });
    }

    if (desc && desc.length > 250) {
      return res.status(400).json({ error: 'Description too long (max 250 characters)' });
    }

    const roomId = `room_${uuidv4()}`;

    const newRoom = new Room({
      roomId,
      title: title.trim(),
      desc: desc?.trim() || '',
      topic: topic.trim(),
      isActive: true,
      createdAt: new Date()
    });

    await newRoom.save();
    await newRoom.populate('createdBy', 'username');

    io.emit('room_created', newRoom);

    res.status(201).json({
      message: 'Room created successfully',
      room: newRoom
    });

  } catch (error) {
    console.error('Create room error:', error);

    if (error.code === 11000) {
      return res.status(400).json({ error: 'Room ID already exists' });
    }

    res.status(500).json({ error: 'Internal server error',message:error });
  }
});

// Get all rooms
app.get('/api/all_rooms', async (req, res) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get rooms by topic
app.get('/api/rooms', async (req, res) => {
  try {
    const { topic } = req.query;

    if (!topic) {
      return res.status(400).json({ error: 'Topic parameter is required' });
    }

    const rooms = await Room.find({
      topic: new RegExp(topic, 'i'),
      isActive: true
    })
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 });

    res.json(rooms);
  } catch (error) {
    console.error('Get rooms by topic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room by ID
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId })
      .populate('createdBy', 'username');

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update room
app.put('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { title, desc, topic } = req.body;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (title) room.title = title.trim();
    if (desc !== undefined) room.desc = desc.trim();
    if (topic) room.topic = topic.trim();

    await room.save();

    res.json({
      message: 'Room updated successfully',
      room
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete room (soft delete)
app.delete('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Only room creator can delete the room' });
    }

    room.isActive = false;
    await room.save();

    io.emit('room_deleted', { roomId });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a room
app.get("/api/rooms/:roomId/messages", async (req, res) => {
  try {
    const { roomId } = req.params;
    const { includeDeleted = "false" } = req.query;

    let query = { roomId };

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

// Delete message via REST API
app.delete("/api/messages/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { username, isModerator = false } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }

    if (message.sender !== username && !isModerator) {
      return res.status(403).json({ success: false, error: "Insufficient permissions" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ success: false, error: "Message already deleted" });
    }

    message.text = "This message was deleted";
    message.image = "";
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = username;

    await message.save();

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

// Get message statistics
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

  const existingUser = await User.findOne({ email }); // Use User instead of user
  if (existingUser) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({ username, password: hashedPassword, email }); // Use User instead of user
  await newUser.save();

  res.status(201).json({ message: "User registered", user: newUser._id });
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user and validate password (your existing logic)
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return complete user data (excluding password)
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      rank: user.rank,
      created_at: user.created_at,
      user_image: user.user_image,
      desc: user.desc,
      total_debates: user.total_debates,
      debates_won: user.debates_won,
      googleId: user.googleId,
      profilePicture: user.profilePicture,
      isVerified: user.isVerified
    };

    res.status(200).json({
      message: 'Login successful',
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put("/api/update_desc", async (req, res) => {
    const desc = req.body.desc;
    const username = req.body.username;

    try {
        const user = await User.findOne({ username }); // Use User instead of user
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

app.post("/api/get_details", async(req, res)=>{
    const username = req.body.username;

    if(!username){
    res.status(400).json({error: "Username is required"});
    }
     try{
        const user = await User.findOne({username}); // Use User instead of user
        if(!user){
            return res.status(404).json({error: "User not found"});
        }
        res.json({user_data: user});
     }
     catch(error){
     console.error("Something went wrong !");
     }
});

// Multer setup
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile_' + req.body.username + '_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

app.put('/api/update_user_image', upload.single('image'), async (req, res) => {
  try {
    const { username } = req.body;
    let user_image = '';

    if (req.file) {
      user_image = `/uploads/${req.file.filename}`;
    } else {
      user_image = req.body.user_image;
    }

    const updatedUser = await User.findOneAndUpdate( // Use User instead of user
      { username },
      { user_image },
      { new: true }
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post("/api/get_desc", async (req, res)=>{
        const username = req.body.username;
        try {
        const user = await User.findOne({username}); // Use User instead of user
        console.log(user);
        if (!user){
            return res.status(404).json({error: "User not found"})
        }
        console.log("User Description is "+ user.desc);
        res.json({desc: user.desc});
        }
        catch(error){
        console.error("Error getting description:", error);
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