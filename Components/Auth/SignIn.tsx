
import React from 'react' ;
import {
    StyleSheet ,
    View ,
    Text ,
    TextInput ,
    Button ,
    TouchableOpacity,
    Pressable ,
    Image
    } from 'react-native' ;
import { useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LinearGradient from 'react-native-linear-gradient';
import Icon from "react-native-vector-icons/FontAwesome";
import { useState } from 'react' ;
import axios from 'axios' ;

const BACKEND_URL = "https://debatesphere-11.onrender.com/login" ;

const SignIn =({})=>{

    const [username, setUsername] = useState("");
    const [password , setPassword] = useState("");
    const navigation = useNavigation();
    const handleNewAccount = ()=>{
    navigation.navigate("SignUp") ;
    }

    const handleSignIn = async ()=>{
        console.log("yes this is working");
    try{
        console.log("Username is " + username) ;
        console.log("Password is " + password) ;
    const response = await axios.post(BACKEND_URL , { username , password }) ;


        if (response.status === 200){
            alert("User Logged in Successfully") ;
        navigation.navigate("Dashboard") ;


        }
        else{
            alert("Something went wrong try again")
            }}
        catch(error){
            console.log("Something went wrong try again"+error) ;
        }

    }

    const handleGoogleAuth = ()=>{



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
            <TextInput  value={username} onChangeText={setUsername}/>
            </View>
            <View>
            <Text style={styles.label}>
            Password
            </Text>
            <TextInput  value={password} onChangeText={setPassword} secureTextEntry={true}/>

            </View>
            <View>
             <Pressable
               style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: pressed ? "#388E3C" : "#4CAF50" , marginTop:30 },
                    ]}
                    onPress={() => handleSignIn()}
                  >
                    <Text style={styles.buttonText}>SignIn</Text>
             </Pressable>
             <TouchableOpacity onPress={handleNewAccount}>
             <Text style={styles.new_acc}>{"\n"}create new account</Text>
             </TouchableOpacity>
            </View>
            <View style={{flexDirection:"column" ,justifyContent:"center" ,alignItems:"center" ,marginTop:20}}>
            <Text style={styles.label}> or </Text>
            </View>
            <View style={{marginTop:5}}>
             <TouchableOpacity onPress={() => handleGoogleAuth()}>
             <Image source={require("../assets/google.png")} style={styles.logo} />
             </TouchableOpacity>
            </View>
        </View>
        </View>
        )
    }

export const styles = StyleSheet.create({
         container: {
           flex: 1,                     // make it fill the whole screen
           justifyContent: "center",
           alignItems: "center",
           backgroundColor: "#f0f0f0",  // 👈 background color for full body
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
           backgroundColor: "white",    // inner box color
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
           backgroundColor: "#4CAF50",   // button bg
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



export default SignIn ;