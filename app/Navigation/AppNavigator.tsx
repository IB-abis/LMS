import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useEffect, useRef, useState } from "react";
import { AppState, PanResponder, View } from "react-native";

import CalendarScreen from "../Screens/Calendar/CalendarScreen";
import CertificateScreen from "../Screens/Certificate/CertificateScreen";
import ActionviewScreen from "../Screens/Courses/ActionviewScreen";
import CoursesScreen from "../Screens/Courses/CoursesScreen";
import DashboardScreen from "../Screens/Dashboard/DashboardScreen";

import CourseDetailsScreen from "../Screens/ELearning/CourseDetailsScreen";
import SCORMPlayerScreen from "../Screens/ELearning/ScormPlayerScreen";

import LjmapScreen from "../Screens/Dashboard/Ljmap";
import MicroLearningScreen from "../Screens/Dashboard/MicroLearningScreen";
import EAssessmentScreen from "../Screens/ELearning/ELearningAssessment";
import EFeedbackScreen from "../Screens/ELearning/ELearningFeedback";
import ELearningScreen from "../Screens/ELearning/ELearningScreen";
import Exploremore from "../Screens/LearningHub/Exploremore";
import LearningHubScreen from "../Screens/LearningHub/LearningHubScreen";
import LoginScreen from "../Screens/Login/LoginScreen";
import SplashScreen from "../Screens/Splash";
import AssessmentScreen from "../Screens/TrainingSession/AssessmentScreen";
import FeedbackScreen from "../Screens/TrainingSession/Feedback";
import TrainingDetailsScreen from "../Screens/TrainingSession/TrainingDetailsScreen";
import TrainingSession from "../Screens/TrainingSession/TrainingSessionScreen";
import VirtualTraining from "../Screens/TrainingSession/VirtualTrainingScreen";
import PDFViewer from "../Screens/UserManual/PDFViewer";
import UserManualScreen from "../Screens/UserManual/UserManualScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const appState = useRef(AppState.currentState);
  const backgroundTimestamp = useRef<number | null>(null);
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const midnightTimer = useRef<NodeJS.Timeout | null>(null);
  const lastActivityTime = useRef(Date.now());

  // Constants
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Show Splash first
  useEffect(() => {
    const timer = setTimeout(() => {
      checkLogin();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Check if user is logged in
  const checkLogin = async () => {
  const token = await AsyncStorage.getItem("token");
  const isQuizEnabled = await AsyncStorage.getItem("isQuizEnabled");

  if (token && token !== "") {
    // If quiz is enabled, force user to login screen
    if (isQuizEnabled === "true") {
      await AsyncStorage.removeItem("token"); // Clear token to force re-login
      setIsLoggedIn(false);
      setInitialRoute("Login");
    } else {
      setIsLoggedIn(true);
      setInitialRoute("Dashboard");
    }
  } else {
    setIsLoggedIn(false);
    setInitialRoute("Login");
  }

  setIsSplashVisible(false);
};

  // Logout function
  const performLogout = async () => {
    await AsyncStorage.removeItem("token");
    setIsLoggedIn(false);
    setInitialRoute("Login");
    
    // Clear all timers
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    if (midnightTimer.current) {
      clearTimeout(midnightTimer.current);
      midnightTimer.current = null;
    }
  };

  // Schedule midnight logout
  const scheduleMidnightLogout = () => {
    if (midnightTimer.current) {
      clearTimeout(midnightTimer.current);
    }

    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0); // Next midnight

    const timeUntilMidnight = midnight.getTime() - now.getTime();

    midnightTimer.current = setTimeout(async () => {
      console.log("Midnight logout triggered");
      await performLogout();
      // Reschedule for next day
      scheduleMidnightLogout();
    }, timeUntilMidnight);
  };

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    lastActivityTime.current = Date.now();
    
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }

    inactivityTimer.current = setTimeout(async () => {
      console.log("Inactivity timeout - logging out");
      await performLogout();
    }, INACTIVITY_TIMEOUT);
  };

  // PanResponder to detect user interactions
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        if (isLoggedIn) {
          resetInactivityTimer();
        }
        return false;
      },
      onMoveShouldSetPanResponder: () => {
        if (isLoggedIn) {
          resetInactivityTimer();
        }
        return false;
      },
    })
  ).current;

  // Handle AppState changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground
        console.log("App came to foreground");

        if (isLoggedIn && backgroundTimestamp.current) {
          const timeInBackground = Date.now() - backgroundTimestamp.current;
          
          // If app was in background for more than 30 minutes, logout
          if (timeInBackground >= INACTIVITY_TIMEOUT) {
            console.log("App was in background for 30+ minutes - logging out");
            await performLogout();
          } else {
            // Reset inactivity timer when app comes to foreground
            resetInactivityTimer();
          }
          
          backgroundTimestamp.current = null;
        }
      } else if (
        appState.current === "active" &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background
        console.log("App went to background");
        
        if (isLoggedIn) {
          backgroundTimestamp.current = Date.now();
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isLoggedIn]);

  // Setup timers when user logs in
  useEffect(() => {
    if (isLoggedIn) {
      resetInactivityTimer();
      scheduleMidnightLogout();
    }

    return () => {
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
      if (midnightTimer.current) {
        clearTimeout(midnightTimer.current);
      }
    };
  }, [isLoggedIn]);

  // Handle splash finish
  const handleSplashFinish = () => {
    setIsSplashVisible(false);
  };

  // Show Splash screen
  if (isSplashVisible) {
    return <SplashScreen onFinish={handleSplashFinish} navigation={LoginScreen} />;
  }

  // Wait until initialRoute is set
  if (!initialRoute) return null;

  return (
    <View {...panResponder.panHandlers} style={{ flex: 1 }}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />

        <Stack.Screen name="MicroLearning" component={MicroLearningScreen} />
        <Stack.Screen name="LearningHub" component={LearningHubScreen} />
        <Stack.Screen name="Courses" component={CoursesScreen} />
        <Stack.Screen name="TrainingSession" component={TrainingSession} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="ELearning" component={ELearningScreen} />

        <Stack.Screen name="Certificate" component={CertificateScreen} />
        <Stack.Screen name="UserManual" component={UserManualScreen} />
        <Stack.Screen name="Exploremore" component={Exploremore} />
        <Stack.Screen name="ActionviewScreen" component={ActionviewScreen} />
        <Stack.Screen name="TrainingDetails" component={TrainingDetailsScreen} />
        <Stack.Screen name="VirtualTraining" component={VirtualTraining} />
        <Stack.Screen name="Assessment" component={AssessmentScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />

        <Stack.Screen name="EAssessment" component={EAssessmentScreen} />
        <Stack.Screen name="EFeedback" component={EFeedbackScreen} />
        <Stack.Screen name="PDFViewer" component={PDFViewer} />

        <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
        <Stack.Screen name="SCORMPlayer" component={SCORMPlayerScreen} />
        <Stack.Screen name="LjmapScreen" component={LjmapScreen} />
      </Stack.Navigator>
    </View>
  );
}