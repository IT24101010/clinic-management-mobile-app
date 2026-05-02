import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';
import { formatDate } from '../../utils/formatDate';

/* ─── Category metadata ─── */
const CATEGORY_META = {
  general:        { label: 'General',      color: '#2563EB', bg: '#EFF6FF', icon: 'information-circle' },
  'health-alert': { label: 'Health Alert', color: '#EF4444', bg: '#FEF2F2', icon: 'warning'            },
  holiday:        { label: 'Holiday',      color: '#F97316', bg: '#FFF7ED', icon: 'sunny'              },
  campaign:       { label: 'Campaign',     color: '#7C3AED', bg: '#F5F3FF', icon: 'megaphone'          },
};

const PRIORITY_META = {
  high:   { label: 'High',   color: '#EF4444', bg: '#FEF2F2' },
  medium: { label: 'Medium', color: '#F97316', bg: '#FFF7ED' },
  low:    { label: 'Low',    color: '#94A3B8', bg: '#F8FAFC' },
};

const getCatMeta = (cat)  => CATEGORY_META[(cat || '').toLowerCase()] || CATEGORY_META.general;
const getPriMeta = (pri)  => PRIORITY_META[(pri || '').toLowerCase()] || PRIORITY_META.low;

/**
 * AnnouncementCard
 *
 * Props:
 *   announcement  {object}   announcement document
 *   onPress       {fn}       tap handler
 *   compact       {bool}     slim horizontal layout for HomeScreen
 */
const AnnouncementCard = ({ announcement = {}, onPress, compact = false }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  const { title = '', content = '', category, priority, publishDate } = announcement;
  const catMeta = getCatMeta(category);
  const priMeta = getPriMeta(priority);

  /* ── Compact (HomeScreen) layout ── */
  if (compact) {
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.compactCard}
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}
        >
          {/* Left accent */}
          <View style={[styles.compactAccent, { backgroundColor: catMeta.color }]} />

          {/* Icon */}
          <View style={[styles.compactIcon, { backgroundColor: catMeta.bg }]}>
            <Ionicons name={catMeta.icon} size={18} color={catMeta.color} />
          </View>

          {/* Text */}
          <View style={styles.compactBody}>
            <View style={styles.compactTopRow}>
              <View style={[styles.catChip, { backgroundColor: catMeta.bg }]}>
                <Text style={[styles.catChipText, { color: catMeta.color }]}>
                  {catMeta.label}
                </Text>
              </View>
              {priority && priority !== 'low' && (
                <View style={[styles.priDot, { backgroundColor: priMeta.color }]} />
              )}
            </View>
            <Text style={styles.compactTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.compactContent} numberOfLines={1}>{content}</Text>
          </View>

          {/* Arrow */}
          <View style={[styles.arrowBtn, { backgroundColor: catMeta.bg }]}>
            <Ionicons name="chevron-forward" size={14} color={catMeta.color} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  /* ── Full (Feed) layout ── */
  const CONTENT_LIMIT = 100;
  const displayContent =
    content.length > CONTENT_LIMIT
      ? content.slice(0, CONTENT_LIMIT).trimEnd() + '...'
      : content;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: catMeta.color }]} />

        <View style={styles.body}>
          {/* Top row */}
          <View style={styles.topRow}>
            <View style={[styles.iconWrap, { backgroundColor: catMeta.bg }]}>
              <Ionicons name={catMeta.icon} size={20} color={catMeta.color} />
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: priMeta.bg }]}>
              <View style={[styles.priDot, { backgroundColor: priMeta.color }]} />
              <Text style={[styles.priorityText, { color: priMeta.color }]}>
                {priMeta.label}
              </Text>
            </View>
          </View>

          {/* Content preview */}
          {content.length > 0 && (
            <Text style={styles.content} numberOfLines={2}>{displayContent}</Text>
          )}

          {/* Bottom row */}
          <View style={styles.bottomRow}>
            <View style={[styles.catChip, { backgroundColor: catMeta.bg }]}>
              <Ionicons name={catMeta.icon} size={11} color={catMeta.color} />
              <Text style={[styles.catChipText, { color: catMeta.color }]}>
                {catMeta.label}
              </Text>
            </View>
            {publishDate && (
              <View style={styles.dateRow}>
                <Ionicons name="time-outline" size={11} color={colors.textLight} />
                <Text style={styles.dateText}>{formatDate(publishDate)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  /* ── Full card ── */
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  priDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  content: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catChipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLight,
  },

  /* ── Compact card ── */
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  compactAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  compactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 12,
    flexShrink: 0,
  },
  compactBody: {
    flex: 1,
    paddingVertical: 12,
    gap: 3,
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },
  compactContent: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
});

export default AnnouncementCard;
