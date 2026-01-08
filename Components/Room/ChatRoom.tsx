import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  ScrollView,
  ToastAndroid
} from 'react-native';
import io from 'socket.io-client';
import { useUser } from "../../Contexts/UserContext";
import { useRoute } from '@react-navigation/native';
import AIDetectionService from '../services/AIDetectionService';
import AIContentWarning from '../warning/AIContentWarning';
import { useNavigation } from '@react-navigation/native';
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
      onRequestClose={() => {}}
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

// Scoreboard Modal Component
const ScoreboardModal = ({
  visible,
  onClose,
  scores,
  leaderboard,
  roomId,
  userId,
  winner,
  debateStatus,
  canEndDebate,
  endDebate,
  loadingScoreboard,
  fetchScoreboard,
  debateSettings,
  setDebateSettings,
  updateDebateSettings
}) => {
  const [activeTab, setActiveTab] = useState('scores');

  if (loadingScoreboard) {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={scoreboardStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={scoreboardStyles.loadingText}>Loading scoreboard...</Text>
        </View>
      </Modal>
    );
  }

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
            <Text style={scoreboardStyles.title}>
              {debateStatus === 'ended' ? '🏆 Debate Results' : '📊 Debate Scoreboard'}
            </Text>
            <View style={scoreboardStyles.headerButtons}>
              <TouchableOpacity
                style={scoreboardStyles.refreshButton}
                onPress={fetchScoreboard}
                disabled={loadingScoreboard}
              >
                {loadingScoreboard ? (
                  <ActivityIndicator size="small" color="#667eea" />
                ) : (
                  <Text style={scoreboardStyles.refreshButtonText}>🔄</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={scoreboardStyles.closeButton}>
                <Text style={scoreboardStyles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={scoreboardStyles.statusBanner}>
            <Text style={[
              scoreboardStyles.statusText,
              debateStatus === 'ended' ? scoreboardStyles.statusEnded : scoreboardStyles.statusActive
            ]}>
              {debateStatus === 'ended' ? '🏁 DEBATE ENDED' : '⚡ DEBATE ACTIVE'}
            </Text>
            {winner && winner !== 'undecided' && (
              <Text style={scoreboardStyles.winnerText}>Winner: {winner}</Text>
            )}
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
                <Text style={scoreboardStyles.settingLabel}>Minimum Arguments per Team</Text>
                <TextInput
                  style={scoreboardStyles.settingInput}
                  value={debateSettings.minArgumentsPerTeam.toString()}
                  onChangeText={(text) => setDebateSettings({
                    ...debateSettings,
                    minArgumentsPerTeam: parseInt(text) || 3
                  })}
                  keyboardType="numeric"
                />
                <Text style={scoreboardStyles.settingDescription}>
                  Minimum arguments required from each team to declare a winner
                </Text>
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
                <Text style={scoreboardStyles.settingDescription}>
                  Minimum percentage difference needed to declare a clear winner
                </Text>
              </View>

              <TouchableOpacity
                style={scoreboardStyles.saveButton}
                onPress={updateDebateSettings}
              >
                <Text style={scoreboardStyles.saveButtonText}>Save Settings</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {debateStatus !== 'ended' && (
            <TouchableOpacity
              style={[
                scoreboardStyles.endDebateButton,
                !canEndDebate.canEnd && scoreboardStyles.endDebateButtonDisabled
              ]}
              onPress={endDebate}
              disabled={!canEndDebate.canEnd}
            >
              <Text style={scoreboardStyles.endDebateButtonText}>
                {canEndDebate.canEnd ? 'End Debate Now' : canEndDebate.reason}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Main ChatRoom Component
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
  const [consecutiveAIDetections, setConsecutiveAIDetections] = useState(0);
  const [userImages, setUserImages] = useState({});
  const [messageEvaluation, setMessageEvaluation] = useState(null);

  // Stance-related state
  const [showStanceModal, setShowStanceModal] = useState(false);
  const [userStance, setUserStance] = useState(null);
  const [hasCheckedStance, setHasCheckedStance] = useState(false);
  const [roomStances, setRoomStances] = useState({});

  // Debate management state
  const [debateScores, setDebateScores] = useState({
    favor: { total: 0, count: 0, average: 0, participants: 0 },
    against: { total: 0, count: 0, average: 0, participants: 0 },
    neutral: { total: 0, count: 0, average: 0, participants: 0 }
  });
  const [canSendMessages, setCanSendMessages] = useState(true);
  const [debateStatus, setDebateStatus] = useState('active'); // 'active' or 'ended'
  const [winner, setWinner] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingScoreboard, setLoadingScoreboard] = useState(false);
  const [debateSettings, setDebateSettings] = useState({
    minArgumentsPerTeam: 3,
    winMarginThreshold: 10
  });
  const [canEndDebate, setCanEndDebate] = useState({
    canEnd: false,
    reason: 'Checking requirements...'
  });

  const { roomId, title, desc } = route.params;
  const { user } = useUser();
  const username = user?.username || 'Guest';
  const userId = user?.id || '';
  const userImage = user?.user_image || '';
  const navigation = useNavigation();

  // Animation values
//   const fadeAnim = useRef(new Animated.Value(0)).current;

  // Stance color and label mapping
  const stanceColors = {
    against: {
      background: '#ef4444',
      text: '#ff6b35',
      light: '#fef2f2'
    },
    favor: {
      background: '#10b981',
      text: '#8b5cf6',
      light: '#f0fdf4'
    },
    neutral: {
      background: '#6b7280',
      text: '#4b5563',
      light: '#f9fafb'
    }
  };

  const stanceLabels = {
    against: 'Against',
    favor: 'In Favor',
    neutral: 'Neutral'
  };

  // Function to get user image source
  const getUserImageSource = (userImage) => {
    if (!userImage) {
      return defaultImages[0].source;
    }
    const defaultImage = defaultImages.find(img => img.id === userImage);
    if (defaultImage) {
      return defaultImage.source;
    }
    return defaultImages[0].source;
  };

  // Check debate endability
  const checkDebateEndability = useCallback(async () => {
    try {
      const response = await axios.post(`${SERVER_URL}/api/debate/${roomId}/can-end`, {
        userId
      });

      if (response.data.success) {
        setCanEndDebate({
          canEnd: response.data.canEnd,
          reason: response.data.reason,
          teamStats: response.data.teamStats,
          totalArguments: response.data.totalArguments
        });
      }
    } catch (error) {
      console.error('Error checking debate endability:', error);
      setCanEndDebate({
        canEnd: false,
        reason: 'Error checking requirements'
      });
    }
  }, [roomId, userId]);

  // End debate function
  const endDebate = useCallback(async () => {
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
                userId: userId,
                reason: 'User requested end'
              });

              if (response.data.success) {
                setDebateStatus('ended');
                setCanSendMessages(false);
                setWinner(response.data.winner || 'undecided');

                if (response.data.stats) {
                  setDebateScores(response.data.stats);
                }

                fetchScoreboard();

                Alert.alert(
                  'Success!',
                  `Debate ended successfully!\nWinner: ${(response.data.winner || 'undecided').toUpperCase()}`,
                  [
                    {
                      text: 'View Results',
                      onPress: () => {
                        navigation.navigate('DebateResults', {
                          roomId,
                          winner: response.data.winner || 'undecided',
                          scores: response.data.stats || debateScores,
                          leaderboard: leaderboard,
                          title: title,
                          desc: desc
                        });
                      }
                    },
                    {
                      text: 'Stay in Room',
                      style: 'cancel'
                    }
                  ]
                );
              } else {
                Alert.alert('Error', response.data.error || 'Failed to end debate');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to end debate');
            }
          }
        }
      ]
    );
  }, [roomId, userId, navigation, title, desc, debateScores, leaderboard, fetchScoreboard]);

  // Update debate settings
  const updateDebateSettings = async () => {
    try {
      const response = await axios.put(`${SERVER_URL}/api/debate/${roomId}/settings`, {
        userId: userId,
        settings: debateSettings
      });

      if (response.data.success) {
        Alert.alert('Success', 'Debate settings updated');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  // Fetch scoreboard data
  const fetchScoreboard = useCallback(async () => {
    try {
      setLoadingScoreboard(true);
      const response = await axios.get(`${SERVER_URL}/api/debate/${roomId}/scoreboard`);

      if (response.data.success) {
        setLeaderboard(response.data.leaderboard || []);

        if (response.data.standings) {
          setDebateScores(response.data.standings);
        }

        if (response.data.status === 'ended') {
          setDebateStatus('ended');
          setCanSendMessages(false);
        }

        if (response.data.winner && response.data.winner !== 'undecided') {
          setWinner(response.data.winner);
        }
      }
    } catch (error) {
      console.error('Error fetching scoreboard:', error);
      setLeaderboard([]);
    } finally {
      setLoadingScoreboard(false);
    }
  }, [roomId]);

  // Check debate status
  const checkDebateStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/api/debate/${roomId}/status`);

      if (response.data.success) {
        setDebateStatus(response.data.status);

        if (response.data.status === 'ended') {
          setCanSendMessages(false);
          setWinner(response.data.winner);
        }

        // Update canEndDebate state
        setCanEndDebate({
          canEnd: response.data.canEnd,
          reason: response.data.requirements ?
            `Need ${response.data.requirements.minTeams} teams with ${response.data.requirements.minArgumentsPerTeam} arguments each` :
            'Checking requirements...'
        });
      }
    } catch (error) {
      console.error('Error checking debate status:', error);
    }
  }, [roomId]);

  // Handle debate ended event
  const handleDebateEnded = useCallback((data) => {
    console.log('🏆 DEBATE ENDED EVENT RECEIVED:', data);

    if (data.roomId === roomId) {
      setDebateStatus('ended');
      setCanSendMessages(false);
      setWinner(data.winner || 'undecided');

      if (data.stats) {
        setDebateScores(data.stats);
      }

      fetchScoreboard();

      Alert.alert(
        '🏆 Debate Concluded!',
        `The debate has ended.\nWinner: ${(data.winner || 'undecided').toUpperCase()}`,
        [
          {
            text: 'View Results',
            onPress: () => {
              navigation.navigate('DebateResults', {
                roomId,
                winner: data.winner || 'undecided',
                scores: data.stats || debateScores,
                leaderboard: leaderboard,
                title: title,
                desc: desc
              });
            }
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    }
  }, [roomId, navigation, title, desc, fetchScoreboard]);

  // Check user stance
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

  // Handle stance selection
  const handleStanceSelected = (stance) => {
    setUserStance(stance);
    setShowStanceModal(false);

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

    Alert.alert(
      'Stance Selected!',
      `You are now debating: ${stance.label}`,
      [{ text: 'Continue' }]
    );
  };

  // Socket connection and event handlers
  useEffect(() => {
    setIsConnecting(true);

    socketRef.current = io(SERVER_URL, {
      transports: ['websocket'],
      timeout: 30000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      autoConnect: true,
      forceNew: false,
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setIsConnecting(false);
      socketRef.current.emit('join_room', roomId);

      // Initial checks
      checkUserStance();
      fetchScoreboard();
      checkDebateStatus();
      checkDebateEndability();
    });

    // Socket event handlers
    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      setIsConnecting(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('Connection error:', error);
      setIsConnecting(false);
      setIsConnected(false);
    });

    socketRef.current.on('receive_message', async (msg) => {
      // Handle incoming messages
      const processMessage = async (message) => {
        const messageUserId = message.userId || message.senderId;
        let userImageToUse = message.image || message.userImage || '';

        return {
          ...message,
          id: message.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isDeleted: message.isDeleted || false,
          userId: messageUserId,
          userImage: userImageToUse,
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

    socketRef.current.on('previous_messages', async (msgs) => {
      if (Array.isArray(msgs)) {
        const messagesWithIds = await Promise.all(
          msgs.reverse().map(async (msg) => {
            const messageUserId = msg.userId || msg.senderId;
            let userImageToUse = msg.image || msg.userImage || '';

            return {
              ...msg,
              id: msg.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    socketRef.current.on('message_deleted', (deletedMessage) => {
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

    socketRef.current.on('user_stance_selected', (data) => {
      setRoomStances(prev => ({
        ...prev,
        [data.userId]: data
      }));
    });

    socketRef.current.on('score_updated', (data) => {
      if (data.roomId === roomId) {
        setDebateScores(data.teamScores);
        checkDebateEndability();
      }
    });

    socketRef.current.on('debate_ended', handleDebateEnded);

    socketRef.current.on('argument_evaluated', (data) => {
      if (data.roomId === roomId && data.userId !== userId) {
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            `${data.username}'s argument scored ${data.totalScore} points`,
            ToastAndroid.SHORT
          );
        }
        checkDebateEndability();
      }
    });

    socketRef.current.on('scoreboard_updated', (data) => {
      if (data.roomId === roomId) {
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
        if (data.standings) {
          setDebateScores(data.standings);
        }
        if (data.winner) {
          setWinner(data.winner);
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userId, handleDebateEnded]);

  // Check for AI content
  const checkForAIContent = async (text) => {
    if (!text || text.length < 20) return null;
    const detection = await AIDetectionService.isLikelyAI(text, 0.65);
    return detection;
  };

  // Send message function
  const sendMessage = async (imageData = null) => {
    if (!canSendMessages) {
      Alert.alert('Debate Ended', 'This debate has ended. You can no longer send messages.');
      return;
    }

    if (!isConnected || isConnecting) return;
    if (!text.trim() && !imageData) return;

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

  const proceedWithMessage = async (messageText, imageData, isAIDetected = false) => {
    if (!socketRef.current || !socketRef.current.connected) {
      Alert.alert('Connection Lost', 'Please reconnect to the server');
      return;
    }

    const currentUserImage = user?.user_image || userImage || '';
    const cleanedText = messageText
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .replace(/\s+$/gm, '')
      .replace(/\n{3,}/g, '\n\n');

    const messageData = {
      text: cleanedText,
      image: imageData,
      sender: username,
      userId: userId,
      userImage: currentUserImage,
      roomId,
      time: new Date().toISOString(),
      aiDetected: isAIDetected,
      aiConfidence: isAIDetected ? pendingMessage?.aiDetection?.confidence : 0,
      userStance: userStance
    };

    try {
      if (!socketRef.current) {
        throw new Error('Socket not initialized');
      }

      socketRef.current.emit('send_message', messageData, async (ack) => {
        if (!ack || ack.status !== "ok") {
          Alert.alert('Error', 'Failed to send message');
          return;
        }

        // Evaluate the argument
        const actualMessageId = ack.id;
        try {
          const evalResponse = await axios.post(`${SERVER_URL}/evaluate`, {
            argument: cleanedText,
            team: (userStance.id || userStance).toLowerCase(),
            roomId: roomId,
            userId: userId,
            username: username,
            messageId: actualMessageId
          });

          if (evalResponse.data.success) {
            const { evaluation, currentStandings } = evalResponse.data;

            if (currentStandings) {
              setDebateScores(currentStandings);
            }

            fetchScoreboard();
            checkDebateEndability();

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
          }
        } catch (error) {
          console.error('Evaluation error:', error);
        }

        setText('');
      });
    } catch (error) {
      console.error('Socket emit error:', error);
      Alert.alert('Connection Error', 'Failed to send message. Please check your connection.');
    }
  };

  // Handle AI detection
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
      handleAIDetection();
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

  // Render message item
  const renderMessage = ({ item }) => {
    const isMyMessage = item.userId === userId;
    const messageUserImage = item.userImage || userImages[item.userId] || '';
    const messageStance = item.userStance || roomStances[item.userId]?.stance;
    const shouldShowAvatar = !isMyMessage && !item.isSystem && !item.isDeleted && messageUserImage;

    const textColor = messageStance ? stanceColors[messageStance]?.text || '#1e293b' : '#1e293b';
    const backgroundColor = messageStance ? stanceColors[messageStance]?.light || '#f8fafc' : '#f8fafc';

    const messageText = item.text || '';
    const hasContent = messageText.trim().length > 0;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => handleMessageLongPress(item)}
        delayLongPress={500}
        disabled={item.isSystem || item.isDeleted}
      >
        <View style={[
          styles.messageRow,
          isMyMessage ? styles.myMessageRow : styles.theirMessageRow
        ]}>
          {!isMyMessage && shouldShowAvatar && (
            <View style={styles.avatarWrapper}>
              <Image
                source={getUserImageSource(messageUserImage)}
                style={styles.avatar}
              />
            </View>
          )}

          <View style={[
            styles.bubbleWrapper,
            isMyMessage && styles.myBubbleWrapper
          ]}>
            <View style={[
              styles.messageBubble,
              isMyMessage ? styles.myBubble : styles.theirBubble,
              item.isDeleted && styles.deletedBubble,
              !isMyMessage && !item.isSystem && !item.isDeleted && {
                backgroundColor: backgroundColor,
                borderLeftWidth: 4,
                borderLeftColor: stanceColors[messageStance]?.background || '#e2e8f0'
              },
            ]}>
              {!isMyMessage && !item.isSystem && !item.isDeleted && (
                <View style={styles.userInfo}>
                  <Text style={[styles.username, { color: textColor }]}>
                    {item.sender}
                  </Text>
                  {messageStance && (
                    <View style={[
                      styles.stanceTag,
                      { backgroundColor: `${stanceColors[messageStance]?.background}20` }
                    ]}>
                      <Text style={[
                        styles.stanceTagText,
                        { color: stanceColors[messageStance]?.background }
                      ]}>
                        {stanceLabels[messageStance] || messageStance}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {isMyMessage && userStance && !item.isSystem && !item.isDeleted && (
                <View style={styles.myStance}>
                  <Text style={[
                    styles.myStanceText,
                    { color: stanceColors[userStance.id]?.text || stanceColors[userStance]?.text }
                  ]}>
                    Debating: {userStance.label || stanceLabels[userStance]}
                  </Text>
                </View>
              )}

              {item.aiDetected && !item.isDeleted && (
                <View style={styles.aiTag}>
                  <Text style={styles.aiTagText}>🤖 AI Detected</Text>
                </View>
              )}

              {item.evaluationScore && !item.isDeleted && (
                <View style={[
                  styles.scoreBadge,
                  {
                    backgroundColor: item.evaluationScore > 40 ? '#10b981' :
                                   item.evaluationScore > 30 ? '#f59e0b' : '#ef4444'
                  }
                ]}>
                  <Text style={styles.scoreBadgeText}>{item.evaluationScore} pts</Text>
                </View>
              )}

              {item.isDeleted ? (
                <View style={styles.deletedWrapper}>
                  <Text style={styles.deletedIcon}>🗑️</Text>
                  <Text style={styles.deletedText}>This message was deleted</Text>
                </View>
              ) : hasContent ? (
                <View style={styles.contentWrapper}>
                  <Text style={[
                    styles.messageText,
                    isMyMessage && styles.myMessageText,
                    item.isSystem && styles.systemText,
                    !isMyMessage && !item.isSystem && { color: textColor }
                  ]}>
                    {messageText}
                  </Text>
                </View>
              ) : null}

              <Text style={[
                styles.timestamp,
                isMyMessage && styles.myTimestamp,
                item.isDeleted && styles.deletedTimestamp
              ]}>
                {new Date(item.time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          {isMyMessage && !item.isSystem && !item.isDeleted && (
            <View style={styles.avatarWrapper}>
              <Image
                source={getUserImageSource(userImage)}
                style={styles.avatar}
              />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Handle message long press
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

    socketRef.current.emit('delete_message', {
      messageId: messageToDelete.id,
      roomId: roomId,
      username: username,
      userId: userId
    }, (ack) => {
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

  // Loading state
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

      {/* Scoreboard Modal */}
      <ScoreboardModal
        visible={showScoreboard}
        onClose={() => setShowScoreboard(false)}
        scores={debateScores}
        leaderboard={leaderboard}
        roomId={roomId}
        userId={userId}
        winner={winner}
        debateStatus={debateStatus}
        canEndDebate={canEndDebate}
        endDebate={endDebate}
        loadingScoreboard={loadingScoreboard}
        fetchScoreboard={fetchScoreboard}
        debateSettings={debateSettings}
        setDebateSettings={setDebateSettings}
        updateDebateSettings={updateDebateSettings}
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

        {/* Debate Status Indicator */}
        <View style={[
          styles.debateStatusIndicator,
          debateStatus === 'ended' ? styles.debateStatusEnded : styles.debateStatusActive
        ]}>
          <Text style={styles.debateStatusText}>
            {debateStatus === 'ended' ? '🏁 DEBATE ENDED' : '⚡ DEBATE ACTIVE'}
          </Text>
          {winner && winner !== 'undecided' && debateStatus === 'ended' && (
            <Text style={styles.winnerText}>Winner: {winner}</Text>
          )}
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

        {/* Debate Requirements Status */}
        {debateStatus === 'active' && (
          <View style={styles.requirementsIndicator}>
            <Text style={styles.requirementsText}>
              {canEndDebate.canEnd ? '✅ Ready to end debate' : `⏳ ${canEndDebate.reason}`}
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

      {/* Floating Score Button */}
      <View style={styles.rightSideButtons}>
        <TouchableOpacity
          style={styles.floatingScoreButton}
          onPress={() => {
            fetchScoreboard();
            setShowScoreboard(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.scoreButtonContent}>
            <Text style={styles.scoreButtonIcon}>
              {debateStatus === 'ended' ? '🏆' : '📊'}
            </Text>
            <Text style={styles.scoreButtonText}>
              {debateStatus === 'ended' ? 'Results' : 'Scores'}
            </Text>
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

      {/* Input Area */}
      <View style={[styles.inputContainer, (!isConnected || isConnecting || !userStance || !canSendMessages) && styles.inputContainerDisabled]}>
        <View style={styles.inputRow}>
          <TextInput
            style={[
              styles.input,
              (!isConnected || isConnecting || !userStance || !canSendMessages) && styles.inputDisabled,
            ]}
            placeholder={
              !userStance ? 'Select your stance to chat...' :
              !canSendMessages ? 'Debate has ended' :
              isConnecting ? 'Connecting...' :
              isConnected ? 'Type your argument...' : 'Disconnected'
            }
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            multiline
            maxLength={500}
            editable={isConnected && !isConnecting && !!userStance && canSendMessages}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!text.trim() || !isConnected || isConnecting || !userStance || !canSendMessages) && styles.sendBtnDisabled,
            ]}
            onPress={() => sendMessage()}
            disabled={!text.trim() || !isConnected || isConnecting || !userStance || !canSendMessages}
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

// Styles (same as before, just remove timer-related styles)
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
    marginBottom: 8,
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
  debateStatusIndicator: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  debateStatusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  debateStatusEnded: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  debateStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  winnerText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  userStanceIndicator: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    borderLeftWidth: 4,
  },
  userStanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requirementsIndicator: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  requirementsText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
    textAlign: 'center',
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
  rightSideButtons: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 100 : 80,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
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
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 8,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarWrapper: {
    width: 32,
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  myBubbleWrapper: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    padding: 10,
    borderRadius: 18,
    minWidth: 50,
    maxWidth: '100%',
    elevation: 2,
  },
  myBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  deletedBubble: {
    backgroundColor: '#f1f5f9',
    opacity: 0.7,
    padding: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
  stanceTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stanceTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  myStance: {
    marginBottom: 4,
  },
  myStanceText: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  aiTag: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  aiTagText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '600',
  },
  scoreBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 40,
    zIndex: 1,
  },
  scoreBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contentWrapper: {
    margin: 0,
    padding: 0,
  },
  messageText: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 20,
    includeFontPadding: false,
    paddingVertical: 0,
    marginVertical: 0,
  },
  myMessageText: {
    color: '#fff',
  },
  systemText: {
    color: '#64748b',
    fontStyle: 'italic',
    fontSize: 13,
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(100, 116, 139, 0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 0,
  },
  myTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  deletedTimestamp: {
    color: '#94a3b8',
  },
  deletedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  deletedIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  deletedText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    paddingHorizontal: 20,
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
});

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
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: 'white',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#64748b',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  statusBanner: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusActive: {
    color: '#10b981',
  },
  statusEnded: {
    color: '#ef4444',
  },
  winnerText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
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
  settingDescription: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
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
  endDebateButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  endDebateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});