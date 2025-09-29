import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SignIn from './Components/Auth/SignIn';
import SignUp from './Components/Auth/SignUp';
import Navbar from './Components/Home/Navbar';
import Dashboard from './Components/Home/Dashboard' ;
import Profile from './Components/Profile/Profile' ;
import Notification from './Components/Profile/Notification';
import Contact from './Components/Contact/Contact';
import ChatRoom from './Components/Room/ChatRoom' ;

const Stack = createStackNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <View style={styles.container}>

            <ChatRoom />

        </View>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1, // takes remaining space above navbar
  },
});

export default App;
