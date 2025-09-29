
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
import { styles }  from './SignIn.tsx' ;
const SignUp = ()=>{
    const [username , setUsername] = useState("") ;
    const [email , setEmail] = useState("") ;
    const [password , setPassword] = useState("") ;
    const [confirmPassword , setConfirmPassword] = useState("") ;


    const handleSignUp = ()=>{

    if (password !== confirmPassword){
        alert("password does not match") ;
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
            </View>
        </View>
        </View>
        )
    }



export default SignUp ;