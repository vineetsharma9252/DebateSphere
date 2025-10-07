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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function DebatePage() {
  const navigation = useNavigation();
  const route = useRoute();

  // Always call hooks at the top level
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get parameters from navigation and set initial state
  const { topic: initialTopic, username } = route.params || {};
  const [selectedTopic, setSelectedTopic] = useState(initialTopic || 'Politics');

  const topics = ['Politics', 'Technology', 'Environment', 'Sports', 'Education', 'Health', 'All Topics'];

  useEffect(() => {
    fetchRooms();
  }, [selectedTopic]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      let url = 'https://debatesphere-11.onrender.com/api/all_rooms';

      // If a specific topic is selected and it's not "All Topics", filter by topic
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
    }
  };

  const handleJoinRoom = (roomId, title, desc) => {
    navigation.navigate('ChatRoom', {
      username: username || 'Guest',
      roomId,
      title,
      desc,
    });
  };

  const renderRoom = ({ item }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => handleJoinRoom(item.roomId, item.title, item.desc)}
    >
      <Text style={styles.roomTitle}>{item.title}</Text>
      <Text style={styles.roomDesc}>{item.desc || 'No description'}</Text>
      <View style={styles.roomFooter}>
        <Text style={styles.roomTopic}>Topic: {item.topic || 'General'}</Text>
        <Text style={styles.roomTime}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderTopic = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.topicButton,
        selectedTopic === item && styles.topicButtonSelected,
      ]}
      onPress={() => setSelectedTopic(item)}
    >
      <Text
        style={[
          styles.topicText,
          selectedTopic === item && styles.topicTextSelected,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  );

  // Now use the initialTopic variable in the JSX (not in hooks)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedTopic === 'All Topics' ? 'All Debate Rooms' : `${selectedTopic} Debates`}
        </Text>
        {initialTopic && initialTopic !== selectedTopic && (
          <Text style={styles.headerSubtitle}>
            Navigated from: {initialTopic}
          </Text>
        )}
      </View>

      {/* Topic Filter */}
      <View style={styles.topicListContainer}>
        <Text style={styles.topicListTitle}>Filter by Topic</Text>
        <FlatList
          data={topics}
          renderItem={renderTopic}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicList}
        />
      </View>

      {/* Rooms List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Loading rooms...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No debate rooms found for {selectedTopic}
          </Text>
          <Text style={styles.emptySubtext}>
            Be the first to create a room for this topic!
          </Text>
        </ScrollView>
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderRoom}
          keyExtractor={(item) => item.roomId}
          contentContainerStyle={styles.roomList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    borderWidth: 3,
    borderRadius: 20,
    padding: 20,
    margin: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  topicListContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  topicListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  topicList: {
    paddingBottom: 5,
  },
  topicButton: {
    backgroundColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  topicButtonSelected: {
    backgroundColor: '#007aff',
  },
  topicText: {
    fontSize: 14,
    color: '#000',
  },
  topicTextSelected: {
    color: '#fff',
  },
  roomList: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  roomItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  roomDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTopic: {
    fontSize: 12,
    color: '#007aff',
    fontWeight: '500',
  },
  roomTime: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});