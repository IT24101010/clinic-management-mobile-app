import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import ErrorAlert from '../../components/shared/ErrorAlert';
import SuccessAlert from '../../components/shared/SuccessAlert';

const UploadReportScreen = ({ navigation }) => {
  const { updateUser } = useAuth();

  const [selectedImage, setSelectedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePickImage = async () => {
    setError('');
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (err) {
      setError('Failed to open photo library');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      setError('Please select a report image first');
      return;
    }
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const formData = new FormData();
      formData.append('report', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: selectedImage.fileName || `report_${Date.now()}.jpg`,
      });
      const res = await api.post('/api/users/upload-report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Server returns { report, user } — update auth context with the full updated user
      updateUser(res.data.user);
      setSuccess('Report uploaded successfully!');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setError('');
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#059669', '#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Report</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          {/* ── Alerts ── */}
          {error ? <ErrorAlert message={error} /> : null}
          {success ? <SuccessAlert message={success} /> : null}

          {/* ── Info Card ── */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
            </View>
            <Text style={styles.infoText}>
              Upload your blood test report as an image (JPG or PNG). Make sure the report is clearly visible and legible.
            </Text>
          </View>

          {/* ── Image Picker Area ── */}
          <TouchableOpacity
            style={styles.pickerArea}
            onPress={handlePickImage}
            activeOpacity={0.75}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.pickerPlaceholder}>
                <LinearGradient
                  colors={[colors.accentFaded, '#D1FAE5']}
                  style={styles.pickerIconWrap}
                >
                  <Ionicons name="image-outline" size={42} color={colors.accent} />
                </LinearGradient>
                <Text style={styles.pickerTitle}>Select Report Image</Text>
                <Text style={styles.pickerSubtitle}>Tap here to pick from your gallery</Text>
                <View style={styles.pickerFormats}>
                  <View style={styles.formatBadge}>
                    <Text style={styles.formatText}>JPG</Text>
                  </View>
                  <View style={styles.formatBadge}>
                    <Text style={styles.formatText}>PNG</Text>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Selected File Info ── */}
          {selectedImage && (
            <View style={styles.fileInfoRow}>
              <View style={styles.fileInfoLeft}>
                <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedImage.fileName || 'report_image.jpg'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClearImage} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Choose Button ── */}
          <TouchableOpacity style={styles.chooseBtn} onPress={handlePickImage} activeOpacity={0.8}>
            <Ionicons name="images-outline" size={18} color={colors.accent} />
            <Text style={styles.chooseBtnText}>
              {selectedImage ? 'Choose a Different Image' : 'Choose from Gallery'}
            </Text>
          </TouchableOpacity>

          {/* ── Upload Button ── */}
          <TouchableOpacity
            style={[styles.uploadBtn, (!selectedImage || uploading) && styles.uploadBtnDisabled]}
            onPress={handleUpload}
            disabled={!selectedImage || uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <>
                <ActivityIndicator color={colors.surface} style={{ marginRight: 8 }} />
                <Text style={styles.uploadBtnText}>Uploading...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.surface} style={{ marginRight: 8 }} />
                <Text style={styles.uploadBtnText}>Upload Report</Text>
              </>
            )}
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Header ── */
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 54,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
  },

  /* ── Scroll ── */
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* ── Info Card ── */
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.accentFaded,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  infoIconWrap: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.accent,
    fontWeight: '500',
    lineHeight: 19,
  },

  /* ── Picker Area ── */
  pickerArea: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    minHeight: 240,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  pickerPlaceholder: {
    flex: 1,
    minHeight: 240,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  pickerIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  pickerSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500',
  },
  pickerFormats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  formatBadge: {
    backgroundColor: colors.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  formatText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  previewImage: {
    width: '100%',
    height: 280,
  },

  /* ── File Info ── */
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  fileInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },

  /* ── Buttons ── */
  chooseBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: colors.accentFaded,
  },
  chooseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  uploadBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  uploadBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
});

export default UploadReportScreen;
