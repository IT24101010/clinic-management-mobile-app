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
import StarRating from './StarRating';
import { formatDate } from '../../utils/formatDate';

const SENTIMENT_META = {
  positive: { label: 'Positive', bg: '#ECFDF5', color: '#059669', icon: 'happy-outline' },
  negative: { label: 'Negative', bg: '#FEF2F2', color: '#EF4444', icon: 'sad-outline'   },
  neutral:  { label: 'Neutral',  bg: '#F8FAFC', color: '#64748B', icon: 'remove-circle-outline' },
};

/**
 * FeedbackCard
 *
 * Props:
 *   feedback  {object}  populated feedback document
 *   onPress   {fn}      optional tap handler
 *   compact   {bool}    narrower card for HomeScreen horizontal scroll
 */
const FeedbackCard = ({ feedback, onPress, compact = false }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  const {
    patientId,
    doctorId,
    serviceId,
    rating = 0,
    comment = '',
    sentimentLabel,
    createdAt,
  } = feedback;

  const patientName  = patientId?.name  || 'Patient';
  const doctorName   = doctorId?.name;
  const serviceName  = serviceId?.serviceName;
  const initials     = patientName.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const sentiment    = sentimentLabel ? SENTIMENT_META[sentimentLabel.toLowerCase()] : null;

  const COMMENT_LIMIT = compact ? 72 : 140;
  const displayComment =
    comment.length > COMMENT_LIMIT ? comment.slice(0, COMMENT_LIMIT).trimEnd() + '...' : comment;

  return (
    <Animated.View style={[compact ? styles.compactWrapper : styles.wrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity
        style={[styles.card, compact && styles.compactCard]}
        onPress={onPress}
        onPressIn={onPress ? onPressIn  : undefined}
        onPressOut={onPress ? onPressOut : undefined}
        activeOpacity={onPress ? 1 : 1}
      >
        {/* ── Top row: avatar, name, sentiment, date ── */}
        <View style={styles.topRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>

          <View style={styles.topMid}>
            <Text style={styles.patientName} numberOfLines={1}>{patientName}</Text>
            <Text style={styles.dateText}>
              {createdAt ? formatDate(createdAt) : ''}
            </Text>
          </View>

          <View style={styles.topRight}>
            {sentiment && (
              <View style={[styles.sentimentBadge, { backgroundColor: sentiment.bg }]}>
                <Ionicons name={sentiment.icon} size={11} color={sentiment.color} />
                {!compact && (
                  <Text style={[styles.sentimentText, { color: sentiment.color }]}>
                    {sentiment.label}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── Star rating + numeric ── */}
        <View style={styles.ratingRow}>
          <StarRating rating={rating} size={compact ? 13 : 15} />
          <Text style={styles.ratingNum}>{rating.toFixed(1)}</Text>
        </View>

        {/* ── Comment ── */}
        <Text style={[styles.comment, compact && styles.compactComment]}>
          {displayComment}
        </Text>

        {/* ── Doctor / Service tags ── */}
        {(doctorName || serviceName) && (
          <View style={styles.tagsRow}>
            {doctorName && (
              <View style={styles.tag}>
                <Ionicons name="medical-outline" size={11} color={colors.primary} />
                <Text style={styles.tagText} numberOfLines={1}>{doctorName}</Text>
              </View>
            )}
            {serviceName && (
              <View style={[styles.tag, styles.tagService]}>
                <Ionicons name="grid-outline" size={11} color={colors.accent} />
                <Text style={[styles.tagText, styles.tagTextService]} numberOfLines={1}>
                  {serviceName}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  compactWrapper: {
    width: 260,
    marginRight: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  compactCard: {
    padding: 14,
    gap: 8,
  },

  /* ── Top row ── */
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  topMid: {
    flex: 1,
  },
  patientName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.1,
  },
  dateText: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 1,
    fontWeight: '500',
  },
  topRight: {
    alignItems: 'flex-end',
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sentimentText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* ── Rating row ── */
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: -0.2,
  },

  /* ── Comment ── */
  comment: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  compactComment: {
    fontSize: 12,
    lineHeight: 18,
  },

  /* ── Tags ── */
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 160,
  },
  tagService: {
    backgroundColor: colors.accentFaded,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  tagTextService: {
    color: colors.accent,
  },
});

export default FeedbackCard;
