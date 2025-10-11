// SignIn.js
import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Pressable,
    Image
} from 'react-native';
import { useNavigation } from "@react-navigation/native";
import axios from 'axios';
import {useState } from 'react'
import { useUser } from '../../Contexts/UserContext'; // Import the context

const BACKEND_URL = "https://debatesphere-11.onrender.com/login";

const SignIn = ({ }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigation = useNavigation();
    const { login } = useUser(); // Get login function from context

    const handleNewAccount = () => {
        navigation.navigate("SignUp");
    }

    const handleSignIn = async () => {
        console.log("yes this is working");
        try {
            console.log("Username is " + username);
            console.log("Password is " + password);
            const response = await axios.post(BACKEND_URL, { username, password });

            if (response.status === 200) {
                alert("User Logged in Successfully");

                // ✅ Update the context with the logged-in user
                login({ username: username });

                // Navigate to Dashboard
                navigation.navigate("Dashboard");
            } else {
                alert("Something went wrong try again")
            }
        } catch (error) {
            console.log("Something went wrong try again" + error);
            alert("Login failed. Please check your credentials.");
        }
    }

    const handleGoogleAuth = () => {
        // Google auth implementation
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                SignIn Page
            </Text >
            <View style={styles.container_2}>
                <View>
                    <Text style={styles.label}>
                        Email/Username
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Enter your username"
                    />
                </View>
                <View>
                    <Text style={styles.label}>
                        Password
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={true}
                        placeholder="Enter your password"
                    />
                </View>
                <View>
                    <Pressable
                        style={({ pressed }) => [
                            styles.button,
                            { backgroundColor: pressed ? "#388E3C" : "#4CAF50", marginTop: 30 },
                        ]}
                        onPress={handleSignIn}
                    >
                        <Text style={styles.buttonText}>SignIn</Text>
                    </Pressable>
                    <TouchableOpacity onPress={handleNewAccount}>
                        <Text style={styles.new_acc}>{"\n"}create new account</Text>
                    </TouchableOpacity>
                </View>
                <View style={{ flexDirection: "column", justifyContent: "center", alignItems: "center", marginTop: 20 }}>
                    <Text style={styles.label}> or </Text>
                </View>
                <View style={{ marginTop: 5 }}>
                    <TouchableOpacity onPress={() => handleGoogleAuth()}>
                        <Image source={require("../assets/google.png")} style={styles.logo} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f0f0f0",
        bottom: "40%",
    },
    container_2: {
        position: "absolute",
        top: "60%",
        borderWidth: 1,
        borderColor: "green",
        height: 400,
        width: 300,
        borderRadius: 30,
        padding: 25,
        backgroundColor: "white",
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginVertical: 5,
        width: '100%',
    },
    label: {
        fontSize: 20,
    },
    new_acc: {
        textDecorationLine: "underline",
        color: "blue",
    },
    button: {
        padding: 12,
        borderRadius: 8,
        alignItems: "center",
        flexDirection: "column",
        backgroundColor: "#4CAF50",
    },
    buttonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "bold",
    },
    logo: {
        width: 50,
        height: 45,
        marginRight: 8,
    },
    title: {
        fontSize: 30,
        fontFamily: "Roboto",
        height: 50,
        borderRadius: 15,
        padding: 5,
        margin: 10,
    },
});

export default SignIn;