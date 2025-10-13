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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

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

const TOPICS = [
  { name: 'All Topics', icon: '🌐', color: COLORS.primary },
  { name: 'Politics', icon: '🗳️', color: '#667eea' },
  { name: 'Technology', icon: '🚀', color: '#4facfe' },
  { name: 'Environment', icon: '🌱', color: '#43e97b' },
  { name: 'Sports', icon: '⚽', color: '#fa709a' },
  { name: 'Education', icon: '🎯', color: '#ff9a9e' },
  { name: 'Health', icon: '💊', color: '#a8edea' },
];

export default function DebatePage() {
  const navigation = useNavigation();
  const route = useRoute();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { topic: initialTopic, username } = route.params || {};
  const [selectedTopic, setSelectedTopic] = useState(initialTopic || 'All Topics');

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    fetchRooms();
    animateIn();
  }, [selectedTopic]);

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

  const handleJoinRoom = (roomId, title, desc) => {
    navigation.navigate('ChatRoom', {
      username: username || 'Guest',
      roomId,
      title,
      desc,
    });
  };

  const handleCreateRoom = () => {
    Alert.alert('Coming Soon', 'Room creation feature will be available soon!');
  };

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
          <View style={styles.participants}>
            <Text style={styles.participantsText}>👥 12 debating</Text>
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

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
            <Text style={styles.headerSubtitle}>
              {rooms.length} active rooms • Join the conversation
            </Text>
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
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{rooms.length}</Text>
          <Text style={styles.statLabel}>Active Rooms</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>156</Text>
          <Text style={styles.statLabel}>Debaters Online</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>24</Text>
          <Text style={styles.statLabel}>Topics</Text>
        </View>
      </View>

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
          keyExtractor={(item) => item.roomId}
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
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
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
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsText: {
    fontSize: 12,
    color: COLORS.textLight,
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
});