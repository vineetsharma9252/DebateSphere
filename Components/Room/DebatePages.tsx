import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function DebatePage({ topic, username }) {
  const navigation = useNavigation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(topic || 'Politics'); // Default to 'Politics' if topic is undefined

  // Arbitrary topics for fallback
  const arbitraryTopics = ['Politics', 'Technology', 'Environment', 'Sports', 'Education', 'Health'];

  useEffect(() => {
    fetchRooms();
  }, [selectedTopic]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://debatesphere-11.onrender.com/api/rooms?topic=${encodeURIComponent(selectedTopic)}`
      );
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

  const handleJoinRoom = (roomId) => {
    navigation.navigate('ChatRoom', { username, roomId });
  };

  const handleTopicSelect = (newTopic) => {
    setSelectedTopic(newTopic);
  };

  const renderRoom = ({ item }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => handleJoinRoom(item.roomId)}
    >
      <Text style={styles.roomTitle}>{item.title}</Text>
      <Text style={styles.roomId}>Room ID: {item.roomId}</Text>
      <Text style={styles.roomTime}>
        Created: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const renderTopic = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.topicButton,
        selectedTopic === item && styles.topicButtonSelected,
      ]}
      onPress={() => handleTopicSelect(item)}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {selectedTopic} Debates
        </Text>
      </View>
      {!topic && (
        <View style={styles.topicListContainer}>
          <Text style={styles.topicListTitle}>Select a Topic</Text>
          <FlatList
            data={arbitraryTopics}
            renderItem={renderTopic}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicList}
          />
        </View>
      )}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.loadingText}>Loading rooms...</Text>
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No debate rooms found for {selectedTopic}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderRoom}
          keyExtractor={(item) => item.roomId}
          contentContainerStyle={styles.roomList}
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
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  topicListContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  topicListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  topicList: {
    paddingBottom: 10,
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
    fontSize: 16,
    color: '#000',
  },
  topicTextSelected: {
    color: '#fff',
  },
  roomList: {
    paddingHorizontal: 10,
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
  },
  roomId: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  roomTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
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
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
