const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const Room = require("./models/Room.js");
const User = require("./models/Users.js"); // Import User model
const DebateResult = require("./models/debateResult.js");
const ArgumentEvaluation = require('./models/argumentEvaluation.js');
const UserStance = require('./models/UserStance.js');
const jwt = require('jsonwebtoken');
const axios = require("axios");
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
    userId: String,
    userImage: String,
    roomId: String,
    time: Date,
    isDeleted: Boolean,
    aiDetected: Boolean,
    aiConfidence: Number,
    userStance: String, // Add this field to store stance in messages
    stanceLabel: String, // Add this field for display
    evaluationId: String, // Link to ArgumentEvaluation
    evaluationScore: Number // Quick reference score

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
    try {
          const stances = await UserStance.find({ roomId }).lean();
          const stancesMap = {};
          stances.forEach(stance => {
            stancesMap[stance.userId] = {
              userId: stance.userId,
              username: stance.username,
              stance: stance.stance,
              stanceLabel: stance.stanceLabel,
              userImage: stance.userImage
            };
          });

          socket.emit('room_stances', stancesMap);
        } catch (error) {
          console.error('Error fetching room stances:', error);
        }

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

socket.on('get_debate_scores', async (data, callback) => {
    try {
      const { roomId } = data;
      const standings = await getCurrentStandings(roomId);

      if (callback) {
        callback({ success: true, standings });
      }
    } catch (error) {
      console.error("Error getting debate scores:", error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
});

socket.on('end_debate', async (data, callback) => {
    try {
      const { roomId, userId } = data;

      // Verify user has permission
      const room = await Room.findOne({ roomId });
      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }

      if (room.createdBy.toString() !== userId) {
        // Check if user is a moderator (implement your own logic)
        const user = await User.findById(userId);
        if (!user || !user.isModerator) {
          if (callback) callback({ success: false, error: 'Only room creator or moderators can end debate' });
          return;
        }
      }

      const winnerData = await determineWinner(roomId, true);

      if (!winnerData) {
        if (callback) callback({ success: false, error: 'Could not determine winner' });
        return;
      }

      // Broadcast results to all users in room
      io.to(roomId).emit('debate_ended', {
        ...winnerData,
        roomId,
        endedBy: userId,
        endedAt: new Date().toISOString()
      });

      if (callback) {
        callback({ success: true, ...winnerData });
      }
    } catch (error) {
      console.error("Error ending debate:", error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('start_debate_timer', async (data, callback) => {
    try {
      const { roomId, duration } = data; // duration in minutes

      const debateResult = await DebateResult.findOneAndUpdate(
        { roomId },
        {
          $set: {
            'settings.maxDuration': (duration || 30) * 60,
            startTime: new Date(),
            isActive: true
          }
        },
        { upsert: true, new: true }
      );

      // Schedule automatic end
      setTimeout(async () => {
        const winner = await determineWinner(roomId);
        if (winner) {
          io.to(roomId).emit('debate_ended', {
            ...winner,
            reason: 'Time expired',
            roomId
          });
        }
      }, (duration || 30) * 60 * 1000);

      if (callback) {
        callback({ success: true, debateResult });
      }
    } catch (error) {
      console.error("Error starting debate timer:", error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

socket.on('get_debate_status', async (data, callback) => {
  try {
    const { roomId } = data;

    const debateResult = await DebateResult.findOne({ roomId });
    const room = await Room.findOne({ roomId });

    if (callback) {
      callback({
        success: true,
        isActive: debateResult?.isActive || false,
        winner: debateResult?.winningTeam || room?.winner || null,
        scores: await getCurrentStandings(roomId),
        settings: debateResult?.settings || {
          maxDuration: 1800,
          maxArguments: 50,
          winMarginThreshold: 10
        }
      });
    }
  } catch (error) {
    console.error('Error getting debate status:', error);
    if (callback) {
      callback({ success: false, error: error.message });
    }
  }
});

socket.on('join_debate_scoreboard', (roomId) => {
  socket.join(`scoreboard-${roomId}`);
  console.log(`📊 User joined scoreboard for room ${roomId}`);
});

socket.on('leave_debate_scoreboard', (roomId) => {
  socket.leave(`scoreboard-${roomId}`);
});

socket.on('user_stance_selected', async (data, callback) => {
    try {
      const { roomId, userId, username, stance, stanceLabel, userImage } = data;

      console.log(`🎯 User ${username} selected stance: ${stanceLabel} in room ${roomId}`);

      // Save or update stance
      const userStance = await UserStance.findOneAndUpdate(
        { roomId, userId },
        {
          roomId,
          userId,
          username,
          stance,
          stanceLabel,
          userImage: userImage || '',
          selectedAt: new Date()
        },
        { upsert: true, new: true }
      );

      // Broadcast to all users in the room
      const stanceData = {
        userId,
        username,
        stance,
        stanceLabel,
        userImage: userImage || '',
        roomId,
        selectedAt: userStance.selectedAt
      };

      socket.to(roomId).emit('user_stance_selected', stanceData);

      if (callback) {
        callback({ success: true });
      }

    } catch (error) {
      console.error('Error saving user stance:', error);
      if (callback) {
        callback({ success: false, error: 'Failed to save stance' });
      }
    }
  });

  socket.on('check_user_stance', async (data, callback) => {
      try {
        const { roomId, userId } = data;

        const stance = await UserStance.findOne({ roomId, userId });

        if (callback) {
          callback({
            success: true,
            stance: stance ? {
              id: stance.stance,
              label: stance.stanceLabel
            } : null
          });
        }
      } catch (error) {
        console.error('Error checking user stance:', error);
        if (callback) {
          callback({ success: false, error: 'Failed to check stance' });
        }
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
            aiConfidence: data.aiConfidence || 0,
            userStance: data.userStance?.id || data.userStance || "", // Include stance
            stanceLabel: data.userStance?.label || ""
        };

        console.log("Saving message with user data:", {
            userId: messageData.userId,
            userImage: messageData.userImage,
            sender: messageData.sender,
            userStance: data.userStance,
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
            aiConfidence: savedMessage.aiConfidence,
            userStance: savedMessage.userStance, // Include in broadcast
            stanceLabel: savedMessage.stanceLabel // Include in broadcast
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

  // Add this socket event handler
  socket.on('update_message_evaluation', async (data) => {
    try {
      // Update the message with evaluation data
      await Message.findByIdAndUpdate(data.messageId, {
        evaluationId: data.evaluationId,
        evaluationScore: data.evaluationScore
      });

      // Broadcast the updated message
      const updatedMessage = await Message.findById(data.messageId);
      if (updatedMessage) {
        io.to(data.roomId).emit('message_evaluated', {
          messageId: data.messageId,
          evaluationId: data.evaluationId,
          evaluationScore: data.evaluationScore
        });
      }
    } catch (error) {
      console.error('Error updating message evaluation:', error);
    }
  });
});

// REST API routes
// Backend endpoint to get user by ID
async function updateTeamScore(roomId, team, score, userId) { // ✅ Add userId parameter
  try {
    let debateResult = await DebateResult.findOne({ roomId });

    if (!debateResult) {
      // Get room title for new debate result
      const room = await Room.findOne({ roomId });
      debateResult = new DebateResult({
        roomId,
        debateTitle: room?.title || `Debate ${roomId}`,
        startTime: new Date()
      });
    }

    // Update team statistics
    const teamKey = team.toLowerCase();
    if (debateResult.teamScores[teamKey]) {
      // Update scores
      debateResult.teamScores[teamKey].totalPoints += score;
      debateResult.teamScores[teamKey].argumentCount += 1;
      debateResult.teamScores[teamKey].averageScore =
        debateResult.teamScores[teamKey].totalPoints /
        debateResult.teamScores[teamKey].argumentCount;

      // ✅ Add participant if not already in list
      if (!debateResult.teamScores[teamKey].participants.includes(userId)) {
        debateResult.teamScores[teamKey].participants.push(userId);
      }
    }

    debateResult.totalRounds += 1;
    debateResult.isActive = true;

    await debateResult.save();

    // Broadcast updated scores to room
    const currentStandings = await getCurrentStandings(roomId);
    if (io) {
      io.to(roomId).emit('score_updated', {
        roomId,
        teamScores: currentStandings,
        lastUpdate: new Date().toISOString()
      });
    }

    return debateResult;
  } catch (error) {
    console.error("Error updating team score:", error);
    throw error;
  }
}

async function getCurrentStandings(roomId) {
  const debateResult = await DebateResult.findOne({ roomId });
  if (!debateResult) return null;

  const standings = {};
  ['favor', 'against', 'neutral'].forEach(team => {
    standings[team] = {
      total: debateResult.teamScores[team].totalPoints,
      count: debateResult.teamScores[team].argumentCount,
      average: debateResult.teamScores[team].averageScore,
      participants: debateResult.teamScores[team].participants.length
    };
  });

  return standings;
}

async function determineWinner(roomId, forceEnd = false) {
  try {
    const debateResult = await DebateResult.findOne({ roomId });
    if (!debateResult) return null;

    // Check if debate should end based on settings
    const debateDuration = (new Date() - debateResult.startTime) / 1000; // seconds
    const shouldEndByTime = debateDuration >= debateResult.settings.maxDuration;
    const shouldEndByArguments = debateResult.totalRounds >= debateResult.settings.maxArguments;

    if (!forceEnd && !shouldEndByTime && !shouldEndByArguments) {
      return null; // Debate continues
    }

    // Get all arguments for this room
    const arguments = await ArgumentEvaluation.find({ roomId });

    // Check minimum arguments per team
    const teamsWithEnoughArgs = ['favor', 'against', 'neutral'].filter(team =>
      debateResult.teamScores[team].argumentCount >= debateResult.settings.minArgumentsPerTeam
    );

    if (teamsWithEnoughArgs.length < 2) {
      debateResult.winningTeam = 'undecided';
      debateResult.endTime = new Date();
      debateResult.isActive = false;
      debateResult.calculatedAt = new Date();
      await debateResult.save();

      return {
        winner: 'undecided',
        reason: 'Insufficient arguments from at least 2 teams',
        stats: await getCurrentStandings(roomId)
      };
    }

    // Calculate weighted effectiveness score for each team
    const teamEffectiveness = {};

    for (const team of ['favor', 'against', 'neutral']) {
      const teamArgs = arguments.filter(arg => arg.team === team);
      if (teamArgs.length === 0) continue;

      const totalScore = debateResult.teamScores[team].totalPoints;
      const avgScore = debateResult.teamScores[team].averageScore;
      const argCount = debateResult.teamScores[team].argumentCount;

      // Calculate standard deviation for consistency
      const scores = teamArgs.map(arg => arg.totalScore);
      const mean = scores.reduce((a, b) => a + b) / scores.length;
      const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
      const consistency = Math.sqrt(variance);

      // Calculate average rebuttal score
      const avgRebuttal = teamArgs.reduce((sum, arg) => sum + arg.scores.rebuttal, 0) / argCount;

      // Calculate participation rate
      const uniqueParticipants = debateResult.teamScores[team].participants.length;
      const totalParticipants = await UserStance.countDocuments({
        roomId,
        stance: team
      });
      const participationRate = totalParticipants > 0 ?
        (uniqueParticipants / totalParticipants) * 100 : 0;

      // Weighted effectiveness formula
      teamEffectiveness[team] = {
        rawScore: avgScore,
        consistencyScore: Math.max(0, 10 - consistency), // Lower inconsistency = higher score
        rebuttalStrength: avgRebuttal,
        participationRate: participationRate / 10, // Scale to 0-10
        quantityBonus: Math.log(argCount + 1) * 2, // Logarithmic bonus for more arguments

        // Final weighted score
        effectiveness: (avgScore * 0.30) +
                      (Math.max(0, 10 - consistency) * 0.20) +
                      (avgRebuttal * 0.25) +
                      (Math.log(argCount + 1) * 1.5 * 0.15) +
                      ((participationRate / 10) * 0.10)
      };
    }

    // Find winner
    const teams = Object.keys(teamEffectiveness);
    if (teams.length === 0) {
      debateResult.winningTeam = 'undecided';
    } else if (teams.length === 1) {
      debateResult.winningTeam = teams[0];
    } else {
      // Sort by effectiveness
      teams.sort((a, b) => teamEffectiveness[b].effectiveness - teamEffectiveness[a].effectiveness);

      const winner = teams[0];
      const runnerUp = teams[1];
      const margin = ((teamEffectiveness[winner].effectiveness - teamEffectiveness[runnerUp].effectiveness) /
                     teamEffectiveness[runnerUp].effectiveness) * 100;

      if (margin < debateResult.settings.winMarginThreshold) {
        debateResult.winningTeam = 'tie';
        debateResult.marginOfVictory = margin;
      } else {
        debateResult.winningTeam = winner;
        debateResult.marginOfVictory = margin;
      }
    }

    // Calculate awards
    await calculateAwards(roomId, debateResult, arguments);

    debateResult.endTime = new Date();
    debateResult.isActive = false;
    debateResult.calculatedAt = new Date();
    await debateResult.save();

    // Return winner data
    return {
      winner: debateResult.winningTeam,
      margin: debateResult.marginOfVictory,
      stats: await getCurrentStandings(roomId),
      effectivenessScores: teamEffectiveness,
      awards: debateResult.awards,
      endedAt: debateResult.endTime
    };

  } catch (error) {
    console.error("Error determining winner:", error);
    throw error;
  }
}

async function calculateAwards(roomId, debateResult, arguments) {
  if (arguments.length === 0) return;

  // Best Argument (highest total score)
  const bestArgument = arguments.reduce((best, current) =>
    current.totalScore > best.totalScore ? current : best
  );

  // Most Persuasive (highest persuasiveness score)
  const mostPersuasive = arguments.reduce((best, current) =>
    current.scores.persuasiveness > best.scores.persuasiveness ? current : best
  );

  // Most Active (most arguments)
  const argumentCounts = {};
  arguments.forEach(arg => {
    argumentCounts[arg.userId] = (argumentCounts[arg.userId] || 0) + 1;
  });
  const mostActiveUserId = Object.keys(argumentCounts).reduce((a, b) =>
    argumentCounts[a] > argumentCounts[b] ? a : b
  );
  const mostActiveArg = arguments.find(arg => arg.userId === mostActiveUserId);

  debateResult.awards = {
    bestArgument: bestArgument ? {
      userId: bestArgument.userId,
      username: bestArgument.username,
      score: bestArgument.totalScore,
      argumentExcerpt: bestArgument.argument.substring(0, 150) + '...'
    } : null,
    mostPersuasive: mostPersuasive ? {
      userId: mostPersuasive.userId,
      username: mostPersuasive.username,
      score: mostPersuasive.scores.persuasiveness
    } : null,
    mostActive: mostActiveArg ? {
      userId: mostActiveArg.userId,
      username: mostActiveArg.username,
      argumentCount: argumentCounts[mostActiveUserId]
    } : null
  };
}

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

    await UserStance.deleteMany({ roomId });

    io.emit('room_deleted', { roomId });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/rooms/:roomId/stance_stats', async (req, res) => {
  try {
    const { roomId } = req.params;

    const stats = await UserStance.aggregate([
      { $match: { roomId } },
      { $group: { _id: '$stance', count: { $sum: 1 } } }
    ]);

    const result = {
      against: 0,
      favor: 0,
      neutral: 0,
      total: 0
    };

    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });

    res.json({ success: true, stats: result });
  } catch (error) {
    console.error('Get stance stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stance statistics' });
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
      image: msg.isDeleted ? null : msg.userImage,
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

app.post('/api/save_user_stance', async (req, res) => {
  try {
    const { roomId, userId, username, stance, stanceLabel, userImage } = req.body;

    if (!roomId || !userId || !username || !stance || !stanceLabel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate stance
    const validStances = ['against', 'favor', 'neutral'];
    if (!validStances.includes(stance)) {
      return res.status(400).json({ error: 'Invalid stance' });
    }

    const userStance = await UserStance.findOneAndUpdate(
      { roomId, userId },
      {
        roomId,
        userId,
        username,
        stance,
        stanceLabel,
        userImage: userImage || '',
        selectedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Notify all users in the room via socket
    const stanceData = {
      userId,
      username,
      stance,
      stanceLabel,
      userImage: userImage || '',
      roomId,
      selectedAt: userStance.selectedAt
    };

    io.to(roomId).emit('user_stance_selected', stanceData);

    res.json({
      success: true,
      message: 'Stance saved successfully',
      stance: userStance
    });

  } catch (error) {
    console.error('Save stance error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'You have already selected a stance for this room' });
    }
    res.status(500).json({ error: 'Failed to save stance' });
  }
});

// API to get user stance
app.post('/api/get_user_stance', async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({ error: 'Room ID and User ID are required' });
    }

    const stance = await UserStance.findOne({ roomId, userId });

    res.json({
      success: true,
      stance: stance ? {
        id: stance.stance,
        label: stance.stanceLabel
      } : null
    });
  } catch (error) {
    console.error('Get stance error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stance' });
  }
});

// API to get all stances for a room
app.post('/api/get_room_stances', async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    const stances = await UserStance.find({ roomId }).lean();

    const stancesMap = {};
    stances.forEach(stance => {
      stancesMap[stance.userId] = {
        userId: stance.userId,
        username: stance.username,
        stance: stance.stance,
        stanceLabel: stance.stanceLabel,
        userImage: stance.userImage
      };
    });

    res.json({ success: true, stances: stancesMap });
  } catch (error) {
    console.error('Get room stances error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch room stances' });
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

// Helper function to update team scores
// DELETE THIS DUPLICATE SECTION (lines 1109-1152):
// Helper function to update team scores
//async function updateTeamScore(roomId, team, score) {
//  // Find or create debate result
//  let debateResult = await DebateResult.findOne({ roomId });
//
//  if (!debateResult) {
//    debateResult = new DebateResult({ roomId });
//  }
//
//  // Update the specific team's score
//  const teamKey = team.toLowerCase();
//  if (debateResult.teamScores[teamKey]) {
//    debateResult.teamScores[teamKey].totalPoints += score;
//    debateResult.teamScores[teamKey].argumentCount += 1;
//    debateResult.teamScores[teamKey].averageScore =
//      debateResult.teamScores[teamKey].totalPoints /
//      debateResult.teamScores[teamKey].argumentCount;
//  }
//
//  debateResult.totalRounds += 1;
//  await debateResult.save();
//  return debateResult;
//}

// Function to determine winner based on multiple criteria
async function determineWinner(roomId) {
  const debateResult = await DebateResult.findOne({ roomId });
  if (!debateResult) return null;

  const { teamScores, totalRounds } = debateResult;

  // Criteria 1: Minimum arguments per team to declare winner
  const MIN_ARGUMENTS_PER_TEAM = 3;
  const teamsWithEnoughArgs = ['favor', 'against', 'neutral'].filter(team =>
    teamScores[team].argumentCount >= MIN_ARGUMENTS_PER_TEAM
  );

  if (teamsWithEnoughArgs.length < 2) {
    return { winner: 'undecided', reason: 'Insufficient arguments' };
  }

  // Calculate weighted scores (average score × number of arguments)
  const teamStats = {};
  ['favor', 'against', 'neutral'].forEach(team => {
    if (teamScores[team].argumentCount > 0) {
      teamStats[team] = {
        averageScore: teamScores[team].averageScore,
        argumentCount: teamScores[team].argumentCount,
        weightedScore: teamScores[team].averageScore *
                      Math.log(teamScores[team].argumentCount + 1) // Logarithm to prevent spam
      };
    }
  });

  // Find highest weighted score
  const teams = Object.keys(teamStats);
  if (teams.length === 0) return { winner: 'undecided' };

  teams.sort((a, b) => teamStats[b].weightedScore - teamStats[a].weightedScore);

  const winner = teams[0];
  const runnerUp = teams[1];

  // Check for tie (within 5% margin)
  const margin = teamStats[winner].weightedScore - teamStats[runnerUp]?.weightedScore;
  const marginPercentage = teamStats[runnerUp] ?
    (margin / teamStats[runnerUp].weightedScore) * 100 : 100;

  if (marginPercentage < 5 && marginPercentage > 0) {
    return {
      winner: 'tie',
      teams: [winner, runnerUp],
      margin: marginPercentage.toFixed(2)
    };
  }

  debateResult.winningTeam = winner;
  debateResult.marginOfVictory = marginPercentage;
  debateResult.calculatedAt = new Date();
  debateResult.isActive = false;
  await debateResult.save();

  return {
    winner,
    margin: marginPercentage.toFixed(2),
    stats: teamStats
  };
}


app.post("/evaluate", async (req, res) => {
    const { argument, team, roomId, userId, username, messageId } = req.body;

    // Validate input
    if (!argument || argument.trim().length < 10) {
        return res.json({
            success: true,
            evaluation: {
                clarity: 3, relevance: 3, logic: 3, evidence: 3,
                persuasiveness: 3, rebuttal: 3, totalScore: 18,
                feedback: "Argument is too short for meaningful evaluation."
            },
            currentStandings: await getCurrentStandings(roomId)
        });
    }

    // Short, effective prompt
    const scoringPrompt = `You are a debate judge. Score this argument from 1-10 on:
1. Clarity: Is it easy to understand?
2. Relevance: Does it relate to the stance: ${team}?
3. Logic: Is the reasoning sound?
4. Evidence: Are there supporting facts/examples?
5. Persuasiveness: How convincing is it?
6. Rebuttal: Does it address counter-arguments?

Argument: "${argument.substring(0, 500)}"

Return ONLY valid JSON with this structure:
{
    "clarity": <number 1-10>,
    "relevance": <number 1-10>,
    "logic": <number 1-10>,
    "evidence": <number 1-10>,
    "persuasiveness": <number 1-10>,
    "rebuttal": <number 1-10>,
    "totalScore": <sum of above>,
    "feedback": "<constructive feedback string>"
}`;

    try {
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile", // ✅ CURRENT MODEL
                messages: [{ role: "user", content: scoringPrompt }],
                temperature: 0.2,
                max_tokens: 200,
                response_format: { type: "json_object" }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 20000
            }
        );

        const resultText = response.data.choices[0].message.content;
        console.log("AI Response:", resultText);

        let evaluation;
        try {
            evaluation = JSON.parse(resultText);

            // Validate the response has all required fields
            const requiredFields = ['clarity', 'relevance', 'logic', 'evidence',
                                   'persuasiveness', 'rebuttal', 'totalScore', 'feedback'];
            const hasAllFields = requiredFields.every(field => field in evaluation);

            if (!hasAllFields) {
                throw new Error("AI response missing required fields");
            }

        } catch (parseError) {
            console.error("Failed to parse AI response:", parseError);
            // Create a structured fallback from the raw text
            evaluation = createFallbackFromText(resultText, argument);
        }
//        team = team.toLowerCase();
        // Save to database
        console.log("team is " + team);
        const argumentEval = new ArgumentEvaluation({
            roomId,
            userId,
            username,
            team,
            argument: argument.substring(0, 800),
            scores: {
                clarity: evaluation.clarity || 5,
                relevance: evaluation.relevance || 5,
                logic: evaluation.logic || 5,
                evidence: evaluation.evidence || 5,
                persuasiveness: evaluation.persuasiveness || 5,
                rebuttal: evaluation.rebuttal || 5
            },
            totalScore: evaluation.totalScore || 30,
            feedback: evaluation.feedback || "AI evaluation completed",
            messageId,
            evaluatedAt: new Date(),
            aiConfidence: 0.9
        });

        await argumentEval.save();

        // Update team scores
        await updateTeamScore(roomId, team, evaluation.totalScore, userId);
            const existingStance = await UserStance.findOne({ roomId, userId });
            if (!existingStance) {
                await UserStance.findOneAndUpdate(
                    { roomId, userId },
                    {
                        roomId,
                        userId,
                        username,
                        stance: team.toLowerCase(),
                        stanceLabel: team.toLowerCase() === 'favor' ? 'In Favor' :
                                   team.toLowerCase() === 'against' ? 'Against' : 'Neutral',
                        userImage: '',
                        selectedAt: new Date()
                    },
                    { upsert: true, new: true }
                );
            }
        // Broadcast to room
        if (io) {
            io.to(roomId).emit('argument_evaluated', {
                roomId,
                userId,
                username,
                team,
                totalScore: evaluation.totalScore,
                evaluationId: argumentEval._id,
                messageId
            });
        }

        // Update message with evaluation
        if (messageId) {
            await Message.findByIdAndUpdate(messageId, {
                evaluationId: argumentEval._id,
                evaluationScore: evaluation.totalScore
            });
        }
        const currentStandings = await getCurrentStandings(roomId);

                // Check if debate should end
        const debateResult = await DebateResult.findOne({ roomId });
        if (debateResult) {
            const shouldEndByArguments = debateResult.totalRounds >= debateResult.settings.maxArguments;
            const debateDuration = (new Date() - debateResult.startTime) / 1000;
            const shouldEndByTime = debateDuration >= debateResult.settings.maxDuration;

            if (shouldEndByArguments || shouldEndByTime) {
                const winnerData = await determineWinner(roomId, true);
                if (winnerData && winnerData.winner !== 'undecided') {
                    io.to(roomId).emit('debate_ended', {
                        roomId,
                        ...winnerData
                    });
                }
            }
        }
        res.json({
            success: true,
            evaluation: evaluation,
            currentStandings: await getCurrentStandings(roomId)
        });

    } catch (error) {
        console.error("❌ Groq API Error:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });

        // Create intelligent fallback evaluation
        const fallbackEvaluation = createIntelligentFallback(argument, team);

        // Still save the fallback
        const argumentEval = new ArgumentEvaluation({
            roomId,
            userId,
            username,
            team,
            argument: argument.substring(0, 800),
            scores: {
                clarity: fallbackEvaluation.clarity,
                relevance: fallbackEvaluation.relevance,
                logic: fallbackEvaluation.logic,
                evidence: fallbackEvaluation.evidence,
                persuasiveness: fallbackEvaluation.persuasiveness,
                rebuttal: fallbackEvaluation.rebuttal
            },
            totalScore: fallbackEvaluation.totalScore,
            feedback: fallbackEvaluation.feedback,
            messageId,
            evaluatedAt: new Date(),
            aiConfidence: 0.1,
            isFallback: true,
            error: error.message
        });

        await argumentEval.save();

        // Update team scores
        await updateTeamScore(roomId, team, fallbackEvaluation.totalScore, userId);

        res.json({
            success: true,
            evaluation: fallbackEvaluation,
            warning: `AI service issue. Using fallback scoring. Error: ${error.message}`,
            currentStandings: await getCurrentStandings(roomId),
            isFallback: true
        });
    }
});

// Helper function to create fallback from malformed AI response
// Helper function to create fallback from malformed AI response
function createFallbackFromText(text, originalArgument) {
    // Try to extract numbers from the text
    const numbers = text.match(/\b\d{1,2}\b/g) || [];
    const scores = numbers.map(n => parseInt(n)).filter(n => n >= 1 && n <= 10);

    // Use extracted numbers or defaults
    const defaultScores = [5, 5, 5, 5, 5, 5];
    const finalScores = scores.length >= 6 ? scores.slice(0, 6) : defaultScores;

    return {
        clarity: finalScores[0],
        relevance: finalScores[1],
        logic: finalScores[2],
        evidence: finalScores[3],
        persuasiveness: finalScores[4],
        rebuttal: finalScores[5],
        totalScore: finalScores.reduce((a, b) => a + b, 0),
        feedback: "AI evaluation completed with basic scoring."
    };
}

// Enhanced fallback function
function createIntelligentFallback(argument, team) {
    const wordCount = argument.split(/\s+/).length;
    const sentenceCount = argument.split(/[.!?]+/).length - 1;

    // Calculate base scores
    let baseScore = 5;
    if (wordCount > 150) baseScore = 6;
    if (wordCount > 300) baseScore = 7;
    if (wordCount > 500) baseScore = 8;

    // Check for quality indicators
    const hasEvidence = argument.match(/\d+/) ||
                       argument.toLowerCase().includes('because') ||
                       argument.toLowerCase().includes('example') ||
                       argument.toLowerCase().includes('study');

    const hasStructure = argument.toLowerCase().includes('first') ||
                        argument.toLowerCase().includes('second') ||
                        argument.toLowerCase().includes('therefore') ||
                        argument.toLowerCase().includes('conclusion');

    const hasCounter = argument.toLowerCase().includes('however') ||
                      argument.toLowerCase().includes('although') ||
                      argument.toLowerCase().includes('while');

    // Calculate total score
    const clarity = Math.min(10, baseScore + (hasStructure ? 1 : 0));
    const relevance = baseScore;
    const logic = Math.min(10, baseScore + (hasStructure ? 1 : 0));
    const evidence = Math.min(10, baseScore + (hasEvidence ? 2 : 0));
    const persuasiveness = baseScore;
    const rebuttal = Math.min(10, baseScore + (hasCounter ? 2 : -1));
    const totalScore = clarity + relevance + logic + evidence + persuasiveness + rebuttal;

    return {
        clarity,
        relevance,
        logic,
        evidence,
        persuasiveness,
        rebuttal,
        totalScore,
        feedback: wordCount < 50 ?
            "Argument is brief. Try adding more detail and supporting points." :
            hasEvidence ?
            "Good use of supporting information. " +
            (hasCounter ? "Nice consideration of counter-arguments." :
             "Consider addressing potential objections.") :
            "Try adding specific examples or data to strengthen your argument."
    };
}


app.get('/api/debate/:roomId/results', async (req, res) => {
  try {
    const { roomId } = req.params;

    const debateResult = await DebateResult.findOne({ roomId });
    if (!debateResult) {
      return res.status(404).json({
        success: false,
        error: "Debate results not found"
      });
    }

    // Get all arguments for detailed stats
    const arguments = await ArgumentEvaluation.find({ roomId })
      .sort({ totalScore: -1 })
      .limit(20);

    // Calculate team statistics
    const teamStats = {};
    ['favor', 'against', 'neutral'].forEach(team => {
      const teamArgs = arguments.filter(arg => arg.team === team);
      if (teamArgs.length > 0) {
        teamStats[team] = {
          argumentCount: teamArgs.length,
          averageScore: teamArgs.reduce((sum, arg) => sum + arg.totalScore, 0) / teamArgs.length,
          bestScore: Math.max(...teamArgs.map(arg => arg.totalScore)),
          participants: [...new Set(teamArgs.map(arg => arg.username))]
        };
      }
    });

    // Calculate debate duration
    const duration = debateResult.endTime ?
      Math.round((debateResult.endTime - debateResult.startTime) / (1000 * 60)) :
      Math.round((new Date() - debateResult.startTime) / (1000 * 60));

    res.json({
      success: true,
      debate: {
        roomId,
        title: debateResult.debateTitle,
        startTime: debateResult.startTime,
        endTime: debateResult.endTime,
        duration: `${duration} minutes`,
        isActive: debateResult.isActive,
        totalArguments: debateResult.totalRounds
      },
      winner: {
        team: debateResult.winningTeam,
        margin: debateResult.marginOfVictory,
        calculatedAt: debateResult.calculatedAt
      },
      scores: debateResult.teamScores,
      teamStats,
      awards: debateResult.awards,
      topArguments: arguments.slice(0, 5).map(arg => ({
        username: arg.username,
        team: arg.team,
        score: arg.totalScore,
        excerpt: arg.argument.substring(0, 100) + '...'
      }))
    });

  } catch (error) {
    console.error("Error getting debate results:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET REAL-TIME SCOREBOARD
app.get('/api/debate/:roomId/scoreboard', async (req, res) => {
  try {
    const { roomId } = req.params;

    console.log(`📊 Fetching scoreboard for room: ${roomId}`);

    // Get debate result
    const debateResult = await DebateResult.findOne({ roomId });

    // Get all arguments for this room
    const arguments = await ArgumentEvaluation.find({ roomId });

    // Calculate user statistics
    const userStats = {};

    arguments.forEach(arg => {
      const userId = arg.userId;
      const username = arg.username;
      const team = arg.team;

      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          username,
          team,
          totalScore: 0,
          argumentCount: 0,
          bestScore: 0,
          recentScores: []
        };
      }

      userStats[userId].totalScore += arg.totalScore;
      userStats[userId].argumentCount += 1;
      userStats[userId].bestScore = Math.max(userStats[userId].bestScore, arg.totalScore);
      userStats[userId].recentScores.push({
        score: arg.totalScore,
        time: arg.evaluatedAt,
        feedback: arg.feedback?.substring(0, 50)
      });

      // Keep only last 5 scores
      if (userStats[userId].recentScores.length > 5) {
        userStats[userId].recentScores.shift();
      }
    });

    // Calculate averages and format
    const leaderboard = Object.values(userStats).map(player => {
      const averageScore = player.argumentCount > 0
        ? player.totalScore / player.argumentCount
        : 0;

      return {
        userId: player.userId,
        username: player.username,
        team: player.team,
        totalScore: player.totalScore,
        argumentCount: player.argumentCount,
        averageScore: parseFloat(averageScore.toFixed(2)),
        bestScore: player.bestScore,
        recentScores: player.recentScores
      };
    }).sort((a, b) => b.averageScore - a.averageScore);

    // Get team standings from debate result or calculate
    let standings;
    if (debateResult) {
      standings = {
        favor: {
          total: debateResult.teamScores.favor.totalPoints,
          count: debateResult.teamScores.favor.argumentCount,
          average: debateResult.teamScores.favor.averageScore,
          participants: debateResult.teamScores.favor.participants.length
        },
        against: {
          total: debateResult.teamScores.against.totalPoints,
          count: debateResult.teamScores.against.argumentCount,
          average: debateResult.teamScores.against.averageScore,
          participants: debateResult.teamScores.against.participants.length
        },
        neutral: {
          total: debateResult.teamScores.neutral.totalPoints,
          count: debateResult.teamScores.neutral.argumentCount,
          average: debateResult.teamScores.neutral.averageScore,
          participants: debateResult.teamScores.neutral.participants.length
        }
      };
    } else {
      // Calculate from arguments
      const teamStats = {
        favor: { total: 0, count: 0, participants: new Set() },
        against: { total: 0, count: 0, participants: new Set() },
        neutral: { total: 0, count: 0, participants: new Set() }
      };

      arguments.forEach(arg => {
        const team = arg.team;
        if (teamStats[team]) {
          teamStats[team].total += arg.totalScore;
          teamStats[team].count += 1;
          teamStats[team].participants.add(arg.userId);
        }
      });

      standings = {};
      Object.keys(teamStats).forEach(team => {
        const stats = teamStats[team];
        standings[team] = {
          total: stats.total,
          count: stats.count,
          average: stats.count > 0 ? stats.total / stats.count : 0,
          participants: stats.participants.size
        };
      });
    }

    res.json({
      success: true,
      standings,
      leaderboard: leaderboard.slice(0, 20), // Top 20
      totalArguments: arguments.length,
      debateStatus: debateResult?.isActive ? 'active' : 'ended',
      winner: debateResult?.winningTeam || 'undecided',
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Scoreboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scoreboard data',
      details: error.message
    });
  }
});

// ADMIN: FORCE END DEBATE
// ADMIN: FORCE END DEBATE
app.post('/api/debate/:roomId/end', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, reason } = req.body;

    // Verify permissions
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    // Check if user is room creator or has moderator rights
    const user = await User.findById(userId);
    const isCreator = room.createdBy.toString() === userId;
    const isModerator = user && user.isModerator;

    if (!isCreator && !isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only room creator or moderators can end debate'
      });
    }

    // Get or create debate result
    let debateResult = await DebateResult.findOne({ roomId });
    if (!debateResult) {
      debateResult = new DebateResult({
        roomId,
        debateTitle: room.title,
        startTime: room.createdAt || new Date(),
        settings: {
          maxDuration: 1800,
          maxArguments: 50,
          minArgumentsPerTeam: 3,
          winMarginThreshold: 10
        }
      });
    }

    // Calculate winner
    const winnerData = await determineWinner(roomId, true);

    if (!winnerData) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine winner'
      });
    }

    // Update debate result
    debateResult.isActive = false;
    debateResult.endTime = new Date();
    debateResult.winningTeam = winnerData.winner;
    debateResult.marginOfVictory = winnerData.margin;
    debateResult.calculatedAt = new Date();

    // Update awards
    if (winnerData.awards) {
      debateResult.awards = winnerData.awards;
    }

    await debateResult.save();

    // Update room status
    room.debateStatus = 'ended';
    room.endedAt = new Date();
    room.winner = winnerData.winner;
    await room.save();

    // Broadcast to all connected users
    io.to(roomId).emit('debate_ended', {
      ...winnerData,
      roomId,
      endedBy: userId,
      reason: reason || 'Manually ended',
      endedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Debate ended successfully',
      ...winnerData,
      endedAt: debateResult.endTime
    });

  } catch (error) {
    console.error("Error ending debate:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ADMIN: UPDATE DEBATE SETTINGS
app.put('/api/debate/:roomId/settings', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, settings } = req.body;

    console.log(`⚙️ Updating settings for room ${roomId}:`, settings);

    // Verify permissions
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    // Check if user is room creator
    if (room.createdBy.toString() !== userId) {
      const user = await User.findById(userId);
      if (!user || !user.isModerator) {
        return res.status(403).json({
          success: false,
          error: 'Only room creator or moderators can update settings'
        });
      }
    }

    // Get or create debate result
    let debateResult = await DebateResult.findOne({ roomId });
    if (!debateResult) {
      debateResult = new DebateResult({
        roomId,
        debateTitle: room.title,
        startTime: new Date()
      });
    }

    // Update settings
    debateResult.settings = {
      ...debateResult.settings,
      ...settings,
      maxDuration: settings.maxDuration * 60 || debateResult.settings.maxDuration // Convert minutes to seconds
    };

    await debateResult.save();

    // Update room settings if needed
    if (!room.settings) {
      room.settings = {};
    }
    room.settings = { ...room.settings, ...settings };
    await room.save();

    // Broadcast settings update
    io.to(roomId).emit('debate_settings_updated', {
      roomId,
      settings: debateResult.settings,
      updatedBy: userId,
      updatedAt: new Date().toISOString()
    });

    console.log(`✅ Settings updated for room ${roomId}`);

    res.json({
      success: true,
      message: 'Debate settings updated',
      settings: debateResult.settings
    });

  } catch (error) {
    console.error("Error updating debate settings:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
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

// Debug endpoint to check all data
app.get('/api/debug/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const arguments = await ArgumentEvaluation.find({ roomId });
    const debateResult = await DebateResult.findOne({ roomId });
    const messages = await Message.find({ roomId });

    res.json({
      success: true,
      argumentCount: arguments.length,
      debateResultExists: !!debateResult,
      messageCount: messages.length,
      arguments: arguments.slice(0, 3).map(arg => ({
        id: arg._id,
        team: arg.team,
        score: arg.totalScore,
        userId: arg.userId
      })),
      debateResult: debateResult ? {
        totalRounds: debateResult.totalRounds,
        teamScores: debateResult.teamScores
      } : null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
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