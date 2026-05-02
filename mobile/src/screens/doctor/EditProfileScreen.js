import React, { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import ErrorAlert from '../../components/shared/ErrorAlert';
import SuccessAlert from '../../components/shared/SuccessAlert';

const EditField = ({ label, icon, value, onChangeText, keyboardType, multiline, focusedField, fieldName, onFocus, onBlur, placeholder }) => {
  const isFocused = focusedField === fieldName;
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, isFocused && styles.inputRowFocused, multiline && styles.inputRowMultiline]}>
        <Ionicons name={icon} size={16} color={isFocused ? colors.primary : colors.textLight} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.disabled}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => onFocus && onFocus(fieldName)}
          onBlur={() => onBlur && onBlur()}
        />
      </View>
    </View>
  );
};

const QualificationTag = ({ text, onRemove }) => (
  <View style={styles.qualTag}>
    <Text style={styles.qualTagText} numberOfLines={1}>{text}</Text>
    <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close-circle" size={16} color={colors.primary} />
    </TouchableOpacity>
  </View>
);

const DoctorEditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [qualInput, setQualInput] = useState('');
  const [qualFocused, setQualFocused] = useState(false);

  const [personal, setPersonal] = useState({
    name: '',
    phone: '',
  });

  const [professional, setProfessional] = useState({
    specialization: '',
    qualifications: [],
    bio: '',
    consultationFee: '',
    experience: '',
  });

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadDoctorProfile = useCallback(async () => {
    try {
      const res = await api.get('/api/doctors/me');
      const doc = res.data;
      setProfessional({
        specialization: doc.specialization || '',
        qualifications: doc.qualifications || [],
        bio: doc.bio || '',
        consultationFee: doc.consultationFee != null ? String(doc.consultationFee) : '',
        experience: doc.experience != null ? String(doc.experience) : '',
      });
    } catch (err) {
      console.log('Doctor profile load error:', err);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadDoctorProfile(); }, [loadDoctorProfile]));

  useEffect(() => {
    if (user) {
      setPersonal({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handlePersonalChange = (field, value) => setPersonal(prev => ({ ...prev, [field]: value }));
  const handleProfChange = (field, value) => setProfessional(prev => ({ ...prev, [field]: value }));

  const addQualification = () => {
    const trimmed = qualInput.trim();
    if (!trimmed) return;
    if (professional.qualifications.includes(trimmed)) {
      setQualInput('');
      return;
    }
    setProfessional(prev => ({ ...prev, qualifications: [...prev.qualifications, trimmed] }));
    setQualInput('');
  };

  const removeQualification = (index) => {
    setProfessional(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!personal.name.trim()) {
      setError('Full name is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const [userRes] = await Promise.all([
        api.put('/api/users/profile', {
          name: personal.name.trim(),
          phone: personal.phone,
        }),
        api.put('/api/doctors/me', {
          specialization: professional.specialization,
          qualifications: professional.qualifications,
          bio: professional.bio,
          consultationFee: professional.consultationFee ? Number(professional.consultationFee) : undefined,
          experience: professional.experience ? Number(professional.experience) : undefined,
        }),
      ]);
      updateUser(userRes.data);
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
      if (!permResult.granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });
      if (!result.canceled && result.assets?.[0]) {
        setUploadingAvatar(true);
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('avatar', { uri: asset.uri, type: 'image/jpeg', name: 'avatar.jpg' });
        const res = await api.post('/api/users/upload-avatar', formData, {
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

  const firstName = user?.name?.split(' ')[0] || 'D';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#1E3A5F', '#1D4ED8', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveHeaderBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Avatar ── */}
      <Animated.View style={[styles.avatarSection, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.8}>
          {uploadingAvatar ? (
            <View style={styles.avatarCircle}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatarCircle} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase() || 'D'}</Text>
            </View>
          )}
          <View style={styles.cameraBtn}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change photo</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <ErrorAlert message={error} /> : null}
        {success ? <SuccessAlert message={success} /> : null}

        {/* ── Personal Information ── */}
        <Animated.View style={[styles.card, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="person-outline" size={15} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>

          <EditField
            label="Full Name"
            icon="person-outline"
            value={personal.name}
            onChangeText={v => handlePersonalChange('name', v)}
            focusedField={focusedField}
            fieldName="name"
            onFocus={setFocusedField}
            onBlur={() => setFocusedField(null)}
          />
          <EditField
            label="Phone Number"
            icon="call-outline"
            value={personal.phone}
            onChangeText={v => handlePersonalChange('phone', v)}
            keyboardType="phone-pad"
            focusedField={focusedField}
            fieldName="phone"
            onFocus={setFocusedField}
            onBlur={() => setFocusedField(null)}
          />
        </Animated.View>

        {/* ── Professional Details ── */}
        <Animated.View style={[styles.card, { opacity: fadeIn }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderIcon}>
              <Ionicons name="medkit-outline" size={15} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Professional Details</Text>
          </View>

          <EditField
            label="Specialization"
            icon="medkit-outline"
            value={professional.specialization}
            onChangeText={v => handleProfChange('specialization', v)}
            placeholder="e.g. Cardiologist"
            focusedField={focusedField}
            fieldName="specialization"
            onFocus={setFocusedField}
            onBlur={() => setFocusedField(null)}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Years of Experience</Text>
            <View style={[styles.inputRow, focusedField === 'experience' && styles.inputRowFocused]}>
              <Ionicons
                name="briefcase-outline"
                size={16}
                color={focusedField === 'experience' ? colors.primary : colors.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={professional.experience}
                onChangeText={v => handleProfChange('experience', v.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 8"
                placeholderTextColor={colors.disabled}
                keyboardType="number-pad"
                onFocus={() => setFocusedField('experience')}
                onBlur={() => setFocusedField(null)}
              />
              <Text style={styles.inputSuffix}>yrs</Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Consultation Fee</Text>
            <View style={[styles.inputRow, focusedField === 'fee' && styles.inputRowFocused]}>
              <Ionicons
                name="cash-outline"
                size={16}
                color={focusedField === 'fee' ? colors.primary : colors.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={professional.consultationFee}
                onChangeText={v => handleProfChange('consultationFee', v.replace(/[^0-9.]/g, ''))}
                placeholder="e.g. 50"
                placeholderTextColor={colors.disabled}
                keyboardType="decimal-pad"
                onFocus={() => setFocusedField('fee')}
                onBlur={() => setFocusedField(null)}
              />
              <Text style={styles.inputSuffix}>USD</Text>
            </View>
          </View>

          {/* Qualifications */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Qualifications</Text>
            {professional.qualifications.length > 0 && (
              <View style={styles.qualTagsWrap}>
                {professional.qualifications.map((q, i) => (
                  <QualificationTag key={i} text={q} onRemove={() => removeQualification(i)} />
                ))}
              </View>
            )}
            <View style={[styles.inputRow, styles.qualInputRow, qualFocused && styles.inputRowFocused]}>
              <Ionicons
                name="school-outline"
                size={16}
                color={qualFocused ? colors.primary : colors.textLight}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={qualInput}
                onChangeText={setQualInput}
                placeholder="e.g. MBBS, MD Cardiology"
                placeholderTextColor={colors.disabled}
                returnKeyType="done"
                onFocus={() => setQualFocused(true)}
                onBlur={() => { setQualFocused(false); addQualification(); }}
                onSubmitEditing={addQualification}
              />
              <TouchableOpacity onPress={addQualification} style={styles.addQualBtn}>
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.qualHint}>Press Enter or + to add each qualification</Text>
          </View>

          <EditField
            label="Bio / About"
            icon="document-text-outline"
            value={professional.bio}
            onChangeText={v => handleProfChange('bio', v)}
            placeholder="Brief description about yourself and your practice"
            multiline
            focusedField={focusedField}
            fieldName="bio"
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
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  saveHeaderBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 52,
    alignItems: 'center',
  },
  saveHeaderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  /* ── Avatar ── */
  avatarSection: {
    alignItems: 'center',
    marginTop: -26,
    marginBottom: 4,
    zIndex: 10,
  },
  avatarWrap: {
    marginBottom: 6,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: colors.primaryFaded,
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
    fontSize: 30,
    fontWeight: '800',
    color: colors.primary,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primary,
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

  /* ── Scroll ── */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  /* ── Card ── */
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 14,
    gap: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  cardHeaderIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  /* ── Fields ── */
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputRowMultiline: {
    height: 90,
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
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
  inputMultiline: {
    height: 70,
    textAlignVertical: 'top',
  },
  inputSuffix: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    marginLeft: 6,
  },

  /* ── Qualifications ── */
  qualTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  qualTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryFaded,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '80%',
  },
  qualTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    flexShrink: 1,
  },
  qualInputRow: {
    paddingRight: 6,
  },
  addQualBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  qualHint: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
    marginLeft: 2,
  },

  /* ── Save Button ── */
  saveBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

export default DoctorEditProfileScreen;
