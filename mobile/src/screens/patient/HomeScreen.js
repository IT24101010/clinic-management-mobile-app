import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorAlert from '../../components/shared/ErrorAlert';
import FeedbackCard from '../../components/feedback/FeedbackCard';
import StarRating from '../../components/feedback/StarRating';
import AnnouncementCard from '../../components/announcements/AnnouncementCard';
import { formatDate } from '../../utils/formatDate';

const { width } = Dimensions.get('window');

/* ─── Category icon/color mapping ─── */
const CATEGORY_META = {
  Consultation: { icon: 'chatbubbles', color: '#059669', bg: '#ECFDF5' },
  Laboratory: { icon: 'flask', color: '#7C3AED', bg: '#F5F3FF' },
  Dental: { icon: 'happy', color: '#EC4899', bg: '#FDF2F8' },
  Radiology: { icon: 'scan', color: '#F59E0B', bg: '#FFFBEB' },
  Cardiology: { icon: 'heart', color: '#EF4444', bg: '#FEF2F2' },
  Neurology: { icon: 'pulse', color: '#3B82F6', bg: '#EFF6FF' },
  Orthopedic: { icon: 'body', color: '#14B8A6', bg: '#F0FDFA' },
  Pediatrics: { icon: 'people', color: '#F97316', bg: '#FFF7ED' },
  default: { icon: 'medkit', color: '#059669', bg: '#ECFDF5' },
};

const getCategoryMeta = (cat) => CATEGORY_META[cat] || CATEGORY_META.default;

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  const fetchData = useCallback(async () => {
    try {
      setError('');
      const [apptRes, docRes, svcRes, fbRes, annRes] = await Promise.all([
        api.get('/api/appointments/my'),
        api.get('/api/doctors'),
        api.get('/api/services'),
        api.get('/api/feedback'),
        api.get('/api/announcements'),
      ]);
      setAppointments(apptRes.data || []);
      setDoctors(docRes.data || []);
      setServices(svcRes.data || []);
      setFeedbacks(fbRes.data || []);
      setAnnouncements(Array.isArray(annRes.data) ? annRes.data : []);
    } catch (err) {
      setError('Unable to load data. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const firstName = user?.name?.split(' ')[0] || 'there';

  /* Derive next upcoming appointment */
  const now = new Date();
  const upcomingAppointment = appointments
    .filter((a) => new Date(a.date) >= now && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  /* Derive unique categories from services */
  const categories = [...new Set(services.map((s) => s.category))].filter(Boolean);

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <LinearGradient
        colors={['#D6E9F8', '#B8E6D0', '#D1F5E0', '#EAF9F0', '#F8FAFC']}
        locations={[0, 0.2, 0.35, 0.5, 0.7]}
        style={styles.gradientBg}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* ── Header ── */}
        <Animated.View style={[styles.header, { opacity: fadeIn }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {firstName}!</Text>
            <Text style={styles.greetingSub}>Let us make you feel better</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color={colors.text} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <View style={styles.avatar}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{firstName[0]?.toUpperCase()}</Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* ── Search Bar (visual) ── */}
        <Animated.View style={[styles.searchBar, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <Ionicons name="search-outline" size={18} color={colors.textLight} />
          <Text style={styles.searchPlaceholder}>Search doctors, services...</Text>
        </Animated.View>

        {error ? (
          <View style={styles.errorBox}>
            <ErrorAlert message={error} />
          </View>
        ) : null}

        {/* ── Promo Banner ── */}
        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
          <LinearGradient
            colors={['#059669', '#10B981']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoBanner}
          >
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Enhance Your{'\n'}Healthcare Experience</Text>
              <Text style={styles.promoSub}>Health is Wealth: Access{'\n'}Doctors Easily with Us!</Text>
            </View>
            <View style={styles.promoIconWrap}>
              <Ionicons name="medical" size={52} color="rgba(255,255,255,0.25)" />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── AI Symptom Checker CTA ── */}
        <Animated.View style={[styles.symptomWrap, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('SymptomChecker')}
            style={styles.symptomBtn}
          >
            <LinearGradient
              colors={['#6D28D9', '#7C3AED', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.symptomCard}
            >
              <View style={styles.symptomDeco1} />
              <View style={styles.symptomDeco2} />

              <View style={styles.symptomIconWrap}>
                <Ionicons name="sparkles" size={24} color={colors.surface} />
              </View>

              <View style={styles.symptomContent}>
                <View style={styles.symptomBadge}>
                  <Ionicons name="flash" size={9} color="#7C3AED" />
                  <Text style={styles.symptomBadgeText}>AI POWERED</Text>
                </View>
                <Text style={styles.symptomTitle}>Symptom Checker</Text>
                <Text style={styles.symptomSub}>
                  Describe your symptoms and find the right specialist instantly
                </Text>
              </View>

              <View style={styles.symptomArrow}>
                <Ionicons name="arrow-forward" size={16} color={colors.surface} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Upcoming Appointment ── */}
        <Animated.View style={[styles.section, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointment</Text>
          </View>

          {upcomingAppointment ? (
            <View style={styles.appointmentCard}>
              <View style={styles.apptRow}>
                <View style={styles.apptAvatar}>
                  <Ionicons name="person" size={22} color={colors.accent} />
                </View>
                <View style={styles.apptInfo}>
                  <Text style={styles.apptDoctor}>
                    {upcomingAppointment.doctorId?.name || 'Doctor'}
                  </Text>
                  <Text style={styles.apptSpecialty}>
                    {upcomingAppointment.serviceId?.serviceName || 'General Consultation'}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  upcomingAppointment.status === 'confirmed' && styles.statusConfirmed,
                  upcomingAppointment.status === 'pending' && styles.statusPending,
                ]}>
                  <Text style={[
                    styles.statusText,
                    upcomingAppointment.status === 'confirmed' && styles.statusTextConfirmed,
                    upcomingAppointment.status === 'pending' && styles.statusTextPending,
                  ]}>
                    {upcomingAppointment.status?.charAt(0).toUpperCase() + upcomingAppointment.status?.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.apptDivider} />
              <View style={styles.apptMeta}>
                <View style={styles.apptMetaItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.accent} />
                  <Text style={styles.apptMetaText}>{formatDate(upcomingAppointment.date)}</Text>
                </View>
                <View style={styles.apptMetaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.accent} />
                  <Text style={styles.apptMetaText}>
                    {upcomingAppointment.timeSlotId?.startTime || 'TBA'}
                  </Text>
                </View>
                {upcomingAppointment.tokenNumber && (
                  <View style={styles.apptMetaItem}>
                    <Ionicons name="ticket-outline" size={14} color={colors.accent} />
                    <Text style={styles.apptMetaText}>Token #{upcomingAppointment.tokenNumber}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color={colors.disabled} />
              <Text style={styles.emptyText}>No upcoming appointments</Text>
              <Text style={styles.emptySubText}>Book one from the Doctors tab</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Categories ── */}
        {categories.length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeIn }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Category</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map((cat) => {
                const meta = getCategoryMeta(cat);
                return (
                  <TouchableOpacity key={cat} style={styles.categoryItem} activeOpacity={0.7}>
                    <View style={[styles.categoryIcon, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={22} color={meta.color} />
                    </View>
                    <Text style={styles.categoryLabel} numberOfLines={1}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Announcements ── */}
        {announcements.length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.announceSectionLeft}>
                <View style={styles.announceDot} />
                <Text style={styles.sectionTitle}>Announcements</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('AnnouncementFeed')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {/* High-priority alert banner (if any) */}
            {announcements.some((a) => a.priority === 'high') && (
              <View style={styles.alertBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.alertBannerText}>
                  {announcements.filter((a) => a.priority === 'high').length} high-priority notice
                  {announcements.filter((a) => a.priority === 'high').length > 1 ? 's' : ''}
                </Text>
                <Ionicons name="chevron-forward" size={13} color="#EF4444" />
              </View>
            )}

            {/* Announcement cards — show up to 3 */}
            <View style={styles.announceList}>
              {announcements.slice(0, 3).map((ann) => (
                <AnnouncementCard
                  key={ann._id}
                  announcement={ann}
                  compact
                  onPress={() =>
                    navigation.navigate('AnnouncementDetail', { announcement: ann })
                  }
                />
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Popular Doctors ── */}
        <Animated.View style={[styles.section, { opacity: fadeIn }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Doctors</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {doctors.length > 0 ? (
            doctors.slice(0, 5).map((doc) => (
              <View key={doc._id} style={styles.doctorCard}>
                <View style={styles.docAvatarWrap}>
                  {doc.userId?.profileImage ? (
                    <Image source={{ uri: doc.userId.profileImage }} style={styles.docAvatarImg} />
                  ) : (
                    <View style={styles.docAvatar}>
                      <Ionicons name="person" size={20} color={colors.accent} />
                    </View>
                  )}
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName}>{doc.userId?.name || 'Doctor'}</Text>
                  <Text style={styles.docSpecialty}>{doc.specialization}</Text>
                  <View style={styles.docMetaRow}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={styles.docMetaText}>{doc.experience} yrs exp</Text>
                    <View style={styles.docMetaDot} />
                    <Text style={styles.docMetaText}>Rs. {doc.consultationFee}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.bookBtn} activeOpacity={0.8}>
                  <Ionicons name="arrow-forward" size={16} color={colors.surface} />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="medkit-outline" size={32} color={colors.disabled} />
              <Text style={styles.emptyText}>No doctors available</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Patient Reviews ── */}
        {feedbacks.length > 0 && (
          <Animated.View style={[styles.section, styles.lastSection, { opacity: fadeIn }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Patient Reviews</Text>
              <TouchableOpacity onPress={() => navigation.navigate('FeedbackList')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {/* Average rating summary */}
            <View style={styles.reviewSummary}>
              <View style={styles.reviewAvgWrap}>
                <Text style={styles.reviewAvgNum}>
                  {(feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)}
                </Text>
                <StarRating
                  rating={feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length}
                  size={13}
                  color="#F59E0B"
                />
                <Text style={styles.reviewAvgSub}>{feedbacks.length} reviews</Text>
              </View>
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={() => navigation.navigate('SubmitFeedback')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#059669', '#10B981']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.writeReviewGradient}
                >
                  <Ionicons name="create-outline" size={15} color={colors.surface} />
                  <Text style={styles.writeReviewText}>Write a Review</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.feedbackScroll}
            >
              {feedbacks.slice(0, 5).map((fb) => (
                <FeedbackCard key={fb._id} feedback={fb} compact />
              ))}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 56,
    paddingBottom: 24,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  headerLeft: { flex: 1 },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 15,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.accent,
  },

  /* ── Search ── */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: colors.textLight,
  },

  errorBox: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },

  /* ── Promo ── */
  promoBanner: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  promoContent: { flex: 1 },
  promoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
    lineHeight: 24,
    marginBottom: 6,
  },
  promoSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  promoIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  /* ── Symptom Checker CTA ── */
  symptomWrap: {
    marginTop: 18,
    paddingHorizontal: 24,
  },
  symptomBtn: {
    borderRadius: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  symptomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
  },
  symptomDeco1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  symptomDeco2: {
    position: 'absolute',
    bottom: -20,
    right: 60,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  symptomIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  symptomContent: {
    flex: 1,
  },
  symptomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 3,
    marginBottom: 5,
  },
  symptomBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.6,
  },
  symptomTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
    letterSpacing: -0.3,
  },
  symptomSub: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
    lineHeight: 16,
  },
  symptomArrow: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  /* ── Section ── */
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  lastSection: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },

  /* ── Appointment Card ── */
  appointmentCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  apptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  apptAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  apptInfo: {
    flex: 1,
    marginLeft: 14,
  },
  apptDoctor: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  apptSpecialty: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  statusConfirmed: {
    backgroundColor: colors.accentFaded,
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusTextConfirmed: {
    color: colors.accent,
  },
  statusTextPending: {
    color: '#D97706',
  },
  apptDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 14,
  },
  apptMeta: {
    flexDirection: 'row',
    gap: 20,
  },
  apptMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  apptMetaText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  /* ── Empty State ── */
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 10,
  },
  emptySubText: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },

  /* ── Categories ── */
  categoryScroll: {
    gap: 16,
    paddingRight: 8,
  },
  categoryItem: {
    alignItems: 'center',
    width: 76,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },

  /* ── Doctor Cards ── */
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  docAvatarWrap: {},
  docAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docAvatarImg: {
    width: 50,
    height: 50,
    borderRadius: 16,
  },
  docInfo: {
    flex: 1,
    marginLeft: 14,
  },
  docName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  docSpecialty: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  docMetaText: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
  },
  docMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textLight,
    marginHorizontal: 4,
  },
  bookBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  /* ── Reviews ── */
  reviewSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewAvgWrap: {
    alignItems: 'flex-start',
    gap: 4,
  },
  reviewAvgNum: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  reviewAvgSub: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textLight,
  },
  writeReviewBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  writeReviewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  writeReviewText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surface,
  },
  feedbackScroll: {
    paddingRight: 4,
    paddingBottom: 4,
  },

  /* ── Announcements ── */
  announceSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  announceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  announceList: {
    marginHorizontal: -24,
  },
});

export default HomeScreen;
