import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    Image,
    Animated,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import axios from 'axios';
import { useState, useEffect } from 'react'
import { useUser } from '../../Contexts/UserContext';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const BACKEND_URL = "https://debatesphere-11.onrender.com/login";
const GOOGLE_AUTH_URL = "https://debatesphere-11.onrender.com/auth/google";

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '555564188297-qe9k1l1t0lvkm4sebgbtq8o51idtlnqk.apps.googleusercontent.com', // Get from Google Cloud Console
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});

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

const SignIn = ({ }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);
    const navigation = useNavigation();
    const { login } = useUser();

    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const slideAnim = useState(new Animated.Value(30))[0];
    const logoScale = useState(new Animated.Value(0.8))[0];

    useEffect(() => {
        animateIn();
    }, []);

    const animateIn = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
                toValue: 1,
                duration: 700,
                useNativeDriver: true,
            })
        ]).start();
    };

    const handleNewAccount = () => {
        navigation.navigate("SignUp");
    }

    const handleSignIn = async () => {
        if (!username.trim() || !password.trim()) {
            alert("Please enter both username and password");
            return;
        }

        setIsLoading(true);
        try {
            console.log("Username at SignIn is " + username);
            console.log("Password is " + password);
            const response = await axios.post(BACKEND_URL, { username, password });

            if (response.status === 200) {
                // ✅ Update the context with the logged-in user
                login({ username: username });

                // Navigate to Dashboard
                navigation.navigate("Dashboard", {username: username});
            } else {
                alert("Something went wrong try again")
            }
        } catch (error) {
            console.log("Login error:" + error);
            alert("Login failed. Please check your credentials.");
        } finally {
            setIsLoading(false);
        }
    }

    const handleGoogleAuth = async () => {
        setGoogleLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();

            // Send the ID token to your backend
            const { idToken } = userInfo;

            console.log('Sending Google auth request with ID token...');

            const response = await axios.post(GOOGLE_AUTH_URL, {
                idToken: idToken
            });

            console.log('Google auth response:', response.data);

            if (response.status === 200 || response.status === 201) {
                const { user } = response.data;

                // Update the context with the logged-in user
                login({
                    username: user.username,
                    email: user.email,
                    profilePicture: user.profilePicture
                });

                // Navigate to Dashboard
                navigation.navigate("Dashboard", { username: user.username });

                Alert.alert("Success", "Google authentication successful!");
            } else {
                Alert.alert("Error", "Google authentication failed with status: " + response.status);
            }
        } catch (error) {
            console.log("Google auth error:", error);

            // More detailed error logging
            if (error.response) {
                console.log('Backend error response:', error.response.data);
                Alert.alert(
                    "Authentication Error",
                    error.response.data.error || error.response.data.details || "Google authentication failed"
                );
            } else if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // User cancelled the login flow
                console.log('User cancelled Google sign in');
            } else if (error.code === statusCodes.IN_PROGRESS) {
                Alert.alert("In Progress", "Sign in is already in progress");
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert("Error", "Google Play Services not available");
            } else {
                console.log('Other error:', error);
                Alert.alert("Error", "Google authentication failed. Please try again.");
            }
        } finally {
            setGoogleLoading(false);
        }
    }

    const handleForgotPassword = () => {
        alert("Password reset feature coming soon!");
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
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
                    <Animated.View
                        style={[
                            styles.logoContainer,
                            { transform: [{ scale: logoScale }] }
                        ]}
                    >
                        <Text style={styles.logoIcon}>🏛️</Text>
                    </Animated.View>
                    <Text style={styles.welcomeTitle}>Welcome Back</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Sign in to continue your debate journey
                    </Text>
                </Animated.View>

                {/* Form Section */}
                <Animated.View
                    style={[
                        styles.formContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    {/* Username Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Username</Text>
                        <TextInput
                            style={[
                                styles.input,
                                focusedInput === 'username' && styles.inputFocused
                            ]}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter your username"
                            placeholderTextColor={COLORS.textLight}
                            onFocus={() => setFocusedInput('username')}
                            onBlur={() => setFocusedInput(null)}
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <TextInput
                            style={[
                                styles.input,
                                focusedInput === 'password' && styles.inputFocused
                            ]}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={true}
                            placeholder="Enter your password"
                            placeholderTextColor={COLORS.textLight}
                            onFocus={() => setFocusedInput('password')}
                            onBlur={() => setFocusedInput(null)}
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Forgot Password */}
                    <TouchableOpacity
                        style={styles.forgotPasswordContainer}
                        onPress={handleForgotPassword}
                    >
                        <Text style={styles.forgotPasswordText}>
                            Forgot your password?
                        </Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.signInButton,
                            pressed && styles.signInButtonPressed,
                            isLoading && styles.signInButtonDisabled
                        ]}
                        onPress={handleSignIn}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.buttonText}>Signing In...</Text>
                            </View>
                        ) : (
                            <Text style={styles.buttonText}>Sign In</Text>
                        )}
                    </Pressable>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google Sign In Button */}
                    <View style={styles.googleButtonContainer}>
                        <GoogleSigninButton
                            style={styles.googleButton}
                            size={GoogleSigninButton.Size.Wide}
                            color={GoogleSigninButton.Color.Dark}
                            onPress={handleGoogleAuth}
                            disabled={googleLoading}
                        />
                        {googleLoading && (
                            <View style={styles.googleLoadingOverlay}>
                                <Text style={styles.googleLoadingText}>Signing in...</Text>
                            </View>
                        )}
                    </View>

                    {/* Sign Up Link */}
                    <View style={styles.signUpContainer}>
                        <Text style={styles.signUpText}>
                            Don't have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={handleNewAccount}>
                            <Text style={styles.signUpLink}>Create one</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        paddingTop: 20,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    logoIcon: {
        fontSize: 32,
    },
    welcomeTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 22,
    },
    formContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: COLORS.text,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputFocused: {
        borderColor: COLORS.primary,
        backgroundColor: '#ffffff',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    signInButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 24,
    },
    signInButtonPressed: {
        backgroundColor: COLORS.secondary,
        transform: [{ scale: 0.98 }],
    },
    signInButtonDisabled: {
        opacity: 0.7,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#e2e8f0',
    },
    dividerText: {
        color: COLORS.textLight,
        fontSize: 14,
        fontWeight: '500',
        marginHorizontal: 12,
    },
    googleButtonContainer: {
        position: 'relative',
        marginBottom: 24,
    },
    googleButton: {
        width: '100%',
        height: 48,
    },
    googleLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    googleLoadingText: {
        color: COLORS.text,
        fontWeight: '600',
    },
    signUpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signUpText: {
        color: COLORS.textLight,
        fontSize: 14,
    },
    signUpLink: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default SignIn;