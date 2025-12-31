import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const CreateRoom = ({ visible, onClose, onCreateRoom, username, userId }) => {
  const [roomData, setRoomData] = useState({
    title: '',
    desc: '',
    topic: '',
  });
  const [loading, setLoading] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  console.log("User id while creating the room is " + userId);
  const topics = [
    'Politics', 'Technology', 'Environment', 'Sports',
    'Education', 'Health', 'Science', 'Philosophy',
    'Entertainment', 'Business', 'Custom'
  ];

  const handleCreateRoom = async () => {
    if (!roomData.title.trim()) {
      Alert.alert('Error', 'Please enter a room title');
      return;
    }

    if (!roomData.topic) {
      Alert.alert('Error', 'Please select a topic');
      return;
    }

    if (roomData.topic === 'Custom' && !customTopic.trim()) {
      Alert.alert('Error', 'Please enter a custom topic');
      return;
    }

    setLoading(true);

    try {
      const finalTopic = roomData.topic === 'Custom' ? customTopic : roomData.topic;

      const roomPayload = {
        title: roomData.title.trim(),
        desc: roomData.desc.trim(),
        topic: finalTopic,
        createdBy: userId, // Use the user ID from context/props
      };

      const response = await fetch('https://debatesphere-11.onrender.com/api/create_room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomPayload),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Room created successfully!');
        onCreateRoom(result.room);
        resetForm();
        onClose();
      } else {
        Alert.alert('Error', result.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Create room error:', error);
      Alert.alert('Error', 'Network error while creating room');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRoomData({
      title: '',
      desc: '',
      topic: '',
    });
    setCustomTopic('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Debate Room</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            {/* Room Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Room Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter a compelling debate topic..."
                value={roomData.title}
                onChangeText={(text) => setRoomData(prev => ({ ...prev, title: text }))}
                maxLength={100}
              />
              <Text style={styles.charCount}>{roomData.title.length}/100</Text>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe what this debate will be about..."
                value={roomData.desc}
                onChangeText={(text) => setRoomData(prev => ({ ...prev, desc: text }))}
                multiline
                numberOfLines={3}
                maxLength={250}
              />
              <Text style={styles.charCount}>{roomData.desc.length}/250</Text>
            </View>

            {/* Topic Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Topic Category *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.topicScrollView}
              >
                <View style={styles.topicContainer}>
                  {topics.map((topic) => (
                    <TouchableOpacity
                      key={topic}
                      style={[
                        styles.topicButton,
                        roomData.topic === topic && styles.topicButtonSelected,
                      ]}
                      onPress={() => setRoomData(prev => ({ ...prev, topic }))}
                    >
                      <Text style={[
                        styles.topicButtonText,
                        roomData.topic === topic && styles.topicButtonTextSelected,
                      ]}>
                        {topic}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {roomData.topic === 'Custom' && (
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your custom topic..."
                  value={customTopic}
                  onChangeText={setCustomTopic}
                  maxLength={50}
                />
              )}
            </View>

            {/* Created By Info */}
            <View style={styles.userInfo}>
              <Text style={styles.userInfoLabel}>Created by:</Text>
              <Text style={styles.userInfoText}>{username || 'Anonymous'}</Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.createButton,
                loading && styles.createButtonDisabled,
                (!roomData.title.trim() || !roomData.topic) && styles.createButtonDisabled
              ]}
              onPress={handleCreateRoom}
              disabled={loading || !roomData.title.trim() || !roomData.topic}
            >
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Room'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 4,
  },
  topicScrollView: {
    marginBottom: 12,
  },
  topicContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  topicButtonSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  topicButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  topicButtonTextSelected: {
    color: 'white',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  userInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  userInfoText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  createButton: {
    backgroundColor: '#667eea',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default CreateRoom;