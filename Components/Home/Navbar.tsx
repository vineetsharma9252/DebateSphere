import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Image,
  FlatList,
  Modal,
  Animated,
  StatusBar
} from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';

const BACKEND_URL = "https://debatesphere-11.onrender.com/api/all_rooms";

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
  success: '#10b981'
};

export default function Navbar() {
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Animation values
  const searchWidth = useState(new Animated.Value(200))[0];
  const modalOpacity = useState(new Animated.Value(0))[0];

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

  const animateSearchWidth = (toValue) => {
    Animated.timing(searchWidth, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const animateModal = (toValue) => {
    Animated.timing(modalOpacity, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    animateSearchWidth(280);
    if (search.length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    if (search.length === 0) {
      animateSearchWidth(200);
    }
  };

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
    navigation.navigate('ChatRoom', {
      username: 'User', // You might want to pass actual username
      roomId: room.roomId || room.id,
      title: room.title,
      desc: room.desc || room.description,
    });
    setSearch("");
    setShowSearchResults(false);
    animateModal(0);
  };

  const handleSearchIconPress = () => {
    if (search.trim().length > 0) {
      setShowSearchResults(true);
      animateModal(1);
    }
  };

  const clearSearch = () => {
    setSearch("");
    setShowSearchResults(false);
    setIsSearching(false);
    animateSearchWidth(200);
  };

  const openSearchModal = () => {
    setShowSearchResults(true);
    animateModal(1);
  };

  const closeSearchModal = () => {
    setShowSearchResults(false);
    animateModal(0);
  };

  const renderRoomItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.roomItem,
        index % 2 === 0 ? styles.roomItemEven : styles.roomItemOdd
      ]}
      onPress={() => handleRoomPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.roomIcon}>
        <Text style={styles.roomIconText}>💬</Text>
      </View>
      <View style={styles.roomContent}>
        <Text style={styles.roomTitle} numberOfLines={1}>
          {item.title || 'Untitled Room'}
        </Text>
        {item.topic && (
          <Text style={styles.roomTopic}>#{item.topic}</Text>
        )}
        {(item.description || item.desc) && (
          <Text style={styles.roomDescription} numberOfLines={2}>
            {item.description || item.desc}
          </Text>
        )}
      </View>
      <View style={styles.roomArrow}>
        <Text style={styles.roomArrowText}>→</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.navbar}>
        {/* Left Section - Menu & Logo */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={handleMenuPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuIcon}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleHomePress} style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🏛️</Text>

          </TouchableOpacity>
        </View>

        {/* Center Section - Search */}
        <View style={styles.centerSection}>
          <Animated.View style={[styles.searchContainer, { width: searchWidth }]}>
            <TextInput
              style={[
                styles.searchBar,
                isSearchFocused && styles.searchBarFocused
              ]}
              placeholder="Search debates..."
              placeholderTextColor={COLORS.textLight}
              value={search}
              onChangeText={setSearch}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
            {search.length > 0 ? (
              <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.searchIconButton} onPress={handleSearchIconPress}>
                <Text style={styles.searchIcon}>🔍</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>

        {/* Right Section - Profile */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Results Modal */}
      <Modal
        visible={showSearchResults}
        animationType="fade"
        transparent={true}
        onRequestClose={closeSearchModal}
        statusBarTranslucent={true}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalOpacity }]}>
          <View style={styles.searchResultsContainer}>
            {/* Header */}
            <View style={styles.searchResultsHeader}>
              <View>
                <Text style={styles.searchResultsTitle}>
                  {isSearching ? `Search Results` : 'All Debate Rooms'}
                </Text>
                <Text style={styles.searchResultsSubtitle}>
                  {isSearching
                    ? `${searchResults.length} debates found for "${search}"`
                    : `${allRooms.length} total rooms available`
                  }
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeSearchModal}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Results List */}
            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderRoomItem}
                keyExtractor={(item, index) => item.roomId?.toString() || item.id?.toString() || index.toString()}
                style={styles.resultsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsListContent}
              />
            ) : search.length > 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsEmoji}>🔍</Text>
                <Text style={styles.noResultsTitle}>No debates found</Text>
                <Text style={styles.noResultsText}>
                  We couldn't find any debates matching "{search}"
                </Text>
                <TouchableOpacity style={styles.exploreButton} onPress={clearSearch}>
                  <Text style={styles.exploreButtonText}>Explore All Debates</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noResults}>
                <Text style={styles.noResultsEmoji}>💬</Text>
                <Text style={styles.noResultsTitle}>No rooms available</Text>
                <Text style={styles.noResultsText}>
                  There are no active debate rooms at the moment
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  navButton: {
    padding: 8,
  },
  menuIcon: {
    width: 20,
    height: 16,
    justifyContent: 'space-between',
  },
  menuLine: {
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  logoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1,
  },
  searchBarFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  clearText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchIconButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  searchIcon: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  profileButton: {
    padding: 8,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: 16,
  },
  // Search Results Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  searchResultsContainer: {
    backgroundColor: COLORS.background,
    marginHorizontal: 20,
    borderRadius: 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  searchResultsSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultsList: {
    maxHeight: '100%',
  },
  resultsListContent: {
    padding: 8,
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginVertical: 4,
    marginHorizontal: 8,
  },
  roomItemEven: {
    backgroundColor: COLORS.card,
  },
  roomItemOdd: {
    backgroundColor: 'rgba(199, 210, 254, 0.1)',
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
    fontSize: 16,
  },
  roomContent: {
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
    marginBottom: 4,
  },
  roomDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  roomArrow: {
    padding: 8,
  },
  roomArrowText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  exploreButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});