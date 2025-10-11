import React, { useState, useRef,useEffect } from 'react';
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
  TextInput
} from 'react-native';
import { Divider } from "react-native-elements";
import PropTypes from "prop-types";
const { width } = Dimensions.get('window');
import axios from 'axios' ;
import { useUser } from '../../Contexts/UserContext'
const BACKEND_URL = "https://debatesphere-11.onrender.com";


export default function Profile() {
    const data = [1, 2];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [edit , setEdit]= useState(false) ;
    const [desc  , setDesc] = useState("");
    const [details , setDetails] = useState({}) ;
    const scrollX = useRef(new Animated.Value(0)).current;
    const { username, setUsername } = useUser();
    const fetchDesc = async (username)=>{

        const response = await axios.post(BACKEND_URL+"/api/get_desc",{username});

        setDesc(response.data.desc);


    }
    const fetchDetail = async (username)=>{

        const response = await axios.post(BACKEND_URL+"/api/get_details", {username});


        }
useEffect(() => {
    if (username) {
      fetchDesc(username);
    }
  }, [username]);
    useEffect(()=>{


        fetchDesc(username) ;
        },[])

    console.log("Current Description is " + desc) ;
    const renderPagination = () => {
        return (
            <View style={styles.pagination}>
                {data.map((_, index) => (
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

        const handleEditingDesc = async () => {
            try {
                await axios.put(BACKEND_URL + "/api/update_desc", { username, desc });
                setEdit(false); // Make sure this is called after successful update
                console.log("Description updated successfully");
            } catch (error) {
                console.error("Error updating description:", error);
            }
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
            <Animated.View style={[styles.sliderItem, { width, transform: [{ scale }] }]}>
                <Text style={styles.sliderText}>🔥 Slider Item {item}</Text>
            </Animated.View>
        );
    };

    // Sample stats data
    const stats = {
        totalDebates: 25,
        debatesWon: 18,
        winRate: 72,
        ranking: 5
    };

    // Sample achievements data
    const achievements = [
        { id: 1, title: "Novice Debater", description: "Participated in 5 debates", icon: "🏅" },
        { id: 2, title: "Silver Tongue", description: "Won 10 debates", icon: "🎤" },
        { id: 3, title: "Top Contender", description: "Reached top 10 ranking", icon: "🌟" }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.image_block}>
                <View style={styles.image_block_con}>
                    <Image
                        source={require("../assets/Nerd_male_1.png")}
                        style={{height:140, width:110, borderWidth:4, borderColor:"white", borderRadius:50}}
                    />
                    <View style={{marginRight:200}}>
                        <TouchableOpacity>
                            <Text style={{fontSize:30, fontWeight:"bold"}}>{username}</Text>
                        </TouchableOpacity>
                        <Text>Debate Head</Text>
                        <Text>#Rank - 234</Text>
                    </View>
                </View>
                <ScrollView contentContainerStyle={{ width: "100%" }}>
                    {/* Stats Section */}
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionTitle}>Description</Text>

                      // In the JSX return, replace the conditional edit section with:
                      <View style={styles.descriptionBox}>
                          {edit ? (
                              <Text>
                                  <TextInput
                                      style={styles.descriptionInput}
                                      value={desc}
                                      onChangeText={setDesc}
                                      multiline
                                      numberOfLines={4}
                                  />
                                  <View style={styles.editButtonContainer}>
                                      <TouchableOpacity onPress={handleEditingDesc} style={styles.editButton}>
                                          <Image source={require("../assets/right.png")} style={{height:25 , width:25,marginTop:6}}/>
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={() => setEdit(false)} style={styles.cancelButton}>
                                          <Image source={require("../assets/cancel.png")} style={{height:25 , width:25,marginTop:8}}/>
                                      </TouchableOpacity>
                                  </View>
                              </Text>
                          ) : (
                              <Text>
                                  <Text style={styles.descriptionText}>{desc || "No description available"}</Text>
                                  <TouchableOpacity onPress={() => setEdit(true)} style={styles.editButton, {marginLeft:250}}>
                                    <Image source={require("../assets/edit.png")} style={{height:18 , width:20,marginLeft:260,marginTop:10}} />
                                  </TouchableOpacity>
                              </Text>
                          )}
                      </View>
                    </View>
                    <View style={{ alignItems:"left", justifyContent:"center", flexDirection:"column", marginRight:100}}>
                        <Text style={{fontSize:20, fontWeight:"bold",marginLeft:20}}>{"\n"}📊 Stats</Text>
                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.totalDebates}</Text>
                                <Text style={styles.statLabel}>Total Debates</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.debatesWon}</Text>
                                <Text style={styles.statLabel}>Debates Won</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.winRate}%</Text>
                                <Text style={styles.statLabel}>Win Rate</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>#{stats.ranking}</Text>
                                <Text style={styles.statLabel}>Ranking</Text>
                            </View>
                        </View>
                    </View>

                    {/* Debate History Section */}
                    <View style={{ alignItems:"center", justifyContent:"center", flexDirection:"column", marginRight:100}}>
                        <Text style={{fontSize:20, fontWeight:"bold"}}>{"\n"}🔥 Debate History</Text>
                        <View style={{flexDirection:"column", justifyContent:"space-evenly", alignItems:"center"}}>
                            <View style={styles.feedContainer}>
                                {data.map((item) => (
                                    <View key={item} style={styles.feedItem}>
                                        <Text style={styles.feedText}>🗣️ Feed Item {item}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Achievements Section */}
                    <View style={{ alignItems:"center", justifyContent:"center", flexDirection:"column", marginRight:100}}>
                        <Text style={{fontSize:20, fontWeight:"bold"}}>{"\n"}🏆 Achievements</Text>
                        <View style={{flexDirection:"column", justifyContent:"space-evenly", alignItems:"center"}}>
                            <View style={styles.achievementsContainer}>
                                {achievements.map((achievement) => (
                                    <View key={achievement.id} style={styles.achievementItem}>
                                        <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                                        <View style={styles.achievementTextContainer}>
                                            <Text style={styles.achievementTitle}>{achievement.title}</Text>
                                            <Text style={styles.achievementDescription}>{achievement.description}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'top',
        alignItems: 'center',
        backgroundColor: '#f5f5f5'
    },
    image_block: {
        flex: 1,
        padding: 5,
        alignItems: "center",
        height: 400,
        width: "100%",
        borderWidth: 2,
        borderColor: "white",
    },
    image_block_con: {
        borderColor: "green",
        borderWidth: 4,
        width: "100%",
        height: 200,
        alignItems: "center",
        justifyContent: "space-evenly",
        flexDirection: "row",
        padding: 20,
        gap: 90,
        borderRadius: 20,
        backgroundColor: "tomato",
        elevation: 20,
    },
    feedContainer: {
        paddingHorizontal: 100,
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    feedItem: {
        height: 200,
        marginVertical: 8,
        borderRadius: 10,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        width: "200%",
    },
    feedText: {
        fontSize: 18,
        fontWeight: '500',
    },
    statsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-around",
        padding: 10,
        width: "100%",
    },
    statItem: {
        alignItems: "center",
        width: "45%",
        marginVertical: 10,
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 16,
        color: '#666',
    },
    achievementsContainer: {
        width: "100%",
        paddingHorizontal: 10,
    },
    achievementItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginVertical: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    achievementIcon: {
        fontSize: 30,
        marginRight: 10,
    },
    achievementTextContainer: {
        flex: 1,
    },
    achievementTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    achievementDescription: {
        fontSize: 14,
        color: '#666',
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: 10,
        alignSelf: 'center',
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: '#333',
    },
    paginationDotInactive: {
        backgroundColor: '#ccc',
    },
    sliderItem: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 200,
        backgroundColor: 'white',
        borderRadius: 10,
        elevation: 2,
    },
    sliderText: {
        fontSize: 20,
        fontWeight: 'bold',
    } ,
    sectionContainer: {
            width: "100%", // Ensure it takes full width of parent
            paddingHorizontal: 15, // Consistent padding
            marginBottom: 20,
            alignItems: "flex-start", // Align content to left to prevent overflow
        },
        sectionTitle: {
            fontSize: 20,
            fontWeight: "bold",
            marginBottom: 12,
            alignSelf: "flex-start", // Ensure title stays left-aligned
        },
        descriptionBox: {
            backgroundColor: "white",
            padding: 15,
            borderRadius: 10,
            width: "100%", // Force box to stay within parent bounds
            elevation: 3,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
            alignSelf: "stretch", // Ensure it respects parent container width
        },
    descriptionText: {
      fontSize: 16,
      color: "#333",
      lineHeight: 22,
      textAlign: "justify",
      fontFamily:'serif',

    },
    sectionContainer: {
        width: "100%",
        paddingHorizontal: 15,  // ← Add proper padding
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 12,
        alignSelf: 'flex-start',  // ← Align to left
    },
    descriptionBox: {
        backgroundColor: "white",
        padding: 15,
        borderRadius: 10,
        width: "100%",
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    descriptionViewMode: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    descriptionInput: {
        fontSize: 16,
        color: "#333",
        lineHeight: 22,
        textAlign: "left",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
        minHeight: 100,
        width: '100%',
    },
    editButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 20,

    },
    editButton: {
        backgroundColor: "white",
        width:30,
        height:20,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 10,

    },
    editIconButton: {
        padding: 5,

    },

});

Profile.propTypes = {
    title: PropTypes.string.isRequired,
    participants: PropTypes.number,
};