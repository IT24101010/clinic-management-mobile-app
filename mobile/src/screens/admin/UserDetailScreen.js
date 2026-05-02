import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
  Image,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/axiosConfig';
import colors from '../../constants/colors';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import ErrorAlert from '../../components/shared/ErrorAlert';
import SuccessAlert from '../../components/shared/SuccessAlert';
import { formatDate } from '../../utils/formatDate';

/* ─── Role / Risk helpers ─── */
const ROLE_CONFIG = {
  patient: { color: colors.accent,  bg: colors.accentFaded,  label: 'Patient', icon: 'person-outline'  },
  doctor:  { color: colors.primary, bg: colors.primaryFaded, label: 'Doctor',  icon: 'medkit-outline'  },
  admin:   { color: '#4F46E5',      bg: '#EEF2FF',           label: 'Admin',   icon: 'shield-outline'  },
};
const RISK_CONFIG = {
  Low:    { color: colors.accent,  bg: colors.accentFaded, icon: 'checkmark-circle-outline' },
  Medium: { color: colors.warning, bg: '#FFFBEB',          icon: 'alert-circle-outline'     },
  High:   { color: colors.danger,  bg: '#FEF2F2',          icon: 'warning-outline'          },
};
const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.patient;
const getRiskConfig = (risk) => RISK_CONFIG[risk]  || RISK_CONFIG.Low;

/* ─── Info Row ─── */
const InfoRow = ({ icon, label, value, iconColor, last }) => (
  <View style={[styles.infoRow, last && styles.infoRowLast]}>
    <View style={[styles.infoIconWrap, { backgroundColor: iconColor ? `${iconColor}18` : '#EEF2FF' }]}>
      <Ionicons name={icon} size={15} color={iconColor || '#4F46E5'} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not set'}</Text>
    </View>
  </View>
);

/* ─── Badge Pill ─── */
const BadgePill = ({ label, color, bg, icon }) => (
  <View style={[styles.badgePill, { backgroundColor: bg }]}>
    {icon ? <Ionicons name={icon} size={13} color={color} style={{ marginRight: 4 }} /> : null}
    <Text style={[styles.badgePillText, { color }]}>{label}</Text>
  </View>
);

/* ─── Section Card ─── */
const SectionCard = ({ title, icon, children, style }) => (
  <View style={[styles.card, style]}>
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleIcon}>
        <Ionicons name={icon} size={15} color="#4F46E5" />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

/* ─── Main Screen ─── */
const UserDetailScreen = ({ navigation, route }) => {
  const { userId, user: initialUser } = route.params;

  const [user, setUser]               = useState(initialUser || null);
  const [loading, setLoading]         = useState(!initialUser);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [showDeleteDialog, setShowDeleteDialog]   = useState(false);
  const [showToggleDialog, setShowToggleDialog]   = useState(false);
  const [actionLoading, setActionLoading]         = useState(false);

  const fadeIn  = useRef(new Animated.Value(initialUser ? 1 : 0)).current;
  const slideUp = useRef(new Animated.Value(initialUser ? 0 : 20)).current;

  const fetchUser = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get(`/api/users/${userId}`);
      setUser(res.data);
      Animated.parallel([
        Animated.timing(fadeIn,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    } catch {
      setError('Failed to load user details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!initialUser) fetchUser();
    const unsub = navigation.addListener('focus', () => fetchUser());
    return unsub;
  }, [navigation, fetchUser]);

  const handleToggleActive = async () => {
    setShowToggleDialog(false);
    setActionLoading(true);
    setError('');
    try {
      await api.put(`/api/users/${userId}`, { isActive: !user.isActive });
      setUser(prev => ({ ...prev, isActive: !prev.isActive }));
      setSuccess(`Account ${!user.isActive ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to update account status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    setActionLoading(true);
    setError('');
    try {
      await api.delete(`/api/users/${userId}`);
      navigation.goBack();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return (
      <View style={styles.errorScreen}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={styles.errorScreenText}>User not found</Text>
        <TouchableOpacity style={styles.backBtnAlt} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const roleCfg   = getRoleConfig(user.role);
  const riskCfg   = getRiskConfig(user.riskLevel || 'Low');
  const isActive  = user.isActive !== false;
  const initial   = user.name?.charAt(0).toUpperCase() || '?';
  const memberSince = user.createdAt ? new Date(user.createdAt).getFullYear() : '—';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchUser(true)}
            tintColor={colors.surface}
          />
        }
      >
        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={['#4F46E5', '#6366F1', '#818CF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTopBar}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color={colors.surface} />
            </TouchableOpacity>
            <Text style={styles.headerLabel}>User Detail</Text>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('EditUser', { user })}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={colors.surface} />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarSection}>
            {user.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatarCircle} />
            ) : (
              <View style={[styles.avatarCircle, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={[styles.rolePill, { backgroundColor: roleCfg.color }]}>
              <Ionicons name={roleCfg.icon} size={11} color={colors.surface} style={{ marginRight: 3 }} />
              <Text style={styles.rolePillText}>{roleCfg.label}</Text>
            </View>
          </View>

          <Text style={styles.headerName}>{user.name || 'Unknown User'}</Text>
          <Text style={styles.headerEmail}>{user.email}</Text>
        </LinearGradient>

        {/* ── Quick Stats ── */}
        <Animated.View style={[styles.quickStats, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: isActive ? colors.accentFaded : '#FEF2F2' }]}>
              <Ionicons
                name={isActive ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={isActive ? colors.accent : colors.danger}
              />
            </View>
            <Text style={[styles.quickStatVal, { color: isActive ? colors.accent : colors.danger }]}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
            <Text style={styles.quickStatLabel}>Status</Text>
          </View>

          <View style={styles.quickStatCard}>
            <View style={[styles.quickStatIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
            </View>
            <Text style={[styles.quickStatVal, { color: '#4F46E5' }]}>{memberSince}</Text>
            <Text style={styles.quickStatLabel}>Member Since</Text>
          </View>

          {user.role === 'patient' ? (
            <View style={styles.quickStatCard}>
              <View style={[styles.quickStatIcon, { backgroundColor: riskCfg.bg }]}>
                <Ionicons name={riskCfg.icon} size={18} color={riskCfg.color} />
              </View>
              <Text style={[styles.quickStatVal, { color: riskCfg.color }]}>{user.riskLevel || 'Low'}</Text>
              <Text style={styles.quickStatLabel}>Risk Level</Text>
            </View>
          ) : (
            <View style={styles.quickStatCard}>
              <View style={[styles.quickStatIcon, { backgroundColor: '#FDF2F8' }]}>
                <Ionicons name="analytics-outline" size={18} color="#EC4899" />
              </View>
              <Text style={[styles.quickStatVal, { color: '#EC4899' }]}>
                {user.role === 'doctor' && user.experience ? `${user.experience}yr` : '—'}
              </Text>
              <Text style={styles.quickStatLabel}>{user.role === 'doctor' ? 'Experience' : 'System'}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>

          {/* ── Alerts ── */}
          <View style={{ paddingHorizontal: 20 }}>
            {error   ? <ErrorAlert   message={error}   /> : null}
            {success ? <SuccessAlert message={success} /> : null}
          </View>

          {/* ── Personal Information ── */}
          <SectionCard title="Personal Information" icon="person-outline" style={{ marginTop: 20 }}>
            <InfoRow icon="person-outline"      label="Full Name"     value={user.name}   iconColor="#4F46E5" />
            <InfoRow icon="mail-outline"        label="Email"         value={user.email}  iconColor="#4F46E5" />
            <InfoRow icon="call-outline"        label="Phone"         value={user.phone}  iconColor={colors.accent} />
            <InfoRow icon="calendar-outline"    label="Date of Birth" value={user.dateOfBirth ? formatDate(user.dateOfBirth) : null} iconColor={colors.accent} />
            <InfoRow
              icon="transgender-outline"
              label="Gender"
              value={user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : null}
              iconColor={colors.primary}
            />
            <InfoRow icon="location-outline" label="Address" value={user.address} iconColor={colors.primary} last />
          </SectionCard>

          {/* ── Account Information ── */}
          <SectionCard title="Account Information" icon="shield-outline">
            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="key-outline" size={15} color="#4F46E5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Role</Text>
                <BadgePill label={roleCfg.label} color={roleCfg.color} bg={roleCfg.bg} icon={roleCfg.icon} />
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: isActive ? colors.accentFaded : '#FEF2F2' }]}>
                <Ionicons name="power-outline" size={15} color={isActive ? colors.accent : colors.danger} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Account Status</Text>
                <BadgePill
                  label={isActive ? 'Active' : 'Inactive'}
                  color={isActive ? colors.accent : colors.danger}
                  bg={isActive ? colors.accentFaded : '#FEF2F2'}
                  icon={isActive ? 'checkmark-circle-outline' : 'close-circle-outline'}
                />
              </View>
            </View>

            {user.role === 'patient' && (
              <View style={[styles.infoRow, styles.infoRowLast]}>
                <View style={[styles.infoIconWrap, { backgroundColor: riskCfg.bg }]}>
                  <Ionicons name="fitness-outline" size={15} color={riskCfg.color} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Health Risk Level</Text>
                  <BadgePill
                    label={user.riskLevel || 'Low'}
                    color={riskCfg.color}
                    bg={riskCfg.bg}
                    icon={riskCfg.icon}
                  />
                </View>
              </View>
            )}
          </SectionCard>

          {/* ── Medical (patients only) ── */}
          {user.role === 'patient' && (
            <SectionCard title="Medical & Health" icon="medkit-outline">
              <InfoRow
                icon="document-text-outline"
                label="Medical History"
                value={`${user.medicalHistory?.length || 0} records`}
                iconColor={colors.accent}
              />
              <InfoRow
                icon="alert-circle-outline"
                label="Allergies"
                value={user.allergies?.length ? user.allergies.join(', ') : 'None recorded'}
                iconColor={colors.warning}
              />
              <InfoRow
                icon="analytics-outline"
                label="Blood Reports"
                value={`${user.bloodReports?.length || 0} uploaded`}
                iconColor="#EC4899"
                last
              />
            </SectionCard>
          )}

          {/* ── Emergency Contact (patients only) ── */}
          {user.role === 'patient' && (
            <SectionCard title="Emergency Contact" icon="call-outline">
              <InfoRow icon="people-outline" label="Name"  value={user.emergencyContact?.name}  iconColor="#4F46E5" />
              <InfoRow icon="call-outline"   label="Phone" value={user.emergencyContact?.phone} iconColor="#4F46E5" last />
            </SectionCard>
          )}

          {/* ── Admin Actions ── */}
          <View style={styles.actionsCard}>
            <Text style={styles.actionsTitle}>Admin Actions</Text>

            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: isActive ? `${colors.warning}66` : `${colors.accent}66` }]}
              onPress={() => setShowToggleDialog(true)}
              activeOpacity={0.8}
              disabled={actionLoading}
            >
              <View style={[styles.actionBtnIcon, { backgroundColor: isActive ? '#FFFBEB' : colors.accentFaded }]}>
                <Ionicons
                  name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                  size={18}
                  color={isActive ? colors.warning : colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionBtnLabel, { color: isActive ? colors.warning : colors.accent }]}>
                  {isActive ? 'Deactivate Account' : 'Activate Account'}
                </Text>
                <Text style={styles.actionBtnSub}>
                  {isActive ? 'Block this user from logging in' : 'Restore access for this user'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => setShowDeleteDialog(true)}
              activeOpacity={0.8}
              disabled={actionLoading}
            >
              <View style={[styles.actionBtnIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionBtnLabel, { color: colors.danger }]}>Delete User Account</Text>
                <Text style={styles.actionBtnSub}>Permanently remove all user data</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      <ConfirmDialog
        visible={showToggleDialog}
        title={isActive ? 'Deactivate Account' : 'Activate Account'}
        message={`Are you sure you want to ${isActive ? 'deactivate' : 'activate'} ${user.name}'s account?`}
        onConfirm={handleToggleActive}
        onCancel={() => setShowToggleDialog(false)}
        confirmText={isActive ? 'Deactivate' : 'Activate'}
        confirmColor={isActive ? colors.warning : colors.accent}
      />

      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete User"
        message={`Permanently delete ${user.name}'s account? All their data will be removed. This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        confirmText="Delete"
        confirmColor={colors.danger}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  /* ── Header ── */
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 14 : 54,
    paddingBottom: 42,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 22,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLabel: { fontSize: 16, fontWeight: '700', color: colors.surface },
  avatarSection: { alignItems: 'center', marginBottom: 14 },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 34, fontWeight: '800', color: colors.surface },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: -10,
    borderWidth: 2,
    borderColor: colors.surface,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  rolePillText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerName:  { fontSize: 22, fontWeight: '800', color: colors.surface, marginTop: 10 },
  headerEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '500' },

  /* ── Quick Stats ── */
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -22,
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 5,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatVal: { fontSize: 14, fontWeight: '800' },
  quickStatLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* ── Section Card ── */
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },

  /* ── Info Row ── */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text },

  /* ── Badge Pill ── */
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 2,
  },
  badgePillText: { fontSize: 12, fontWeight: '700' },

  /* ── Admin Actions ── */
  actionsCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    gap: 10,
  },
  actionsTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  actionBtnDanger: { borderColor: `${colors.danger}33`, backgroundColor: '#FEF2F2' },
  actionBtnIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnLabel: { fontSize: 14, fontWeight: '700' },
  actionBtnSub: { fontSize: 11, color: colors.textLight, marginTop: 2, fontWeight: '500' },

  /* ── Error Screen ── */
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  errorScreenText: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
  backBtnAlt: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    marginTop: 8,
  },
  backBtnAltText: { fontSize: 14, fontWeight: '700', color: '#4F46E5' },
});

export default UserDetailScreen;
