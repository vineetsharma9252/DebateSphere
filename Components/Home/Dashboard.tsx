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
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const { width } = Dimensions.get('window');
const BACKEND_URL = "https://debatesphere-11.onrender.com/api/all_rooms";

export default function Dashboard() {
  const navigation = useNavigation();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Popular topics for the slider
  const popularTopics = ["Politics", "Sports", "Technology", "Environment", "Health", "Education"];

  useEffect(() => {
    fetchAllRooms();
  }, []);

  const fetchAllRooms = async () => {
    try {
      setLoading(true);
      const response = await axios.get(BACKEND_URL);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicPress = (topic) => {
    navigation.navigate('DebatePage', {
      topic: topic,
      username: 'User'
    });
  };

  const handleDebatePage = () => {
    navigation.navigate('DebatePage', {
      username: 'User'
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
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity onPress={() => handleTopicPress(item)}>
        <Animated.View style={[styles.sliderItem, { width, transform: [{ scale }] }]}>
          <Text style={styles.sliderText}>🔥 {item}</Text>
          <Text style={styles.sliderSubtext}>Tap to explore debates</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {popularTopics.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex ? styles.paginationDotActive : styles.paginationDotInactive
            ]}
          />
        ))}
      </View>
    );
  };

  const renderRoomItem = ({ item }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => navigation.navigate('ChatRoom', {
        username: 'User',
        roomId: item.roomId,
        title: item.title,
        desc: item.desc,
      })}
    >
      <Text style={styles.roomTitle}>{item.title}</Text>
      <Text style={styles.roomDesc}>{item.desc || 'No description available'}</Text>
      <Text style={styles.roomTopic}>Topic: {item.topic || 'General'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sliderContainer}>
          <Text style={styles.sectionTitle}>Popular Topics</Text>
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
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentIndex(index);
            }}
            keyExtractor={(item) => item}
            renderItem={renderSliderItem}
          />
          {renderPagination()}
        </View>

        <TouchableOpacity style={styles.browseButton} onPress={handleDebatePage}>
          <Text style={styles.browseButtonText}>Browse All Debate Rooms</Text>
        </TouchableOpacity>

        <View style={styles.feedContainer}>
          <Text style={styles.sectionTitle}>Recent Debate Rooms</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#4CAF50" />
          ) : rooms.length > 0 ? (
            <FlatList
              data={rooms.slice(0, 5)}
              renderItem={renderRoomItem}
              keyExtractor={(item) => item.roomId}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noRoomsText}>No active debate rooms found</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 15,
    marginVertical: 10,
    color: '#333',
  },
  sliderContainer: {
    marginVertical: 10,
  },
  sliderItem: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: 'tomato',
    borderRadius: 15,
    borderColor: 'black',
    borderWidth: 2,
    marginHorizontal: 10,
    padding: 20,
  },
  sliderText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sliderSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#4CAF50',
  },
  paginationDotInactive: {
    backgroundColor: '#ccc',
  },
  browseButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  feedContainer: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  roomItem: {
    backgroundColor: 'white',
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  roomDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  roomTopic: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  noRoomsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
});