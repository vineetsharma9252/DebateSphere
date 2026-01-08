const express = require("express");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const Room = require("./models/Room.js");
const User = require("./models/Users.js");
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
    userStance: String,
    stanceLabel: String,
    evaluationId: String,
    evaluationScore: Number,
    messageId: {
        type: String,
        unique: true,
        sparse: true
    },
    originalMessageId: String
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

  socket.on('join_room', async (roomId) => {
    socket.join(roomId);
    const room = await Room.findOne({ roomId });

    if (!room || !room.isActive){
        socket.emit('room_closed', {
            roomId,
            message: 'This Debate room is no longer active'
        });
        return;
    }

    const debateResult = await DebateResult.findOne({ roomId });
    if (debateResult && debateResult.status === 'ended') {
        socket.emit('room_closed', {
            roomId,
            message: 'This debate has ended',
            winner: debateResult.winningTeam
        });
        return;
    }

    console.log(`Socket ${socket.id} joined room ${roomId}`);

    try {
      const messages = await Message.find({ roomId, isDeleted: false })
        .sort({ time: 1 })
        .limit(50)
        .lean();

      const formattedMessages = await Promise.all(messages.map(async (msg) => {
        let displayText = msg.text || '';
        if (displayText) {
          displayText = displayText
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/^\s+|\s+$/g, '')
            .replace(/\s+$/gm, '');
        }

        let userImageToUse = msg.userImage || '';

        if (!userImageToUse && msg.userId) {
          try {
            const user = await User.findById(msg.userId);
            if (user && user.user_image) {
              userImageToUse = user.user_image;
            }
          } catch (error) {
            console.error(`Error fetching user image for ${msg.userId}:`, error);
          }
        }

        return {
          id: msg._id.toString(),
          text: displayText,
          image: msg.image,
          sender: msg.sender,
          userId: msg.userId,
          userImage: userImageToUse,
          roomId: msg.roomId,
          time: msg.time.toISOString(),
          isDeleted: msg.isDeleted,
          isSystem: msg.sender === "System",
          userStance: msg.userStance,
          stanceLabel: msg.stanceLabel,
          aiDetected: msg.aiDetected,
          aiConfidence: msg.aiConfidence
        };
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
      const { roomId, userId, reason = 'User requested' } = data;

      // Verify user has permission
      const room = await Room.findOne({ roomId });
      if (!room) {
        if (callback) callback({ success: false, error: 'Room not found' });
        return;
      }

      if (room.createdBy.toString() !== userId) {
        const user = await User.findById(userId);
        if (!user || !user.isModerator) {
          if (callback) callback({ success: false, error: 'Only room creator or moderators can end debate' });
          return;
        }
      }

      // Check if there are enough arguments to end debate
      const arguments = await ArgumentEvaluation.find({ roomId });
      if (arguments.length === 0) {
        if (callback) callback({
          success: false,
          error: 'Cannot end debate with no arguments submitted'
        });
        return;
      }

      const winnerData = await determineWinner(roomId);

      if (!winnerData) {
        if (callback) callback({ success: false, error: 'Could not determine winner' });
        return;
      }

      // Update debate result
      let debateResult = await DebateResult.findOne({ roomId });
      if (!debateResult) {
        debateResult = new DebateResult({
          roomId,
          debateTitle: room.title,
          createdAt: new Date(),
          status: 'ended',
          endedAt: new Date(),
          endedBy: userId,
          reason: reason
        });
      } else {
        debateResult.status = 'ended';
        debateResult.endedAt = new Date();
        debateResult.endedBy = userId;
        debateResult.reason = reason;
      }

      debateResult.winningTeam = winnerData.winner;
      debateResult.marginOfVictory = winnerData.margin;
      debateResult.calculatedAt = new Date();

      // Update team scores
      if (winnerData.stats) {
        debateResult.teamScores = winnerData.stats;
      }

      // Calculate awards
      await calculateAwards(roomId, debateResult, arguments);

      await debateResult.save();

      // Update room status
      room.debateStatus = 'ended';
      room.endedAt = new Date();
      room.winner = winnerData.winner;
      await room.save();

      // Update user statistics
      await updateUserStatsAfterDebate(roomId, winnerData.winner, userId);

      // Broadcast to all users
      io.to(roomId).emit('debate_ended', {
        roomId,
        winner: winnerData.winner,
        margin: winnerData.margin,
        stats: winnerData.stats,
        awards: debateResult.awards,
        endedBy: userId,
        endedAt: debateResult.endedAt.toISOString(),
        reason: reason,
        message: `Debate ended by ${debateResult.endedBy}. Winner: ${winnerData.winner}`
      });

      if (callback) {
        callback({
          success: true,
          winner: winnerData.winner,
          margin: winnerData.margin,
          stats: winnerData.stats,
          awards: debateResult.awards
        });
      }
    } catch (error) {
      console.error("Error ending debate:", error);
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
          status: debateResult?.status || 'active',
          winner: debateResult?.winningTeam || null,
          scores: await getCurrentStandings(roomId),
          roomActive: room?.isActive || false,
          roomEnded: room?.debateStatus === 'ended'
        });
      }
    } catch (error) {
      console.error('Error getting debate status:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('check_debate_endable', async (data, callback) => {
    try {
      const { roomId } = data;

      const arguments = await ArgumentEvaluation.find({ roomId });
      const room = await Room.findOne({ roomId });

      // Check if debate can be ended
      const minArguments = 3; // Minimum arguments per team
      const teamStats = {
        favor: 0,
        against: 0,
        neutral: 0
      };

      arguments.forEach(arg => {
        const team = arg.team?.toLowerCase();
        if (team && teamStats[team] !== undefined) {
          teamStats[team]++;
        }
      });

      const teamsWithEnoughArgs = Object.keys(teamStats).filter(
        team => teamStats[team] >= minArguments
      );

      const canEnd = teamsWithEnoughArgs.length >= 2 && arguments.length >= 6;
      const reason = canEnd
        ? 'Ready to end debate'
        : `Need at least 2 teams with ${minArguments} arguments each (current: ${JSON.stringify(teamStats)})`;

      if (callback) {
        callback({
          success: true,
          canEnd,
          reason,
          teamStats,
          totalArguments: arguments.length
        });
      }
    } catch (error) {
      console.error('Error checking debate endability:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  socket.on('user_stance_selected', async (data, callback) => {
    try {
      const { roomId, userId, username, stance, stanceLabel, userImage } = data;

      console.log(`🎯 User ${username} selected stance: ${stanceLabel} in room ${roomId}`);

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

    const userImage = data.userImage || '';
    let cleanedText = data.text || "";

    if (cleanedText) {
      cleanedText = cleanedText
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\s+$/gm, '');
    }

    if (!cleanedText.trim() && !data.image) {
      if (callback) callback({ status: "error", error: "Message cannot be empty" });
      return;
    }

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const messageData = {
        text: cleanedText,
        image: "",
        sender: data.sender,
        userId: data.userId || "",
        userImage: userImage,
        roomId: data.roomId,
        time: new Date(data.time),
        isDeleted: false,
        aiDetected: data.aiDetected || false,
        aiConfidence: data.aiConfidence || 0,
        userStance: data.userStance?.id || data.userStance || "",
        stanceLabel: data.userStance?.label || "",
        messageId: messageId,
        originalMessageId: data.messageId
      };

      const savedMessage = await new Message(messageData).save();

      const broadcastMessage = {
        id: savedMessage._id.toString(),
        messageId: savedMessage.messageId,
        text: savedMessage.text,
        image: savedMessage.image,
        sender: savedMessage.sender,
        userId: savedMessage.userId,
        userImage: savedMessage.userImage,
        roomId: savedMessage.roomId,
        time: savedMessage.time.toISOString(),
        isDeleted: false,
        aiDetected: savedMessage.aiDetected,
        aiConfidence: savedMessage.aiConfidence,
        userStance: savedMessage.userStance,
        stanceLabel: savedMessage.stanceLabel
      };

      io.to(data.roomId).emit("receive_message", broadcastMessage);

      if (callback) callback({ status: "ok", id: savedMessage._id, messageId: savedMessage.messageId });
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
      const createdByUserId = mongoose.Types.ObjectId.isValid(createdBy)
        ? new mongoose.Types.ObjectId(createdBy)
        : createdBy;

      const newRoom = new Room({
        roomId,
        title: title.trim(),
        desc: desc?.trim() || '',
        topic: topic.trim(),
        createdBy: createdByUserId,
        isActive: true,
        debateStatus: 'active',
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

  socket.on('update_message_evaluation', async (data) => {
    try {
      await Message.findByIdAndUpdate(data.messageId, {
        evaluationId: data.evaluationId,
        evaluationScore: data.evaluationScore
      });

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
async function cleanupExistingMessages() {
  try {
    const messages = await Message.find({});
    let cleanedCount = 0;

    for (const msg of messages) {
      if (msg.text) {
        const originalText = msg.text;
        const cleanedText = originalText
          .replace(/\n\s*\n\s*\n/g, '\n\n')
          .replace(/^\s+|\s+$/g, '')
          .replace(/\s+$/gm, '');

        if (cleanedText !== originalText) {
          msg.text = cleanedText;
          await msg.save();
          cleanedCount++;
        }
      }
    }

    console.log(`✅ Cleaned ${cleanedCount} messages`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

async function ensureDebateResultExists(roomId, userId) {
  try {
    let debateResult = await DebateResult.findOne({ roomId });

    if (!debateResult) {
      const room = await Room.findOne({ roomId });

      debateResult = new DebateResult({
        roomId,
        debateTitle: room?.title || `Debate ${roomId}`,
        createdAt: new Date(),
        status: 'active',
        settings: {
          minArgumentsPerTeam: 3,
          winMarginThreshold: 10
        },
        teamScores: {
          favor: { totalPoints: 0, argumentCount: 0, averageScore: 0, participants: [] },
          against: { totalPoints: 0, argumentCount: 0, averageScore: 0, participants: [] },
          neutral: { totalPoints: 0, argumentCount: 0, averageScore: 0, participants: [] }
        }
      });

      await debateResult.save();
      console.log(`✅ Created new DebateResult for room ${roomId}`);
    }

    return debateResult;
  } catch (error) {
    console.error('Error ensuring debate result exists:', error);
    throw error;
  }
}

async function updateTeamScore(roomId, team, score, userId) {
  try {
    let debateResult = await DebateResult.findOne({ roomId });

    if (!debateResult) {
      const room = await Room.findOne({ roomId });
      debateResult = new DebateResult({
        roomId,
        debateTitle: room?.title || `Debate ${roomId}`,
        createdAt: new Date(),
        status: 'active'
      });
    }

    const teamKey = team.toLowerCase();
    if (debateResult.teamScores[teamKey]) {
      debateResult.teamScores[teamKey].totalPoints += score;
      debateResult.teamScores[teamKey].argumentCount += 1;
      debateResult.teamScores[teamKey].averageScore =
        debateResult.teamScores[teamKey].totalPoints /
        debateResult.teamScores[teamKey].argumentCount;

      if (!debateResult.teamScores[teamKey].participants.includes(userId)) {
        debateResult.teamScores[teamKey].participants.push(userId);
      }
    }

    debateResult.totalRounds += 1;
    debateResult.status = 'active';

    await debateResult.save();

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

async function determineWinner(roomId) {
  try {
    console.log(`🔍 Determining winner for room ${roomId}`);

    const arguments = await ArgumentEvaluation.find({ roomId });
    console.log(`📊 Total arguments found: ${arguments.length}`);

    if (arguments.length === 0) {
      console.log('❌ No arguments found - debate cannot have a winner');
      return {
        winner: 'undecided',
        margin: 0,
        stats: {
          favor: { total: 0, count: 0, average: 0, participants: 0 },
          against: { total: 0, count: 0, average: 0, participants: 0 },
          neutral: { total: 0, count: 0, average: 0, participants: 0 }
        },
        awards: null,
        reason: 'No arguments submitted'
      };
    }

    const debateResult = await DebateResult.findOne({ roomId });
    const minArgumentsPerTeam = debateResult?.settings?.minArgumentsPerTeam || 3;

    const teamStats = {
      favor: { total: 0, count: 0, participants: new Set(), scores: [] },
      against: { total: 0, count: 0, participants: new Set(), scores: [] },
      neutral: { total: 0, count: 0, participants: new Set(), scores: [] }
    };

    arguments.forEach(arg => {
      const team = arg.team?.toLowerCase();
      if (team && teamStats[team]) {
        teamStats[team].total += arg.totalScore || 0;
        teamStats[team].count += 1;
        teamStats[team].scores.push(arg.totalScore || 0);
        if (arg.userId) teamStats[team].participants.add(arg.userId);
      }
    });

    console.log('📈 Team Statistics:');
    Object.keys(teamStats).forEach(team => {
      console.log(`  ${team}: ${teamStats[team].count} arguments, ${teamStats[team].total} total points`);
    });

    const stats = {};
    Object.keys(teamStats).forEach(team => {
      stats[team] = {
        total: teamStats[team].total,
        count: teamStats[team].count,
        average: teamStats[team].count > 0 ? teamStats[team].total / teamStats[team].count : 0,
        participants: teamStats[team].participants.size,
        scores: teamStats[team].scores
      };
    });

    const teamsWithEnoughArgs = Object.keys(stats).filter(team =>
      stats[team].count >= minArgumentsPerTeam
    );

    console.log(`🏆 Teams with enough arguments (${minArgumentsPerTeam}+): ${teamsWithEnoughArgs.length}`);

    if (teamsWithEnoughArgs.length < 2) {
      return {
        winner: 'undecided',
        margin: 0,
        stats,
        awards: null,
        reason: `Need at least 2 teams with ${minArgumentsPerTeam} arguments each`
      };
    }

    const teamsWithArguments = Object.keys(stats).filter(team => stats[team].count > 0);
    teamsWithArguments.sort((a, b) => stats[b].average - stats[a].average);

    const winner = teamsWithArguments[0];
    const winnerStats = stats[winner];

    if (teamsWithArguments.length === 1) {
      console.log(`✅ Only one team has arguments: ${winner} wins by default`);
      return {
        winner,
        margin: 100,
        stats,
        awards: calculateAwardsFromArguments(arguments),
        reason: 'Only one team participated'
      };
    }

    const runnerUp = teamsWithArguments[1];
    const runnerUpStats = stats[runnerUp];

    let margin = 0;
    if (runnerUpStats.average > 0) {
      margin = ((winnerStats.average - runnerUpStats.average) / runnerUpStats.average) * 100;
    } else if (winnerStats.average > 0) {
      margin = 100;
    }

    console.log(`📊 Score comparison: ${winner} (${winnerStats.average.toFixed(2)}) vs ${runnerUp} (${runnerUpStats.average.toFixed(2)})`);
    console.log(`📐 Margin: ${margin.toFixed(2)}%`);

    const winMarginThreshold = debateResult?.settings?.winMarginThreshold || 10;

    if (margin >= winMarginThreshold) {
      console.log(`🏆 ${winner} wins with ${margin.toFixed(2)}% margin (threshold: ${winMarginThreshold}%)`);
      return {
        winner,
        margin: Math.round(margin * 100) / 100,
        stats,
        awards: calculateAwardsFromArguments(arguments),
        reason: `Won by ${margin.toFixed(2)}% margin`
      };
    } else {
      console.log(`🤝 Close competition: ${winner} leads by only ${margin.toFixed(2)}% (needs ${winMarginThreshold}%)`);
      return {
        winner: 'undecided',
        margin: Math.round(margin * 100) / 100,
        stats,
        awards: calculateAwardsFromArguments(arguments),
        reason: `Margin of victory (${margin.toFixed(2)}%) below threshold (${winMarginThreshold}%)`
      };
    }

  } catch (error) {
    console.error("❌ Error in determineWinner:", error);
    return {
      winner: 'undecided',
      margin: 0,
      stats: null,
      awards: null,
      reason: `Error: ${error.message}`
    };
  }
}

async function calculateAwards(roomId, debateResult, arguments) {
  if (arguments.length === 0) return;

  const bestArgument = arguments.reduce((best, current) =>
    current.totalScore > best.totalScore ? current : best
  );

  const mostPersuasive = arguments.reduce((best, current) =>
    current.scores.persuasiveness > best.scores.persuasiveness ? current : best
  );

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

async function updateUserStatsAfterDebate(roomId, winningTeam, userId) {
  try {
    const userStances = await UserStance.find({ roomId });

    if (!userStances.length) return;

    for (const stance of userStances) {
      const isWinner = stance.stance === winningTeam;

      try {
        const user = await User.findOne({ username: stance.username });
        if (user) {
          user.total_debates = (user.total_debates || 0) + 1;

          if (isWinner) {
            user.debates_won = (user.debates_won || 0) + 1;
          }

          if (user.total_debates > 0) {
            const winRate = (user.debates_won / user.total_debates) * 100;
            if (winRate >= 80) user.rank = 1;
            else if (winRate >= 60) user.rank = 2;
            else if (winRate >= 40) user.rank = 3;
            else if (winRate >= 20) user.rank = 4;
            else user.rank = 5;
          }

          await user.save();
          console.log(`✅ Updated stats for ${user.username}: ${user.debates_won}/${user.total_debates} wins`);
        }
      } catch (error) {
        console.error(`❌ Error updating stats for ${stance.username}:`, error);
      }
    }

    console.log(`🏆 Updated stats for ${userStances.length} participants`);
  } catch (error) {
    console.error('❌ Error updating user stats after debate:', error);
  }
}

function calculateAwardsFromArguments(arguments) {
  if (arguments.length === 0) return null;

  const bestArgument = arguments.reduce((best, current) =>
    (current.totalScore || 0) > (best.totalScore || 0) ? current : best
  );

  const argumentCounts = {};
  arguments.forEach(arg => {
    argumentCounts[arg.userId] = (argumentCounts[arg.userId] || 0) + 1;
  });
  const mostActiveUserId = Object.keys(argumentCounts).reduce((a, b) =>
    argumentCounts[a] > argumentCounts[b] ? a : b
  );
  const mostActiveArg = arguments.find(arg => arg.userId === mostActiveUserId);

  return {
    bestArgument: bestArgument ? {
      userId: bestArgument.userId,
      username: bestArgument.username,
      score: bestArgument.totalScore,
      argumentExcerpt: bestArgument.argument?.substring(0, 150) + '...'
    } : null,
    mostActive: mostActiveArg ? {
      userId: mostActiveArg.userId,
      username: mostActiveArg.username,
      argumentCount: argumentCounts[mostActiveUserId]
    } : null
  };
}

async function getScoreboardData(roomId) {
  try {
    const debateResult = await DebateResult.findOne({ roomId });
    const arguments = await ArgumentEvaluation.find({ roomId });

    const userStats = {};

    arguments.forEach(arg => {
      const userId = arg.userId;
      if (!userStats[userId]) {
        userStats[userId] = {
          userId,
          username: arg.username,
          team: arg.team,
          totalScore: 0,
          argumentCount: 0,
        };
      }
      userStats[userId].totalScore += arg.totalScore;
      userStats[userId].argumentCount += 1;
    });

    const leaderboard = Object.values(userStats).map(player => {
      const averageScore = player.argumentCount > 0
        ? player.totalScore / player.argumentCount
        : 0;

      return {
        ...player,
        averageScore: parseFloat(averageScore.toFixed(2))
      };
    }).sort((a, b) => b.averageScore - a.averageScore);

    return {
      standings: await getCurrentStandings(roomId),
      leaderboard,
      winner: debateResult?.winningTeam || 'undecided',
      status: debateResult?.status || 'active'
    };
  } catch (error) {
    console.error('Error getting scoreboard data:', error);
    return { standings: {}, leaderboard: [], winner: 'undecided', status: 'active' };
  }
}

// API to check if debate can be ended
app.post('/api/debate/:roomId/can-end', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const arguments = await ArgumentEvaluation.find({ roomId });
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.json({ success: false, error: 'Room not found' });
    }

    // Verify permissions
    const isCreator = room.createdBy.toString() === userId;
    const user = await User.findById(userId);
    const isModerator = user && user.isModerator;

    if (!isCreator && !isModerator) {
      return res.json({
        success: false,
        error: 'Only room creator or moderators can end debate'
      });
    }

    const teamStats = {
      favor: 0,
      against: 0,
      neutral: 0
    };

    arguments.forEach(arg => {
      const team = arg.team?.toLowerCase();
      if (team && teamStats[team] !== undefined) {
        teamStats[team]++;
      }
    });

    const minArguments = 3;
    const teamsWithEnoughArgs = Object.keys(teamStats).filter(
      team => teamStats[team] >= minArguments
    );

    const canEnd = teamsWithEnoughArgs.length >= 2 && arguments.length >= 6;
    const reason = canEnd
      ? 'Ready to end debate'
      : `Need at least 2 teams with ${minArguments} arguments each`;

    res.json({
      success: true,
      canEnd,
      reason,
      teamStats,
      totalArguments: arguments.length,
      requirements: {
        minArgumentsPerTeam: minArguments,
        minTeams: 2,
        currentStatus: {
          teamsWithEnoughArgs: teamsWithEnoughArgs.length,
          totalArguments: arguments.length
        }
      }
    });

  } catch (error) {
    console.error('Error checking debate endability:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API to manually end debate
app.post('/api/debate/:roomId/end', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, reason = 'Manual end by user' } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    // Check permissions
    if (room.createdBy.toString() !== userId) {
      const user = await User.findById(userId);
      if (!user || !user.isModerator) {
        return res.status(403).json({
          success: false,
          error: 'Only room creator or moderators can end debate'
        });
      }
    }

    // Check if debate already ended
    if (room.debateStatus === 'ended') {
      return res.status(400).json({
        success: false,
        error: 'Debate has already ended'
      });
    }

    const arguments = await ArgumentEvaluation.find({ roomId });
    if (arguments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot end debate with no arguments submitted'
      });
    }

    // Determine winner
    const winnerData = await determineWinner(roomId);

    // Update debate result
    let debateResult = await DebateResult.findOne({ roomId });
    if (!debateResult) {
      debateResult = new DebateResult({
        roomId,
        debateTitle: room.title,
        createdAt: new Date()
      });
    }

    debateResult.status = 'ended';
    debateResult.winningTeam = winnerData.winner;
    debateResult.marginOfVictory = winnerData.margin;
    debateResult.endedAt = new Date();
    debateResult.endedBy = userId;
    debateResult.reason = reason;

    if (winnerData.stats) {
      debateResult.teamScores = winnerData.stats;
    }

    // Calculate awards
    await calculateAwards(roomId, debateResult, arguments);

    await debateResult.save();

    // Update room
    room.debateStatus = 'ended';
    room.endedAt = new Date();
    room.winner = winnerData.winner;
    await room.save();

    // Update user stats
    await updateUserStatsAfterDebate(roomId, winnerData.winner, userId);

    // Broadcast to all users
    io.to(roomId).emit('debate_ended', {
      roomId,
      winner: winnerData.winner,
      margin: winnerData.margin,
      stats: winnerData.stats,
      awards: debateResult.awards,
      endedBy: userId,
      endedAt: debateResult.endedAt.toISOString(),
      reason: reason,
      message: `Debate ended by ${userId}. Winner: ${winnerData.winner}`
    });

    res.json({
      success: true,
      winner: winnerData.winner,
      margin: winnerData.margin,
      stats: winnerData.stats,
      awards: debateResult.awards,
      endedAt: debateResult.endedAt,
      reason: reason
    });

  } catch (error) {
    console.error("Error ending debate:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API to get debate status
app.get('/api/debate/:roomId/status', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    const debateResult = await DebateResult.findOne({ roomId });
    const arguments = await ArgumentEvaluation.find({ roomId });

    // Calculate if debate can be ended
    const teamStats = {
      favor: 0,
      against: 0,
      neutral: 0
    };

    arguments.forEach(arg => {
      const team = arg.team?.toLowerCase();
      if (team && teamStats[team] !== undefined) {
        teamStats[team]++;
      }
    });

    const minArguments = 3;
    const teamsWithEnoughArgs = Object.keys(teamStats).filter(
      team => teamStats[team] >= minArguments
    );

    const canEnd = teamsWithEnoughArgs.length >= 2 && arguments.length >= 6;

    res.json({
      success: true,
      status: debateResult?.status || 'active',
      roomStatus: room.debateStatus,
      winner: debateResult?.winningTeam || null,
      canEnd,
      requirements: {
        minArgumentsPerTeam: minArguments,
        minTeams: 2,
        current: {
          arguments: arguments.length,
          teamStats,
          teamsWithEnoughArgs: teamsWithEnoughArgs.length
        }
      },
      endedAt: debateResult?.endedAt,
      endedBy: debateResult?.endedBy
    });

  } catch (error) {
    console.error('Error getting debate status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/evaluate", async (req, res) => {
    const { argument, team, roomId, userId, username, messageId } = req.body;

    const validTeams = ['favor', 'against', 'neutral'];
      const normalizedTeam = team?.toLowerCase();

      if (!validTeams.includes(normalizedTeam)) {
        console.error('❌ Invalid team:', team);
        return res.status(400).json({
          success: false,
          error: `Invalid team. Must be one of: ${validTeams.join(', ')}`
        });
      }

    await ensureDebateResultExists(roomId, userId);
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
    console.log("📝 Evaluation request received:", {
        argumentLength: argument?.length,
        team,
        roomId,
        userId,
        username,
        messageId
      });
      let actualMessageId = messageId;
        if (!actualMessageId) {
          try {
            const recentMessage = await Message.findOne({
              roomId,
              userId,
              isDeleted: false
            }).sort({ time: -1 }).limit(1);

        if (recentMessage) {
              actualMessageId = recentMessage.messageId || recentMessage._id.toString();
              console.log(`🔍 Found recent message for linking: ${actualMessageId}`);
            }
        } catch (error) {
            console.error("Error finding recent message:", error);
        }
      }



        console.log(`📌 Using messageId for evaluation: ${actualMessageId || 'Not found'}`);

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
            console.log("✅ Parsed AI evaluation:", evaluation);
               // Validate the response has all required fields
            const requiredFields = ['clarity', 'relevance', 'logic', 'evidence',
                                   'persuasiveness', 'rebuttal', 'totalScore', 'feedback'];
            const hasAllFields = requiredFields.every(field => field in evaluation);

            if (!hasAllFields) {
                throw new Error("AI response missing required fields");
            }

            const updatedScoreboard = await getScoreboardData(roomId);

                // Broadcast updated scoreboard to all clients in the room
                io.to(roomId).emit('scoreboard_updated', {
                  roomId,
                  standings: await getCurrentStandings(roomId),
                  leaderboard: updatedScoreboard.leaderboard,
                  winner: updatedScoreboard.winner
                });

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
            messageId : actualMessageId,
            evaluatedAt: new Date(),
            aiConfidence: 0.9
        });

        await argumentEval.save();

        if (actualMessageId) {
            try {
              // Try to find message by messageId first, then by _id
              let messageToUpdate = await Message.findOne({
                $or: [
                  { messageId: actualMessageId },
                  { _id: actualMessageId }
                ]
              });

              if (messageToUpdate) {
                console.log(`🔗 Linking evaluation to message: ${messageToUpdate._id}`);
                await Message.findByIdAndUpdate(messageToUpdate._id, {
                  evaluationId: argumentEval._id,
                  evaluationScore: evaluation.totalScore
                });
              } else {
                console.log(`⚠️ Message not found for ID: ${actualMessageId}`);
              }
            } catch (error) {
              console.error("Error updating message with evaluation:", error);
            }
          }

        const existingArguments = await ArgumentEvaluation.find({ roomId });
            const debateResult = await DebateResult.findOne({ roomId });

            if (existingArguments.length === 0 && (!debateResult || !debateResult.startTime)) {
              console.log('⏰ First argument submitted - starting debate timer');

              // Auto-start timer for 30 minutes
              if (!debateResult) {
                debateResult = new DebateResult({
                  roomId,
                  debateTitle: room?.title || `Debate ${roomId}`,
                  startTime: new Date(),
                  isActive: true,
                  settings: {
                    maxDuration: 1800, // 30 minutes
                    maxArguments: 50,
                    minArgumentsPerTeam: 3,
                    winMarginThreshold: 10,
                    minEndTime: 300 // 5 minutes
                  }
                });
              } else {
                debateResult.startTime = new Date();
                debateResult.isActive = true;
                if (!debateResult.settings) {
                  debateResult.settings = {
                    maxDuration: 1800,
                    minEndTime: 300
                  };
                }
              }

              await debateResult.save();

              // Broadcast timer start to all users
              io.to(roomId).emit('debate_timer_started', {
                roomId,
                startTime: debateResult.startTime,
                duration: debateResult.settings.maxDuration,
                startedBy: userId,
                autoStarted: true
              });

              console.log('✅ Auto-started debate timer');
            }
        // Update team scores
        await updateTeamScore(roomId, team, evaluation.totalScore, userId);
        const updatedScoreboard = await getScoreboardData(roomId);
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
        const scoreboardData = await getScoreboardData(roomId);

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

            io.to(roomId).emit('scoreboard_updated', {
              roomId,
              standings: await getCurrentStandings(roomId),
              leaderboard: updatedScoreboard.leaderboard,
              winner: updatedScoreboard.winner,
              updatedAt: new Date().toISOString()
            });

            // Also emit the simple score update
            io.to(roomId).emit('score_updated', {
              roomId,
              teamScores: await getCurrentStandings(roomId),
              lastUpdate: new Date().toISOString()
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
            evaluationId: argumentEval._id,
            currentStandings: currentStandings
        });

    } catch (error) {
        console.error("❌ Groq API Error:", {
            message: error.message,
            stack : error.stack ,
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


// Update user statistics (total debates, debates won)
app.post('/api/update_user_stats', async (req, res) => {
  try {
    const { username, isWinner } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Increment total debates
    user.total_debates = (user.total_debates || 0) + 1;

    // Increment debates won if user won
    if (isWinner) {
      user.debates_won = (user.debates_won || 0) + 1;
    }

    // Recalculate rank (optional - you can implement your own ranking logic)
    if (user.total_debates > 0) {
      const winRate = (user.debates_won / user.total_debates) * 100;
      // Simple ranking logic - adjust as needed
      if (winRate >= 80) user.rank = 1;
      else if (winRate >= 60) user.rank = 2;
      else if (winRate >= 40) user.rank = 3;
      else if (winRate >= 20) user.rank = 4;
      else user.rank = 5;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User stats updated',
      user: {
        username: user.username,
        total_debates: user.total_debates,
        debates_won: user.debates_won,
        rank: user.rank
      }
    });

  } catch (error) {
    console.error('Error updating user stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET REAL-TIME SCOREBOARD
app.get('/api/debate/:roomId/scoreboard', async (req, res) => {
  try {
    const { roomId } = req.params;

    console.log(`📊 Fetching scoreboard for room: ${roomId}`);

    // Get debate result
    const debateResult = await DebateResult.findOne({ roomId });

    if (!debateResult) {
          return res.json({
            success: true,
            standings: {
              favor: { total: 0, count: 0, average: 0, participants: 0 },
              against: { total: 0, count: 0, average: 0, participants: 0 },
              neutral: { total: 0, count: 0, average: 0, participants: 0 }
            },
            leaderboard: [],
            debateStatus: 'not_started', // Add this status
            winner: null,
            totalArguments: 0,
            lastUpdated: new Date().toISOString()
          });
     }
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

app.post('/api/debate/:roomId/end', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, reason } = req.body;

    if (!userId) {
          return res.status(400).json({
            success: false,
            error: 'User ID is required'
          });
     }
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

    const arguments = await ArgumentEvaluation.find({ roomId });
        console.log(`📝 Found ${arguments.length} arguments for room ${roomId}`);

        if (arguments.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Cannot end debate with no arguments submitted',
            suggestion: 'Submit at least one argument before ending the debate'
          });
     }
    // Get or create debate result
    let debateResult = await DebateResult.findOne({ roomId });
    if (!debateResult) {
      console.log(`📋 Creating new DebateResult for room ${roomId}`);

            // Calculate initial scores from existing arguments
            const initialTeamScores = {
              favor: { totalPoints: 0, argumentCount: 0, averageScore: 0, participants: [] },
              against: { totalPoints: 0, argumentCount: 0, averageScore: 0, participants: [] },
              neutral: { totalPoints: 0, argumentCount: 0, averageScore: 0, participants: [] }
            };

            arguments.forEach(arg => {
              const team = arg.team?.toLowerCase();
              if (team && initialTeamScores[team]) {
                initialTeamScores[team].totalPoints += arg.totalScore || 0;
                initialTeamScores[team].argumentCount += 1;
                if (arg.userId && !initialTeamScores[team].participants.includes(arg.userId)) {
                  initialTeamScores[team].participants.push(arg.userId);
                }
              }
            });

            // Calculate averages
            Object.keys(initialTeamScores).forEach(team => {
              if (initialTeamScores[team].argumentCount > 0) {
                initialTeamScores[team].averageScore =
                  initialTeamScores[team].totalPoints / initialTeamScores[team].argumentCount;
              }
            });
      debateResult = new DebateResult({
        roomId,
        debateTitle: room.title,
        startTime: room.createdAt || new Date(),
        settings: {
          maxDuration: 1800,
          maxArguments: 50,
          minArgumentsPerTeam: 3,
          winMarginThreshold: 10
        },
        teamScores: initialTeamScores ,
        isActive:true ,
      });

      await debateResult.save() ;
    }

    // Calculate winner
    const winnerData = await determineWinnerWithForcedEnd(roomId, true);

    if (!winnerData || !winnerData.winner) {
      return res.status(400).json({
        success: false,
        error: 'Could not determine winner',
        debug : winnerData
      });
    }

    // Update debate result
    debateResult.isActive = false;
    debateResult.endTime = new Date();
    debateResult.winningTeam = winnerData.winner;
    debateResult.marginOfVictory = winnerData.margin;
    debateResult.calculatedAt = new Date();


    if (winnerData.stats) {
          Object.keys(winnerData.stats).forEach(team => {
            if (debateResult.teamScores[team]) {
              debateResult.teamScores[team].totalPoints = winnerData.stats[team].total || 0;
              debateResult.teamScores[team].argumentCount = winnerData.stats[team].count || 0;
              debateResult.teamScores[team].averageScore = winnerData.stats[team].average || 0;
            }
          });
    }
    // Update awards
    if (winnerData.awards) {
      debateResult.awards = winnerData.awards;
    }
    debateResult.totalRounds = arguments.length;
    await debateResult.save();
    console.log('DebateResult saved:', debateResult);

    // Update room status
    room.debateStatus = 'ended';
    room.endedAt = new Date();
    room.winner = winnerData.winner;
    await room.save();

    const responseData = {
          success: true,
          message: 'Debate ended successfully',
          roomId,
          winner: winnerData.winner,
          margin: winnerData.margin,
          stats: winnerData.stats,
          awards: winnerData.awards,
          endedAt: debateResult.endTime,
          endedBy: userId,
          reason: reason || 'Manually ended'
    };

    // Broadcast to all connected users
    io.to(roomId).emit('debate_ended', responseData);

    res.json(responseData);

  } catch (error) {
    console.error("Error ending debate:", error);
    res.status(500).json({
      success: false,
      error: error.message ,
      stack: error.stack
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