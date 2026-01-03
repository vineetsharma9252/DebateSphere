import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useUser } from '../../Contexts/UserContext';

const { width } = Dimensions.get('window');
const BACKEND_URL = "https://debatesphere-11.onrender.com/api/all_rooms";

// Color palette matching your chatroom
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
  success: '#10b981'
};

// Popular topics with icons and solid colors
const popularTopics = [
  { name: "Politics", icon: "🏛️", color: '#667eea', lightColor: '#e0e7ff' },
  { name: "Sports", icon: "⚽", color: '#4facfe', lightColor: '#dbeafe' },
  { name: "Technology", icon: "💻", color: '#43e97b', lightColor: '#dcfce7' },
  { name: "Environment", icon: "🌍", color: '#fa709a', lightColor: '#fce7f3' },
  { name: "Health", icon: "🏥", color: '#ff9a9e', lightColor: '#fef7cd' },
  { name: "Education", icon: "🎓", color: '#a8edea', lightColor: '#ecfdf5' },
];

export default function Dashboard() {
  const { user } = useUser();
  const navigation = useNavigation();
  const [rooms, setRooms] = useState([]);
  const [activeRooms, setActiveRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);
  const [debateStats, setDebateStats] = useState({
      totalDebates: 0,
      activeDebates: 0,
      totalParticipants: 0
    });

  const scrollX = useRef(new Animated.Value(0)).current;
  const welcomeAnim = useRef(new Animated.Value(1)).current;
  console.log("User Data we are getting " + user);
  console.log("Username at dashboard is " + user.username);
  const username = user.username ;

  useEffect(() => {
    fetchAllRooms();
    fetchDebateStats();
    // Set timer to hide welcome section after 5 seconds
    const welcomeTimer = setTimeout(() => {
      // Start fade out animation
      Animated.timing(welcomeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowWelcome(false);
      });
    }, 7000); // 5 seconds

    return () => clearTimeout(welcomeTimer);
  }, []);

  const fetchAllRooms = async () => {
    try {
      setLoading(true);
      const response = await axios.get(BACKEND_URL);
      const allRooms = response.data;
      setRooms(allRooms);

      // Filter only active rooms
      const activeRoomsList = allRooms.filter(room => room.isActive === true && room.debateStatus !== 'ended');
      setActiveRooms(activeRoomsList);

      console.log(`Total rooms: ${allRooms.length}, Active rooms: ${activeRoomsList.length}`);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };
//      const fetchDebateStats = async () => {
//         try {
//           // Fetch all rooms to calculate stats
//           const response = await axios.get(BACKEND_URL);
//           const allRooms = response.data;
//
//           // Calculate statistics based on new server data
//           const totalDebates = allRooms.length;
//           const activeDebates = allRooms.filter(room =>
//             room.isActive === true && room.debateStatus !== 'ended'
//           ).length;
//
//           // For participant count, you might need a different endpoint
//           // This is a placeholder - update with actual endpoint when available
//           const totalParticipants = activeDebates * 12; // Placeholder calculation
//
//           setDebateStats({
//             totalDebates,
//             activeDebates,
//             totalParticipants
//           });
//         } catch (error) {
//           console.error('Error fetching debate stats:', error);
//         }
//       };
  const handleTopicPress = (topic) => {
    navigation.navigate('DebatePage', {
      topic: topic.name,
      username: username
    });
  };

  const handleDebatePage = () => {
    navigation.navigate('DebatePage', {
      username: username
    });
  };

  const renderSliderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity onPress={() => handleTopicPress(item)} activeOpacity={0.9}>
        <Animated.View
          style={[
            styles.sliderItem,
            {
              transform: [{ scale }],
              opacity,
              backgroundColor: item.color
            }
          ]}
        >
          <View style={styles.sliderContent}>
            <View style={[styles.topicIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.topicIcon}>{item.icon}</Text>
            </View>
            <Text style={styles.sliderText}>{item.name}</Text>
            <Text style={styles.sliderSubtext}>Join the conversation</Text>
            <View style={styles.exploreButton}>
              <Text style={styles.exploreButtonText}>Explore →</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {popularTopics.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.paginationDot,
                { width: dotWidth, opacity }
              ]}
            />
          );
        })}
      </View>
    );
  };


    const fetchDebateStats = async () => {
      try {
        // Fetch all rooms
        const response = await axios.get(BACKEND_URL);
        const allRooms = response.data;

        // Calculate statistics
        const totalDebates = allRooms.length;
        const activeDebates = allRooms.filter(room =>
          room.isActive === true && room.debateStatus !== 'ended'
        ).length;

        // Fetch total participants from the new endpoint
        const participantsResponse = await axios.get('https://debatesphere-11.onrender.com/api/participants/total');
        const totalParticipants = participantsResponse.data.success
          ? participantsResponse.data.totalParticipants
          : 0;

        // Or use the detailed endpoint for more data
        // const detailedResponse = await axios.get('https://debatesphere-11.onrender.com/api/participants/detailed');
        // const totalParticipants = detailedResponse.data.success
        //   ? detailedResponse.data.totalUniqueParticipants
        //   : 0;

        setDebateStats({
          totalDebates,
          activeDebates,
          totalParticipants
        });
      } catch (error) {
        console.error('Error fetching debate stats:', error);

        // Fallback calculation if new endpoint fails
        try {
          const response = await axios.get(BACKEND_URL);
          const allRooms = response.data;
          const activeDebates = allRooms.filter(room =>
            room.isActive === true && room.debateStatus !== 'ended'
          ).length;

          setDebateStats({
            totalDebates: allRooms.length,
            activeDebates,
            totalParticipants: activeDebates * 12 // Fallback to placeholder
          });
        } catch (fallbackError) {
          console.error('Fallback stats fetch also failed:', fallbackError);
        }
      }
    };

  const renderRoomItem = ({ item, index }) => {

    const getRoomStatus = (room) => {
      if (!room.isActive) return { status: 'Closed', color: COLORS.danger };
      if (room.debateStatus === 'ended') return { status: 'Ended', color: COLORS.textLight };
      if (room.debateStatus === 'active') return { status: 'Live', color: COLORS.accent };
      return { status: 'Active', color: COLORS.success };
    };

    const roomStatus = getRoomStatus(item);
    const participantCount = item.standings ?
        (item.standings.favor?.participants || 0) +
        (item.standings.against?.participants || 0) +
        (item.standings.neutral?.participants || 0) : 12;

    const isRoomClosed = !item.isActive || item.debateStatus === 'ended';

      return (
    <TouchableOpacity
      style={[styles.roomItem, isRoomClosed && styles.roomItemDisabled]}
      onPress={() => {
              if (isRoomClosed) {
                // Show alert for closed rooms
                Alert.alert(
                  'Room Closed',
                  'This debate has ended and is no longer accessible.',
                  [{ text: 'OK' }]
                );
              } else {
                navigation.navigate('ChatRoom', {
                  username: username,
                  roomId: item.roomId,
                  title: item.title,
                  desc: item.desc,
                });
              }
            }}
            activeOpacity={isRoomClosed ? 1 : 0.8}
            disabled={isRoomClosed}
          >

      <View style={styles.roomHeader}>
        <View style={styles.roomIcon}>
          <Text style={styles.roomIconText}>💬</Text>
        </View>
        <View style={styles.roomInfo}>
          <Text style={styles.roomTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.roomTopic}>#{item.topic || 'General'}</Text>
        </View>
        <View style={[
                  styles.activeIndicator,
                  isRoomClosed && styles.closedIndicator,
                  { backgroundColor: `${roomStatus.color}20` }
                ]}>
          <View style={[styles.activeDot, { backgroundColor: roomStatus.color }]} />
          <Text style={[
                      styles.activeText,
                      { color: isRoomClosed ? COLORS.textLight :
                        roomStatus.color === COLORS.accent ? '#166534' : roomStatus.color }
                    ]}>
                      {roomStatus.status}
                    </Text>

        </View>
      </View>

      <Text style={styles.roomDesc} numberOfLines={2}>
        {item.desc || 'Join this engaging debate conversation'}
      </Text>

      {item.winner && item.winner !== 'undecided' && (
              <View style={styles.winnerBadge}>
                <Text style={styles.winnerText}>🏆 Winner: {item.winner}</Text>
              </View>
      )}
      <View style={styles.roomFooter}>
        <View style={styles.participants}>
          <Text style={styles.participantsText}>👥 {participantCount}</Text>
        </View>
        <View style={[
          styles.joinButton,
          (!item.isActive || item.debateStatus === 'ended') && styles.joinButtonDisabled
        ]}>
          <Text style={styles.joinButtonText}>
            {item.isActive || item.debateStatus === 'ended' ? 'Join Debate' : 'Room Closed'}
          </Text>
        </View>
      </View>

      {/* Show overlay for closed rooms */}
            {isRoomClosed && (
              <View style={styles.closedOverlay}>
                <Text style={styles.closedText}>DEBATE ENDED</Text>
              </View>
            )}
    </TouchableOpacity>
  )};

  const StatCard = ({ icon, value, label, color = COLORS.primary }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section with Animation */}
        {showWelcome && (
          <Animated.View
            style={[
              styles.header,
              {
                opacity: welcomeAnim,
                transform: [
                  {
                    translateY: welcomeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.username}>{username || 'Debater'}! 👋</Text>
            </View>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {username?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Stats Section - Updated with active rooms count */}
        <View style={[
          styles.statsContainer,
          !showWelcome && styles.statsContainerNoWelcome // Adjust spacing when welcome is hidden
        ]}>
          <StatCard
                      icon="💬"
                      value={debateStats.activeDebates.toString()}
                      label="Active Debates"
                      color={COLORS.primary}
                    />
                    <StatCard
                      icon="👥"
                      value={debateStats.totalParticipants.toString()}
                      label="Participants"
                      color={COLORS.success}
                    />
                    <StatCard
                      icon="🏆"
                      value={debateStats.totalDebates.toString()}
                      label="Total Debates"
                      color={COLORS.warning}
                    />
        </View>

        {/* Popular Topics Slider */}
        <View style={styles.sliderSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔥 Popular Topics</Text>
            <Text style={styles.sectionSubtitle}>Trending right now</Text>
          </View>

          <View style={styles.sliderContainer}>
            <Animated.FlatList
              data={popularTopics}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / (width - 60));
                setCurrentIndex(index);
              }}
              keyExtractor={(item) => item.name}
              renderItem={renderSliderItem}
              snapToInterval={width - 60}
              decelerationRate="fast"
            />
            {renderPagination()}
          </View>
        </View>

        {/* Quick Action Button */}
        <TouchableOpacity
          style={styles.browseButton}
          onPress={handleDebatePage}
          activeOpacity={0.9}
        >
          <View style={styles.browseButtonContent}>
            <Text style={styles.browseButtonText}>Browse All Debate Rooms</Text>
            <Text style={styles.browseButtonSubtext}>
              Discover {activeRooms.length}+ active debates
            </Text>
            <View style={styles.browseButtonIcon}>
              <Text style={styles.browseButtonIconText}>🎯</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Active Debate Rooms Section */}
        <View style={styles.feedContainer}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>💫 Active Debate Rooms</Text>
              <Text style={styles.sectionSubtitle}>
                {activeRooms.length} rooms currently active
              </Text>
            </View>
            <TouchableOpacity onPress={fetchAllRooms} style={styles.refreshButton}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading debates...</Text>
            </View>
          ) : activeRooms.length > 0 ? (
            <FlatList
              data={activeRooms.slice(0, 6)} // Show first 6 active rooms
              renderItem={renderRoomItem}
              keyExtractor={(item) => item.roomId}
              scrollEnabled={false}
              contentContainerStyle={styles.roomsList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💤</Text>
              <Text style={styles.emptyTitle}>No Active Debate Rooms</Text>
              <Text style={styles.emptySubtitle}>
                All debate rooms are currently inactive. Check back later!
              </Text>
              <TouchableOpacity
                style={styles.createRoomButton}
                onPress={() => navigation.navigate('CreateRoom')} // You can add this navigation
              >
                <Text style={styles.createRoomButtonText}>Create New Room</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statsContainerNoWelcome: {
    marginTop: 20, // Add some top margin when welcome is hidden
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 18,
    color: '#fff',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  sliderSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  refreshText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  sliderContainer: {
    marginBottom: 10,
  },
  sliderItem: {
    width: width - 120,
    height: 180,
    marginHorizontal: 10,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  sliderContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topicIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicIcon: {
    fontSize: 24,
  },
  sliderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sliderSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  exploreButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  exploreButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: COLORS.primary,
  },
  browseButton: {
    marginHorizontal: 24,
    marginBottom: 30,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  browseButtonContent: {
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  browseButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  browseButtonIcon: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -15,
  },
  browseButtonIconText: {
    fontSize: 24,
  },
  feedContainer: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textLight,
    fontSize: 14,
  },
  roomsList: {
    paddingBottom: 10,
  },
  roomItem: {
    backgroundColor: COLORS.card,
    padding: 20,
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
    fontSize: 16,
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
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  joinButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  joinButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  createRoomButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createRoomButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  winnerBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  winnerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  roomItemDisabled: {
    opacity: 0.7,
  },
  closedIndicator: {
    backgroundColor: '#f1f5f9',
  },
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  closedText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
});