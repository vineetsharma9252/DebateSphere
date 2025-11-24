// App.js
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
import { UserProvider, useUser } from './Contexts/UserContext'; // Fixed import
import LoadingScreen from './Components/loading/LoadingScreen'; // Fixed import

// Wrapper for screens with Navbar
function MainScreen({ component: Component, navigation, route }) {
  return (
    <View style={styles.container}>
      <Navbar navigation={navigation} />
      <View style={styles.content}>
        <Component navigation={navigation} route={route} />
      </View>
    </View>
  );
}

// Wrapper for DebatePage to pass topic and username as props
function DebatePageWrapper({ navigation, route }) {
  const { topic, username } = route.params || {};
  return <DebatePage topic={topic} username={username} navigation={navigation} />;
}

const Stack = createStackNavigator();

// Separate navigator component to use the hook
function AppNavigator() {
  const { user, isLoading } = useUser();

  // Show loading screen while checking authentication state
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator>
      {user ? (
        // User is logged in - show main app screens
        <>
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
        // User is not logged in - show auth screens
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