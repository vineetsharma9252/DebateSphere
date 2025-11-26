import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import io from 'socket.io-client' ;
import { useUser } from "../../Contexts/UserContext";
import { useRoute } from '@react-navigation/native';
import AIDetectionService from '../services/AIDetectionService';
import AIContentWarning from '../warning/AIContentWarning';

const SERVER_URL = 'https://debatesphere-11.onrender.com/';

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

  // Stance-related state
  const [showStanceModal, setShowStanceModal] = useState(false);
  const [userStance, setUserStance] = useState(null);
  const [hasCheckedStance, setHasCheckedStance] = useState(false);
  const [roomStances, setRoomStances] = useState({});

  const { roomId, title, desc } = route.params;
  const { user } = useUser();

  const username = user?.username || 'Guest';
  const userId = user?.id || '';
  const userImage = user?.user_image || '';

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Stance color and label mapping
  const stanceColors = {
    against: '#ef4444',
    favor: '#10b981',
    neutral: '#6b7280'
  };

  const stanceLabels = {
    against: 'Against',
    favor: 'In Favor',
    neutral: 'Neutral'
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
    if (userImages[messageUserId]) {
      return userImages[messageUserId];
    }

    if (messageUserId === userId) {
      return userImage;
    }

    const fetchedUserImage = await fetchUserImageById(messageUserId);
    if (fetchedUserImage) {
      setUserImages(prev => ({
        ...prev,
        [messageUserId]: fetchedUserImage
      }));
      return fetchedUserImage;
    }

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

      if (Array.isArray(msg)) {
        const messagesWithIds = await Promise.all(
          msg.map(async (message) => {
            const messageUserId = message.userId || message.senderId;
            let userImageToUse = message.userImage || '';

            if (!userImageToUse && messageUserId) {
              userImageToUse = await getUserImage(messageUserId, message.sender);
            }

            return {
              ...message,
              id: message.id || generateMessageId(),
              isDeleted: message.isDeleted || false,
              userId: messageUserId,
              userImage: userImageToUse
            };
          })
        );

        setMessages(messagesWithIds);
      } else {
        const messageUserId = msg.userId || msg.senderId;
        let userImageToUse = msg.userImage || '';

        if (!userImageToUse && messageUserId) {
          userImageToUse = await getUserImage(messageUserId, msg.sender);
        }

        const messageWithId = {
          ...msg,
          id: msg.id || generateMessageId(),
          isDeleted: msg.isDeleted || false,
          userId: messageUserId,
          userImage: userImageToUse
        };

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
            let userImageToUse = msg.userImage || '';

            if (!userImageToUse && messageUserId) {
              userImageToUse = await getUserImage(messageUserId, msg.sender);
            }

            return {
              ...msg,
              id: msg.id || generateMessageId(),
              isDeleted: msg.isDeleted || false,
              userId: messageUserId,
              userImage: userImageToUse
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

  const renderMessage = ({ item }) => {
    const isMyMessage = item.userId === userId;
    const messageUserImage = item.userImage || userImages[item.userId] || '';
    const messageStance = item.userStance || roomStances[item.userId]?.stance;

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
          ]}
          onLongPress={() => handleMessageLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          {/* User info for other users' messages */}
          {!item.isSystem && !isMyMessage && !item.isDeleted && (
            <View style={styles.msgUserInfo}>
              <View style={styles.userInfoRow}>
                <Text style={styles.msgUser}>
                  {item.sender}
                </Text>
                {messageStance && (
                  <View style={[
                    styles.stanceBadge,
                    { backgroundColor: `${stanceColors[messageStance]}20` }
                  ]}>
                    <Text style={[
                      styles.stanceBadgeText,
                      { color: stanceColors[messageStance] }
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
                { color: stanceColors[userStance.id] || stanceColors[userStance] }
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
            item.isDeleted && styles.deletedMsgTime
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

  // Show loading while checking stance
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
            { backgroundColor: `${stanceColors[userStance.id] || stanceColors[userStance]}20` }
          ]}>
            <Text style={[
              styles.userStanceText,
              { color: stanceColors[userStance.id] || stanceColors[userStance] }
            ]}>
              Your Stance: {userStance.label || stanceLabels[userStance]}
            </Text>
          </View>
        )}

        {/* AI Usage Indicator */}
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
});