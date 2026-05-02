import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import ErrorAlert from '../../components/shared/ErrorAlert';
import SuccessAlert from '../../components/shared/SuccessAlert';
import { formatDate } from '../../utils/formatDate';

const EditField = ({ label, icon, value, onChangeText, keyboardType, focusedField, fieldName, onFocus, onBlur }) => {
  const isFocused = focusedField === fieldName;
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, isFocused && styles.inputRowFocused]}>
        <Ionicons name={icon} size={16} color={isFocused ? colors.accent : colors.textLight} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.disabled}
          keyboardType={keyboardType || 'default'}
          onFocus={() => onFocus && onFocus(fieldName)}
          onBlur={() => onBlur && onBlur()}
        />
      </View>
    </View>
  );
};

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    gender: '',
    address: '',
    dateOfBirth: null,
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        gender: user.gender || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
        emergencyContactName: user.emergencyContact?.name || '',
        emergencyContactPhone: user.emergencyContact?.phone || '',
      });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Full name is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone,
        gender: formData.gender,
        address: formData.address,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth.toISOString() : undefined,
        emergencyContact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
        },
      };
      const res = await api.put('/api/users/profile', payload);
      updateUser(res.data);
      setSuccess('Profile updated successfully!');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) {
        setUploadingAvatar(true);
        const asset = result.assets[0];
        const formDataUpload = new FormData();
        formDataUpload.append('avatar', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        });
        const res = await api.post('/api/users/upload-avatar', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        updateUser(res.data.user);
        setSuccess('Profile photo updated!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* ── Avatar ── */}
      <Animated.View style={[styles.avatarSection, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.8}>
          {uploadingAvatar ? (
            <View style={styles.avatarCircle}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatarCircle} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase() || 'U'}</Text>
            </View>
          )}
          <View style={styles.cameraIcon}>
            <Ionicons name="camera" size={14} color={colors.surface} />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change photo</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Alerts ── */}
        {error ? <ErrorAlert message={error} /> : null}
        {success ? <SuccessAlert message={success} /> : null}

        {/* ── Personal Information ── */}
        <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          <EditField
            label="Full Name"
            icon="person-outline"
            value={formData.name}
            onChangeText={v => handleChange('name', v)}
            focusedField={focusedField}
            fieldName="name"
            onFocus={setFocusedField}
            onBlur={() => setFocusedField(null)}
          />
          <EditField
            label="Phone"
            icon="call-outline"
            value={formData.phone}
            onChangeText={v => handleChange('phone', v)}
            keyboardType="phone-pad"
            focusedField={focusedField}
            fieldName="phone"
            onFocus={setFocusedField}
            onBlur={() => setFocusedField(null)}
          />
          <EditField
            label="Address"
            icon="location-outline"
            value={formData.address}
            onChangeText={v => handleChange('address', v)}
            focusedField={focusedField}
            fieldName="address"
            onFocus={setFocusedField}
            onBlur={() => setFocusedField(null)}
          />

          {/* Date of Birth */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.inputRow}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.textLight} style={styles.inputIcon} />
              <Text style={[styles.inputDateText, !formData.dateOfBirth && styles.inputPlaceholder]}>
                {formData.dateOfBirth ? formatDate(formData.dateOfBirth) : 'Select date of birth'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={formData.dateOfBirth || new Date(1990, 0, 1)}
              mode="date"
              maximumDate={new Date()}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) handleChange('dateOfBirth', date);
              }}
            />
          )}

          {/* Gender Chips */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.chipRow}>
              {['male', 'female', 'other'].map(g => {
                const selected = formData.gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => handleChange('gender', g)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* ── Emergency Contact ── */}
        <Animated.View style={[styles.card, { opacity: fadeIn }]}>
          <Text style={styles.cardTitle}>Emergency Contact</Text>

          <EditField
            label="Contact Name"
            icon="people-outline"
            value={formData.emergencyContactName}
            onChangeText={v => handleChange('emergencyContactName', v)}
            focusedField={focusedField}
            fieldName="emergencyName"
            onFocus={setFocusedField}
            onBlur={() => setFocusedField(null)}
          />
          <EditField
            label="Contact Phone"
            icon="call-outline"
            value={formData.emergencyContactPhone}
            onChangeText={v => handleChange('emergencyContactPhone', v)}
            keyboardType="phone-pad"
            focusedField={focusedField}
            fieldName="emergencyPhone"
            onFocus={setFocusedField}
            onBlur={() => setFocusedField(null)}
          />
        </Animated.View>

        {/* ── Save Button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.surface} style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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

  /* ── Avatar ── */
  avatarSection: {
    alignItems: 'center',
    marginTop: -28,
    marginBottom: 6,
    zIndex: 10,
  },
  avatarWrap: {
    marginBottom: 8,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.accent,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarHint: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },

  /* ── Scroll Content ── */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  /* ── Card ── */
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    gap: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },

  /* ── Fields ── */
  fieldGroup: {},
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputRowFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  inputDateText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  inputPlaceholder: {
    color: colors.disabled,
  },

  /* ── Gender Chips ── */
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.surface,
  },

  /* ── Save Button ── */
  saveBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
});

export default EditProfileScreen;
