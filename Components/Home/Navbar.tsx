import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Image,
  ScrollView,
  Modal,
  StatusBar
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../Contexts/UserContext';
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
  const [allRooms, setAllRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userImage, setUserImage] = useState("");
  const { user } = useUser();
  const username = user.username ;
  const profile_image = user.user_image ;

  const defaultImages = [
    { id: 'nerd_male_1', source: require("../assets/Nerd_male_1.png"), name: "Alex" },
    { id: 'nerd_male_2', source: require("../assets/Nerd_male_2.png"), name: "James" },
    { id: 'nerd_female_1', source: require("../assets/Nerd_female.png"), name: "Tina" },
    { id: 'nerd_female_2', source: require("../assets/Nerd_female_2.png"), name: "Jasmine" },
    { id: 'nerd_male_3', source: require("../assets/Nerd_male_3.png"), name: "John" },
  ];

  const getImageSource = () => {
    if (!userImage) {
      return defaultImages[0].source;
    }
    const defaultImage = defaultImages.find(img => img.id === userImage);
    return defaultImage ? defaultImage.source : defaultImages[0].source;
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(BACKEND_URL);
        console.log("Backend response:", {
          status: response.status,
          dataLength: response.data ? response.data.length : 'no data',
          dataSample: response.data && response.data.length > 0 ? response.data[0] : 'no data'
        });
        if (response.data && Array.isArray(response.data)) {
          const validRooms = response.data
            .filter(room => room && (room.roomId || room._id) && room.title)
            .sort((a, b) => {
              if (a.isActive && !b.isActive) return -1;
              if (!a.isActive && b.isActive) return 1;
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
          setAllRooms(validRooms);
          setFilteredRooms(validRooms);
          console.log("Loaded rooms:", validRooms.map(room => ({
            roomId: room.roomId,
            title: room.title,
            topic: room.topic,
            desc: room.desc,
            isActive: room.isActive,
            createdAt: room.createdAt
          })));
        } else {
          setAllRooms([]);
          setFilteredRooms([]);
        }
      } catch (err) {
        console.error("Error fetching rooms:", err.message);
        Alert.alert("Error", "Failed to load debate rooms. Please try again.");
        setAllRooms([]);
        setFilteredRooms([]);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchImage = async () => {
      try {
        const response = await axios.post("https://debatesphere-11.onrender.com/api/get_details", { username });
        if (response.data && response.data.user_data) {
          setUserImage(response.data.user_data.user_image);
        }
      } catch (error) {
        console.error("Error fetching user image:", error);
      }
    };

    if (username) {
      fetchImage();
    }
    fetchRooms();
  }, [username]);

  useEffect(() => {
    const searchTerm = search.toLowerCase().trim();
    const results = allRooms
      .filter(room => {
        const title = room.title?.toLowerCase() || '';
        const topic = room.topic?.toLowerCase() || '';
        const desc = room.desc?.toLowerCase() || '';
        return title.includes(searchTerm) || topic.includes(searchTerm) || desc.includes(searchTerm);
      })
      .sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    setFilteredRooms(results);
    console.log("Filtered rooms:", results.map(room => ({
      roomId: room.roomId,
      title: room.title,
      topic: room.topic,
      desc: room.desc,
      isActive: room.isActive,
      createdAt: room.createdAt
    })));
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
    setShowModal(false);
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
    setSearch("");
    setShowModal(false);
  };

  const handleRoomPress = (room) => {
    const roomId = room.roomId || room._id;
    if (!roomId) {
      Alert.alert("Error", "This room cannot be accessed");
      return;
    }

    navigation.navigate('ChatRoom', {
      username: username || 'User',
      roomId: roomId,
      title: room.title || 'Untitled Room',
      topic: room.topic || 'General',
      desc: room.desc || 'Join the discussion!',
    });

    setSearch("");
    setShowModal(false);
  };

  const openModal = () => {
    if (!isLoading) {
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const clearSearch = () => {
    setSearch("");
  };

  const renderRoom = (room) => {
    const title = room.title || 'Untitled';
    const topic = room.topic || 'General';
    const desc = room.desc || 'No description';
    const active = room.isActive !== false;
    const date = room.createdAt ? new Date(room.createdAt).toLocaleDateString() : '';

    return (
      <TouchableOpacity
        key={room.roomId || room._id}
        style={[styles.roomCard, !active && styles.roomCardInactive]}
        onPress={() => handleRoomPress(room)}
        disabled={!active}
      >
        <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={styles.badgeText}>{active ? 'Active' : 'Paused'}</Text>
        </View>
        <View style={styles.roomCardBody}>
          <Text style={styles.roomCardTitle}>{title}</Text>
          <Text style={styles.roomCardTopic}>#{topic}</Text>
          <Text style={styles.roomCardDesc} numberOfLines={3}>{desc}</Text>
          <Text style={styles.roomCardDate}>{date}</Text>
        </View>
        <Text style={styles.roomCardArrow}>→</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return <Text style={styles.noResultsText}>Loading debates...</Text>;
    }
    return <Text style={styles.noResultsText}>No debates found</Text>;
  };

  // Log filteredRooms when rendering modal
  console.log("Rendering modal with filteredRooms:", filteredRooms.map(room => ({
    roomId: room.roomId,
    title: room.title,
    topic: room.topic,
    desc: room.desc,
    isActive: room.isActive,
    createdAt: room.createdAt
  })));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.navbar}>
        <View style={styles.leftSection}>
          <TouchableOpacity style={styles.navButton} onPress={handleMenuPress}>
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

        <View style={styles.centerSection}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchBar}
              placeholder="Search debates or tap to browse..."
              placeholderTextColor={COLORS.textLight}
              value={search}
              onChangeText={setSearch}
              onFocus={openModal}
              returnKeyType="search"
              editable={!isLoading}
            />
            {search.length > 0 ? (
              <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.searchIconButton} onPress={openModal} disabled={isLoading}>
                <Text style={[styles.searchIcon, isLoading && { opacity: 0.5 }]}>🔍</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            <View style={styles.profileIcon}>
              <Image source={getImageSource()} style={styles.profileImage} resizeMode="cover" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showModal}
        transparent={true}
        onRequestClose={closeModal}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={closeModal} activeOpacity={1}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.searchResultsHeader}>
              <Text style={styles.searchResultsTitle}>
                {search ? 'Search Results' : 'All Debate Rooms'}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.resultsList} contentContainerStyle={styles.resultsListContent}>
              {filteredRooms.length > 0 ? filteredRooms.map(renderRoom) : renderEmpty()}
            </ScrollView>
          </View>
        </TouchableOpacity>
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
    marginLeft: 8,
  },
  logoIcon: {
    fontSize: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-start',
    paddingTop: 100,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    marginHorizontal: 20,
    borderRadius: 20,
    minHeight: 200, // Ensure modal has enough space
    maxHeight: '80%', // Increased to ensure visibility
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
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
    flexGrow: 1,
  },
  resultsListContent: {
    paddingBottom: 20, // Ensure content isn't cut off
  },
  roomCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  roomCardInactive: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: COLORS.success,
  },
  badgeInactive: {
    backgroundColor: COLORS.warning,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  roomCardBody: {
    flex: 1,
    marginRight: 12,
  },
  roomCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  roomCardTopic: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  roomCardDesc: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  roomCardDate: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 6,
  },
  roomCardArrow: {
    fontSize: 18,
    color: COLORS.primary,
    alignSelf: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    margin: 20,
  },
});