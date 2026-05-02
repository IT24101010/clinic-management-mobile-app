import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

const { width, height } = Dimensions.get('window');
const HEADER_HEIGHT = height * 0.44;
const STATUS_BAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;
const TOP_BAR_H = 52;
const BIO_LIMIT = 140;

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DoctorDetailScreen = ({ route, navigation }) => {
  const { doctor } = route.params;
  const [bioExpanded, setBioExpanded] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const {
    userId,
    specialization,
    qualifications = [],
    experience,
    availableSlots = [],
    consultationFee,
    bio,
    isAvailable,
  } = doctor;

  const name = userId?.name || 'Doctor';
  const profileImage = userId?.profileImage;

  /* Split name for hero display: "Dr. John" / "Smith" */
  const cleanName = name.replace(/^Dr\.?\s*/i, '').trim();
  const nameParts = cleanName.split(' ');
  const heroLine1 = `Dr. ${nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : cleanName}`;
  const heroLine2 = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const initials = cleanName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  const sortedSlots = [...availableSlots].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );

  const bioText = bio || '';
  const bioTruncated = bioText.length > BIO_LIMIT && !bioExpanded;
  const displayBio = bioTruncated ? bioText.slice(0, BIO_LIMIT).trimEnd() + '...' : bioText;

  const handleBook = () => {
    navigation.navigate('AppointmentsTab', { screen: 'BookAppointment' });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ═══════════════════════════════════════
          HEADER — fixed, not scrollable
      ═══════════════════════════════════════ */}
      <LinearGradient
        colors={['#047857', '#059669', '#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decorative circles */}
        <View style={styles.deco1} />
        <View style={styles.deco2} />
        <View style={styles.deco3} />

        {/* ── Top bar: back + title ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={colors.surface} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Doctor Profile</Text>
          {/* Invisible spacer to center title */}
          <View style={styles.topBarSpacer} />
        </View>

        {/* ── Hero content: name (left) + photo (right) ── */}
        <View style={styles.heroContent}>
          {/* Left: doctor name + specialty */}
          <View style={styles.heroLeft}>
            <Text style={styles.heroLine1}>{heroLine1}</Text>
            {heroLine2 ? <Text style={styles.heroLine2}>{heroLine2}</Text> : null}
            <Text style={styles.heroSpecialty}>{specialization}</Text>

            {/* Availability pill */}
            <View style={[styles.availPill, isAvailable ? styles.pillGreen : styles.pillGray]}>
              <View style={[styles.availDot, isAvailable ? styles.dotGreen : styles.dotGray]} />
              <Text style={[styles.availPillText, isAvailable ? styles.pillTextGreen : styles.pillTextGray]}>
                {isAvailable ? 'Available Now' : 'Unavailable'}
              </Text>
            </View>
          </View>

          {/* Right: doctor portrait */}
          <View style={styles.photoArea}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.doctorPhoto}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.photoInitials}>{initials}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ═══════════════════════════════════════
          SCROLLABLE CONTENT
      ═══════════════════════════════════════ */}
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{experience} Yrs</Text>
            <Text style={styles.statLabel}>Experience</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Rs.{consultationFee}</Text>
            <Text style={styles.statLabel}>Consult Fee</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* ── About Doctor ── */}
        {bioText.length > 0 && (
          <Animated.View
            style={[styles.section, { transform: [{ translateY: slideAnim }] }]}
          >
            <Text style={styles.sectionTitle}>About Doctor</Text>
            <Text style={styles.bioText}>
              {displayBio}
              {bioText.length > BIO_LIMIT && (
                <Text
                  style={styles.readMore}
                  onPress={() => setBioExpanded(!bioExpanded)}
                >
                  {bioExpanded ? ' Show less' : ' Read More..'}
                </Text>
              )}
            </Text>
          </Animated.View>
        )}

        {/* ── Qualifications ── */}
        {qualifications.length > 0 && (
          <Animated.View style={[styles.section, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionTitle}>Qualifications</Text>
            <View style={styles.pillsRow}>
              {qualifications.map((q, i) => (
                <View key={i} style={styles.qualPill}>
                  <Ionicons name="school-outline" size={12} color={colors.accent} />
                  <Text style={styles.qualPillText}>{q}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Working Hours ── */}
        {sortedSlots.length > 0 && (
          <Animated.View style={[styles.section, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionTitle}>Working Hours</Text>
            <View style={styles.hoursCard}>
              {sortedSlots.map((slot, i) => (
                <View
                  key={i}
                  style={[
                    styles.hourRow,
                    i < sortedSlots.length - 1 && styles.hourRowBorder,
                  ]}
                >
                  <View style={styles.hourDayWrap}>
                    <View style={styles.hourDot} />
                    <Text style={styles.hourDay}>{slot.day}</Text>
                  </View>
                  <Text style={styles.hourTime}>
                    {slot.startTime} – {slot.endTime}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>

      {/* ═══════════════════════════════════════
          BOOK APPOINTMENT — fixed bottom
      ═══════════════════════════════════════ */}
      <Animated.View style={[styles.bookWrapper, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={handleBook}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={['#059669', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookGradient}
          >
            <Text style={styles.bookText}>Book Appointment</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ══════════════════════════════
     HEADER
  ══════════════════════════════ */
  header: {
    height: HEADER_HEIGHT,
    paddingTop: STATUS_BAR_H,
    overflow: 'hidden',
  },

  /* Decorative circles */
  deco1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  deco2: {
    position: 'absolute',
    top: 40,
    left: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  deco3: {
    position: 'absolute',
    bottom: -30,
    left: width * 0.35,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  /* Top bar */
  topBar: {
    height: TOP_BAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.1,
  },
  topBarSpacer: {
    width: 38,
  },

  /* Hero content row */
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 24,
  },

  /* Left: name area */
  heroLeft: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  heroLine1: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.2,
  },
  heroLine2: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -0.5,
    lineHeight: 40,
    marginBottom: 4,
  },
  heroSpecialty: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 14,
  },
  availPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  pillGreen: { backgroundColor: 'rgba(255,255,255,0.2)' },
  pillGray: { backgroundColor: 'rgba(0,0,0,0.15)' },
  availDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotGreen: { backgroundColor: '#86EFAC' },
  dotGray: { backgroundColor: 'rgba(255,255,255,0.5)' },
  availPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pillTextGreen: { color: colors.surface },
  pillTextGray: { color: 'rgba(255,255,255,0.6)' },

  /* Right: doctor photo */
  photoArea: {
    width: width * 0.7,
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  doctorPhoto: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoInitials: {
    fontSize: 48,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
  },

  /* ══════════════════════════════
     SCROLL CONTENT
  ══════════════════════════════ */
  scrollContent: {
    paddingBottom: 0,
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 20,
    paddingHorizontal: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  statSep: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },

  /* Sections */
  section: {
    marginTop: 24,
    paddingHorizontal: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },

  /* Bio */
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  readMore: {
    color: colors.accent,
    fontWeight: '600',
  },

  /* Qualification pills */
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentFaded,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  qualPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },

  /* Working Hours */
  hoursCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  hourRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  hourDayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hourDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.accent,
  },
  hourDay: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  hourTime: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },

  bottomSpacer: {
    height: Platform.OS === 'ios' ? 140 : 116,
  },

  /* ══════════════════════════════
     BOOK BUTTON
  ══════════════════════════════ */
  bookWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 76,
    left: 20,
    right: 20,
  },
  bookBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  bookGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.3,
  },
});

export default DoctorDetailScreen;
