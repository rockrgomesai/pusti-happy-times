import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

const API_URL = 'https://tkgerp.com/api/v1';

const ProfileScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserName(user.full_name || user.username);
        setUserEmail(user.email || '');
        setUserPhoto(user.profile_photo);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const selectPhotoSource = () => {
    Alert.alert('Upload Photo', 'Choose photo source', [
      {
        text: 'Camera',
        onPress: () => takePhoto(),
      },
      {
        text: 'Gallery',
        onPress: () => pickFromGallery(),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const takePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (result.assets && result.assets[0]) {
      uploadPhoto(result.assets[0]);
    }
  };

  const pickFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    });

    if (result.assets && result.assets[0]) {
      uploadPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async (photo: any) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        type: photo.type || 'image/jpeg',
        name: photo.fileName || 'photo.jpg',
      } as any);

      const token = await AsyncStorage.getItem('accessToken');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const response = await axios.post(
        `${API_URL}/profile/upload-photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.data.success) {
        const photoUrl = response.data.data.profile_photo;
        setUserPhoto(photoUrl);

        // Update user data in AsyncStorage
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.profile_photo = photoUrl;
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }

        Alert.alert('Success', 'Photo uploaded successfully');
      } else {
        Alert.alert('Error', response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to upload photo',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.photoContainer}>
          {userPhoto ? (
            <Image
              source={{ uri: `https://tkgerp.com${userPhoto}` }}
              style={styles.photo}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={selectPhotoSource}
            disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload Photo</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{userName}</Text>
          </View>
          {userEmail ? (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{userEmail}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  photoPlaceholderText: {
    color: '#fff',
    fontSize: 60,
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 20,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    width: 80,
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});

export default ProfileScreen;
