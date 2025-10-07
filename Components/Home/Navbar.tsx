import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Image, FlatList, Modal } from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const BACKEND_URL = "https://debatesphere-11.onrender.com/api/all_rooms";

export default function Navbar() {
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // All hooks are called unconditionally at the top level

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get(BACKEND_URL);
        const roomsData = response.data;
        setAllRooms(roomsData);
        console.log("Navbar all rooms:", roomsData);
      } catch (err) {
        console.error("Error fetching rooms:", err);
      }
    };

    fetchRooms();
  }, []);

  // Search functionality - this useEffect is always called
  useEffect(() => {
    if (search.trim().length > 0) {
      setIsSearching(true);
      const filteredRooms = allRooms.filter(room =>
        room.title?.toLowerCase().includes(search.toLowerCase()) ||
        room.topic?.toLowerCase().includes(search.toLowerCase()) ||
        room.description?.toLowerCase().includes(search.toLowerCase())
      );
      setSearchResults(filteredRooms);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
    }
  }, [search, allRooms]);

  const handleMenuPress = () => {
    if (navigation.openDrawer) {
      navigation.openDrawer();
    } else {
      Alert.alert('Menu', 'Drawer navigation not available');
    }
  };

  const handleHomePress = () => {
    navigation.navigate('Home');
    setSearch("");
    setShowSearchResults(false);
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
    setSearch("");
    setShowSearchResults(false);
  };

  const handleSettingsPress = () => {
    navigation.navigate('Settings');
    setSearch("");
    setShowSearchResults(false);
  };

  const handleDebatesPress = () => {
    navigation.navigate('Debates');
    setSearch("");
    setShowSearchResults(false);
  };

  const handleLogoutPress = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => navigation.navigate('Login') }
    ]);
  };

  const handleRoomPress = (room) => {
    // Navigate to the room detail screen
    // You might need to adjust this based on your navigation structure
    navigation.navigate('RoomDetail', { roomId: room.id, room });
    setSearch("");
    setShowSearchResults(false);
  };

  const handleSearchIconPress = () => {
    if (search.trim().length > 0) {
      setShowSearchResults(true);
    }
  };

  const clearSearch = () => {
    setSearch("");
    setShowSearchResults(false);
    setIsSearching(false);
  };

  const renderRoomItem = ({ item }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() => handleRoomPress(item)}
    >
      <Text style={styles.roomTitle}>{item.title || 'Untitled Room'}</Text>
      {item.topic && <Text style={styles.roomTopic}>Topic: {item.topic}</Text>}
      {item.description && (
        <Text style={styles.roomDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  // Conditional rendering happens in the return statement, not with hooks
  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navButton} onPress={handleMenuPress}>
          <Image source={require("../assets/menu.png")} style={styles.link} />
        </TouchableOpacity>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchBar}
            placeholder="Search debates..."
            value={search}
            onChangeText={setSearch}
            onFocus={() => search.length > 0 && setShowSearchResults(true)}
          />
          {search.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.navButton} onPress={handleSearchIconPress}>
          <Image source={require("../assets/search.png")} style={styles.link} />
        </TouchableOpacity>

        <Text style={styles.title}>DebateSphere</Text>

        <TouchableOpacity style={styles.navButton} onPress={handleProfilePress}>
          <Image source={require("../assets/profile.png")} style={styles.link} />
        </TouchableOpacity>
      </View>

      {/* Search Results Modal - conditionally rendered in JSX */}
      <Modal
        visible={showSearchResults}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchResults(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchResultsContainer}>
            <View style={styles.searchResultsHeader}>
              <Text style={styles.searchResultsTitle}>
                {isSearching ? `Search Results (${searchResults.length})` : 'All Rooms'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSearchResults(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>

            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderRoomItem}
                keyExtractor={(item, index) => item.id?.toString() || index.toString()}
                style={styles.resultsList}
                showsVerticalScrollIndicator={false}
              />
            ) : search.length > 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No debates found for "{search}"</Text>
              </View>
            ) : (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No rooms available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
    width: 200,
    fontSize: 16,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    padding: 5,
  },
  clearText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  navButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  link: {
    width: 24,
    height: 24,
    tintColor: "white",
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    zIndex: -1,
  },
  // Search Results Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  searchResultsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 10,
    maxHeight: '70%',
    elevation: 5,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsList: {
    maxHeight: '100%',
  },
  roomItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  roomTopic: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  roomDescription: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});