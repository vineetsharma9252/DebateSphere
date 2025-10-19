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
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigation } from "@react-navigation/native";
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const BACKEND_URL = "https://debatesphere-11.onrender.com/signup";
const GOOGLE_AUTH_URL = "https://debatesphere-11.onrender.com/auth/google";

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

const SignUp = () => {
    const navigation = useNavigation();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);

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

    const handleCreatedAccount = () => {
        navigation.navigate("SignIn");
    }

    const validateForm = () => {
        if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
            Alert.alert('Error', 'Please fill in all fields');
            return false;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return false;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password should be at least 6 characters long');
            return false;
        }

        if (!email.includes('@')) {
            Alert.alert('Error', 'Please enter a valid email address');
            return false;
        }

        return true;
    }

    const handleSignUp = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            console.log("Signup attempt:", { username, email });
            const response = await axios.post(BACKEND_URL, { username, email, password });

            console.log("Response:", response);

            if (response.status === 201) {
                Alert.alert('Success', 'Account created successfully!');
                console.log("User Created");
                navigation.navigate("SignIn");
            } else if (response.status === 409) {
                Alert.alert('Account Exists', 'User already exists. Please login.');
                navigation.navigate("SignIn");
            } else if (response.status === 400) {
                Alert.alert('Error', 'Missing required fields');
            } else {
                Alert.alert('Error', 'Something went wrong. Please try again.');
            }
        } catch (error) {
            console.log("Signup error:", error);
            if (error.response?.status === 409) {
                Alert.alert('Account Exists', 'User already exists. Please login.');
                navigation.navigate("SignIn");
            } else {
                Alert.alert('Error', 'Network error. Please check your connection and try again.');
            }
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

            const response = await axios.post(GOOGLE_AUTH_URL, {
                idToken: idToken
            });

            if (response.status === 200 || response.status === 201) {
                const { user, token } = response.data;

                Alert.alert('Success', 'Account created successfully with Google!');

                // Navigate to Dashboard directly since user is already logged in
                navigation.navigate("Dashboard", { username: user.username });
            } else {
                Alert.alert("Error", "Google authentication failed");
            }
        } catch (error) {
            console.log("Google auth error:", error);

            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // User cancelled the login flow
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // Operation (e.g. sign in) is in progress already
                Alert.alert("In Progress", "Sign in is already in progress");
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                // Play services not available or outdated
                Alert.alert("Error", "Google Play Services not available");
            } else {
                // Some other error happened
                Alert.alert("Error", "Google authentication failed. Please try again.");
            }
        } finally {
            setGoogleLoading(false);
        }
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
                    <Text style={styles.welcomeTitle}>Join DebateSphere</Text>
                    <Text style={styles.welcomeSubtitle}>
                        Create your account and start debating
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
                    {/* Google Sign Up Button - Added at the top */}
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
                                <Text style={styles.googleLoadingText}>Signing up...</Text>
                            </View>
                        )}
                    </View>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or sign up with email</Text>
                        <View style={styles.dividerLine} />
                    </View>

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
                            autoCorrect={false}
                        />
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email</Text>
                        <TextInput
                            style={[
                                styles.input,
                                focusedInput === 'email' && styles.inputFocused
                            ]}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email"
                            placeholderTextColor={COLORS.textLight}
                            onFocus={() => setFocusedInput('email')}
                            onBlur={() => setFocusedInput(null)}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
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
                            placeholder="Create a password"
                            placeholderTextColor={COLORS.textLight}
                            onFocus={() => setFocusedInput('password')}
                            onBlur={() => setFocusedInput(null)}
                            autoCapitalize="none"
                        />
                        <Text style={styles.passwordHint}>
                            Must be at least 6 characters long
                        </Text>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Confirm Password</Text>
                        <TextInput
                            style={[
                                styles.input,
                                focusedInput === 'confirmPassword' && styles.inputFocused,
                                confirmPassword && password !== confirmPassword && styles.inputError
                            ]}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={true}
                            placeholder="Confirm your password"
                            placeholderTextColor={COLORS.textLight}
                            onFocus={() => setFocusedInput('confirmPassword')}
                            onBlur={() => setFocusedInput(null)}
                            autoCapitalize="none"
                        />
                        {confirmPassword && password !== confirmPassword && (
                            <Text style={styles.errorText}>Passwords do not match</Text>
                        )}
                    </View>

                    {/* Sign Up Button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.signUpButton,
                            pressed && styles.signUpButtonPressed,
                            isLoading && styles.signUpButtonDisabled
                        ]}
                        onPress={handleSignUp}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.buttonText}>Creating Account...</Text>
                            </View>
                        ) : (
                            <Text style={styles.buttonText}>Create Account</Text>
                        )}
                    </Pressable>

                    {/* Terms and Conditions */}
                    <View style={styles.termsContainer}>
                        <Text style={styles.termsText}>
                            By creating an account, you agree to our{' '}
                            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                        </Text>
                    </View>

                    {/* Sign In Link */}
                    <View style={styles.signInContainer}>
                        <Text style={styles.signInText}>
                            Already have an account?{' '}
                        </Text>
                        <TouchableOpacity onPress={handleCreatedAccount}>
                            <Text style={styles.signInLink}>Sign in</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
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
        paddingVertical: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
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
    inputError: {
        borderColor: COLORS.danger,
    },
    passwordHint: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
        fontStyle: 'italic',
    },
    errorText: {
        fontSize: 12,
        color: COLORS.danger,
        marginTop: 4,
        fontWeight: '500',
    },
    signUpButton: {
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
        marginBottom: 20,
    },
    signUpButtonPressed: {
        backgroundColor: COLORS.secondary,
        transform: [{ scale: 0.98 }],
    },
    signUpButtonDisabled: {
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
    termsContainer: {
        marginBottom: 24,
    },
    termsText: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 16,
    },
    termsLink: {
        color: COLORS.primary,
        fontWeight: '500',
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInText: {
        color: COLORS.textLight,
        fontSize: 14,
    },
    signInLink: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
});

export default SignUp;