import React, { useRef, useEffect } from 'react';
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

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 280;
const STATUS_BAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

const CATEGORY_META = {
  Consultation: { icon: 'chatbubbles',  gradient: ['#059669', '#34D399'], color: '#059669' },
  Laboratory:   { icon: 'flask',        gradient: ['#7C3AED', '#A78BFA'], color: '#7C3AED' },
  Dental:       { icon: 'happy',        gradient: ['#BE185D', '#EC4899'], color: '#EC4899' },
  Radiology:    { icon: 'scan',         gradient: ['#D97706', '#FBBF24'], color: '#D97706' },
  Cardiology:   { icon: 'heart',        gradient: ['#DC2626', '#F87171'], color: '#DC2626' },
  Neurology:    { icon: 'pulse',        gradient: ['#1D4ED8', '#60A5FA'], color: '#2563EB' },
  Orthopedic:   { icon: 'body',         gradient: ['#0F766E', '#2DD4BF'], color: '#0D9488' },
  Pediatrics:   { icon: 'people',       gradient: ['#C2410C', '#FB923C'], color: '#EA580C' },
  default:      { icon: 'medkit',       gradient: ['#059669', '#34D399'], color: '#059669' },
};

const getMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META.default;

const ServiceDetailScreen = ({ route, navigation }) => {
  const { service } = route.params;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start();
  }, []);

  const { serviceName, category, description, price, duration, imageUrl } = service;
  const meta = getMeta(category);

  const handleBook = () => {
    navigation.navigate('AppointmentsTab', { screen: 'BookAppointment' });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ══════════════════════════════
          FLOATING BACK BUTTON
      ══════════════════════════════ */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={20} color={colors.surface} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ══════════════════════════════
            HERO IMAGE / GRADIENT
        ══════════════════════════════ */}
        <View style={styles.hero}>
          {imageUrl ? (
            <>
              <Image
                source={{ uri: imageUrl }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              {/* Bottom fade so content reads cleanly below */}
              <LinearGradient
                colors={['transparent', 'transparent', colors.background]}
                style={styles.heroFade}
              />
              {/* Dark overlay for back button area */}
              <LinearGradient
                colors={['rgba(0,0,0,0.35)', 'transparent']}
                style={styles.heroTopOverlay}
              />
            </>
          ) : (
            <LinearGradient
              colors={meta.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroFallback}
            >
              {/* Decorative shapes */}
              <View style={styles.deco1} />
              <View style={styles.deco2} />
              <View style={styles.deco3} />
              <View style={styles.heroIconCircle}>
                <Ionicons name={meta.icon} size={56} color="rgba(255,255,255,0.95)" />
              </View>
              {/* Bottom fade */}
              <LinearGradient
                colors={['transparent', 'transparent', colors.background]}
                style={styles.heroFade}
              />
            </LinearGradient>
          )}
        </View>

        {/* ══════════════════════════════
            MAIN CONTENT
        ══════════════════════════════ */}
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Category badge */}
          <View style={[styles.catBadge, { backgroundColor: `${meta.color}18` }]}>
            <Ionicons name={meta.icon} size={13} color={meta.color} />
            <Text style={[styles.catBadgeText, { color: meta.color }]}>{category}</Text>
          </View>

          {/* Service name */}
          <Text style={styles.serviceName}>{serviceName}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="cash-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.statValue}>Rs. {price?.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Consultation Fee</Text>
            </View>

            {!!duration && (
              <View style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                </View>
                <Text style={styles.statValue}>{duration} min</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            )}

            <View style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#EA580C" />
              </View>
              <Text style={styles.statValue}>Active</Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>

          {/* About section */}
          {!!description && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>About this Service</Text>
              </View>
              <Text style={styles.descText}>{description}</Text>
            </View>
          )}

          {/* What to expect */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionAccent} />
              <Text style={styles.sectionTitle}>What to Expect</Text>
            </View>
            <View style={styles.expectList}>
              {[
                { icon: 'person-outline',     text: 'Consultation with a qualified specialist' },
                { icon: 'shield-checkmark-outline', text: 'Safe and hygienic environment' },
                { icon: 'document-text-outline',    text: 'Detailed report after the session' },
                { icon: 'call-outline',       text: 'Follow-up support if needed' },
              ].map((item, i) => (
                <View key={i} style={styles.expectItem}>
                  <View style={styles.expectIconWrap}>
                    <Ionicons name={item.icon} size={15} color={colors.accent} />
                  </View>
                  <Text style={styles.expectText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ══════════════════════════════
          BOOK APPOINTMENT BUTTON
      ══════════════════════════════ */}
      <Animated.View style={[styles.bookWrapper, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} activeOpacity={0.88}>
          <LinearGradient
            colors={['#059669', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookGradient}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.surface} />
            <Text style={styles.bookText}>Book Appointment</Text>
            <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
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

  /* ── Back button ── */
  backBtn: {
    position: 'absolute',
    top: STATUS_BAR_H + 14,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Hero ── */
  hero: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deco2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  deco3: {
    position: 'absolute',
    top: 40,
    left: width * 0.5,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  heroIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },

  /* ── Content ── */
  content: {
    paddingHorizontal: 22,
    marginTop: -20,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  /* Category badge */
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  catBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* Service name */
  serviceName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    lineHeight: 30,
    marginBottom: 20,
  },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    marginTop: 2,
  },

  /* Sections */
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
  },

  /* What to expect list */
  expectList: {
    gap: 10,
  },
  expectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  expectIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expectText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 18,
  },

  bottomSpacer: {
    height: Platform.OS === 'ios' ? 140 : 116,
  },

  /* ── Book button ── */
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
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  bookGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 10,
  },
  bookText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.2,
  },
});

export default ServiceDetailScreen;
