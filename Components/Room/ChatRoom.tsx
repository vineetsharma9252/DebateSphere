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
  StatusBar,
  Modal,
  Animated,
} from 'react-native';
import io from 'socket.io-client';
import { useRoute } from '@react-navigation/native';

const SERVER_URL = 'https://debatesphere-11.onrender.com/';

function ImageUploader({ onImageSelected, disabled }) {
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
            style={[styles.uploadBtn, disabled && styles.uploadBtnDisabled]}
            onPress={() => fileInputRef.current.click()}
            disabled={disabled}
          >
            <Text style={styles.uploadBtnText}>📷</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.uploadBtn, disabled && styles.uploadBtnDisabled]}
          onPress={handleMobileImagePicker}
          disabled={disabled}
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
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const { username, roomId, title, desc } = route.params;
  console.log("Username is " + username);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      socketRef.current.emit('join_room', roomId);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      setIsConnecting(false);
    });

    const generateMessageId = () => {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    socketRef.current.on('connect_error', (error) => {
      console.log('Connection error:', error);
      setIsConnecting(false);
      setIsConnected(false);
    });

    socketRef.current.on('receive_message', (msg) => {
      console.log('Received message:', msg);

      // Handle both single message and array of messages
      if (Array.isArray(msg)) {
        // This is the initial batch of messages
        const messagesWithIds = msg.map(message => ({
          ...message,
          id: message.id || generateMessageId(),
          isDeleted: message.isDeleted || false
        }));
        setMessages(messagesWithIds);
      } else {
        // This is a single new message
        const messageWithId = {
          ...msg,
          id: msg.id || generateMessageId(),
          isDeleted: msg.isDeleted || false
        };
        setMessages((prev) => {
          return [messageWithId, ...prev];
        });
      }
    });

    socketRef.current.on('previous_messages', (msgs) => {
      if (Array.isArray(msgs)) {
        const messagesWithIds = msgs.reverse().map(msg => ({
          ...msg,
          id: msg.id || generateMessageId(),
          isDeleted: msg.isDeleted || false
        }));
        setMessages(messagesWithIds);
      }
    });

    // Handle message deletion events - FIXED: Expect message object, not just ID
    socketRef.current.on('message_deleted', (deletedMessage) => {
      console.log('Message deleted:', deletedMessage);
      if (deletedMessage && deletedMessage.id) {
        setMessages(prev => prev.map(msg =>
          msg.id === deletedMessage.id
            ? {
                ...msg,
                text: 'This message was deleted',
                image: null,
                isDeleted: true
              }
            : msg
        ));
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
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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
      if (!nativeEvent.shiftKey) {
        nativeEvent.preventDefault();
        sendMessage();
      }
    }
  };

  const handleMessageLongPress = (message) => {
    if (message.isDeleted) return;

    setSelectedMessage(message);

    // Show action options
    if (message.sender === username) {
      Alert.alert(
        'Message Options',
        'What would you like to do with this message?',
        [
          {
            text: 'Delete Message',
            style: 'destructive',
            onPress: () => showDeleteConfirmation(message),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      Alert.alert(
        'Message Options',
        `Message from ${message.sender}`,
        [
          {
            text: 'Report Message',
            style: 'destructive',
            onPress: () => reportMessage(message),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  const showDeleteConfirmation = (message) => {
    setMessageToDelete(message);
    setDeleteModalVisible(true);
  };

  // FIXED: Remove parameter and use the state variable directly
  const deleteMessage = () => {
    if (!messageToDelete) return;

    console.log('Deleting message:', messageToDelete.id);

    // Emit delete event to server - FIXED: Use proper data structure
    socketRef.current.emit('delete_message', {
      messageId: messageToDelete.id,
      roomId: roomId,
      username: username // Use the username from props/state
    }, (ack) => {
      console.log('Delete ACK:', ack);
      if (ack && ack.success) {
        // Update local state immediately
        setMessages(prev => prev.map(msg =>
          msg.id === messageToDelete.id
            ? { ...msg, text: 'This message was deleted', image: null, isDeleted: true }
            : msg
        ));

        Alert.alert('Success', 'Message deleted successfully');
      } else {
        Alert.alert('Error', ack?.error || 'Failed to delete message');
      }
    });

    setDeleteModalVisible(false);
    setMessageToDelete(null);
    setSelectedMessage(null);
  };

  const reportMessage = (message) => {
    Alert.alert(
      'Report Message',
      `Are you sure you want to report this message from ${message.sender}?`,
      [
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            // Implement reporting logic here
            console.log('Reporting message:', message.id);
            Alert.alert('Report Submitted', 'Thank you for your report. We will review this message.');
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
    setSelectedMessage(null);
  };

  const renderMessage = ({ item }) => (
    <Animated.View
      style={[
        styles.msgContainer,
        item.sender === username && styles.myMsgContainer,
        { opacity: fadeAnim }
      ]}
    >
      <TouchableOpacity
        style={[
          styles.msgBox,
          item.sender === username ? styles.myMsg : styles.theirMsg,
          item.isSystem && styles.systemMsg,
          item.isDeleted && styles.deletedMsg,
        ]}
        onLongPress={() => handleMessageLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        {!item.isSystem && item.sender !== username && !item.isDeleted && (
          <Text style={styles.msgUser}>
            {item.sender}
          </Text>
        )}

        {item.isDeleted ? (
          <View style={styles.deletedContent}>
            <Text style={styles.deletedIcon}>🗑️</Text>
            <Text style={styles.deletedText}>
              This message was deleted
            </Text>
          </View>
        ) : (
          <>
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
                resizeMode="cover"
              />
            )}
          </>
        )}

        <Text style={[
          styles.msgTime,
          item.sender === username && styles.myMsgTime,
          item.isDeleted && styles.deletedMsgTime
        ]}>
          {new Date(item.time).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {item.isDeleted && ' • Deleted'}
        </Text>

        {/* Edit/Delete indicator for user's messages */}
        {item.sender === username && !item.isSystem && !item.isDeleted && (
          <View style={styles.messageOptionsIndicator}>
            <Text style={styles.optionsHint}>Long press for options</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#667eea" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.roomInfo}>
            <Text style={styles.headerTitle}>
              {title || 'Untitled Debate'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {desc || 'No description available'}
            </Text>
          </View>
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>{username?.charAt(0)?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.connectionIndicator}>
          <View style={[
            styles.connectionDot,
            isConnected ? styles.connectedDot : styles.disconnectedDot
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Connection Status Banner */}
      {!isConnected && !isConnecting && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionBannerText}>
            🔴 Connection lost - Reconnecting...
          </Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.connectingText}>Connecting to debate...</Text>
          </View>
        </View>
      )}

      {/* Messages */}
      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item, index) =>
            item.id?.toString() || `${item.time}-${item.sender}-${index}`
          }
          renderItem={renderMessage}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                {isConnected
                  ? 'Be the first to start the debate!'
                  : 'Connecting to chat room...'
                }
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

      {/* Input Area */}
      <View style={[styles.inputContainer, isConnecting && styles.inputContainerDisabled]}>
        <View style={styles.inputRow}>
          <ImageUploader
            onImageSelected={handleImageSelected}
            disabled={!isConnected || isConnecting}
          />
          <TextInput
            style={[
              styles.input,
              (!isConnected || isConnecting) && styles.inputDisabled,
            ]}
            placeholder={isConnecting ? 'Connecting...' : isConnected ? 'Type your argument...' : 'Disconnected'}
            placeholderTextColor="#999"
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
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.charCount}>
          {text.length}/500
        </Text>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Message</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete this message? This action cannot be undone.
            </Text>

            {messageToDelete && (
              <View style={styles.messagePreview}>
                <Text style={styles.previewText} numberOfLines={3}>
                  {messageToDelete.text}
                </Text>
                {messageToDelete.image && (
                  <Text style={styles.previewImageText}>📷 Image attached</Text>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={deleteMessage} // FIXED: No parameter needed
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// Styles remain the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roomInfo: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  userBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectedDot: {
    backgroundColor: '#4ade80',
  },
  disconnectedDot: {
    backgroundColor: '#f87171',
  },
  connectionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  connectionBanner: {
    backgroundColor: '#fef2f2',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  connectionBannerText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    zIndex: 10,
  },
  loadingContent: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 32,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  connectingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  msgContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  myMsgContainer: {
    justifyContent: 'flex-end',
  },
  msgBox: {
    padding: 16,
    borderRadius: 20,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  myMsg: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  theirMsg: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  systemMsg: {
    backgroundColor: 'transparent',
    alignSelf: 'center',
    maxWidth: '90%',
    shadowOpacity: 0,
    elevation: 0,
  },
  deletedMsg: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.7,
  },
  msgUser: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    color: '#475569',
  },
  msgText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 22,
  },
  myMsgText: {
    color: '#fff',
  },
  systemMsgText: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 14,
  },
  deletedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  deletedText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  msgImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginTop: 8,
  },
  msgTime: {
    fontSize: 11,
    color: 'rgba(100, 116, 139, 0.7)',
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  myMsgTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  deletedMsgTime: {
    color: '#94a3b8',
  },
  messageOptionsIndicator: {
    marginTop: 4,
  },
  optionsHint: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  inputContainerDisabled: {
    opacity: 0.6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  uploaderContainer: {
    marginRight: 12,
  },
  uploadBtn: {
    backgroundColor: '#c7d2fe',
    borderRadius: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxHeight: 100,
    backgroundColor: '#f8fafc',
    fontSize: 16,
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
  },
  sendBtn: {
    backgroundColor: '#667eea',
    marginLeft: 12,
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 2,
  },
  charCount: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 6,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  messagePreview: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  previewImageText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});