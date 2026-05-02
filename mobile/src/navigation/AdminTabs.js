import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import AdminDashboardScreen     from '../screens/admin/AdminDashboardScreen';
import ManageDashboardScreen    from '../screens/admin/ManageDashboardScreen';
import ManageDoctorsScreen      from '../screens/admin/ManageDoctorsScreen';
import AdminServicesScreen      from '../screens/services/AdminServicesScreen';
import ServiceFormScreen        from '../screens/services/ServiceFormScreen';
import ManageAppointmentsScreen from '../screens/appointments/AdminAppointmentsScreen';
import AppointmentDetailScreen  from '../screens/appointments/AppointmentDetailScreen';
import AdminFeedbackScreen      from '../screens/feedback/AdminFeedbackScreen';
import AdminAnnouncementsScreen from '../screens/announcements/AdminAnnouncementsScreen';
import AnnouncementFormScreen   from '../screens/announcements/AnnouncementFormScreen';
import ManageTimeSlotsScreen    from '../screens/admin/ManageTimeSlotsScreen';
import TimeSlotFormScreen       from '../screens/admin/TimeSlotFormScreen';
import UsersScreen              from '../screens/admin/UsersScreen';
import UserDetailScreen         from '../screens/admin/UserDetailScreen';
import EditUserScreen           from '../screens/admin/EditUserScreen';
import ProfileScreen            from '../screens/admin/ProfileScreen';

const Tab         = createBottomTabNavigator();
const DashStack   = createStackNavigator();
const ManageStack = createStackNavigator();
const ProfileStack= createStackNavigator();

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { name: 'DashboardTab', label: 'Overview', icon: 'home',   iconOutline: 'home-outline'   },
  { name: 'ManageTab',    label: 'Manage',   icon: 'albums', iconOutline: 'albums-outline' },
  { name: 'ProfileTab',   label: 'Profile',  icon: 'person', iconOutline: 'person-outline' },
];

// ── Stack navigators ──────────────────────────────────────────────────────────

const DashboardNavigator = () => (
  <DashStack.Navigator screenOptions={{ headerShown: false }}>
    <DashStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
  </DashStack.Navigator>
);

const ManageNavigator = () => (
  <ManageStack.Navigator screenOptions={{ headerShown: false }}>
    <ManageStack.Screen name="ManageDashboard"     component={ManageDashboardScreen} />
    <ManageStack.Screen name="ManageUsers"         component={UsersScreen} />
    <ManageStack.Screen name="UserDetail"          component={UserDetailScreen} />
    <ManageStack.Screen name="EditUser"            component={EditUserScreen} />
    <ManageStack.Screen name="ManageAppointments"  component={ManageAppointmentsScreen} />
    <ManageStack.Screen name="AppointmentDetail"   component={AppointmentDetailScreen} />
    <ManageStack.Screen name="ManageDoctors"       component={ManageDoctorsScreen} />
    <ManageStack.Screen name="ManageServices"      component={AdminServicesScreen} />
    <ManageStack.Screen name="ServiceForm"         component={ServiceFormScreen} />
    <ManageStack.Screen name="ManageFeedback"      component={AdminFeedbackScreen} />
    <ManageStack.Screen name="ManageAnnouncements" component={AdminAnnouncementsScreen} />
    <ManageStack.Screen name="AnnouncementForm"    component={AnnouncementFormScreen} />
    <ManageStack.Screen name="ManageTimeSlots"     component={ManageTimeSlotsScreen} />
    <ManageStack.Screen name="TimeSlotForm"        component={TimeSlotFormScreen} />
  </ManageStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
  </ProfileStack.Navigator>
);

// ── Animated pill tab item ────────────────────────────────────────────────────

const PILL_EXPANDED = 108;
const PILL_COLLAPSED = 46;

const TabItem = ({ tab, focused, onPress }) => {
  const widthAnim  = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      speed: 18,
      bounciness: 5,
    }).start();
  }, [focused]);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.91, useNativeDriver: true, speed: 60, bounciness: 2 }).start();

  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 4 }).start();

  const pillWidth = widthAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [PILL_COLLAPSED, PILL_EXPANDED],
  });

  const labelOpacity = widthAnim.interpolate({
    inputRange:  [0.5, 1],
    outputRange: [0, 1],
  });

  const labelTranslateX = widthAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [-6, 0],
  });

  const iconColor = focused ? '#FFFFFF' : '#A0A8B8';

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={tabStyles.tabOuter}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Animated.View style={[
          tabStyles.pill,
          focused && tabStyles.pillActive,
          { width: pillWidth },
        ]}>
          <Ionicons
            name={focused ? tab.icon : tab.iconOutline}
            size={18}
            color={iconColor}
          />
          {focused && (
            <Animated.Text
              numberOfLines={1}
              style={[
                tabStyles.pillLabel,
                { opacity: labelOpacity, transform: [{ translateX: labelTranslateX }] },
              ]}
            >
              {tab.label}
            </Animated.Text>
          )}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Clean white tab bar ───────────────────────────────────────────────────────

function WhiteTabBar({ state, navigation }) {
  return (
    <View style={tabStyles.safeWrap} pointerEvents="box-none">
      <View style={tabStyles.bar}>
        {state.routes.map((route, i) => {
          const tab = TABS.find(t => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === i;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress', target: route.key, canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TabItem key={route.key} tab={tab} focused={focused} onPress={onPress} />
          );
        })}

        {/* iOS home indicator spacer line */}
        <View style={tabStyles.homeIndicator} />
      </View>
    </View>
  );
}

// ── Admin Tabs ────────────────────────────────────────────────────────────────

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{ headerShown: false }}
    tabBar={(props) => <WhiteTabBar {...props} />}
  >
    <Tab.Screen name="DashboardTab" component={DashboardNavigator} />
    <Tab.Screen name="ManageTab"    component={ManageNavigator} />
    <Tab.Screen name="ProfileTab"   component={ProfileNavigator} />
  </Tab.Navigator>
);

export default AdminTabs;

// ── Styles ────────────────────────────────────────────────────────────────────

const tabStyles = StyleSheet.create({
  safeWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    paddingTop: 8,
  },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
    // Soft layered shadow for lift
    shadowColor: '#1A2340',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 18,
    // Outer ring
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.055)',
  },

  tabOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  pill: {
    height: 46,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    overflow: 'hidden',
    paddingHorizontal: 14,
  },

  pillActive: {
    backgroundColor: '#0E1422',
    // Subtle inner shadow feel
    shadowColor: '#0E1422',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },

  pillLabel: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  homeIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? -14 : -8,
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.14)',
    alignSelf: 'center',
  },
});
