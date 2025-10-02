import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import io from 'socket.io-client';
import { useRoute } from '@react-navigation/native';
const SERVER_URL = 'https://debatesphere-11.onrender.com/';

function ImageUploader({ onImageSelected }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Alert.alert('Error', 'Image size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64Image = reader.result;
        onImageSelected(base64Image);
      };
      reader.onerror = () => {
        Alert.alert('Error', 'Failed to read image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMobileImagePicker = async () => {
    Alert.alert(
      'Image Picker',
      'Mobile image picking not implemented. Please use web for testing or integrate a native image picker.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.uploaderContainer}>
      {Platform.OS === 'web' ? (
        <>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => fileInputRef.current.click()}
          >
            <Text style={styles.uploadBtnText}>📷</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={handleMobileImagePicker}
        >
          <Text style={styles.uploadBtnText}>📷</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function ChatRoom({ route }) {
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const { username, roomId, title, desc } = route.params;

  useEffect(() => {
    setIsConnecting(true);

    socketRef.current = io(SERVER_URL, {
      transports: ['websocket'],
      timeout: 10000,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setIsConnecting(false);
      socketRef.current.emit('join_room', roomId); // Updated to match backend
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      setIsConnecting(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.log('Connection error:', error);
      setIsConnecting(false);
      setIsConnected(false);
    });

    socketRef.current.on('receive_message', (msg) => {
      console.log('Received message:', msg);
      setMessages((prev) => {
        console.log('Current messages before update:', prev);
        return [msg, ...prev];
      });
    });

    socketRef.current.on('previous messages', (msgs) => {
      if (Array.isArray(msgs)) {
        setMessages(msgs.reverse());
      }
    });

    socketRef.current.onAny((eventName, ...args) => {
      console.log('Socket event:', eventName, args);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = (imageData = null) => {
    if (!isConnected || isConnecting) return;
    if (!text.trim() && !imageData) return;

    const messageData = {
      text: text.trim(),
      image: imageData,
      sender: username || 'Guest',
      roomId,
      time: new Date().toISOString(),
    };

    // Remove optimistic update - wait for server response
    // setMessages((prev) => [messageData, ...prev]);

    console.log('Sending message:', messageData);

    socketRef.current.emit('send_message', messageData, (ack) => {
      console.log('Server ACK:', ack);
      if (ack && ack.error) {
        Alert.alert('Error', 'Failed to send message');
      }
    });

    setText('');
  };

  const handleImageSelected = (base64Image) => {
    sendMessage(base64Image);
  };

  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Enter' && Platform.OS === 'web') {
      sendMessage();
    }
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.msgBox,
        item.sender === username ? styles.myMsg : styles.theirMsg,
        item.isSystem && styles.systemMsg,
      ]}
    >
      {!item.isSystem && (
        <Text
          style={[
            styles.msgUser,
            item.sender === username && styles.myMsgUser,
          ]}
        >
          {item.sender}
        </Text>
      )}
      {item.text && (
        <Text
          style={[
            styles.msgText,
            item.sender === username && styles.myMsgText,
            item.isSystem && styles.systemMsgText,
          ]}
        >
          {item.text}
        </Text>
      )}
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.msgImage}
          resizeMode="contain"
        />
      )}
      <Text style={styles.msgTime}>
        {new Date(item.time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Debate Topic: {title || 'Untitled Debate'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {desc || 'No description available'}
        </Text>
      </View>

      {!isConnected && (
        <View style={styles.connectionStatus}>
          <Text style={styles.connectionStatusText}>
            {isConnecting ? '🟡 Connecting...' : '🔴 Disconnected - Attempting to reconnect...'}
          </Text>
        </View>
      )}

      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007aff" />
          <Text style={styles.connectingText}>Connecting to chat...</Text>
        </View>
      )}

      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id?.toString() || `${item.time}-${item.sender}`}
          renderItem={renderMessage}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isConnected ? 'No messages yet. Start the conversation!' : 'Unable to connect to chat'}
              </Text>
            </View>
          }
          onScrollToIndexFailed={(error) => {
            flatListRef.current?.scrollToOffset({
              offset: 0,
              animated: true,
            });
          }}
        />
      </View>

      <View style={[styles.inputRow, isConnecting && styles.inputRowDisabled]}>
        <ImageUploader onImageSelected={handleImageSelected} />
        <TextInput
          style={[
            styles.input,
            (!isConnected || isConnecting) && styles.inputDisabled,
          ]}
          placeholder={isConnecting ? 'Connecting...' : isConnected ? 'Type a message' : 'Disconnected'}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          onKeyPress={handleKeyPress}
          editable={isConnected && !isConnecting}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!text.trim() || !isConnected || isConnecting) && styles.sendBtnDisabled,
          ]}
          onPress={() => sendMessage()}
          disabled={!text.trim() || !isConnected || isConnecting}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    borderWidth: 3,
    borderRadius: 20,
    padding: 20,
    margin: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 30,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.9)',
    zIndex: 10,
  },
  connectingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  connectionStatus: {
    backgroundColor: '#ff6b6b',
    padding: 8,
    alignItems: 'center',
  },
  connectionStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  msgBox: {
    padding: 12,
    margin: 6,
    borderRadius: 12,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myMsg: {
    backgroundColor: '#4b7bec',
    alignSelf: 'flex-end',
  },
  theirMsg: {
    backgroundColor: '#e5e5ea',
    alignSelf: 'flex-start',
  },
  systemMsg: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
    maxWidth: '90%',
  },
  msgUser: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#555',
  },
  myMsgUser: {
    color: 'rgba(255,255,255,0.8)',
  },
  msgText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 20,
  },
  myMsgText: {
    color: '#fff',
  },
  systemMsgText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 14,
  },
  msgImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginTop: 8,
  },
  msgTime: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.4)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  inputRowDisabled: {
    opacity: 0.6,
  },
  uploaderContainer: {
    marginRight: 8,
  },
  uploadBtn: {
    backgroundColor: '#007aff',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 18,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  sendBtn: {
    backgroundColor: '#007aff',
    marginLeft: 8,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendBtnDisabled: {
    backgroundColor: '#ccc',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});