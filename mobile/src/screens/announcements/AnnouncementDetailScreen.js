import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { formatDate } from '../../utils/formatDate';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 260;
const STATUS_BAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 44;

/* ─── Category metadata ─── */
const CATEGORY_META = {
  general:        {
    label: 'General',
    color: '#2563EB',
    bg: '#EFF6FF',
    icon: 'information-circle',
    gradients: ['#1E3A5F', '#1D4ED8', '#3B82F6'],
  },
  'health-alert': {
    label: 'Health Alert',
    color: '#EF4444',
    bg: '#FEF2F2',
    icon: 'warning',
    gradients: ['#7F1D1D', '#B91C1C', '#EF4444'],
  },
  holiday:        {
    label: 'Holiday',
    color: '#F97316',
    bg: '#FFF7ED',
    icon: 'sunny',
    gradients: ['#7C2D12', '#C2410C', '#F97316'],
  },
  campaign:       {
    label: 'Campaign',
    color: '#7C3AED',
    bg: '#F5F3FF',
    icon: 'megaphone',
    gradients: ['#3B0764', '#5B21B6', '#7C3AED'],
  },
};

const PRIORITY_META = {
  high:   { label: 'High Priority',   color: '#EF4444', bg: '#FEF2F2', icon: 'alert-circle' },
  medium: { label: 'Medium Priority', color: '#F97316', bg: '#FFF7ED', icon: 'alert-circle-outline' },
  low:    { label: 'Low Priority',    color: '#94A3B8', bg: '#F8FAFC', icon: 'information-circle-outline' },
};

const AUDIENCE_META = {
  all:       { label: 'All Users',    icon: 'people',          color: '#2563EB', bg: '#EFF6FF' },
  patients:  { label: 'Patients',     icon: 'person',          color: '#059669', bg: '#ECFDF5' },
  doctors:   { label: 'Doctors',      icon: 'medkit',          color: '#7C3AED', bg: '#F5F3FF' },
  'high-risk':{ label: 'High Risk',   icon: 'warning',         color: '#EF4444', bg: '#FEF2F2' },
};

const getCatMeta  = (cat) => CATEGORY_META[(cat || '').toLowerCase()] || CATEGORY_META.general;
const getPriMeta  = (pri) => PRIORITY_META[(pri || '').toLowerCase()]  || PRIORITY_META.low;
const getAudMeta  = (aud) => AUDIENCE_META[(aud || '').toLowerCase()]  || AUDIENCE_META.all;

const AnnouncementDetailScreen = ({ route, navigation }) => {
  const { announcement = {} } = route.params || {};
  const {
    title        = 'Announcement',
    content      = '',
    category,
    priority,
    targetAudience,
    publishDate,
    expiryDate,
    createdBy,
  } = announcement;

  const catMeta = getCatMeta(category);
  const priMeta = getPriMeta(priority);
  const audMeta = getAudMeta(targetAudience);

  /* ── Entrance animations ── */
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ══════════════════════════════
          HERO HEADER
      ══════════════════════════════ */}
      <LinearGradient
        colors={catMeta.gradients}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        {/* Decorative circles */}
        <View style={styles.deco1} />
        <View style={styles.deco2} />
        <View style={styles.deco3} />

        {/* Back button */}
        <TouchableOpacity
          style={[styles.backBtn, { top: STATUS_BAR_H + 12 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.surface} />
        </TouchableOpacity>

        {/* Hero content */}
        <View style={styles.heroContent}>
          {/* Icon ring */}
          <View style={styles.heroIconOuter}>
            <View style={styles.heroIconInner}>
              <Ionicons name={catMeta.icon} size={36} color={catMeta.color} />
            </View>
          </View>

          {/* Category label */}
          <View style={[styles.heroCatBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.heroCatText}>{catMeta.label}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ══════════════════════════════
          CONTENT CARD (overlaps hero)
      ══════════════════════════════ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.contentCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Title */}
          <Text style={styles.announcementTitle}>{title}</Text>

          {/* Metadata chips row */}
          <View style={styles.metaRow}>
            {/* Priority */}
            <View style={[styles.metaBadge, { backgroundColor: priMeta.bg }]}>
              <Ionicons name={priMeta.icon} size={13} color={priMeta.color} />
              <Text style={[styles.metaBadgeText, { color: priMeta.color }]}>
                {priMeta.label}
              </Text>
            </View>

            {/* Audience */}
            <View style={[styles.metaBadge, { backgroundColor: audMeta.bg }]}>
              <Ionicons name={audMeta.icon} size={13} color={audMeta.color} />
              <Text style={[styles.metaBadgeText, { color: audMeta.color }]}>
                {audMeta.label}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Dates */}
          <View style={styles.datesRow}>
            {publishDate && (
              <View style={styles.dateBlock}>
                <View style={styles.dateIconWrap}>
                  <Ionicons name="calendar-outline" size={16} color={catMeta.color} />
                </View>
                <View>
                  <Text style={styles.dateLabel}>Published</Text>
                  <Text style={styles.dateValue}>{formatDate(publishDate)}</Text>
                </View>
              </View>
            )}
            {expiryDate && (
              <View style={styles.dateBlock}>
                <View style={[styles.dateIconWrap, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="time-outline" size={16} color="#EF4444" />
                </View>
                <View>
                  <Text style={styles.dateLabel}>Expires</Text>
                  <Text style={[styles.dateValue, { color: '#EF4444' }]}>
                    {formatDate(expiryDate)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Divider */}
          {(publishDate || expiryDate) && <View style={styles.divider} />}

          {/* Content section */}
          <View style={styles.contentSection}>
            <View style={styles.contentLabelRow}>
              <View style={[styles.contentLabelBar, { backgroundColor: catMeta.color }]} />
              <Text style={styles.contentLabel}>Details</Text>
            </View>
            <Text style={styles.contentText}>{content}</Text>
          </View>

          {/* Posted by */}
          {createdBy?.name && (
            <>
              <View style={styles.divider} />
              <View style={styles.postedByRow}>
                <View style={[styles.postedAvatar, { backgroundColor: catMeta.bg }]}>
                  <Ionicons name="person" size={14} color={catMeta.color} />
                </View>
                <View>
                  <Text style={styles.postedByLabel}>Posted by</Text>
                  <Text style={styles.postedByName}>{createdBy.name}</Text>
                </View>
              </View>
            </>
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* ── Hero ── */
  hero: {
    height: HERO_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute', top: -50, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deco2: {
    position: 'absolute', bottom: 20, left: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  deco3: {
    position: 'absolute', top: 80, right: width * 0.3,
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },
  heroContent: {
    alignItems: 'center',
    paddingBottom: 32,
    gap: 14,
  },
  heroIconOuter: {
    width: 86,
    height: 86,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconInner: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  heroCatBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroCatText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* ── Scroll / Content ── */
  scrollView: {
    flex: 1,
    marginTop: -28,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 22,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    gap: 16,
  },

  /* Title */
  announcementTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 28,
    letterSpacing: -0.3,
  },

  /* Meta badges */
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  /* Divider */
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },

  /* Dates */
  datesRow: {
    flexDirection: 'row',
    gap: 20,
    flexWrap: 'wrap',
  },
  dateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },

  /* Content */
  contentSection: {
    gap: 12,
  },
  contentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentLabelBar: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  contentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.text,
    letterSpacing: 0.1,
  },

  /* Posted by */
  postedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postedByLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  postedByName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
});

export default AnnouncementDetailScreen;
