import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenCapture from "expo-screen-capture";
import React, { useEffect } from "react";
import { TourGuideProvider } from 'rn-tourguide';
import { NotificationProvider } from "../app/Components/NotificationContext";
import AppNavigator from "../app/Navigation/AppNavigator";


export default function RootLayout() {
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    NavigationBar.setVisibilityAsync("hidden");
  }, []);

  const handleTourStop = async () => {
    try {
      await AsyncStorage.setItem('tutorialCompleted', 'true');
    } catch (error) {
      console.log('Error saving tutorial completion:', error);
    }
  };

  return (

    <NotificationProvider>
      <TourGuideProvider
        androidStatusBarVisible={true}
        backdropColor="rgba(0, 0, 0, 0.7)"
        labels={{ finish: "Let's Go!", skip: "Skip" }}
      >

        <AppNavigator />

      </TourGuideProvider>
    </NotificationProvider>
  );
}
