import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenCapture from "expo-screen-capture";
import React, { useEffect } from "react";
import { TourGuideProvider } from 'rn-tourguide';
import { NotificationProvider } from "../app/Components/NotificationContext";
import AppNavigator from "../app/Navigation/AppNavigator";
import CustomTooltip from './Components/CustomToolTip';

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
        {...{
          backdropColor: 'rgba(15, 15, 35, 0.92)',
          labels: {
            previous: 'Back',
            next: 'Next',
            skip: 'Skip',
            finish: 'Got it!',
          },
          onStop: handleTourStop,
          verticalOffset: 14, // global vertical offset to nudge highlights/tooltips down
          tooltipStyle: { paddingHorizontal: 6 }, // default tooltip padding (tweak as needed)
        }}
        tooltipComponent={CustomTooltip}
      >
        <AppNavigator />
      </TourGuideProvider>
    </NotificationProvider>
  );
}
