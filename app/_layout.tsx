import * as NavigationBar from "expo-navigation-bar";
//import * as ScreenCapture from "expo-screen-capture";

import React, { useEffect } from "react";
import { TourGuideProvider } from 'rn-tourguide';
import { NotificationProvider } from "../app/Components/NotificationContext";
import AppNavigator from "../app/Navigation/AppNavigator";



export default function RootLayout() {
  useEffect(() => {
    //ScreenCapture.preventScreenCaptureAsync();
    NavigationBar.setVisibilityAsync("hidden"); // Hide navigation bar globally
  }, []);

  return (
      <TourGuideProvider 
      borderRadius={16}
      backdropColor="rgba(26, 26, 46, 0.9)"
      tooltipStyle={{ backgroundColor: '#1a1a2e' }}
    >
     <NotificationProvider>
      <AppNavigator />
    </NotificationProvider>
    </TourGuideProvider>
  );
}
