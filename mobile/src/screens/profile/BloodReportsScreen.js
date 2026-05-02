import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  RefreshControl,
  Modal,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { formatDate } from '../../utils/formatDate';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ─── In-App Image Viewer Modal ─── */
const ImageViewerModal = ({ visible, report, onClose }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setImageLoading(true);
      setImageError(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  if (!report) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <StatusBar translucent backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />

        {/* ── Modal Header ── */}
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color={colors.surface} />
          </TouchableOpacity>

          <View style={styles.modalTitleWrap}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {report.fileName || 'Blood Report'}
            </Text>
            {report.uploadDate ? (
              <Text style={styles.modalDate}>{formatDate(report.uploadDate)}</Text>
            ) : null}
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* ── Zoomable Image ── */}
        <ScrollView
          style={styles.imageScrollView}
          contentContainerStyle={styles.imageScrollContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
          bouncesZoom
        >
          {imageError ? (
            <View style={styles.imageErrorWrap}>
              <Ionicons name="image-outline" size={56} color="rgba(255,255,255,0.3)" />
              <Text style={styles.imageErrorText}>Could not load image</Text>
            </View>
          ) : (
            <Image
              source={{ uri: report.fileUrl }}
              style={styles.viewerImage}
              resizeMode="contain"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
              onError={() => { setImageLoading(false); setImageError(true); }}
            />
          )}

          {imageLoading && !imageError && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="large" color={colors.surface} />
              <Text style={styles.imageLoadingText}>Loading report...</Text>
            </View>
          )}
        </ScrollView>

        {/* ── Zoom hint ── */}
        {!imageLoading && !imageError && (
          <View style={styles.zoomHint}>
            <Ionicons name="scan-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.zoomHintText}>Pinch to zoom</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

/* ─── Report Card ─── */
const ReportCard = ({ item, index, fadeIn, onView, onDelete }) => (
  <Animated.View style={[styles.reportCard, { opacity: fadeIn }]}>
    <View style={styles.reportIconWrap}>
      <Ionicons name="document-text" size={24} color={colors.accent} />
    </View>

    <View style={styles.reportInfo}>
      <Text style={styles.reportName} numberOfLines={1}>
        {item.fileName || `Report ${index + 1}`}
      </Text>
      <View style={styles.reportMeta}>
        <Ionicons name="calendar-outline" size={12} color={colors.textLight} />
        <Text style={styles.reportDate}>
          {item.uploadDate ? formatDate(item.uploadDate) : 'Unknown date'}
        </Text>
      </View>
    </View>

    <View style={styles.cardActions}>
      <TouchableOpacity style={styles.viewBtn} onPress={() => onView(item)} activeOpacity={0.7}>
        <Ionicons name="eye-outline" size={15} color={colors.accent} />
        <Text style={styles.viewBtnText}>View</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item)} activeOpacity={0.7}>
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
      </TouchableOpacity>
    </View>
  </Animated.View>
);

/* ─── Main Screen ─── */
const BloodReportsScreen = ({ navigation }) => {
  const { user, updateUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/users/profile');
      if (res.data) updateUser(res.data);
    } catch (err) {
      /* silent */
    } finally {
      setRefreshing(false);
    }
  }, [updateUser]);

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;
    setDeleting(true);
    try {
      const res = await api.delete(`/api/users/reports/${reportToDelete._id}`);
      updateUser(res.data.user);
    } catch (err) {
      // Silently refresh to sync state if delete failed
      const res = await api.get('/api/users/profile').catch(() => null);
      if (res?.data) updateUser(res.data);
    } finally {
      setDeleting(false);
      setReportToDelete(null);
    }
  };

  const reports = user?.bloodReports || [];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={['#059669', '#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={colors.surface} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Blood Reports</Text>
          <Text style={styles.headerSubtitle}>
            {reports.length} {reports.length === 1 ? 'report' : 'reports'} uploaded
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <Ionicons name="analytics-outline" size={18} color={colors.surface} />
        </View>
      </LinearGradient>

      {/* ── Report List ── */}
      <FlatList
        data={reports}
        keyExtractor={(item, index) => item._id || String(index)}
        renderItem={({ item, index }) => (
          <ReportCard
            item={item}
            index={index}
            fadeIn={fadeIn}
            onView={setSelectedReport}
            onDelete={setReportToDelete}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          reports.length === 0 && styles.emptyContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <Animated.View style={{ opacity: fadeIn }}>
            <EmptyState
              icon="document-text-outline"
              title="No Reports Yet"
              subtitle="Upload your blood test reports to keep track of your health history"
            />
          </Animated.View>
        }
        ListHeaderComponent={
          reports.length > 0 ? (
            <Animated.View style={[styles.listHeader, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textLight} />
              <Text style={styles.listHeaderText}>Tap "View" to open · Tap trash to delete</Text>
            </Animated.View>
          ) : null
        }
      />

      {/* ── Upload FAB ── */}
      <Animated.View style={[styles.fabWrap, { opacity: fadeIn }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('UploadReport')}
          activeOpacity={0.85}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={colors.surface} />
          <Text style={styles.fabText}>Upload New Report</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Image Viewer Modal ── */}
      <ImageViewerModal
        visible={selectedReport !== null}
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog
        visible={reportToDelete !== null}
        title="Delete Report"
        message={`Are you sure you want to delete "${reportToDelete?.fileName || 'this report'}"? This cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setReportToDelete(null)}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        confirmColor={colors.danger}
      />
    </View>
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.surface,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── List ── */
  listContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 170 : 148,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  listHeaderText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
    flex: 1,
  },

  /* ── Report Card ── */
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  reportIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.accentFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reportDate: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentFaded,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── FAB ── */
  fabWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 80,
    left: 20,
    right: 20,
  },
  fab: {
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },

  /* ── Image Viewer Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.surface,
    textAlign: 'center',
  },
  modalDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 3,
    fontWeight: '500',
  },

  /* ── Viewer Image ── */
  imageScrollView: {
    flex: 1,
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.72,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  imageLoadingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  imageErrorWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    height: SCREEN_HEIGHT * 0.6,
  },
  imageErrorText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },

  /* ── Zoom Hint ── */
  zoomHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  zoomHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
});

export default BloodReportsScreen;
