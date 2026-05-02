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
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import ErrorAlert from '../../components/shared/ErrorAlert';
import SuccessAlert from '../../components/shared/SuccessAlert';
import StarRating from '../../components/feedback/StarRating';

const MAX_CHARS = 500;

const SubmitFeedbackScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [rating,     setRating]     = useState(0);
  const [comment,    setComment]    = useState('');
  const [doctors,    setDoctors]    = useState([]);
  const [services,   setServices]   = useState([]);
  const [doctorId,   setDoctorId]   = useState(null);
  const [serviceId,  setServiceId]  = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [docRes, svcRes] = await Promise.all([
        api.get('/api/doctors'),
        api.get('/api/services'),
      ]);
      setDoctors(Array.isArray(docRes.data) ? docRes.data : []);
      setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
    } catch {
      /* non-fatal — tagging is optional */
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) { setError('Please select a star rating.'); return; }
    if (!comment.trim()) { setError('Please write a comment.'); return; }

    setError('');
    setSubmitting(true);
    try {
      await api.post('/api/feedback', {
        rating,
        comment: comment.trim(),
        ...(doctorId  && { doctorId  }),
        ...(serviceId && { serviceId }),
      });
      setSuccess('Thank you for your review!');
      setTimeout(() => navigation.goBack(), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  /* Toggle helpers */
  const toggleDoctor  = (id) => setDoctorId((prev) => (prev === id ? null : id));
  const toggleService = (id) => setServiceId((prev) => (prev === id ? null : id));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ══════════════════════════════
          HEADER
      ══════════════════════════════ */}
      <LinearGradient
        colors={['#059669', '#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.deco1} />
        <View style={styles.deco2} />

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write a Review</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Greeting */}
        <Animated.View style={[styles.greeting, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.greetingTitle}>Hi {firstName}! 👋</Text>
          <Text style={styles.greetingSub}>
            Your feedback helps us improve our services
          </Text>
        </Animated.View>

        {/* Alerts */}
        {error   ? <View style={styles.alertWrap}><ErrorAlert   message={error}   /></View> : null}
        {success ? <View style={styles.alertWrap}><SuccessAlert message={success} /></View> : null}

        {/* ══════════════════════════════
            RATING CARD
        ══════════════════════════════ */}
        <Animated.View
          style={[styles.card, styles.ratingCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.cardTitle}>Rate your experience</Text>
          <Text style={styles.cardSub}>Tap a star to set your rating</Text>

          <View style={styles.starsWrap}>
            <StarRating
              rating={rating}
              onRatingChange={setRating}
              size={44}
              showLabel
              color="#F59E0B"
            />
          </View>

          {/* Rating bar visualisation */}
          {rating > 0 && (
            <View style={styles.ratingBar}>
              {[1, 2, 3, 4, 5].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.ratingBarSeg,
                    s <= rating && styles.ratingBarFilled,
                  ]}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* ══════════════════════════════
            TAG A DOCTOR
        ══════════════════════════════ */}
        {doctors.length > 0 && (
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="medical-outline" size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Tag a Doctor</Text>
                <Text style={styles.cardSub}>Optional</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              {doctors.map((doc) => {
                const id       = doc.userId?._id;
                const selected = doctorId === id;
                return (
                  <TouchableOpacity
                    key={doc._id}
                    style={[styles.selChip, selected && styles.selChipActive]}
                    onPress={() => toggleDoctor(id)}
                    activeOpacity={0.7}
                  >
                    {selected && (
                      <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                    )}
                    <Text
                      style={[styles.selChipText, selected && styles.selChipTextActive]}
                      numberOfLines={1}
                    >
                      {doc.userId?.name || 'Doctor'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ══════════════════════════════
            TAG A SERVICE
        ══════════════════════════════ */}
        {services.length > 0 && (
          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconWrap, { backgroundColor: colors.accentFaded }]}>
                <Ionicons name="grid-outline" size={16} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Tag a Service</Text>
                <Text style={styles.cardSub}>Optional</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipScroll}
            >
              {services.map((svc) => {
                const selected = serviceId === svc._id;
                return (
                  <TouchableOpacity
                    key={svc._id}
                    style={[styles.selChip, styles.selChipService, selected && styles.selChipServiceActive]}
                    onPress={() => toggleService(svc._id)}
                    activeOpacity={0.7}
                  >
                    {selected && (
                      <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
                    )}
                    <Text
                      style={[styles.selChipText, styles.selChipTextService, selected && styles.selChipServiceTextActive]}
                      numberOfLines={1}
                    >
                      {svc.serviceName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ══════════════════════════════
            COMMENT
        ══════════════════════════════ */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.cardIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="chatbubble-outline" size={16} color="#EA580C" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Your Review</Text>
              <Text style={styles.cardSub}>Share your experience</Text>
            </View>
          </View>

          <TextInput
            style={styles.commentInput}
            placeholder="Tell others about your experience — what was helpful, what could be improved..."
            placeholderTextColor={colors.textLight}
            value={comment}
            onChangeText={(v) => v.length <= MAX_CHARS && setComment(v)}
            multiline
            textAlignVertical="top"
            returnKeyType="default"
          />
          <Text style={[styles.charCount, comment.length > MAX_CHARS * 0.9 && styles.charCountWarn]}>
            {comment.length}/{MAX_CHARS}
          </Text>
        </Animated.View>

        {/* ══════════════════════════════
            SUBMIT BUTTON
        ══════════════════════════════ */}
        <Animated.View style={[styles.submitWrap, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={[styles.submitBtn, (submitting || rating === 0) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={submitting || rating === 0}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={rating > 0 ? ['#059669', '#10B981'] : [colors.disabled, colors.disabled]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color={colors.surface} />
                  <Text style={styles.submitText}>Submit Review</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

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
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute', top: -40, right: -40,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deco2: {
    position: 'absolute', bottom: -20, left: 60,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18, fontWeight: '700', color: colors.surface,
  },

  /* ── Scroll ── */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  alertWrap: { marginBottom: 12 },

  /* ── Greeting ── */
  greeting: {
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 14, color: colors.textSecondary, marginTop: 4,
  },

  /* ── Cards ── */
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  ratingCard: {
    alignItems: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: colors.text,
  },
  cardSub: {
    fontSize: 11, fontWeight: '500', color: colors.textLight, marginTop: 1,
  },

  /* ── Stars ── */
  starsWrap: {
    paddingVertical: 8,
  },
  ratingBar: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
    marginTop: 4,
  },
  ratingBarSeg: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  ratingBarFilled: {
    backgroundColor: '#F59E0B',
  },

  /* ── Tag chips ── */
  chipScroll: { gap: 8, paddingRight: 4 },
  selChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.inputBg, borderWidth: 1.5,
    borderColor: colors.border,
  },
  selChipActive: {
    backgroundColor: '#EFF6FF', borderColor: colors.primary,
  },
  selChipService: {},
  selChipServiceActive: {
    backgroundColor: colors.accentFaded, borderColor: colors.accent,
  },
  selChipText: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary, maxWidth: 120,
  },
  selChipTextActive: { color: colors.primary },
  selChipTextService: {},
  selChipServiceTextActive: { color: colors.accent },

  /* ── Comment ── */
  commentInput: {
    backgroundColor: colors.inputBg,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: 'transparent',
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11, fontWeight: '500', color: colors.textLight,
    textAlign: 'right', marginTop: -4,
  },
  charCountWarn: { color: colors.warning },

  /* ── Submit ── */
  submitWrap: { marginTop: 4 },
  submitBtn: {
    borderRadius: 16, overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 7,
  },
  submitDisabled: { shadowOpacity: 0, elevation: 0 },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 17, gap: 10,
  },
  submitText: {
    fontSize: 16, fontWeight: '700', color: colors.surface, letterSpacing: 0.2,
  },
});

export default SubmitFeedbackScreen;
