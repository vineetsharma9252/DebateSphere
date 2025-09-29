// Navbar.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert  , TextInput, Image } from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react' ;
import { SearchBar } from "react-native-elements";

export default function Navbar() {
  const navigation = useNavigation();

  const handleMenuPress = () => {
    // Check if drawer navigation is available
    if (navigation.openDrawer) {
      navigation.openDrawer();
    } else {
      // Fallback: navigate to a menu screen or show alert
      Alert.alert('Menu', 'Drawer navigation not available');
      // Alternatively, you can navigate to a different screen:
      // navigation.navigate('Menu');
    }
  };

  const handleHomePress = () => {
    navigation.navigate('Home');
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };
  const [search , setSearch ] = useState("") ;
  const handleSettingsPress = () => {
    navigation.navigate('Settings');
  };

  return (
    <View style={styles.navbar}>
      <TouchableOpacity style={ styles.navButton } onPress={handleMenuPress}>
         <Image source={require("../assets/menu.png")} style={styles.link} />
      </TouchableOpacity>
      <TouchableOpacity>
      {/* SearchBar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search debates..."
        value={search}
        onChangeText={(text) => setSearch(text)}
      />
      </TouchableOpacity>
      <TouchableOpacity style={ styles.navButton }>
         <Image source={require("../assets/search.png")} style={styles.link} />
      </TouchableOpacity>

      <Text style={styles.title}>DebateSphere</Text>

      <TouchableOpacity style={styles.navButton} onPress={handleProfilePress}>
        <Image source={require("../assets/profile.png")} style={styles.link} />
      </TouchableOpacity>


    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#4CAF50",
    borderRadius: 10
  },
  navButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  link: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
  }
});