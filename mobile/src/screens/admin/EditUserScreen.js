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
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import ErrorAlert from '../../components/shared/ErrorAlert';
import SuccessAlert from '../../components/shared/SuccessAlert';

/* ─── Option chip (role / gender / risk / status) ─── */
const OptionChip = ({ label, icon, selected, onPress, color, bg }) => (
  <TouchableOpacity
    style={[
      styles.optionChip,
      selected && { backgroundColor: color, borderColor: color },
    ]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    {icon ? (
      <Ionicons
        name={icon}
        size={14}
        color={selected ? colors.surface : colors.textSecondary}
        style={{ marginRight: 4 }}
      />
    ) : null}
    <Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/* ─── Edit Field ─── */
const EditField = ({ label, icon, value, onChangeText, keyboardType, focusedField, fieldName, onFocus, onBlur, editable = true }) => {
  const isFocused = focusedField === fieldName;
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[
        styles.inputRow,
        isFocused && styles.inputRowFocused,
        !editable && styles.inputRowDisabled,
      ]}>
        <Ionicons
          name={icon}
          size={16}
          color={isFocused ? '#4F46E5' : colors.textLight}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, !editable && { color: colors.textLight }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={colors.disabled}
          keyboardType={keyboardType || 'default'}
          editable={editable}
          onFocus={() => onFocus && onFocus(fieldName)}
          onBlur={() => onBlur && onBlur()}
        />
      </View>
    </View>
  );
};

/* ─── Section header inside form ─── */
const FormSection = ({ icon, title }) => (
  <View style={styles.formSectionHeader}>
    <View style={styles.formSectionIcon}>
      <Ionicons name={icon} size={14} color="#4F46E5" />
    </View>
    <Text style={styles.formSectionTitle}>{title}</Text>
  </View>
);

/* ─── Main Screen ─── */
const EditUserScreen = ({ navigation, route }) => {
  const { user: initialUser } = route.params;

  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const [form, setForm] = useState({
    name:      initialUser.name      || '',
    email:     initialUser.email     || '',
    phone:     initialUser.phone     || '',
    address:   initialUser.address   || '',
    role:      initialUser.role      || 'patient',
    gender:    initialUser.gender    || '',
    riskLevel: initialUser.riskLevel || 'Low',
    isActive:  initialUser.isActive  !== false,
  });

  const fadeIn  = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Full name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/api/users/${initialUser._id}`, {
        name:      form.name.trim(),
        phone:     form.phone,
        address:   form.address,
        role:      form.role,
        gender:    form.gender,
        riskLevel: form.riskLevel,
        isActive:  form.isActive,
      });
      setSuccess('User updated successfully!');
      setTimeout(() => navigation.goBack(), 1400);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Config arrays ─── */
  const ROLES = [
    { value: 'patient', label: 'Patient', icon: 'person-outline',   color: colors.accent,  bg: colors.accentFaded  },
    { value: 'doctor',  label: 'Doctor',  icon: 'medkit-outline',   color: colors.primary, bg: colors.primaryFaded },
    { value: 'admin',   label: 'Admin',   icon: 'shield-outline',   color: '#4F46E5',      bg: '#EEF2FF'           },
  ];
  const GENDERS = [
    { value: 'male',   label: 'Male'   },
    { value: 'female', label: 'Female' },
    { value: 'other',  label: 'Other'  },
  ];
  const RISKS = [
    { value: 'Low',    label: 'Low',    color: colors.accent,  bg: colors.accentFaded },
    { value: 'Medium', label: 'Medium', color: colors.warning, bg: '#FFFBEB'          },
    { value: 'High',   label: 'High',   color: colors.danger,  bg: '#FEF2F2'          },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#4F46E5', '#6366F1', '#818CF8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={colors.surface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit User</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{initialUser.name}</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveHeaderBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Ionicons name="checkmark" size={20} color={colors.surface} />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          {/* ── Alerts ── */}
          {error   ? <ErrorAlert   message={error}   /> : null}
          {success ? <SuccessAlert message={success} /> : null}

          {/* ── Personal Info ── */}
          <View style={styles.card}>
            <FormSection icon="person-outline" title="Personal Information" />

            <EditField
              label="Full Name" icon="person-outline"
              value={form.name} onChangeText={v => set('name', v)}
              focusedField={focusedField} fieldName="name"
              onFocus={setFocusedField} onBlur={() => setFocusedField(null)}
            />
            <EditField
              label="Email" icon="mail-outline"
              value={form.email} editable={false}
              focusedField={focusedField} fieldName="email"
            />
            <EditField
              label="Phone" icon="call-outline"
              value={form.phone} onChangeText={v => set('phone', v)}
              keyboardType="phone-pad"
              focusedField={focusedField} fieldName="phone"
              onFocus={setFocusedField} onBlur={() => setFocusedField(null)}
            />
            <EditField
              label="Address" icon="location-outline"
              value={form.address} onChangeText={v => set('address', v)}
              focusedField={focusedField} fieldName="address"
              onFocus={setFocusedField} onBlur={() => setFocusedField(null)}
            />

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.chipRow}>
                {GENDERS.map(g => (
                  <OptionChip
                    key={g.value}
                    label={g.label}
                    selected={form.gender === g.value}
                    onPress={() => set('gender', g.value)}
                    color="#4F46E5"
                    bg="#EEF2FF"
                  />
                ))}
              </View>
            </View>
          </View>

          {/* ── Account Settings ── */}
          <View style={styles.card}>
            <FormSection icon="shield-outline" title="Account Settings" />

            {/* Role */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Role</Text>
              <View style={styles.chipRow}>
                {ROLES.map(r => (
                  <OptionChip
                    key={r.value}
                    label={r.label}
                    icon={r.icon}
                    selected={form.role === r.value}
                    onPress={() => set('role', r.value)}
                    color={r.color}
                    bg={r.bg}
                  />
                ))}
              </View>
            </View>

            {/* Active Status */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Account Status</Text>
              <View style={styles.chipRow}>
                <OptionChip
                  label="Active"
                  icon="checkmark-circle-outline"
                  selected={form.isActive}
                  onPress={() => set('isActive', true)}
                  color={colors.accent}
                  bg={colors.accentFaded}
                />
                <OptionChip
                  label="Inactive"
                  icon="close-circle-outline"
                  selected={!form.isActive}
                  onPress={() => set('isActive', false)}
                  color={colors.danger}
                  bg="#FEF2F2"
                />
              </View>
            </View>
          </View>

          {/* ── Health Settings (patients only) ── */}
          {form.role === 'patient' && (
            <View style={styles.card}>
              <FormSection icon="fitness-outline" title="Health Settings" />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Risk Level</Text>
                <View style={styles.chipRow}>
                  {RISKS.map(r => (
                    <OptionChip
                      key={r.value}
                      label={r.label}
                      selected={form.riskLevel === r.value}
                      onPress={() => set('riskLevel', r.value)}
                      color={r.color}
                      bg={r.bg}
                    />
                  ))}
                </View>
                <Text style={styles.fieldHint}>
                  High-risk patients automatically receive priority flags on appointments.
                </Text>
              </View>
            </View>
          )}

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
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* ── Header ── */
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 54,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.surface },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '500' },
  saveHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Scroll ── */
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  /* ── Card ── */
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    gap: 14,
  },

  /* ── Form Section Header ── */
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  formSectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },

  /* ── Field ── */
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
  fieldHint: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
    marginTop: 6,
    lineHeight: 16,
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
  inputRowFocused: { borderColor: '#4F46E5', backgroundColor: colors.surface },
  inputRowDisabled: { opacity: 0.55 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: colors.text, height: '100%' },

  /* ── Chips ── */
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.inputBg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  optionChipTextActive: { color: colors.surface },

  /* ── Save Button ── */
  saveBtn: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.surface },
});

export default EditUserScreen;
