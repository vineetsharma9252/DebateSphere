import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import io from 'socket.io-client';
import { useUser } from "../../Contexts/UserContext";

// Color palette matching your chatroom theme
const COLORS = {
  primary: '#667eea',
  primaryLight: '#c7d2fe',
  secondary: '#4b7bec',
  background: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  accent: '#4ade80',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  purple: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6'
};

const SOCKET_URL = "https://debatesphere-11.onrender.com";
const TOPICS = [
  { name: 'All Topics', icon: '🌐', color: COLORS.primary },
  { name: 'Politics', icon: '🗳️', color: '#667eea' },
  { name: 'Technology', icon: '🚀', color: '#4facfe' },
  { name: 'Environment', icon: '🌱', color: '#43e97b' },
  { name: 'Sports', icon: '⚽', color: '#fa709a' },
  { name: 'Education', icon: '🎯', color: '#ff9a9e' },
  { name: 'Health', icon: '💊', color: '#a8edea' },
];

// Create Room Modal Component
const CreateRoomModal = ({ visible, onClose, onCreateRoom, username, userId }) => {
  const [roomData, setRoomData] = useState({
    title: '',
    desc: '',
    topic: '',
  });
  const [loading, setLoading] = useState(false);
  const [customTopic, setCustomTopic] = useState('');

  const topics = [
    'Politics', 'Technology', 'Environment', 'Sports',
    'Education', 'Health', 'Science', 'Philosophy',
    'Entertainment', 'Business', 'Custom'
  ];

  const handleCreateRoom = async () => {
    if (!roomData.title.trim()) {
      Alert.alert('Error', 'Please enter a room title');
      return;
    }

    if (!roomData.topic) {
      Alert.alert('Error', 'Please select a topic');
      return;
    }

    if (roomData.topic === 'Custom' && !customTopic.trim()) {
      Alert.alert('Error', 'Please enter a custom topic');
      return;
    }

    setLoading(true);

    try {
      const finalTopic = roomData.topic === 'Custom' ? customTopic : roomData.topic;

      const roomPayload = {
        title: roomData.title.trim(),
        desc: roomData.desc.trim(),
        topic: finalTopic,
        createdBy: userId,
      };

      const response = await fetch('https://debatesphere-11.onrender.com/api/create_room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomPayload),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Room created successfully!');
        onCreateRoom(result.room);
        resetForm();
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Create room error:', error);
      Alert.alert('Error', 'Network error while creating room');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRoomData({
      title: '',
      desc: '',
      topic: '',
    });
    setCustomTopic('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Debate Room</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Room Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Room Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter a compelling debate topic..."
                value={roomData.title}
                onChangeText={(text) => setRoomData(prev => ({ ...prev, title: text }))}
                maxLength={100}
              />
              <Text style={styles.charCount}>{roomData.title.length}/100</Text>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe what this debate will be about..."
                value={roomData.desc}
                onChangeText={(text) => setRoomData(prev => ({ ...prev, desc: text }))}
                multiline
                numberOfLines={3}
                maxLength={250}
              />
              <Text style={styles.charCount}>{roomData.desc.length}/250</Text>
            </View>

            {/* Topic Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Topic Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.topicScrollView}
              >
                <View style={styles.topicContainer}>
                  {topics.map((topic) => (
                    <TouchableOpacity
                      key={topic}
                      style={[
                        styles.topicButton,
                        roomData.topic === topic && styles.topicButtonSelected,
                      ]}
                      onPress={() => setRoomData(prev => ({ ...prev, topic }))}
                    >
                      <Text style={[
                        styles.topicButtonText,
                        roomData.topic === topic && styles.topicButtonTextSelected,
                      ]}>
                        {topic}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {roomData.topic === 'Custom' && (
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your custom topic..."
                  value={customTopic}
                  onChangeText={setCustomTopic}
                  maxLength={50}
                />
              )}
            </View>

            {/* Created By Info */}
            <View style={styles.userInfo}>
              <Text style={styles.userInfoLabel}>Created by:</Text>
              <Text style={styles.userInfoText}>{username || 'Anonymous'}</Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.createButton,
                loading && styles.createButtonDisabled,
                (!roomData.title.trim() || !roomData.topic) && styles.createButtonDisabled
              ]}
              onPress={handleCreateRoom}
              disabled={loading || !roomData.title.trim() || !roomData.topic}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Room'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default function DebatePage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useUser();
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [createRoomModalVisible, setCreateRoomModalVisible] = useState(false);

  const { topic: initialTopic } = route.params || {};
  const [selectedTopic, setSelectedTopic] = useState(initialTopic || 'All Topics');

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    initializeSocket();
    fetchRooms();
    animateIn();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [selectedTopic]);

  const initializeSocket = () => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('online_users_update', (data) => {
      setOnlineCount(data.onlineCount);
      setOnlineUsers(data.users);
    });

    newSocket.on('room_created', (newRoom) => {
      setRooms(prev => [newRoom, ...prev]);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return newSocket;
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      let url = 'https://debatesphere-11.onrender.com/api/all_rooms';

      if (selectedTopic && selectedTopic !== 'All Topics') {
        url = `https://debatesphere-11.onrender.com/api/rooms?topic=${encodeURIComponent(selectedTopic)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setRooms(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to fetch rooms');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while fetching rooms');
      console.error('Fetch rooms error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const handleRoomCreated = (newRoom) => {
    setRooms(prev => [newRoom, ...prev]);
    setCreateRoomModalVisible(false);

    if (newRoom.topic) {
      setSelectedTopic(newRoom.topic);
    }
  };

  const handleCreateRoom = () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please log in to create a room');
      return;
    }
    setCreateRoomModalVisible(true);
  };

  const handleJoinRoom = (roomId, title, desc) => {
    navigation.navigate('ChatRoom', {
      roomId,
      title,
      desc,
    });
  };

  const renderOnlineUsersModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showOnlineUsers}
      onRequestClose={() => setShowOnlineUsers(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Online Debaters</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowOnlineUsers(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.onlineStats}>
            <Text style={styles.onlineCountText}>
              {onlineCount} users online
            </Text>
          </View>

          <FlatList
            data={onlineUsers}
            keyExtractor={(item) => item.socketId}
            renderItem={({ item }) => (
              <View style={styles.userItem}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {item.username?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
                <Text style={styles.userName}>{item.username}</Text>
                <View style={styles.onlineIndicator} />
              </View>
            )}
            contentContainerStyle={styles.usersList}
          />
        </View>
      </View>
    </Modal>
  );

  const renderRoom = ({ item, index }) => (
    <Animated.View
      style={[
        styles.roomItem,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.roomContent}
        onPress={() => handleJoinRoom(item.roomId, item.title, item.desc)}
        activeOpacity={0.8}
      >
        <View style={styles.roomHeader}>
          <View style={styles.roomIcon}>
            <Text style={styles.roomIconText}>💬</Text>
          </View>
          <View style={styles.roomInfo}>
            <Text style={styles.roomTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.roomTopic}>#{item.topic || 'General'}</Text>
          </View>
          <View style={styles.activeIndicator}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Live</Text>
          </View>
        </View>

        <Text style={styles.roomDesc} numberOfLines={2}>
          {item.desc || 'Join this engaging debate conversation'}
        </Text>

        <View style={styles.roomFooter}>
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorText}>
              Created by {item.createdBy?.username || 'Anonymous'}
            </Text>
          </View>
          <View style={styles.roomMeta}>
            <Text style={styles.roomTime}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}
            </Text>
          </View>
        </View>

        <View style={styles.joinButton}>
          <Text style={styles.joinButtonText}>Join Debate →</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderTopic = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.topicButton,
        selectedTopic === item.name && styles.topicButtonSelected,
        { borderColor: item.color }
      ]}
      onPress={() => setSelectedTopic(item.name)}
      activeOpacity={0.8}
    >
      <Text style={styles.topicIcon}>{item.icon}</Text>
      <Text
        style={[
          styles.topicText,
          selectedTopic === item.name && styles.topicTextSelected,
        ]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <Animated.View
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.headerContent}>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {selectedTopic === 'All Topics' ? 'All Debate Rooms' : `${selectedTopic} Debates`}
          </Text>
          <View style={styles.headerSubtitleContainer}>
            <Text style={styles.headerSubtitle}>
              {rooms.length} active rooms • {onlineCount} debaters online
            </Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        </View>
        {initialTopic && initialTopic !== selectedTopic && (
          <View style={styles.navigationBadge}>
            <Text style={styles.navigationBadgeText}>
              From: {initialTopic}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderStatsContainer = () => (
    <View style={styles.statsContainer}>
      <TouchableOpacity
        style={styles.statItem}
        onPress={() => setShowOnlineUsers(true)}
        activeOpacity={0.7}
      >
        <View style={styles.statIcon}>
          <Text style={styles.statIconText}>👥</Text>
        </View>
        <Text style={styles.statNumber}>{onlineCount}</Text>
        <Text style={styles.statLabel}>Online Now</Text>
        <Text style={styles.statSubtext}>Tap to view</Text>
      </TouchableOpacity>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={styles.statIcon}>
          <Text style={styles.statIconText}>💬</Text>
        </View>
        <Text style={styles.statNumber}>{rooms.length}</Text>
        <Text style={styles.statLabel}>Active Rooms</Text>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={styles.statIcon}>
          <Text style={styles.statIconText}>🔥</Text>
        </View>
        <Text style={styles.statNumber}>{TOPICS.length}</Text>
        <Text style={styles.statLabel}>Topics</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Create Room Modal */}
      <CreateRoomModal
        visible={createRoomModalVisible}
        onClose={() => setCreateRoomModalVisible(false)}
        onCreateRoom={handleRoomCreated}
        username={user?.username}
        userId={user?.id}
      />

      {renderOnlineUsersModal()}
      {renderHeader()}

      {/* Topic Filter Section */}
      <View style={styles.topicSection}>
        <Text style={styles.sectionTitle}>🔥 Popular Topics</Text>
        <FlatList
          data={TOPICS}
          renderItem={renderTopic}
          keyExtractor={(item) => item.name}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicList}
        />
      </View>

      {/* Quick Stats */}
      {renderStatsContainer()}

      {/* Rooms List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading debate rooms...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>
            No debate rooms found for {selectedTopic}
          </Text>
          <Text style={styles.emptySubtext}>
            Be the first to create a room and start the conversation!
          </Text>
          <TouchableOpacity style={styles.createRoomButton} onPress={handleCreateRoom}>
            <Text style={styles.createRoomButtonText}>Create First Room</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <Animated.FlatList
          data={rooms}
          renderItem={renderRoom}
          keyExtractor={(item) => item.roomId || item._id}
          contentContainerStyle={styles.roomList}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleCreateRoom}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  navigationBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  navigationBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  topicSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.card,
    marginTop: -10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  topicList: {
    paddingBottom: 5,
  },
  topicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topicButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  topicIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  topicText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  topicTextSelected: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statIconText: {
    fontSize: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 10,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 8,
  },
  roomList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  roomItem: {
    backgroundColor: COLORS.card,
    marginVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  roomContent: {
    padding: 20,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roomIconText: {
    fontSize: 18,
  },
  roomInfo: {
    flex: 1,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  roomTopic: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginRight: 4,
  },
  activeText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '600',
  },
  roomDesc: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 16,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  roomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createRoomButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createRoomButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  topicScrollView: {
    marginBottom: 12,
  },
  topicContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  topicButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  topicButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  topicButtonTextSelected: {
    color: 'white',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  userInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  createButton: {
    backgroundColor: '#667eea',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  onlineStats: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  onlineCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  usersList: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userName: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
});