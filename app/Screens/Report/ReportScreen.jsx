import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useNotification } from "@/app/Components/NotificationContext";
import BottomNavigation from "../../Components/BottomNavigation";
import CustomDrawer from "../../Components/CustomDrawer";
import Header from "../../Components/Header";
import { useDrawer } from "../../Components/useDrawer";

const { width } = Dimensions.get("window");

const ReportScreen = ({ navigation }) => {
  const { openNotification } = useNotification();

  const [selectedTab, setSelectedTab] = useState("Dashboard");
  const [courses, setCourses] = useState([]);
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const tabScaleAnims = useRef(
    [...Array(3)].map(() => new Animated.Value(1)),
  ).current;
  const rotateAnims = useRef(
    [...Array(3)].map(() => new Animated.Value(0)),
  ).current;

  // Back handler
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("Dashboard");
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [navigation]),
  );

  // Drawer
  const {
    drawerVisible,
    selectedMenuItem,
    drawerSlideAnim,
    overlayOpacity,
    menuItemAnims,
    toggleDrawer,
    handleMenuItemPress,
  } = useDrawer(5);

  // Fetch Report API
  const fetchReports = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        "https://lms-api.abisaio.com/api/v1/Reports/GetLatest",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      setCourses(data?.courses || []);
      setTrainingSessions(data?.trainingSessions || []);
    } catch (error) {
      console.log("Report API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleTabPress = (index, tabName) => {
    setSelectedTab(tabName);

    if (index === 1) {
      navigation.navigate("Dashboard");
    } else if (index === 2) {
      navigation.navigate("Calendar");
    } else if (index === 0) {
      navigation.navigate("TrainingSession");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.mainContent}>
        <Header
          title="Report"
          onMenuPress={toggleDrawer}
          onNotificationPress={openNotification}
        />

        {/* Scrollable Content */}
        <ScrollView style={styles.scrollContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#7B68EE" />
          ) : (
            <>
              {/* Courses Table */}
              <Text style={styles.sectionTitle}>Courses</Text>

              <View style={styles.tableContainer}>
                {/* Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Name</Text>
                  <Text style={[styles.headerCell, { flex: 0 }]}>
                    Created On
                  </Text>
                </View>

                {/* Rows */}
                {courses.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.rowCell, { flex: 1 }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.rowCell, { flex: 0 }]}>
                      {item.createdOn}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Training Sessions Table */}

              <Text style={styles.sectionTitle}>Training Sessions</Text>

              <View style={styles.tableContainer}>
                {/* Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, { flex: 1 }]}>Title</Text>
                  <Text style={[styles.headerCell, { flex: 0 }]}>
                    Created On
                  </Text>
                </View>

                {/* Rows */}
                {trainingSessions.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.rowCell, { flex: 1 }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.rowCell, { flex: 0 }]}>
                      {item.createdOn}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
      <BottomNavigation
        selectedTab={selectedTab}
        tabScaleAnims={tabScaleAnims}
        rotateAnims={rotateAnims}
        handleTabPress={handleTabPress}
        navigation={navigation}
      />

      <CustomDrawer
        drawerVisible={drawerVisible}
        drawerSlideAnim={drawerSlideAnim}
        overlayOpacity={overlayOpacity}
        menuItemAnims={menuItemAnims}
        selectedMenuItem={selectedMenuItem}
        handleMenuItemPress={(index) => handleMenuItemPress(index, navigation)}
        toggleDrawer={toggleDrawer}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },

  mainContent: {
    flex: 1,
  },

  scrollContainer: {
    padding: 16,
  },

  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 15,
  },

  tableContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#7B68EE",
    padding: 12,
  },

  headerCell: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },

  tableRow: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  rowCell: {
    fontSize: 13,
    color: "#333",
  },
});

export default ReportScreen;
