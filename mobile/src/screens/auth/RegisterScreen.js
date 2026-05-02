import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import colors from '../../constants/colors';
import ErrorAlert from '../../components/shared/ErrorAlert';

const GENDERS = [
  { key: 'Male', icon: 'male' },
  { key: 'Female', icon: 'female' },
  { key: 'Other', icon: 'ellipsis-horizontal' },
];

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    gender: '',
  });
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [localError, setLocalError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideUp, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    setLocalError('');
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password ||
      !formData.confirmPassword || !formData.phone.trim() || !formData.gender) {
      setLocalError('All fields are required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    setLocalError('');
    setIsSuccess(false);
    if (!validateForm()) return;
    setLoading(true);
    try {
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        dateOfBirth: dateOfBirth.toISOString(),
        gender: formData.gender,
      });
      if (!result?.success) {
        setLocalError(result?.message || 'Registration failed. Please try again.');
        return;
      }
      setIsSuccess(true);
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      setLocalError(
        err?.message === 'Network Error'
          ? 'Cannot reach server. Check your connection and API URL.'
          : err?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError;

  const renderInput = (field, label, icon, placeholder, options = {}) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focusedField === field && styles.inputRowFocused,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={focusedField === field ? colors.accent : colors.textLight}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.disabled}
          value={formData[field]}
          onChangeText={(t) => handleChange(field, t)}
          onFocus={() => setFocusedField(field)}
          onBlur={() => setFocusedField(null)}
          {...options}
        />
        {options.secureTextEntry !== undefined && (
          <TouchableOpacity
            onPress={options.onToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={options.visible ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <LinearGradient
        colors={['#D6E9F8', '#B8E6D0', '#D1F5E0', '#EAF9F0', '#FFFFFF']}
        locations={[0, 0.25, 0.4, 0.55, 0.75]}
        style={styles.gradientBg}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <View style={styles.stepDot} />
            </View>
          </View>

          {/* Title */}
          <Animated.View
            style={[
              styles.titleSection,
              { opacity: fadeIn, transform: [{ translateY: slideUp }] },
            ]}
          >
            <Text style={styles.title}>Create your{'\n'}account</Text>
            <Text style={styles.subtitle}>
              Join us for a smarter healthcare{'\n'}experience.
            </Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            style={[
              styles.formCard,
              { opacity: fadeIn, transform: [{ translateY: slideUp }] },
            ]}
          >
            {displayError ? (
              <View style={styles.errorBox}>
                <ErrorAlert message={displayError} />
              </View>
            ) : null}

            {renderInput('name', 'Full Name', 'person-outline', 'John Doe')}

            {renderInput('email', 'Email', 'mail-outline', 'your@email.com', {
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              autoCorrect: false,
            })}

            {renderInput('phone', 'Phone', 'call-outline', '+94 7X XXX XXXX', {
              keyboardType: 'phone-pad',
            })}

            {/* Date of Birth */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.textLight}
                  style={styles.inputIcon}
                />
                <Text style={styles.dateText}>
                  {dateOfBirth.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textLight} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateOfBirth}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDERS.map(({ key, icon }) => {
                  const selected = formData.gender === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.genderChip, selected && styles.genderChipActive]}
                      onPress={() => handleChange('gender', key)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={icon}
                        size={16}
                        color={selected ? colors.surface : colors.textLight}
                      />
                      <Text
                        style={[
                          styles.genderChipText,
                          selected && styles.genderChipTextActive,
                        ]}
                      >
                        {key}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {renderInput('password', 'Password', 'lock-closed-outline', 'Min 6 characters', {
              secureTextEntry: !showPassword,
              autoCapitalize: 'none',
              visible: showPassword,
              onToggle: () => setShowPassword(!showPassword),
            })}

            {renderInput('confirmPassword', 'Confirm Password', 'shield-checkmark-outline', 'Re-enter password', {
              secureTextEntry: !showConfirmPassword,
              autoCapitalize: 'none',
              visible: showConfirmPassword,
              onToggle: () => setShowConfirmPassword(!showConfirmPassword),
            })}

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, (loading || isSuccess) && styles.primaryBtnDisabled]}
              activeOpacity={0.85}
              onPress={handleRegister}
              disabled={loading || isSuccess}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Create account</Text>
              )}
            </TouchableOpacity>

            {/* Terms */}
            <Text style={styles.termsText}>
              By registering, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 56,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  stepDotActive: {
    width: 24,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },

  /* Title */
  titleSection: {
    paddingHorizontal: 28,
    marginBottom: 24,
    marginTop: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: 10,
  },

  /* Form Card */
  formCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 6,
  },
  errorBox: {
    marginBottom: 20,
  },

  /* Fields */
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginLeft: 2,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#F8FAF9',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputRowFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },

  /* Gender */
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderChip: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F8FAF9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  genderChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  genderChipTextActive: {
    color: colors.surface,
  },

  /* Primary Button */
  primaryBtn: {
    height: 54,
    backgroundColor: colors.accent,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryBtnDisabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },

  /* Terms */
  termsText: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 18,
  },
  termsLink: {
    color: colors.accent,
    fontWeight: '600',
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
});

export default RegisterScreen;
