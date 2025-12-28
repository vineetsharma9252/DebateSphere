import React, { useEffect, useState, useRef , useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
  Modal,
  Animated,
  ScrollView,
  ToastAndroid
} from 'react-native';
import io from 'socket.io-client' ;
import { useUser } from "../../Contexts/UserContext";
import { useRoute } from '@react-navigation/native';
import AIDetectionService from '../services/AIDetectionService';
import AIContentWarning from '../warning/AIContentWarning';

import axios from 'axios';

const SERVER_URL = 'https://debatesphere-11.onrender.com';

// Default images array
const defaultImages = [
  { id: 'nerd_male_1', source: require("../assets/Nerd_male_1.png"), name: "Alex" },
  { id: 'nerd_male_2', source: require("../assets/Nerd_male_2.png"), name: "James" },
  { id: 'nerd_female_1', source: require("../assets/Nerd_female.png"), name: "Tina" },
  { id: 'nerd_female_2', source: require("../assets/Nerd_female_2.png"), name: "Jasmine" },
  { id: 'nerd_male_3', source: require("../assets/Nerd_male_3.png"), name: "John" },
];

// Stance Selection Modal Component
const StanceSelectionModal = ({
  visible,
  onStanceSelected,
  roomId,
  userId,
  username
}) => {
  const [selectedStance, setSelectedStance] = useState(null);
  const [loading, setLoading] = useState(false);

  const stances = [
    { id: 'against', label: 'Against', emoji: '👎', color: '#ef4444' },
    { id: 'favor', label: 'In Favor', emoji: '👍', color: '#10b981' },
    { id: 'neutral', label: 'Neutral', emoji: '🤝', color: '#6b7280' }
  ];

  const handleStanceSelect = async (stance) => {
    if (loading) return;

    setSelectedStance(stance);
    setLoading(true);

    try {
      // Save stance to backend
      const response = await fetch('https://debatesphere-11.onrender.com/api/save_user_stance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          userId,
          username,
          stance: stance.id,
          stanceLabel: stance.label
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onStanceSelected(stance);
      } else {
        Alert.alert('Error', result.error || 'Failed to save stance');
        setSelectedStance(null);
      }
    } catch (error) {
      console.error('Stance selection error:', error);
      Alert.alert('Error', 'Network error while saving stance');
      setSelectedStance(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {}} // Prevent closing by back button
    >
      <View style={stanceStyles.modalOverlay}>
        <View style={stanceStyles.modalContent}>
          <View style={stanceStyles.header}>
            <Text style={stanceStyles.title}>Choose Your Stance</Text>
            <Text style={stanceStyles.subtitle}>
              Select your position in this debate. This choice cannot be changed later.
            </Text>
          </View>

          <View style={stanceStyles.stancesContainer}>
            {stances.map((stance) => (
              <TouchableOpacity
                key={stance.id}
                style={[
                  stanceStyles.stanceButton,
                  selectedStance?.id === stance.id && stanceStyles.stanceButtonSelected,
                  { borderColor: stance.color }
                ]}
                onPress={() => handleStanceSelect(stance)}
                disabled={loading}
              >
                <View style={[
                  stanceStyles.stanceEmoji,
                  { backgroundColor: `${stance.color}20` }
                ]}>
                  <Text style={stanceStyles.emojiText}>{stance.emoji}</Text>
                </View>
                <Text style={[
                  stanceStyles.stanceLabel,
                  selectedStance?.id === stance.id && stanceStyles.stanceLabelSelected
                ]}>
                  {stance.label}
                </Text>
                {loading && selectedStance?.id === stance.id && (
                  <ActivityIndicator size="small" color={stance.color} style={stanceStyles.loading} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={stanceStyles.warning}>
            <Text style={stanceStyles.warningText}>
              ⚠️ Your stance cannot be changed once selected
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles for the stance modal
const stanceStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  stancesContainer: {
    gap: 16,
    marginBottom: 24,
  },
  stanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  stanceButtonSelected: {
    backgroundColor: '#f1f5f9',
    transform: [{ scale: 1.02 }],
  },
  stanceEmoji: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emojiText: {
    fontSize: 20,
  },
  stanceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  stanceLabelSelected: {
    fontWeight: '700',
  },
  loading: {
    marginLeft: 8,
  },
  warning: {
    backgroundColor: '#fffbeb',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

function ImageUploader({ onImageSelected, disabled }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Alert.alert('Error', 'Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64Image = reader.result;
        onImageSelected(base64Image);
      };
      reader.onerror = () => {
        Alert.alert('Error', 'Failed to read image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMobileImagePicker = async () => {
    Alert.alert(
      'Image Picker',
      'Mobile image picking not implemented. Please use web for testing or integrate a native image picker.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.uploaderContainer}>
      {Platform.OS === 'web' ? (
        <>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <TouchableOpacity
            style={[styles.uploadBtn, disabled && styles.uploadBtnDisabled]}
            onPress={() => fileInputRef.current.click()}
            disabled={disabled}
          >
            <Text style={styles.uploadBtnText}>📷</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.uploadBtn, disabled && styles.uploadBtnDisabled]}
          onPress={handleMobileImagePicker}
          disabled={disabled}
        >
          <Text style={styles.uploadBtnText}>📷</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Function to get user image source
const getUserImageSource = (userImage) => {
  if (!userImage) {
    return defaultImages[0].source;
  }

  // Check if it's a default image
  const defaultImage = defaultImages.find(img => img.id === userImage);
  if (defaultImage) {
    return defaultImage.source;
  }

  // Fallback to first default image
  return defaultImages[0].source;
};

// Move this COMPLETELY outside the ChatRoom component, before "export default function ChatRoom"
const ScoreboardModal = ({ visible, onClose, scores, leaderboard, roomId, userId, winner }) => {
  const [activeTab, setActiveTab] = useState('scores');

  // Remove the debateSettings state from here since it's in parent
  // Just use the props passed from parent

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={scoreboardStyles.modalOverlay}>
        <View style={scoreboardStyles.modalContent}>
          <View style={scoreboardStyles.header}>
            <Text style={scoreboardStyles.title}>🏆 Debate Scoreboard</Text>
            <TouchableOpacity onPress={onClose} style={scoreboardStyles.closeButton}>
              <Text style={scoreboardStyles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={scoreboardStyles.tabContainer}>
            <TouchableOpacity
              style={[scoreboardStyles.tab, activeTab === 'scores' && scoreboardStyles.activeTab]}
              onPress={() => setActiveTab('scores')}
            >
              <Text style={scoreboardStyles.tabText}>Team Scores</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[scoreboardStyles.tab, activeTab === 'leaderboard' && scoreboardStyles.activeTab]}
              onPress={() => setActiveTab('leaderboard')}
            >
              <Text style={scoreboardStyles.tabText}>Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[scoreboardStyles.tab, activeTab === 'settings' && scoreboardStyles.activeTab]}
              onPress={() => setActiveTab('settings')}
            >
              <Text style={scoreboardStyles.tabText}>Settings</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'scores' && (
            <ScrollView style={scoreboardStyles.content}>
              {['favor', 'against', 'neutral'].map((team) => (
                <View key={team} style={[
                  scoreboardStyles.teamCard,
                  winner === team && scoreboardStyles.winningTeamCard
                ]}>
                  <View style={scoreboardStyles.teamHeader}>
                    <Text style={scoreboardStyles.teamName}>
                      {team === 'favor' ? '👍 In Favor' :
                       team === 'against' ? '👎 Against' : '🤝 Neutral'}
                      {winner === team && ' 🏆'}
                    </Text>
                    <Text style={scoreboardStyles.teamScore}>
                      {scores[team]?.average?.toFixed(1) || '0.0'} avg
                    </Text>
                  </View>

                  <View style={scoreboardStyles.statsGrid}>
                    <View style={scoreboardStyles.statItem}>
                      <Text style={scoreboardStyles.statLabel}>Total Points</Text>
                      <Text style={scoreboardStyles.statValue}>{scores[team]?.total || 0}</Text>
                    </View>
                    <View style={scoreboardStyles.statItem}>
                      <Text style={scoreboardStyles.statLabel}>Arguments</Text>
                      <Text style={scoreboardStyles.statValue}>{scores[team]?.count || 0}</Text>
                    </View>
                    <View style={scoreboardStyles.statItem}>
                      <Text style={scoreboardStyles.statLabel}>Participants</Text>
                      <Text style={scoreboardStyles.statValue}>{scores[team]?.participants || 0}</Text>
                    </View>
                  </View>

                  {scores[team]?.count > 0 && (
                    <View style={scoreboardStyles.progressBar}>
                      <View
                        style={[
                          scoreboardStyles.progressFill,
                          {
                            width: `${Math.min(100, (scores[team].average / 10) * 100)}%`,
                            backgroundColor: team === 'favor' ? '#10b981' :
                                           team === 'against' ? '#ef4444' : '#6b7280'
                          }
                        ]}
                      />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {activeTab === 'leaderboard' && (
            <ScrollView style={scoreboardStyles.content}>
              {leaderboard.length > 0 ? (
                leaderboard.map((player, index) => (
                  <View key={index} style={scoreboardStyles.leaderboardRow}>
                    <Text style={scoreboardStyles.rank}>#{index + 1}</Text>
                    <View style={scoreboardStyles.playerInfo}>
                      <Text style={scoreboardStyles.playerName}>{player.username}</Text>
                      <View style={scoreboardStyles.playerDetails}>
                        <Text style={scoreboardStyles.playerTeam}>
                          {player.team === 'favor' ? '👍' :
                           player.team === 'against' ? '👎' : '🤝'}
                        </Text>
                        <Text style={scoreboardStyles.playerStats}>
                          {player.argumentCount} args • {player.averageScore.toFixed(1)} avg
                        </Text>
                      </View>
                    </View>
                    <Text style={scoreboardStyles.playerScore}>{player.totalScore}</Text>
                  </View>
                ))
              ) : (
                <Text style={scoreboardStyles.emptyText}>No leaderboard data yet</Text>
              )}
            </ScrollView>
          )}

          {activeTab === 'settings' && (
            <ScoreboardSettingsTab
              debateSettings={debateSettings}
              setDebateSettings={setDebateSettings}
              updateDebateSettings={updateDebateSettings}
            />
          )}

          <TouchableOpacity
            style={scoreboardStyles.endDebateButton}
            onPress={endDebate}
          >
            <Text style={scoreboardStyles.endDebateButtonText}>End Debate Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Add a separate component for the settings tab
const ScoreboardSettingsTab = ({ debateSettings, setDebateSettings, updateDebateSettings }) => {
  const [tempSettings, setTempSettings] = useState(debateSettings);

  const handleSave = () => {
    setDebateSettings(tempSettings);
    updateDebateSettings();
  };

  return (
    <ScrollView style={scoreboardStyles.content}>
      <Text style={scoreboardStyles.sectionTitle}>Debate Settings</Text>

      <View style={scoreboardStyles.settingItem}>
        <Text style={scoreboardStyles.settingLabel}>Max Duration (minutes)</Text>
        <TextInput
          style={scoreboardStyles.settingInput}
          value={tempSettings.maxDuration.toString()}
          onChangeText={(text) => setTempSettings({
            ...tempSettings,
            maxDuration: parseInt(text) || 30
          })}
          keyboardType="numeric"
        />
      </View>

      <View style={scoreboardStyles.settingItem}>
        <Text style={scoreboardStyles.settingLabel}>Max Arguments</Text>
        <TextInput
          style={scoreboardStyles.settingInput}
          value={tempSettings.maxArguments.toString()}
          onChangeText={(text) => setTempSettings({
            ...tempSettings,
            maxArguments: parseInt(text) || 50
          })}
          keyboardType="numeric"
        />
      </View>

      <View style={scoreboardStyles.settingItem}>
        <Text style={scoreboardStyles.settingLabel}>Win Margin Threshold (%)</Text>
        <TextInput
          style={scoreboardStyles.settingInput}
          value={tempSettings.winMarginThreshold.toString()}
          onChangeText={(text) => setTempSettings({
            ...tempSettings,
            winMarginThreshold: parseInt(text) || 10
          })}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={scoreboardStyles.saveButton}
        onPress={handleSave}
      >
        <Text style={scoreboardStyles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default function ChatRoom({ route }) {
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [aiWarningVisible, setAiWarningVisible] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const [userAIScore, setUserAIScore] = useState(0);
  // Add this to your state
  const [loadingScoreboard, setLoadingScoreboard] = useState(false);
  const [consecutiveAIDetections, setConsecutiveAIDetections] = useState(0);
  const [userImages, setUserImages] = useState({});
  // In your ChatRoom component's state
  const [messageEvaluation, setMessageEvaluation] = useState(null);
  // Stance-related state
  const [showStanceModal, setShowStanceModal] = useState(false);
  const [userStance, setUserStance] = useState(null);
  const [hasCheckedStance, setHasCheckedStance] = useState(false);
  const [roomStances, setRoomStances] = useState({});
  const [debateScores, setDebateScores] = useState({
    favor: { total: 0, count: 0, average: 0, participants: 0 },
    against: { total: 0, count: 0, average: 0, participants: 0 },
    neutral: { total: 0, count: 0, average: 0, participants: 0 }
  });
  const [winner, setWinner] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [debateEnded, setDebateEnded] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [debateSettings, setDebateSettings] = useState({
    maxDuration: 30, // minutes
    maxArguments: 50,
    winMarginThreshold: 10
  });


  const { roomId, title, desc } = route.params;
  const { user } = useUser();

  const username = user?.username || 'Guest';
  const userId = user?.id || '';
  const userImage = user?.user_image || '';
  console.log("User Data at ChatRoom is " + user);
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Stance color and label mapping with text colors
  const stanceColors = {
    against: {
      background: '#ef4444',
      text: '#ff6b35', // Orange text color for Against
      light: '#fef2f2'
    },
    favor: {
      background: '#10b981',
      text: '#8b5cf6', // Purple text color for Favor
      light: '#f0fdf4'
    },
    neutral: {
      background: '#6b7280',
      text: '#4b5563', // Gray text color for Neutral
      light: '#f9fafb'
    }
  };

  const stanceLabels = {
    against: 'Against',
    favor: 'In Favor',
    neutral: 'Neutral'
  };

  // Function to get text color based on stance
  const getStanceTextColor = (stance) => {
    if (!stance) return '#1e293b'; // Default text color

    const stanceData = stanceColors[stance];
    return stanceData ? stanceData.text : '#1e293b';
  };

  // Function to get background color based on stance
  const getStanceBackgroundColor = (stance) => {
    if (!stance) return '#f8fafc'; // Default background

    const stanceData = stanceColors[stance];
    return stanceData ? stanceData.light : '#f8fafc';
  };

useEffect(() => {
  if (!socketRef.current) return;

  const socket = socketRef.current;

  const handleScoreUpdated = (data) => {
    if (data.roomId === roomId) {
      setDebateScores(data.teamScores);
    }
  };

  const handleDebateEnded = (data) => {
    if (data.roomId === roomId) {
      setWinner(data.winner);
      setDebateEnded(true);
      showWinnerModal(data);
    }
  };

  const handleArgumentEvaluated = (data) => {
    if (data.roomId === roomId && data.userId !== userId) {
      ToastAndroid.show(
        `${data.username}'s argument scored ${data.totalScore} points`,
        ToastAndroid.SHORT
      );
    }
  };

  socket.on('score_updated', handleScoreUpdated);
  socket.on('debate_ended', handleDebateEnded);
  socket.on('argument_evaluated', handleArgumentEvaluated);

  return () => {
    socket.off('score_updated', handleScoreUpdated);
    socket.off('debate_ended', handleDebateEnded);
    socket.off('argument_evaluated', handleArgumentEvaluated);
  };
}, [roomId, userId]);

// Update handleMessage function
const handleMessage = async () => {
  if (!text.trim() || !isConnected || !userStance) {
    Alert.alert('Error', 'Cannot send empty message or without stance');
    return;
  }

  // First, send the message to chat
  const messageData = {
    text: text.trim(),
    image : user?.user_image || '',
    sender: username,
    userId: userId,
    userImage: user?.user_image || '',
    roomId: roomId,
    time: new Date().toISOString(),
    userStance: userStance.id || userStance,
    stanceLabel: userStance.label || stanceLabels[userStance]
  };

  // Emit message
  socketRef.current.emit('send_message', messageData, async (ack) => {
    if (ack && ack.status === "ok") {
      // Then evaluate the argument
      try {
        const evalResponse = await axios.post(`${SERVER_URL}/evaluate`, {
          argument: text.trim(),
          team: userStance.id.ToLowerCase() || userStance,
          roomId: roomId,
          userId: userId,
          username: username,
          messageId: ack.id // Link evaluation to message
        });

        if (evalResponse.data.success) {
          const { evaluation, currentStandings, winner } = evalResponse.data;

          // Update local scores
          setDebateScores(currentStandings);

          // Show evaluation to user
          Alert.alert(
            '📊 Argument Evaluated!',
            `Your argument scored: ${evaluation.totalScore}/60\n\n` +
            `Clarity: ${evaluation.clarity}/10\n` +
            `Relevance: ${evaluation.relevance}/10\n` +
            `Logic: ${evaluation.logic}/10\n` +
            `Evidence: ${evaluation.evidence}/10\n` +
            `Persuasiveness: ${evaluation.persuasiveness}/10\n` +
            `Rebuttal: ${evaluation.rebuttal}/10\n\n` +
            `Feedback: ${evaluation.feedback}`,
            [{ text: 'OK' }]
          );

          // Update message with evaluation score
          const updatedMessageData = {
            ...messageData,
            evaluationId: evaluation.evaluationId,
            evaluationScore: evaluation.totalScore
          };

          // Re-emit with evaluation data
          socketRef.current.emit('update_message_evaluation', updatedMessageData);

          // Check if debate ended
          if (winner && winner.winner !== 'undecided') {
            setWinner(winner.winner);
            setDebateEnded(true);
          }
        }
      } catch (error) {
        console.error('Evaluation error:', error);
        // Continue without evaluation
      }

      setText('');
    }
  });
};

//   const handleMessage = async () => {
//       if (!text.trim() || !userStance) return;
//
//       try {
//         const response = await axios.post(SERVER_URL + "/evaluate", {
//           argument: text,
//           team: userStance.id // or userStance, depending on your data structure
//         });
//
//         if (response.data.success) {
//           // Store the detailed evaluation result
//           setMessageEvaluation(response.data.evaluation);
//           console.log("Evaluation received:", response.data.evaluation);
//
//           // Prepare and send the chat message via socket
//           const messageData = {
//             text: text,
//             sender: username,
//             userId: userId,
//             roomId: roomId,
//             // Optionally, you can attach a summary of the score to the message
//             evaluationScore: response.data.evaluation.totalScore
//           };
//           socketRef.current.emit('send_message', messageData);
//         }
//         setText(''); // Clear input
//       } catch (error) {
//         console.error("Evaluation error:", error);
//         Alert.alert("Error", "Could not evaluate argument. Sending without evaluation.");
//         // Fallback: send the message without an evaluation
//         const messageData = { /* ... */ };
//         socketRef.current.emit('send_message', messageData);
//         setText('');
//       }
//     };


const showWinnerModal = (winnerData) => {
  Alert.alert(
    '🏆 Debate Concluded!',
    `Winner: ${winnerData.winner.toUpperCase()}\n` +
    `Margin of Victory: ${winnerData.margin || 'N/A'}%\n\n` +
    `Final Scores:\n` +
    `👍 In Favor: ${debateScores.favor.average?.toFixed(1) || '0.0'} avg\n` +
    `👎 Against: ${debateScores.against.average?.toFixed(1) || '0.0'} avg\n` +
    `🤝 Neutral: ${debateScores.neutral.average?.toFixed(1) || '0.0'} avg\n\n` +
    `${winnerData.awards?.bestArgument ?
      `Best Argument: ${winnerData.awards.bestArgument.username} (${winnerData.awards.bestArgument.score}pts)` : ''}`,
    [
      { text: 'View Details', onPress: () => setShowScoreboard(true) },
      { text: 'Continue Chat' }
    ]
  );
};

const fetchScoreboard = useCallback(async () => {
  try {
    setLoadingScoreboard(true);
    console.log("Room ID for fetching scoreboard:", roomId);
    const response = await axios.get(`${SERVER_URL}/api/debate/${roomId}/scoreboard`);

    if (response.data.success) {
      setLeaderboard(response.data.leaderboard || []);
      if (response.data.standings) {
        setDebateScores(response.data.standings);
      }
      if (response.data.winner) {
        setWinner(response.data.winner);
      }
    }
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
  } finally {
    setLoadingScoreboard(false);
  }
}, [roomId]); // Add useCallback with dependency

const endDebate = async () => {
  Alert.alert(
    'End Debate',
    'Are you sure you want to end this debate? This will calculate the final winner.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Debate',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await axios.post(`${SERVER_URL}/api/debate/${roomId}/end`, {
              userId: userId
            });

            if (response.data.success) {
              Alert.alert('Success', 'Debate ended successfully');
            }
          } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to end debate');
          }
        }
      }
    ]
  );
};
  // Function to fetch user image by user ID
  const fetchUserImageById = async (targetUserId) => {
    if (!targetUserId) return null;

    try {
      const response = await fetch(`${SERVER_URL}/api/get_user_by_id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: targetUserId }),
      });

      const data = await response.json();
      if (data.success && data.user) {
        return data.user.user_image || '';
      }
    } catch (error) {
      console.error('Error fetching user image by ID:', error);
    }

    return null;
  };

  // Function to get user image from cache or fetch it
  const getUserImage = async (messageUserId, messageUsername) => {
    // Check cache first
    if (userImages[messageUserId]) {
      return userImages[messageUserId];
    }

    // If it's current user, use their image
    if (messageUserId === userId) {
      return userImage;
    }

    // Try to fetch from server
    try {
      const fetchedUserImage = await fetchUserImageById(messageUserId);
      if (fetchedUserImage) {
        setUserImages(prev => ({
          ...prev,
          [messageUserId]: fetchedUserImage
        }));
        return fetchedUserImage;
      }
    } catch (error) {
      console.error('Error fetching user image:', error);
    }

    // Return empty string if not found (not null)
    return '';
  };

  // Function to check if user has already selected a stance for this room
  const checkUserStance = async () => {
    if (!userId || !roomId) {
      setHasCheckedStance(true);
      return;
    }

    try {
      const response = await fetch('https://debatesphere-11.onrender.com/api/get_user_stance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          userId
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.stance) {
          setUserStance(result.stance);
          setShowStanceModal(false);
        } else {
          setShowStanceModal(true);
        }
      } else {
        console.error('Error checking stance:', result.error);
        setShowStanceModal(true);
      }
    } catch (error) {
      console.error('Stance check error:', error);
      setShowStanceModal(true);
    } finally {
      setHasCheckedStance(true);
    }
  };

  // Function to handle stance selection
  const handleStanceSelected = (stance) => {
    setUserStance(stance);
    setShowStanceModal(false);

    // Add user's own stance to room stances
    setRoomStances(prev => ({
      ...prev,
      [userId]: {
        userId,
        username,
        stance: stance.id,
        stanceLabel: stance.label,
        userImage: user?.user_image || ''
      }
    }));

    // Show confirmation
    Alert.alert(
      'Stance Selected!',
      `You are now debating: ${stance.label}`,
      [{ text: 'Continue' }]
    );
  };

  useEffect(() => {
    setIsConnecting(true);

    socketRef.current = io(SERVER_URL, {
      transports: ['websocket'],
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setIsConnecting(false);
      socketRef.current.emit('join_room', roomId);

      // Check user stance after connection
      checkUserStance();
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      setIsConnecting(false);
    });

    const generateMessageId = () => {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    socketRef.current.on('connect_error', (error) => {
      console.log('Connection error:', error);
      setIsConnecting(false);
      setIsConnected(false);
    });

    socketRef.current.on('receive_message', async (msg) => {
      console.log('Received message:', msg);

      const processMessage = async (message) => {
        const messageUserId = message.userId || message.senderId;

        // Use the image field from server (which should be same as userImage)
        let userImageToUse = message.image || message.userImage || '';

        // If still empty, try to fetch
        if (!userImageToUse && messageUserId) {
          userImageToUse = await getUserImage(messageUserId, message.sender);
        }

        return {
          ...message,
          id: message.id || generateMessageId(),
          isDeleted: message.isDeleted || false,
          userId: messageUserId,
          userImage: userImageToUse,
          // Ensure image field is also populated
          image: message.image || userImageToUse
        };
      };

      if (Array.isArray(msg)) {
        const messagesWithIds = await Promise.all(msg.map(processMessage));
        setMessages(messagesWithIds);
      } else {
        const messageWithId = await processMessage(msg);
        setMessages((prev) => {
          return [messageWithId, ...prev];
        });
      }
    });

    // Update previous_messages handler similarly
    socketRef.current.on('previous_messages', async (msgs) => {
      if (Array.isArray(msgs)) {
        const messagesWithIds = await Promise.all(
          msgs.reverse().map(async (msg) => {
            const messageUserId = msg.userId || msg.senderId;
            let userImageToUse = msg.image || msg.userImage || '';

            if (!userImageToUse && messageUserId) {
              userImageToUse = await getUserImage(messageUserId, msg.sender);
            }

            return {
              ...msg,
              id: msg.id || generateMessageId(),
              isDeleted: msg.isDeleted || false,
              userId: messageUserId,
              userImage: userImageToUse,
              image: msg.image || userImageToUse
            };
          })
        );

        setMessages(messagesWithIds);
      }
    });


    // Handle message deletion events
    socketRef.current.on('message_deleted', (deletedMessage) => {
      console.log('Message deleted:', deletedMessage);
      if (deletedMessage && deletedMessage.id) {
        setMessages(prev => prev.map(msg =>
          msg.id === deletedMessage.id
            ? {
                ...msg,
                text: 'This message was deleted',
                image: null,
                isDeleted: true
              }
            : msg
        ));
      }
    });

    // Handle user join/leave events to get user images
    socketRef.current.on('user_joined', async (userData) => {
      console.log('User joined:', userData);
      if (userData.userId && userData.userImage) {
        setUserImages(prev => ({
          ...prev,
          [userData.userId]: userData.userImage
        }));
      } else if (userData.userId) {
        const fetchedImage = await fetchUserImageById(userData.userId);
        if (fetchedImage) {
          setUserImages(prev => ({
            ...prev,
            [userData.userId]: fetchedImage
          }));
        }
      }
    });

    // Handle stance-related events
    socketRef.current.on('user_stance_selected', (data) => {
      setRoomStances(prev => ({
        ...prev,
        [data.userId]: data
      }));
    });

    socketRef.current.on('room_stances', (stances) => {
      setRoomStances(stances);
    });

    socketRef.current.onAny((eventName, ...args) => {
      console.log('Socket event:', eventName, args);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userId]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }, 100);
    }
  }, [messages]);

  const checkForAIContent = async (text) => {
    if (!text || text.length < 20) return null;
    const detection = await AIDetectionService.isLikelyAI(text, 0.65);
    return detection;
  };

  const sendMessage = async (imageData = null) => {
    if (!isConnected || isConnecting) return;
    if (!text.trim() && !imageData) return;

    // Check if user has selected a stance
    if (!userStance) {
      Alert.alert('Stance Required', 'Please select your debate stance before sending messages.');
      setShowStanceModal(true);
      return;
    }

    const messageText = text.trim();

    if (messageText && messageText.length > 20) {
      const aiDetection = await checkForAIContent(messageText);

      if (aiDetection && aiDetection.isAI) {
        setPendingMessage({
          text: messageText,
          image: imageData,
          aiDetection: aiDetection
        });
        setAiWarningVisible(true);
        return;
      }
    }

    proceedWithMessage(messageText, imageData);
  };

  const proceedWithMessage = (messageText, imageData, isAIDetected = false) => {
    const currentUserImage = user?.user_image || userImage || '';

    const messageData = {
      text: messageText,
      image: imageData,
      sender: username,
      userId: userId,
      userImage: currentUserImage,
      roomId,
      time: new Date().toISOString(),
      aiDetected: isAIDetected,
      aiConfidence: isAIDetected ? pendingMessage?.aiDetection?.confidence : 0,
      userStance: userStance // Include stance in message
    };

    console.log('Sending message with stance:', userStance);

    socketRef.current.emit('send_message', messageData, (ack) => {
      console.log('Server ACK:', ack);
      if (ack && ack.error) {
        Alert.alert('Error', 'Failed to send message');
      } else if (isAIDetected) {
        handleAIDetection();
      }
    });

    setText('');
    setPendingMessage(null);
  };

  const handleAIDetection = () => {
    setConsecutiveAIDetections(prev => {
      const newCount = prev + 1;

      if (newCount >= 3) {
        Alert.alert(
          'AI Content Warning',
          'Multiple AI-generated messages detected. Please use your own arguments to continue participating.',
          [{ text: 'OK' }]
        );

        if (newCount >= 5) {
          Alert.alert(
            'Restriction Applied',
            'You have been temporarily restricted from sending messages due to repeated AI content.',
            [{ text: 'OK' }]
          );
        }
      }

      return newCount;
    });
  };

  const handleAIConfirm = () => {
    if (pendingMessage) {
      proceedWithMessage(pendingMessage.text, pendingMessage.image, true);
    }
    setAiWarningVisible(false);
  };

  const handleAICancel = () => {
    setPendingMessage(null);
    setAiWarningVisible(false);
    if (pendingMessage?.text) {
      setText(pendingMessage.text);
    }
  };

  useEffect(() => {
    if (text && text.length > 0) {
      const lastDetection = consecutiveAIDetections;
      setTimeout(async () => {
        const detection = await checkForAIContent(text);
        if (!detection?.isAI && lastDetection === consecutiveAIDetections) {
          setConsecutiveAIDetections(0);
        }
      }, 1000);
    }
  }, [text]);

  const handleImageSelected = (base64Image) => {
    sendMessage(base64Image);
  };

  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Enter' && Platform.OS === 'web') {
      if (!nativeEvent.shiftKey) {
        nativeEvent.preventDefault();
        sendMessage();
      }
    }
  };

  const handleMessageLongPress = (message) => {
    if (message.isDeleted) return;

    setSelectedMessage(message);

    if (message.sender === username) {
      Alert.alert(
        'Message Options',
        'What would you like to do with this message?',
        [
          {
            text: 'Delete Message',
            style: 'destructive',
            onPress: () => showDeleteConfirmation(message),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      Alert.alert(
        'Message Options',
        `Message from ${message.sender}`,
        [
          {
            text: 'Report Message',
            style: 'destructive',
            onPress: () => reportMessage(message),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const showDeleteConfirmation = (message) => {
    setMessageToDelete(message);
    setDeleteModalVisible(true);
  };

  const deleteMessage = () => {
    if (!messageToDelete) return;

    console.log('Deleting message:', messageToDelete.id);

    socketRef.current.emit('delete_message', {
      messageId: messageToDelete.id,
      roomId: roomId,
      username: username,
      userId: userId
    }, (ack) => {
      console.log('Delete ACK:', ack);
      if (ack && ack.success) {
        setMessages(prev => prev.map(msg =>
          msg.id === messageToDelete.id
            ? { ...msg, text: 'This message was deleted', image: null, isDeleted: true }
            : msg
        ));

        Alert.alert('Success', 'Message deleted successfully');
      } else {
        Alert.alert('Error', ack?.error || 'Failed to delete message');
      }
    });

    setDeleteModalVisible(false);
    setMessageToDelete(null);
    setSelectedMessage(null);
  };

  const reportMessage = (message) => {
    Alert.alert(
      'Report Message',
      `Are you sure you want to report this message from ${message.sender}?`,
      [
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            console.log('Reporting message:', message.id);
            Alert.alert('Report Submitted', 'Thank you for your report. We will review this message.');
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
    setSelectedMessage(null);
  };

  const updateDebateSettings = async () => {
    try {
        console.log("Settings are " + debateSettings);
        console.log("User id at this moment is " + userId);
      const response = await axios.put(`${SERVER_URL}/api/debate/${roomId}/settings`, {
        userId: userId,
        settings: debateSettings
      });
    console.log("Debate settings are " + response.data);
      if (response.data.success) {
        Alert.alert('Success', 'Debate settings updated');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.userId === userId;
    const messageUserImage = item.userImage || userImages[item.userId] || '';
    const messageStance = item.userStance || roomStances[item.userId]?.stance;
    const textColor = getStanceTextColor(messageStance);
    const backgroundColor = getStanceBackgroundColor(messageStance);

    // If message has evaluation score, show badge - but make sure it's part of the same return
    const ScoreBadge = () => {
      if (item.evaluationScore && !item.isDeleted) {
        return (
          <View style={[
            styles.scoreBadge,
            {
              backgroundColor: item.evaluationScore > 40 ? '#10b981' :
                             item.evaluationScore > 30 ? '#f59e0b' : '#ef4444'
            }
          ]}>
            <Text style={styles.scoreBadgeText}>{item.evaluationScore} pts</Text>
          </View>
        );
      }
      return null;
    };

    return (
      <Animated.View
        style={[
          styles.msgContainer,
          isMyMessage && styles.myMsgContainer,
          { opacity: fadeAnim }
        ]}
      >
        {/* User Avatar for other users' messages */}
        {!isMyMessage && !item.isSystem && !item.isDeleted && (
          <View style={styles.userAvatarContainer}>
            <Image
              source={getUserImageSource(messageUserImage)}
              style={styles.userAvatar}
            />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.msgBox,
            isMyMessage ? styles.myMsg : styles.theirMsg,
            item.isSystem && styles.systemMsg,
            item.isDeleted && styles.deletedMsg,
            item.aiDetected && styles.aiDetectedMsg,
            !isMyMessage && !item.isSystem && !item.isDeleted && {
              backgroundColor: backgroundColor,
              borderLeftWidth: 4,
              borderLeftColor: stanceColors[messageStance]?.background || '#e2e8f0'
            },
          ]}
          onLongPress={() => handleMessageLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          {/* Score badge positioned absolutely */}
          <ScoreBadge />

          {/* User info for other users' messages */}
          {!item.isSystem && !isMyMessage && !item.isDeleted && (
            <View style={styles.msgUserInfo}>
              <View style={styles.userInfoRow}>
                <Text style={[
                  styles.msgUser,
                  { color: textColor }
                ]}>
                  {item.sender}
                </Text>
                {messageStance && (
                  <View style={[
                    styles.stanceBadge,
                    { backgroundColor: `${stanceColors[messageStance]?.background}20` }
                  ]}>
                    <Text style={[
                      styles.stanceBadgeText,
                      { color: stanceColors[messageStance]?.background }
                    ]}>
                      {stanceLabels[messageStance] || messageStance}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* My message stance indicator */}
          {isMyMessage && userStance && !item.isSystem && !item.isDeleted && (
            <View style={styles.myStanceIndicator}>
              <Text style={[
                styles.myStanceText,
                { color: stanceColors[userStance.id]?.text || stanceColors[userStance]?.text }
              ]}>
                Debating: {userStance.label || stanceLabels[userStance]}
              </Text>
            </View>
          )}

          {item.aiDetected && (
            <View style={styles.aiWarningBadge}>
              <Text style={styles.aiWarningText}>🤖 AI Detected</Text>
            </View>
          )}

          {item.isDeleted ? (
            <View style={styles.deletedContent}>
              <Text style={styles.deletedIcon}>🗑️</Text>
              <Text style={styles.deletedText}>
                This message was deleted
              </Text>
            </View>
          ) : (
            <>
              {item.text && (
                <Text
                  style={[
                    styles.msgText,
                    isMyMessage && styles.myMsgText,
                    item.isSystem && styles.systemMsgText,
                    !isMyMessage && !item.isSystem && { color: textColor }
                  ]}
                >
                  {item.text}
                </Text>
              )}
              {item.image && (
                <Image
                  source={{ uri: item.image }}
                  style={styles.msgImage}
                  resizeMode="cover"
                />
              )}
            </>
          )}

          <Text style={[
            styles.msgTime,
            isMyMessage && styles.myMsgTime,
            item.isDeleted && styles.deletedMsgTime,
            !isMyMessage && !item.isSystem && !item.isDeleted && { color: `${textColor}80` }
          ]}>
            {new Date(item.time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {item.isDeleted && ' • Deleted'}
          </Text>

          {/* Edit/Delete indicator for user's messages */}
          {isMyMessage && !item.isSystem && !item.isDeleted && (
            <View style={styles.messageOptionsIndicator}>
              <Text style={styles.optionsHint}>Long press for options</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* User Avatar for my messages (on the right) */}
        {isMyMessage && !item.isSystem && !item.isDeleted && (
          <View style={styles.userAvatarContainer}>
            <Image
              source={getUserImageSource(userImage)}
              style={styles.userAvatar}
            />
          </View>
        )}
      </Animated.View>
    );
  };
  if (!hasCheckedStance) {
    return (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.connectingText}>Loading debate room...</Text>
        </View>
      </View>
    );
  }

  const ScoreboardModal = ({ visible, onClose, scores, leaderboard, roomId, userId }) => {
    const [activeTab, setActiveTab] = useState('scores');

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        {loadingScoreboard && (
          <View style={scoreboardStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={scoreboardStyles.loadingText}>Loading scoreboard...</Text>
          </View>
        )}
        <View style={scoreboardStyles.modalOverlay}>
          <View style={scoreboardStyles.modalContent}>
            <View style={scoreboardStyles.header}>
              <Text style={scoreboardStyles.title}>🏆 Debate Scoreboard</Text>
              <TouchableOpacity onPress={onClose} style={scoreboardStyles.closeButton}>
                <Text style={scoreboardStyles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={scoreboardStyles.tabContainer}>
              <TouchableOpacity
                style={[scoreboardStyles.tab, activeTab === 'scores' && scoreboardStyles.activeTab]}
                onPress={() => setActiveTab('scores')}
              >
                <Text style={scoreboardStyles.tabText}>Team Scores</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[scoreboardStyles.tab, activeTab === 'leaderboard' && scoreboardStyles.activeTab]}
                onPress={() => setActiveTab('leaderboard')}
              >
                <Text style={scoreboardStyles.tabText}>Leaderboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[scoreboardStyles.tab, activeTab === 'settings' && scoreboardStyles.activeTab]}
                onPress={() => setActiveTab('settings')}
              >
                <Text style={scoreboardStyles.tabText}>Settings</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'scores' && (
              <ScrollView style={scoreboardStyles.content}>
                {['favor', 'against', 'neutral'].map((team) => (
                  <View key={team} style={[
                    scoreboardStyles.teamCard,
                    winner === team && scoreboardStyles.winningTeamCard
                  ]}>
                    <View style={scoreboardStyles.teamHeader}>
                      <Text style={scoreboardStyles.teamName}>
                        {team === 'favor' ? '👍 In Favor' :
                         team === 'against' ? '👎 Against' : '🤝 Neutral'}
                        {winner === team && ' 🏆'}
                      </Text>
                      <Text style={scoreboardStyles.teamScore}>
                        {scores[team]?.average?.toFixed(1) || '0.0'} avg
                      </Text>
                    </View>

                    <View style={scoreboardStyles.statsGrid}>
                      <View style={scoreboardStyles.statItem}>
                        <Text style={scoreboardStyles.statLabel}>Total Points</Text>
                        <Text style={scoreboardStyles.statValue}>{scores[team]?.total || 0}</Text>
                      </View>
                      <View style={scoreboardStyles.statItem}>
                        <Text style={scoreboardStyles.statLabel}>Arguments</Text>
                        <Text style={scoreboardStyles.statValue}>{scores[team]?.count || 0}</Text>
                      </View>
                      <View style={scoreboardStyles.statItem}>
                        <Text style={scoreboardStyles.statLabel}>Participants</Text>
                        <Text style={scoreboardStyles.statValue}>{scores[team]?.participants || 0}</Text>
                      </View>
                    </View>

                    {scores[team]?.count > 0 && (
                      <View style={scoreboardStyles.progressBar}>
                        <View
                          style={[
                            scoreboardStyles.progressFill,
                            {
                              width: `${Math.min(100, (scores[team].average / 10) * 100)}%`,
                              backgroundColor: team === 'favor' ? '#10b981' :
                                             team === 'against' ? '#ef4444' : '#6b7280'
                            }
                          ]}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}

            {activeTab === 'leaderboard' && (
              <ScrollView style={scoreboardStyles.content}>
                {leaderboard.length > 0 ? (
                  leaderboard.map((player, index) => (
                    <View key={index} style={scoreboardStyles.leaderboardRow}>
                      <Text style={scoreboardStyles.rank}>#{index + 1}</Text>
                      <View style={scoreboardStyles.playerInfo}>
                        <Text style={scoreboardStyles.playerName}>{player.username}</Text>
                        <View style={scoreboardStyles.playerDetails}>
                          <Text style={scoreboardStyles.playerTeam}>
                            {player.team === 'favor' ? '👍' :
                             player.team === 'against' ? '👎' : '🤝'}
                          </Text>
                          <Text style={scoreboardStyles.playerStats}>
                            {player.argumentCount} args • {player.averageScore.toFixed(1)} avg
                          </Text>
                        </View>
                      </View>
                      <Text style={scoreboardStyles.playerScore}>{player.totalScore}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={scoreboardStyles.emptyText}>No leaderboard data yet</Text>
                )}
              </ScrollView>
            )}

            {activeTab === 'settings' && (
              <ScrollView style={scoreboardStyles.content}>
                <Text style={scoreboardStyles.sectionTitle}>Debate Settings</Text>

                <View style={scoreboardStyles.settingItem}>
                  <Text style={scoreboardStyles.settingLabel}>Max Duration (minutes)</Text>
                  <TextInput
                    style={scoreboardStyles.settingInput}
                    value={debateSettings.maxDuration.toString()}
                    onChangeText={(text) => setDebateSettings({
                      ...debateSettings,
                      maxDuration: parseInt(text) || 30
                    })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={scoreboardStyles.settingItem}>
                  <Text style={scoreboardStyles.settingLabel}>Max Arguments</Text>
                  <TextInput
                    style={scoreboardStyles.settingInput}
                    value={debateSettings.maxArguments.toString()}
                    onChangeText={(text) => setDebateSettings({
                      ...debateSettings,
                      maxArguments: parseInt(text) || 50
                    })}
                    keyboardType="numeric"
                  />
                </View>

                <View style={scoreboardStyles.settingItem}>
                  <Text style={scoreboardStyles.settingLabel}>Win Margin Threshold (%)</Text>
                  <TextInput
                    style={scoreboardStyles.settingInput}
                    value={debateSettings.winMarginThreshold.toString()}
                    onChangeText={(text) => setDebateSettings({
                      ...debateSettings,
                      winMarginThreshold: parseInt(text) || 10
                    })}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={scoreboardStyles.saveButton}
                  onPress={() => updateDebateSettings()}
                >
                  <Text style={scoreboardStyles.saveButtonText}>Save Settings</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <TouchableOpacity
              style={scoreboardStyles.endDebateButton}
              onPress={endDebate}
            >
              <Text style={scoreboardStyles.endDebateButtonText}>End Debate Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#667eea" />

      {/* Stance Selection Modal */}
      <StanceSelectionModal
        visible={showStanceModal}
        onStanceSelected={handleStanceSelected}
        roomId={roomId}
        userId={userId}
        username={username}
      />

      {/* AI Content Warning Modal */}
      <AIContentWarning
        message={pendingMessage}
        visible={aiWarningVisible}
        onConfirm={handleAIConfirm}
        onCancel={handleAICancel}
      />

      {/* Header */}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.roomInfo}>
            <Text style={styles.headerTitle}>
              {title || 'Untitled Debate'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {desc || 'No description available'}
            </Text>
          </View>
          <View style={styles.userBadge}>
            <Image
              source={getUserImageSource(userImage)}
              style={styles.userBadgeImage}
            />
          </View>
        </View>

        <View style={styles.connectionIndicator}>
          <View style={[
            styles.connectionDot,
            isConnected ? styles.connectedDot : styles.disconnectedDot
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
          </Text>
        </View>

        {/* User Stance Indicator */}
        {userStance && (
          <View style={[
            styles.userStanceIndicator,
            {
              backgroundColor: `${stanceColors[userStance.id]?.background || stanceColors[userStance]?.background}20`,
              borderLeftWidth: 4,
              borderLeftColor: stanceColors[userStance.id]?.background || stanceColors[userStance]?.background
            }
          ]}>
            <Text style={[
              styles.userStanceText,
              { color: stanceColors[userStance.id]?.text || stanceColors[userStance]?.text }
            ]}>
              Your Stance: {userStance.label || stanceLabels[userStance]}
            </Text>
          </View>
        )}

        {/* AI Usage Indicator - REMOVE THE SCOREBOARD BUTTON FROM HERE */}
        {consecutiveAIDetections > 0 && (
          <View style={styles.aiUsageIndicator}>
            <Text style={styles.aiUsageText}>
              AI Usage: {consecutiveAIDetections}/3 warnings
            </Text>
          </View>
        )}
      </View>

      {/* Connection Status Banner */}
      {!isConnected && !isConnecting && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionBannerText}>
            🔴 Connection lost - Reconnecting...
          </Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.connectingText}>Connecting to debate...</Text>
          </View>
        </View>
      )}
    <View style={styles.rightSideButtons}>
                              {/* Scorecard Button */}

                              <TouchableOpacity
                                style={styles.floatingScoreButton}
                                onPress={() => {

                                  if (!showScoreboard) {
                                    fetchScoreboard();
                                    setShowScoreboard(true);
                                  }
                                }}
                                activeOpacity={0.7}
                                disabled={showScoreboard}
                              >
                                <View style={styles.scoreButtonContent}>
                                  <Text style={styles.scoreButtonIcon}>📊</Text>
                                  <Text style={styles.scoreButtonText}>Scores</Text>
                                </View>
                              </TouchableOpacity>
                              </View>
      {/* Messages */}
      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item, index) =>
            item.id?.toString() || `${item.time}-${item.userId}-${index}`
          }
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                {isConnected
                  ? 'Be the first to start the debate!'
                  : 'Connecting to chat room...'
                }
              </Text>
            </View>
          }
          onScrollToIndexFailed={(error) => {
            flatListRef.current?.scrollToOffset({
              offset: 0,
              animated: true,
            });
          }}
        />
      </View>
        <ScoreboardModal
              visible={showScoreboard}
              onClose={() => setShowScoreboard(false)}
              scores={debateScores}
              leaderboard={leaderboard}
              roomId={roomId}
              userId={userId}
            />
      {/* Input Area */}
      <View style={[styles.inputContainer, isConnecting && styles.inputContainerDisabled]}>
        <View style={styles.inputRow}>
          <ImageUploader
            onImageSelected={handleImageSelected}
            disabled={!isConnected || isConnecting || !userStance}
          />
          <TextInput
            style={[
              styles.input,
              (!isConnected || isConnecting || !userStance) && styles.inputDisabled,
            ]}
            placeholder={
              !userStance ? 'Select your stance to chat...' :
              isConnecting ? 'Connecting...' :
              isConnected ? 'Type your argument...' : 'Disconnected'
            }
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            onKeyPress={handleKeyPress}
            editable={isConnected && !isConnecting && !!userStance}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!text.trim() || !isConnected || isConnecting || !userStance) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage()}
            disabled={!text.trim() || !isConnected || isConnecting || !userStance}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.charCount}>
          {text.length}/500
        </Text>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Message</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this message? This action cannot be undone.
            </Text>

            {messageToDelete && (
              <View style={styles.messagePreview}>
                <Text style={styles.previewText} numberOfLines={3}>
                  {messageToDelete.text}
                </Text>
                {messageToDelete.image && (
                  <Text style={styles.previewImageText}>📷 Image attached</Text>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={deleteMessage}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const scoreboardStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#667eea',
  },
  content: {
    maxHeight: 400,
  },
  teamCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  winningTeamCard: {
    borderColor: '#f59e0b',
    borderWidth: 2,
    backgroundColor: '#fffbeb',
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  teamScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748b',
    width: 40,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  playerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerTeam: {
    fontSize: 14,
    marginRight: 8,
  },
  playerStats: {
    fontSize: 12,
    color: '#64748b',
  },
  playerScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 16,
    padding: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 20,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '500',
  },
  settingInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  saveButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  endDebateButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  endDebateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomInfo: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  userBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userBadgeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectedDot: {
    backgroundColor: '#4ade80',
  },
  disconnectedDot: {
    backgroundColor: '#f87171',
  },
  connectionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  userStanceIndicator: {
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderLeftWidth: 4,
  },
  userStanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  connectionBanner: {
    backgroundColor: '#fef2f2',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  connectionBannerText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    zIndex: 10,
  },
  loadingContent: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  connectingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  msgContainer: {
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMsgContainer: {
    justifyContent: 'flex-end',
  },
  userAvatarContainer: {
    width: 32,
    height: 32,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  msgBox: {
    padding: 16,
    borderRadius: 20,
    maxWidth: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  myMsg: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  theirMsg: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  systemMsg: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
    maxWidth: '90%',
    shadowOpacity: 0,
    elevation: 0,
  },
  deletedMsg: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.7,
  },
  aiDetectedMsg: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  msgUserInfo: {
    marginBottom: 6,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  msgUser: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  stanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  stanceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  myStanceIndicator: {
    marginBottom: 8,
  },
  myStanceText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  msgText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 22,
  },
  myMsgText: {
    color: '#fff',
  },
  systemMsgText: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 14,
  },
  deletedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  deletedText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  msgImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginTop: 8,
  },
  msgTime: {
    fontSize: 11,
    color: 'rgba(100, 116, 139, 0.7)',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  myMsgTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  deletedMsgTime: {
    color: '#94a3b8',
  },
  messageOptionsIndicator: {
    marginTop: 4,
  },
  optionsHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  aiWarningBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  aiWarningText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '600',
  },
  aiUsageIndicator: {
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
    marginTop: 8,
  },
  aiUsageText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  inputContainerDisabled: {
    opacity: 0.6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  uploaderContainer: {
    marginRight: 12,
  },
  uploadBtn: {
    backgroundColor: '#c7d2fe',
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxHeight: 100,
    backgroundColor: '#f8fafc',
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  sendBtn: {
    backgroundColor: '#667eea',
    marginLeft: 12,
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 2,
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 6,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  messagePreview: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  previewImageText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scoreboardButton: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      backgroundColor: '#667eea',
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 100,
    },
    scoreboardButtonText: {
      fontSize: 24,
      color: 'white',
    },
    messageWithScore: {
      position: 'relative',
    },
    scoreBadge: {
      position: 'absolute',
      top: -8,
      right: -8,
      backgroundColor: '#10b981',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 50,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    scoreBadgeText: {
      color: 'white',
      fontSize: 11,
      fontWeight: 'bold',
    },
    rightSideButtons: {
        position: 'absolute',
        right: 16,
        top: Platform.OS === 'ios' ? 100 : 80, // Adjust based on header height
        zIndex: 1000,
        alignItems: 'flex-end',
      },

      // Floating Score Button
      floatingScoreButton: {
        backgroundColor: '#667eea',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        minWidth: 80,
      },

      scoreButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      },

      scoreButtonIcon: {
        fontSize: 20,
        marginRight: 8,
      },

      scoreButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
      },

      // Timer Button
      timerButton: {
        backgroundColor: '#f59e0b',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
      },

      timerIcon: {
        fontSize: 24,
      },

      // Live Score Indicator (Optional)
      liveScoreIndicator: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 12,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        minWidth: 120,
      },

      liveScoreTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
        textAlign: 'center',
      },

      liveScoreTeams: {
        flexDirection: 'row',
        justifyContent: 'space-between',
      },

      liveScoreTeam: {
        alignItems: 'center',
        flex: 1,
      },

      liveScoreTeamIcon: {
        fontSize: 16,
        marginBottom: 4,
      },

      liveScoreTeamScore: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
      },

      // Updated messages container to accommodate floating buttons
      messagesContainer: {
        flex: 1,
        paddingHorizontal: 16,
        marginTop: 0, // Remove any top margin
      },

      // Make sure floating buttons don't overlap with messages
      emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
        paddingHorizontal: 20, // Add horizontal padding
      },
      loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
      },
      loadingText: {
        marginTop: 12,
        color: '#64748b',
        fontSize: 14,
      },
});