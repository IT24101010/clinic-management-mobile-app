import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Animated,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import DoctorCard from '../../components/doctors/DoctorCard';

const MIN_CHARS = 10;
const MAX_CHARS = 500;

const getConfidenceMeta = (confidence) => {
  const pct = Math.round((confidence || 0) * 100);
  if (pct >= 70) {
    return {
      pct,
      label: 'High Confidence',
      color: colors.accent,
      bg: colors.accentFaded,
      gradient: ['#059669', '#10B981'],
    };
  }
  if (pct >= 50) {
    return {
      pct,
      label: 'Moderate Confidence',
      color: '#B45309',
      bg: '#FEF3C7',
      gradient: ['#F59E0B', '#FBBF24'],
    };
  }
  return {
    pct,
    label: 'Low Confidence',
    color: colors.danger,
    bg: '#FEF2F2',
    gradient: ['#DC2626', '#EF4444'],
  };
};

const SymptomCheckerScreen = ({ navigation }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateResult = () => {
    resultAnim.setValue(0);
    Animated.timing(resultAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  };

  const trimmedLen = input.trim().length;
  const canSubmit = trimmedLen >= MIN_CHARS && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setLoading(true);
    setError('');
    setWarning('');
    setResult(null);

    try {
      const { data } = await api.post('/api/triage', {
        symptoms: input.trim(),
      });
      setResult(data);
      const conf = data?.prediction?.confidence ?? 0;
      if (conf < 0.3) {
        setWarning(
          'Your description may be too vague. Try adding more detail about your symptoms.'
        );
      }
      animateResult();
    } catch {
      setError('Unable to analyze symptoms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInput('');
    setResult(null);
    setError('');
    setWarning('');
  };

  const handleBookDoctor = (doctor) => {
    navigation.navigate('DoctorsTab', {
      screen: 'BookAppointment',
      params: { doctor },
    });
  };

  const prediction = result?.prediction;
  const filteredDoctors = result?.filteredDoctors || [];
  const confMeta = prediction ? getConfidenceMeta(prediction.confidence) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Gradient Header ── */}
      <Animated.View style={[styles.headerWrap, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#059669', '#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.decoCircle1} />
          <View style={styles.decoCircle2} />

          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.surface} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Symptom Checker</Text>
              <Text style={styles.headerSubtitle}>AI-assisted specialist matching</Text>
            </View>
            <View style={styles.headerIconBox}>
              <Ionicons name="sparkles" size={22} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Info Card ── */}
          <Animated.View
            style={[
              styles.infoCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.infoIconBox}>
              <Ionicons name="medical-outline" size={26} color={colors.accent} />
            </View>
            <Text style={styles.infoTitle}>AI Symptom Checker</Text>
            <Text style={styles.infoSubtitle}>
              Describe your symptoms in plain English and our AI will recommend the right
              specialist for you.
            </Text>
          </Animated.View>

          {/* ── Input Section ── */}
          <Animated.View
            style={[
              styles.inputSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.inputLabel}>Describe your symptoms</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                multiline
                numberOfLines={4}
                value={input}
                onChangeText={(t) => setInput(t.slice(0, MAX_CHARS))}
                placeholder="e.g., I have severe chest pain and difficulty breathing"
                placeholderTextColor={colors.textLight}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>
            <Text style={styles.charCount}>
              {input.length}/{MAX_CHARS}
              {trimmedLen > 0 && trimmedLen < MIN_CHARS
                ? `  •  ${MIN_CHARS - trimmedLen} more to submit`
                : ''}
            </Text>

            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.btnInner}>
                  <ActivityIndicator size="small" color={colors.surface} />
                  <Text style={styles.submitText}>Analyzing symptoms...</Text>
                </View>
              ) : (
                <View style={styles.btnInner}>
                  <Ionicons name="search" size={18} color={colors.surface} />
                  <Text style={styles.submitText}>Find Specialists</Text>
                </View>
              )}
            </TouchableOpacity>

            {error ? (
              <View style={styles.alertWrap}>
                <ErrorAlert message={error} />
              </View>
            ) : null}
          </Animated.View>

          {/* ── Results ── */}
          {result && prediction && (
            <Animated.View
              style={[
                styles.resultsSection,
                {
                  opacity: resultAnim,
                  transform: [
                    {
                      translateY: resultAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Warning banner */}
              {warning ? (
                <View style={styles.warnCard}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color="#B45309"
                    style={{ marginTop: 1 }}
                  />
                  <Text style={styles.warnText}>{warning}</Text>
                </View>
              ) : null}

              {/* Prediction Card */}
              <View style={styles.predCard}>
                <LinearGradient
                  colors={confMeta.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.predHeader}
                >
                  <View style={styles.predHeaderRow}>
                    <View style={styles.predBadgeIconWrap}>
                      <Ionicons name="pulse" size={20} color={colors.surface} />
                    </View>
                    <Text style={styles.predHeaderTitle}>AI Prediction</Text>
                    <View style={styles.confChip}>
                      <Ionicons
                        name="shield-checkmark"
                        size={11}
                        color={confMeta.color}
                      />
                      <Text style={[styles.confChipText, { color: confMeta.color }]}>
                        {confMeta.pct}%
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.confLabel}>{confMeta.label}</Text>
                </LinearGradient>

                <View style={styles.predBody}>
                  <Text style={styles.predSmallLabel}>Possible Condition</Text>
                  <Text style={styles.predCondition}>{prediction.condition}</Text>

                  <View style={styles.predDivider} />

                  <Text style={styles.predSmallLabel}>Recommended Specialist</Text>
                  <View style={styles.specialtyRow}>
                    <View style={styles.specialtyIconWrap}>
                      <Ionicons name="person-outline" size={16} color={colors.accent} />
                    </View>
                    <Text style={styles.predSpecialty}>{prediction.specialty}</Text>
                  </View>

                  <View style={styles.disclaimerBox}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={colors.textLight}
                      style={{ marginTop: 1 }}
                    />
                    <Text style={styles.disclaimerText}>
                      This is an AI-assisted suggestion, not a medical diagnosis. Please
                      consult a doctor for professional advice.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Recommended Doctors */}
              <View style={styles.doctorsHeader}>
                <Text style={styles.doctorsTitle}>
                  Recommended Doctors
                  <Text style={styles.doctorsCount}>
                    {' '}
                    ({filteredDoctors.length} found)
                  </Text>
                </Text>
              </View>

              {filteredDoctors.length === 0 ? (
                <View style={styles.noDocsCard}>
                  <View style={styles.noDocsIconWrap}>
                    <Ionicons name="medkit-outline" size={26} color={colors.primary} />
                  </View>
                  <Text style={styles.noDocsTitle}>No specialists found</Text>
                  <Text style={styles.noDocsSubtitle}>
                    No specialists found for this condition. Please visit a General
                    Physician.
                  </Text>
                </View>
              ) : (
                <View style={styles.doctorsList}>
                  {filteredDoctors.map((doc) => (
                    <View key={doc._id} style={styles.doctorRow}>
                      <DoctorCard
                        doctor={doc}
                        onPress={() => handleBookDoctor(doc)}
                        style={styles.doctorCardOverride}
                      />
                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => handleBookDoctor(doc)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="calendar-outline" size={16} color={colors.surface} />
                        <Text style={styles.bookBtnText}>Book Appointment</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Clear Results */}
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClear}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={16} color={colors.accent} />
                <Text style={styles.clearBtnText}>Clear Results</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Header ── */
  headerWrap: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 18,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decoCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -10,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: {
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },

  /* ── Info Card ── */
  infoCard: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'flex-start',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  infoIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  infoSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  /* ── Input Section ── */
  inputSection: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  inputWrap: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  input: {
    fontSize: 14,
    color: colors.text,
    padding: 14,
    minHeight: 110,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '500',
  },
  submitBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.accent,
    marginTop: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  alertWrap: {
    marginTop: 4,
  },

  /* ── Results ── */
  resultsSection: {
    marginTop: 22,
  },
  warnCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  warnText: {
    flex: 1,
    fontSize: 12.5,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },

  /* ── Prediction Card ── */
  predCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  predHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  predHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  predBadgeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  predHeaderTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: 0.2,
  },
  confChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  confChipText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  confLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  predBody: {
    padding: 18,
  },
  predSmallLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  predCondition: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    marginTop: 6,
  },
  predDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 16,
  },
  specialtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  specialtyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  predSpecialty: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  disclaimerBox: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  /* ── Recommended Doctors ── */
  doctorsHeader: {
    paddingHorizontal: 22,
    marginTop: 24,
    marginBottom: 12,
  },
  doctorsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  doctorsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  doctorsList: {
    paddingTop: 2,
  },
  doctorRow: {
    marginBottom: 6,
  },
  doctorCardOverride: {
    marginBottom: 0,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  bookBtnText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* ── No Doctors ── */
  noDocsCard: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  noDocsIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  noDocsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  noDocsSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },

  /* ── Clear Results ── */
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 16,
  },
  clearBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default SymptomCheckerScreen;
