
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
import Icon from "react-native-vector-icons/FontAwesome";
import { useState } from 'react' ;

import axios from 'axios' ;
import { useNavigation } from "@react-navigation/native";

const BACKEND_URL = "https://debatesphere-11.onrender.com/signup" ;

const SignUp = ()=>{
    const navigation = useNavigation() ;
    const [username , setUsername] = useState("") ;
    const [email , setEmail] = useState("") ;
    const [password , setPassword] = useState("") ;
    const [confirmPassword , setConfirmPassword] = useState("") ;

    const handleCreatedAccount = ()=>{
        navigation.navigate("SignIn");

    }



    const handleSignUp = async ()=>{
    if (password !== confirmPassword){
        alert("password does not match") ;
        }
    console.log("yes it is working ");
    try{
    const response =  await axios.post(BACKEND_URL, {username,email , password}) ;
    console.log(response)
    if (response.status === 201){

    alert("user created Successfully") ;
    console.log("user Created")
    navigation.navigate("SignIn") ;

    }
    else if (response.status === 409){

        alert("User Already Exist , Please Login");
        navigation.navigate("SignIn") ;

        }
    else if (response.status === 400){

        alert(`Missing Field Error and Fields are ${username}, ${email}, ${password}`);

        }
    else{
        console.log("Something went wrong ")
    alert("user not created , Something Went Wrong");

    }
}
catch(err){
    console.log("Error is " , error) ;

    }
    }
    return (
        <View style={styles.container}>
        <Text style={styles.title}>
        SignUp Page
        </Text >
        <View style={styles.container_2}>
        <View>
            <Text style={styles.label} >
            Username
            </Text>
            <TextInput  placeholder="Ramesh" defaultValue="Ramesh" value={username} onChangeText={setUsername}/>
            </View>
            <View>
            <Text style={styles.label}>
            Email
            </Text>
            <TextInput placeholder="example@gmail.com"  defaultValue="example@gmail.com" value={email} onChangeText={setEmail}/>
            </View>
            <View>
            <Text style={styles.label}>
            Password
            </Text>
            <TextInput placeholder="123" defaultValue="12345" value={password} onChangeText={setPassword}/>
            </View>
            <View>
            <Text style={styles.label}  >
            Confirm Password
            </Text>
            <TextInput  placeholder="123" value={confirmPassword} onChangeText={setConfirmPassword}/>

            </View>
            <View>
             <Pressable
               style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: pressed ? "#388E3C" : "#4CAF50" , marginTop:30 },
                    ]}
                    onPress={() => handleSignUp()}
               >

               <Text style={styles.buttonText}>SignUp</Text>
             </Pressable>
            <TouchableOpacity onPress={handleCreatedAccount}>
            <Text style={styles.new_acc}>Already have account</Text>
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


export default SignUp ;