import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import Navbar from '../Home/Navbar';

export default function Notification() {
  const data = [
    { id: 1, title: "New Debate Started", message: "A new debate on AI vs Humans has started!", date: "12-1-25" },
    { id: 2, title: "Reply Received", message: "Someone replied to your comment in Politics debate.", date: "13-1-25" },
    { id: 3, title: "Reminder", message: "Don’t forget the Sports debate you joined yesterday.", date: "14-1-25" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <Navbar />
      <ScrollView>
        <View style={styles.feedContainer}>
          {data.map((item) => (
            <TouchableOpacity key={item.id} style={styles.feedItem}>
              <Text style={styles.feedTitle}>🗣️ {item.title}</Text>

              {/* Custom Divider */}
              <View style={styles.divider} />

              <Text style={styles.feedMessage}>{item.message}</Text>
              <Text style={styles.feedDate}>{item.date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  feedContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  feedItem: {
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: 'white',
    padding: 12,
    elevation: 3, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: "#333",
  },
  feedMessage: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "serif",
    color: "#555",
  },
  feedDate: {
    marginTop: 10,
    fontSize: 12,
    color: "gray",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginTop: 6,
    marginBottom: 6,
  },
});
