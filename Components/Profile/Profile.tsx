import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  ScrollView,
  Animated,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar
} from 'react-native';
import { Divider } from "react-native-elements";
import PropTypes from "prop-types";
const { width } = Dimensions.get('window');
import axios from 'axios';
import { useUser } from '../../Contexts/UserContext'

const BACKEND_URL = "https://debatesphere-11.onrender.com";

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

export default function Profile() {
    const data = [1, 2];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [edit, setEdit] = useState(false);
    const [desc, setDesc] = useState("");
    const [details, setDetails] = useState({});
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const scrollX = useRef(new Animated.Value(0)).current;
    const { username, setUsername } = useUser();

    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(20))[0];

    // Default images array
    const defaultImages = [
        { id: 'nerd_male_1', source: require("../assets/Nerd_male_1.png"), name: "Alex" },
        { id: 'nerd_male_2', source: require("../assets/Nerd_male_2.png"), name: "James" },
        { id: 'nerd_female_1', source: require("../assets/Nerd_female.png"), name: "Tina" },
        { id: 'nerd_female_2', source: require("../assets/Nerd_female_2.png"), name: "Jasmine" },
        { id: 'nerd_male_3', source: require("../assets/Nerd_male_3.png"), name: "John" },
    ];



    const fetchDetail = async (username) => {
        const response = await axios.post(BACKEND_URL + "/api/get_details", { username });
        console.log("Response is " + response.data.user_data);
        setDetails(response.data.user_data);
        setDesc(response.data.user_data.desc);
        console.log("Details are ", details);
    };

    useEffect(() => {
        if (username) {
            fetchDetail(username);
            animateIn();
        }
    }, [username]);

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

    // Function to get image source based on user_image string
    const getImageSource = () => {
        if (!details.user_image) {
            return defaultImages[0].source;
        }

        // Check if it's a default image
        const defaultImage = defaultImages.find(img => img.id === details.user_image);
        if (defaultImage) {
            return defaultImage.source;
        }

        // Fallback to first default image
        return defaultImages[0].source;
    };

    const updateUserImage = async (imageId) => {
        try {
            await axios.put(BACKEND_URL + "/api/update_user_image", {
                username: username,
                user_image: imageId
            });

            // Refresh user details to get updated image
            await fetchDetail(username);
            Alert.alert('Success', 'Profile image updated successfully!');

        } catch (error) {
            console.error("Error updating user image:", error);
            Alert.alert('Error', 'Failed to update profile image');
        }
    };

    const handleSelectDefaultImage = (image) => {
        updateUserImage(image.id);
        setImageModalVisible(false);
    };

    const renderImageModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={imageModalVisible}
            onRequestClose={() => setImageModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Choose Profile Image</Text>

                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => {
                            Alert.alert('Upload Feature', 'Image upload feature will be implemented soon!');
                            setImageModalVisible(false);
                        }}
                    >
                        <Text style={styles.uploadButtonText}>📷 Upload Photo (Coming Soon)</Text>
                    </TouchableOpacity>

                    <Text style={styles.defaultImagesTitle}>Default Images</Text>

                    <FlatList
                        data={defaultImages}
                        numColumns={2}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.defaultImageItem}
                                onPress={() => handleSelectDefaultImage(item)}
                            >
                                <Image
                                    source={item.source}
                                    style={styles.defaultImage}
                                />
                                <Text style={styles.defaultImageName}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.defaultImagesContainer}
                    />

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setImageModalVisible(false)}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const handleEditingDesc = async () => {
        try {
            await axios.put(BACKEND_URL + "/api/update_desc", { username, desc });
            setEdit(false);
            console.log("Description updated successfully");
            Alert.alert('Success', 'Description updated successfully!');
        } catch (error) {
            console.error("Error updating description:", error);
            Alert.alert('Error', 'Failed to update description');
        }
    };

    // Sample stats data
    const stats = {
        totalDebates: details.total_debates || 0,
        debatesWon: details.debates_won || 0,
        winRate: ((details.debates_won || 0) / ((details.total_debates || 0) + 1) * 100).toFixed(1),
        ranking: details.rank || 'N/A'
    };

    // Sample achievements data
    const achievements = [
        { id: 1, title: "Novice Debater", description: "Participated in 5 debates", icon: "🏅", unlocked: true },
        { id: 2, title: "Silver Tongue", description: "Won 10 debates", icon: "🎤", unlocked: stats.debatesWon >= 10 },
        { id: 3, title: "Top Contender", description: "Reached top 10 ranking", icon: "🌟", unlocked: stats.ranking <= 10 && stats.ranking !== 'N/A' },
        { id: 4, title: "Debate Master", description: "Win rate above 80%", icon: "👑", unlocked: parseFloat(stats.winRate) >= 80 }
    ];

    const recentActivities = [
        { id: 1, type: 'debate', title: 'Politics Debate', result: 'Won', time: '2 hours ago' },
        { id: 2, type: 'debate', title: 'Technology Discussion', result: 'Lost', time: '1 day ago' },
        { id: 3, type: 'achievement', title: 'Novice Debater', result: 'Unlocked', time: '2 days ago' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
            {renderImageModal()}

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.profileHeader}>
                        <TouchableOpacity
                            onPress={() => setImageModalVisible(true)}
                            style={styles.imageContainer}
                        >
                            <Image
                                source={getImageSource()}
                                style={styles.profileImage}
                            />
                            <View style={styles.editImageOverlay}>
                                <Text style={styles.editImageText}>✏️</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.profileInfo}>
                            <Text style={styles.username}>{username}</Text>
                            <Text style={styles.userTitle}>Debate Enthusiast</Text>
                            <View style={styles.rankContainer}>
                                <Text style={styles.rankText}>Rank #{stats.ranking}</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Stats Section */}
                <Animated.View
                    style={[
                        styles.sectionContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Text style={styles.sectionTitle}>📊 Debate Statistics</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.totalDebates}</Text>
                            <Text style={styles.statLabel}>Total Debates</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.debatesWon}</Text>
                            <Text style={styles.statLabel}>Wins</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>{stats.winRate}%</Text>
                            <Text style={styles.statLabel}>Win Rate</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>#{stats.ranking}</Text>
                            <Text style={styles.statLabel}>Ranking</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Description Section */}
                <Animated.View
                    style={[
                        styles.sectionContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>📝 About Me</Text>
                        {!edit && (
                            <TouchableOpacity
                                style={styles.editIconButton}
                                onPress={() => setEdit(true)}
                            >
                                <Text style={styles.editIcon}>✏️</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.descriptionBox}>
                        {edit ? (
                            <View>
                                <TextInput
                                    style={styles.descriptionInput}
                                    value={desc}
                                    onChangeText={setDesc}
                                    multiline
                                    numberOfLines={4}
                                    placeholder="Tell us about yourself..."
                                    placeholderTextColor={COLORS.textLight}
                                />
                                <View style={styles.editButtonContainer}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.saveButton]}
                                        onPress={handleEditingDesc}
                                    >
                                        <Text style={styles.actionButtonText}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.cancelEditButton]}
                                        onPress={() => setEdit(false)}
                                    >
                                        <Text style={styles.actionButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <Text style={styles.descriptionText}>
                                {desc || "No description available. Tap the edit icon to add one."}
                            </Text>
                        )}
                    </View>
                </Animated.View>

                {/* Achievements Section */}
                <Animated.View
                    style={[
                        styles.sectionContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Text style={styles.sectionTitle}>🏆 Achievements</Text>
                    <View style={styles.achievementsGrid}>
                        {achievements.map((achievement) => (
                            <View
                                key={achievement.id}
                                style={[
                                    styles.achievementCard,
                                    !achievement.unlocked && styles.achievementLocked
                                ]}
                            >
                                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                                <View style={styles.achievementInfo}>
                                    <Text style={[
                                        styles.achievementTitle,
                                        !achievement.unlocked && styles.achievementTitleLocked
                                    ]}>
                                        {achievement.title}
                                    </Text>
                                    <Text style={styles.achievementDescription}>
                                        {achievement.description}
                                    </Text>
                                </View>
                                {!achievement.unlocked && (
                                    <Text style={styles.lockedBadge}>🔒</Text>
                                )}
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Recent Activity */}
                <Animated.View
                    style={[
                        styles.sectionContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <Text style={styles.sectionTitle}>📈 Recent Activity</Text>
                    <View style={styles.activityList}>
                        {recentActivities.map((activity) => (
                            <View key={activity.id} style={styles.activityItem}>
                                <View style={[
                                    styles.activityIcon,
                                    activity.result === 'Won' && styles.activityWon,
                                    activity.result === 'Lost' && styles.activityLost,
                                    activity.type === 'achievement' && styles.activityAchievement
                                ]}>
                                    <Text style={styles.activityIconText}>
                                        {activity.type === 'debate' ? '💬' : '🏆'}
                                    </Text>
                                </View>
                                <View style={styles.activityInfo}>
                                    <Text style={styles.activityTitle}>{activity.title}</Text>
                                    <Text style={[
                                        styles.activityResult,
                                        activity.result === 'Won' && styles.resultWon,
                                        activity.result === 'Lost' && styles.resultLost
                                    ]}>
                                        {activity.result}
                                    </Text>
                                </View>
                                <Text style={styles.activityTime}>{activity.time}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>
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
    header: {
        backgroundColor: COLORS.primary,
        paddingTop: 60,
        paddingBottom: 30,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageContainer: {
        position: 'relative',
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    editImageOverlay: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: COLORS.primary,
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    editImageText: {
        color: 'white',
        fontSize: 14,
    },
    profileInfo: {
        flex: 1,
        marginLeft: 20,
    },
    username: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    userTitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    rankContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    rankText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    sectionContainer: {
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    editIconButton: {
        padding: 8,
    },
    editIcon: {
        fontSize: 18,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        backgroundColor: COLORS.card,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    descriptionBox: {
        backgroundColor: COLORS.card,
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    descriptionText: {
        fontSize: 16,
        color: COLORS.text,
        lineHeight: 22,
        fontFamily: 'serif',
    },
    descriptionInput: {
        fontSize: 16,
        color: COLORS.text,
        lineHeight: 22,
        borderWidth: 1,
        borderColor: COLORS.primaryLight,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        minHeight: 120,
        backgroundColor: COLORS.background,
        textAlignVertical: 'top',
    },
    editButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    actionButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 80,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
    },
    cancelEditButton: {
        backgroundColor: COLORS.textLight,
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    achievementsGrid: {
        gap: 12,
    },
    achievementCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
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
    achievementLocked: {
        opacity: 0.6,
    },
    achievementIcon: {
        fontSize: 32,
        marginRight: 16,
    },
    achievementInfo: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    achievementTitleLocked: {
        color: COLORS.textLight,
    },
    achievementDescription: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    lockedBadge: {
        fontSize: 16,
    },
    activityList: {
        gap: 12,
    },
    activityItem: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
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
    activityIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityWon: {
        backgroundColor: '#dcfce7',
    },
    activityLost: {
        backgroundColor: '#fef2f2',
    },
    activityAchievement: {
        backgroundColor: '#fef7cd',
    },
    activityIconText: {
        fontSize: 18,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    activityResult: {
        fontSize: 14,
        fontWeight: '500',
    },
    resultWon: {
        color: COLORS.success,
    },
    resultLost: {
        color: COLORS.danger,
    },
    activityTime: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    uploadButton: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    uploadButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    defaultImagesTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    defaultImagesContainer: {
        paddingBottom: 20,
    },
    defaultImageItem: {
        width: '48%',
        alignItems: 'center',
        marginBottom: 16,
        padding: 12,
        backgroundColor: COLORS.background,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    defaultImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 8,
    },
    defaultImageName: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    cancelButton: {
        backgroundColor: COLORS.textLight,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

Profile.propTypes = {
    title: PropTypes.string.isRequired,
    participants: PropTypes.number,
};

export default Profile;