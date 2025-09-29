import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  ScrollView,
  Animated ,
  TextInput ,
  TouchableOpacity ,
} from 'react-native';
import Navbar from '../Home/Navbar' ;

const { width } = Dimensions.get('window');


export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    console.log("Form Submitted:", { name, email, message });
    alert("Message sent successfully!");
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
    <Navbar/>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Contact Info */}
        <View style={styles.infoCard}>
          <Text style={styles.heading}>📞 Contact Us</Text>
          <Text style={styles.text}>Email: support@debateapp.com</Text>
          <Text style={styles.text}>Phone: +91 98765 43210</Text>
          <Text style={styles.text}>Address: New Delhi, India</Text>
        </View>

        {/* Contact Form */}
        <View style={styles.formCard}>
          <Text style={styles.heading}>✉️ Send us a message</Text>
          <TextInput
            style={styles.input}
            placeholder="Your Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Your Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Your Message"
            value={message}
            onChangeText={setMessage}
            multiline
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Send Message</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  infoCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  formCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    elevation: 3,
  },
  heading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  text: {
    fontSize: 14,
    marginBottom: 6,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});


