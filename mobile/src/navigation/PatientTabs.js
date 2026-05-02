import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';

import HomeScreen from '../screens/patient/HomeScreen';
import DoctorListScreen from '../screens/doctors/DoctorListScreen';
import DoctorDetailScreen from '../screens/doctors/DoctorDetailScreen';
import MyAppointmentsScreen from '../screens/appointments/MyAppointmentsScreen';
import AppointmentDetailScreen from '../screens/appointments/AppointmentDetailScreen';
import BookAppointmentScreen from '../screens/appointments/BookAppointmentScreen';
import ServiceListScreen   from '../screens/services/ServiceListScreen';
import ServiceDetailScreen from '../screens/services/ServiceDetailScreen';
import FeedbackListScreen     from '../screens/feedback/FeedbackListScreen';
import SubmitFeedbackScreen   from '../screens/feedback/SubmitFeedbackScreen';
import AnnouncementFeedScreen from '../screens/announcements/AnnouncementFeedScreen';
import AnnouncementDetailScreen from '../screens/announcements/AnnouncementDetailScreen';
import SymptomCheckerScreen from '../screens/health/SymptomCheckerScreen';
import ProfileScreen from '../screens/patient/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import BloodReportsScreen from '../screens/profile/BloodReportsScreen';
import UploadReportScreen from '../screens/profile/UploadReportScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const DoctorsStack = createStackNavigator();
const AppointmentsStack = createStackNavigator();
const ServicesStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const HomeNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeMain"            component={HomeScreen} />
    <HomeStack.Screen name="FeedbackList"        component={FeedbackListScreen} />
    <HomeStack.Screen name="SubmitFeedback"      component={SubmitFeedbackScreen} />
    <HomeStack.Screen name="AnnouncementFeed"    component={AnnouncementFeedScreen} />
    <HomeStack.Screen name="AnnouncementDetail"  component={AnnouncementDetailScreen} />
    <HomeStack.Screen name="SymptomChecker"      component={SymptomCheckerScreen} />
  </HomeStack.Navigator>
);

const DoctorsNavigator = () => (
  <DoctorsStack.Navigator screenOptions={{ headerShown: false }}>
    <DoctorsStack.Screen name="DoctorsMain"   component={DoctorListScreen} />
    <DoctorsStack.Screen name="DoctorDetail"  component={DoctorDetailScreen} />
  </DoctorsStack.Navigator>
);

const AppointmentsNavigator = () => (
  <AppointmentsStack.Navigator screenOptions={{ headerShown: false }}>
    <AppointmentsStack.Screen name="AppointmentsMain"   component={MyAppointmentsScreen} />
    <AppointmentsStack.Screen name="BookAppointment"    component={BookAppointmentScreen} />
    <AppointmentsStack.Screen name="AppointmentDetail"  component={AppointmentDetailScreen} />
  </AppointmentsStack.Navigator>
);

const ServicesNavigator = () => (
  <ServicesStack.Navigator screenOptions={{ headerShown: false }}>
    <ServicesStack.Screen name="ServicesMain"   component={ServiceListScreen} />
    <ServicesStack.Screen name="ServiceDetail"  component={ServiceDetailScreen} />
  </ServicesStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
    <ProfileStack.Screen name="BloodReports" component={BloodReportsScreen} />
    <ProfileStack.Screen name="UploadReport" component={UploadReportScreen} />
  </ProfileStack.Navigator>
);

const TAB_ICONS = {
  HomeTab: { focused: 'home', unfocused: 'home-outline' },
  DoctorsTab: { focused: 'medkit', unfocused: 'medkit-outline' },
  AppointmentsTab: { focused: 'calendar', unfocused: 'calendar-outline' },
  ServicesTab: { focused: 'grid', unfocused: 'grid-outline' },
  ProfileTab: { focused: 'person', unfocused: 'person-outline' },
};

const PatientTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons.focused : icons.unfocused}
              size={22}
              color={color}
            />
          );
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="DoctorsTab" component={DoctorsNavigator} options={{ tabBarLabel: 'Doctors' }} />
      <Tab.Screen name="AppointmentsTab" component={AppointmentsNavigator} options={{ tabBarLabel: 'Bookings' }} />
      <Tab.Screen name="ServicesTab" component={ServicesNavigator} options={{ tabBarLabel: 'Services' }} />
      <Tab.Screen name="ProfileTab" component={ProfileNavigator} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabItem: {
    paddingVertical: 4,
  },
});

export default PatientTabs;
