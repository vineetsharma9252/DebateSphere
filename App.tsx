// App.js (Simpler Version)
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
import { UserProvider, useUser } from './Contexts/UserContext';
import LoadingScreen from './Components/loading/LoadingScreen';

// Create wrapper components directly
const DashboardWithNavbar = ({ navigation, route }) => (
  <View style={styles.container}>
    <Navbar navigation={navigation} />
    <View style={styles.content}>
      <Dashboard navigation={navigation} route={route} />
    </View>
  </View>
);

const NotificationWithNavbar = ({ navigation, route }) => (
  <View style={styles.container}>
    <Navbar navigation={navigation} />
    <View style={styles.content}>
      <Notification navigation={navigation} route={route} />
    </View>
  </View>
);

const ContactWithNavbar = ({ navigation, route }) => (
  <View style={styles.container}>
    <Navbar navigation={navigation} />
    <View style={styles.content}>
      <Contact navigation={navigation} route={route} />
    </View>
  </View>
);

// Profile without Navbar
const ProfileWithoutNavbar = ({ navigation, route }) => (
  <View style={styles.container}>
    <View style={styles.content}>
      <Profile navigation={navigation} route={route} />
    </View>
  </View>
);

const DebatePageWrapper = ({ navigation, route }) => {
  const { topic, username } = route.params || {};
  return <DebatePage topic={topic} username={username} navigation={navigation} />;
};

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen
            name="Dashboard"
            component={DashboardWithNavbar}
            options={{ title: 'DebateSphere', headerShown:false }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileWithoutNavbar}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Notification"
            component={NotificationWithNavbar}
            options={{ title: 'Notifications' }}
          />
          <Stack.Screen
            name="Contact"
            component={ContactWithNavbar}
            options={{ title: 'Contact' }}
          />
          <Stack.Screen
            name="DebatePage"
            component={DebatePageWrapper}
            options={({ route }) => ({
              title: `${route.params?.topic || 'Debates'} Debates`,
              headerShown: true
            })}
          />
          <Stack.Screen
            name="ChatRoom"
            component={ChatRoom}
            options={{ title: 'Debate Room' }}
          />
        </>
      ) : (
        <>
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
        </>
      )}
    </Stack.Navigator>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </UserProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default App;