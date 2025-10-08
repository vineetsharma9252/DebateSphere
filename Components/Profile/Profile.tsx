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
  TouchableOpacity
} from 'react-native';
import { Divider } from "react-native-elements";
import PropTypes from "prop-types";
const { width } = Dimensions.get('window');
import axios from 'axios' ;
const BACKEND_URL = "https://debatesphere-11.onrender.com";


export default function Profile() {
    const data = [1, 2];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [desc  , setDesc] = useState("");
    const scrollX = useRef(new Animated.Value(0)).current;
    const fetchDesc = async ()=>{

        const response = await axios.get(BACKEND_URL+"/api/get_desc",{username});
        setDesc(response.data);


    }
    useEffect(()=>{


        fetchDesc() ;
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

    const handleEditingDesc=  async ()=>{

        const response = await axios.put(BACKEND_URL+"/api/update_desc",{username , desc});



        }
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
                            <Text style={{fontSize:30, fontWeight:"bold"}}>Vineet Sharma</Text>
                        </TouchableOpacity>
                        <Text>Debate Head</Text>
                        <Text>#Rank - 234</Text>
                    </View>
                </View>
                <ScrollView>
                    {/* Stats Section */}
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionTitle}>Description</Text>
                      <View style={styles.descriptionBox}>
                        <Text style={styles.descriptionText}>
                          Hi, this is Vineet Sharma. I am currently pursuing B.Tech in Computer Science and Engineering at NIT.
                        </Text>
                      <View style={{ borderWidth:3 , borderColor:"white" , backgroundColor:"green",width:50, padding:2 , alignItems:"center", borderRadius:10, marginLeft:-5}}>
                      <TouchableOpacity>
                      <Text style={{color:"white"}} onclick={handleEditingDesc()}>Edit </Text>
                      </TouchableOpacity>
                      </View>
                      </View>
                    </View>



                    <View style={{ alignItems:"center", justifyContent:"center", flexDirection:"column", marginRight:100}}>
                        <Text style={{fontSize:20, fontWeight:"bold"}}>{"\n"}📊 Stats</Text>
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
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 10,
      width: "100%",
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 8,
      marginRight:100
    },
    descriptionBox: {
      backgroundColor: "white",
      padding: 30,
      borderRadius: 10,
      marginRight:100,
      width: "90%",
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
    },
    descriptionText: {
      fontSize: 16,
      color: "#333",
      lineHeight: 22,
      textAlign: "justify",
    },

});

Profile.propTypes = {
    title: PropTypes.string.isRequired,
    participants: PropTypes.number,
};