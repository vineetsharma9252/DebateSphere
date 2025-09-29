import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  ScrollView,
  Animated ,
  Image ,
  TouchableOpacity
} from 'react-native';
import { Divider } from "react-native-elements";
import PropTypes from "prop-types";
const { width } = Dimensions.get('window');


export default function Profile() {
    const data = [1, 2 ];
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
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
    return (
        <View style={styles.container}>
        <View style={styles.image_block}>
        <View style={styles.image_block_con}>
        <Image source={require("../assets/profile.png")} style={{height:100 , width:100 , borderWidth:5 , borderColor:"white" , borderRadius:50}}/>
        <View style={{marginRight:200}}>
        <TouchableOpacity>
        <Text style={{fontSize:30 , fontWeight:"bold"}}>Vineet Sharma </Text>
        </TouchableOpacity>
        <Text> Debate Head </Text>
        </View>
        </View>
        <ScrollView>
        <View style={{ alignItems:"center" , justifyContent:"center" , flexDirection:"column" , marginRight:100}}>
        <Text style={{fontSize:20 , fontWeight:"bold"}}>{"\n"}📊 Stats</Text>
        <View style={{flexDirection:"column" , justifyContent:"space-evenly" , alignItems:"center"}}>
        <View style={styles.feedContainer}>
                  {data.map((item) => (
                    <View key={item} style={styles.feedItem}>
                      <Text style={styles.feedText}>🗣️ Feed Item {item}</Text>
                    </View>
                  ))}
        </View>
        </View>
        </View>
        <View style={{ alignItems:"center" , justifyContent:"center" , flexDirection:"column" , marginRight:100}}>
                <Text style={{fontSize:20 , fontWeight:"bold"}}>{"\n"}🔥 Debate History</Text>
                <View style={{flexDirection:"column" , justifyContent:"space-evenly" , alignItems:"center"}}>
                <View style={styles.feedContainer}>
                          {data.map((item) => (
                            <View key={item} style={styles.feedItem}>
                              <Text style={styles.feedText}>🗣️ Feed Item {item}</Text>
                            </View>
                          ))}
                </View>
                </View>
                </View>
        <View style={{ alignItems:"center" , justifyContent:"center" , flexDirection:"column" , marginRight:100}}>
                        <Text style={{fontSize:20 , fontWeight:"bold"}}>{"\n"}🏆 Achievements</Text>
                        <View style={{flexDirection:"column" , justifyContent:"space-evenly" , alignItems:"center"}}>
                        <View style={styles.feedContainer}>
                                  {data.map((item) => (
                                    <View key={item} style={styles.feedItem}>
                                      <Text style={styles.feedText}>🗣️ Feed Item {item}</Text>
                                    </View>
                                  ))}
                        </View>
                        </View>
                        </View>
        </ScrollView>

        </View>
        </View>




    )


}

const styles = StyleSheet.create({
    container:{
    flex: 1,
    justifyContent: 'top',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'


    },
    image_block : {
        flex:1 ,
        padding:5,
        alignItems:"center" ,
        height: 400 ,
        width : "100%" ,
        borderWidth: 2 ,
        borderColor : "white",
    } ,
    image_block_con : {
        borderColor:"green" ,
        borderWidth:4,
        width:"100%" ,
        height:200,
        alignItems:"center",
        justifyContent:"space-evenly",
        flexDirection:"row",
        padding:20,
        gap:90,
        borderRadius:20,
        backgroundColor:"tomato",
        elevation: 20,
        },
    feedContainer: {
        paddingHorizontal: 100,
        width:"100%",
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
        width:"200%",

      },
      feedText: {
        fontSize: 18,
        fontWeight: '500',
      },



    })

Profile.propTypes = {
  title: PropTypes.string.isRequired,
  participants: PropTypes.number,
};