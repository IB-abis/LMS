import * as NavigationBar from "expo-navigation-bar";
import * as ScreenCapture from "expo-screen-capture";

import React, { useEffect } from "react";

import AppNavigator from './Navigation/AppNavigator';



export default function Index() {
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync();
    NavigationBar.setVisibilityAsync("hidden");
  }, []);
  
  return <AppNavigator />;
}
