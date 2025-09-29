
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
const SignIn = ()=>{


    const handleSignIn = ()=>{



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
            <TextInput  defaultValue="example@gmail.com"/>
            </View>
            <View>
            <Text style={styles.label}>
            Password
            </Text>
            <TextInput  defaultValue="12345"/>

            </View>
            <View>
             <Pressable
               style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: pressed ? "#388E3C" : "#4CAF50" , marginTop:30 },
                    ]}
                    onPress={() => alert("Pressable Button Pressed!")}
                  >
                    <Text style={styles.buttonText}>SignIn</Text>
             </Pressable>
            </View>
            <View style={{flexDirection:"column" ,justifyContent:"center" ,alignItems:"center" ,marginTop:30}}>
            <Text style={styles.label}> or </Text>
            </View>
            <View style={{marginTop:20}}>
             <TouchableOpacity style={styles.button}>
             <Image source={require("../assets/google.png")} style={styles.logo} />
             </TouchableOpacity>
            </View>
        </View>
        </View>
        )
    }

const styles = StyleSheet.create({

  container: {
    flex: 1, // 'display: "flex"' is implied in React Native
    justifyContent: "center",
    alignItems: "center",
    bottom:"30%",

  },
  container_2:{
        position:"absolute",
        top:"60%",
        borderWidth:3 ,
        borderColor:"blue" ,
        height:400 ,
        width:300 ,
        borderRadius:30 ,
        padding:25,

        },
  label :{
      fontFamily:"Roboto",
      fontSize:20 ,



      } ,
  button: { padding: 12, borderRadius: 8 , alignItems: "center", flexDirection: "column" },
    buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
    logo: { width: 50, height: 45, marginRight: 8 },
  title : {
  fontSize:30,
  fontFamily: 'Roboto',
      borderWidth: 1,
      borderColor: 'blue',
      height:50,
      borderRadius: 15, // optional for rounded corners
      padding:5,
      margin: 10,

  }
});


export default SignIn ;