import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SignIn from './Components/Auth/SignIn';
import SignUp from './Components/Auth/SignUp';
import Navbar from './Components/Home/Navbar';
import Dashboard from './Components/Home/Dashboard';
import Profile from './Components/Profile/Profile';
import Notification from './Components/Profile/Notification';
import Contact from './Components/Contact/Contact';
import ChatRoom from './Components/Room/ChatRoom';
import DebatePage from './Components/Room/DebatePages';

// Wrapper for screens with Navbar
function MainScreen({ component: Component, navigation, route }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Component navigation={navigation} route={route} />
      </View>
      <Navbar navigation={navigation} />
    </View>
  );
}

// Wrapper for DebatePage to pass topic and username as props
function DebatePageWrapper({ navigation, route }) {
  const { topic, username } = route.params || "Debates";
  return <DebatePage topic={topic} username={username} navigation={navigation} />;
}

const Stack = createStackNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="DebatePage">
          <Stack.Screen
            name="SignIn"
            component={SignIn}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUp}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Dashboard"
            options={{ title: 'DebateSphere' }}
          >
            {(props) => <MainScreen {...props} component={Dashboard} />}
          </Stack.Screen>
          <Stack.Screen
            name="Profile"
            options={{ title: 'Profile' }}
          >
            {(props) => <MainScreen {...props} component={Profile} />}
          </Stack.Screen>
          <Stack.Screen
            name="Notification"
            options={{ title: 'Notifications' }}
          >
            {(props) => <MainScreen {...props} component={Notification} />}
          </Stack.Screen>
          <Stack.Screen
            name="Contact"
            options={{ title: 'Contact' }}
          >
            {(props) => <MainScreen {...props} component={Contact} />}
          </Stack.Screen>
          <Stack.Screen
                      name="DebatePage"
                      component={DebatePageWrapper}
                      options={({ route }) => ({
                        title: `${route.params?.topic || 'Debates'} Debates`,
                      })}
                    />
          <Stack.Screen
            name="ChatRoom"
            component={ChatRoom}
            options={{ title: 'Debate Room' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1, // Takes remaining space above Navbar
  },
});

export default App;