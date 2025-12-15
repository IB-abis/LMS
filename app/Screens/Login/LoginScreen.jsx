
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from "@react-navigation/native";
import CheckBox from "expo-checkbox";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";

import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const navigation = useNavigation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // <-- added

  // Custom Alert States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'info',
    title: '',
    message: '',
    showCancel: false,
    onConfirm: () => { },
    onCancel: () => { }
  });

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedUsername = await AsyncStorage.getItem("savedUsername");
        const savedPassword = await AsyncStorage.getItem("savedPassword");
        const savedRemember = await AsyncStorage.getItem("rememberMe");

        if (savedRemember === "true" && savedUsername && savedPassword) {
          setUsername(savedUsername);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (e) {
        console.log("Failed to load saved credentials:", e);
      }
    };

    loadSavedCredentials();
  }, []);

  const showCustomAlert = (type, title, message, onConfirm = () => { }, showCancel = false, onCancel = () => { }) => {
    setAlertConfig({ type, title, message, showCancel, onConfirm, onCancel });
    setAlertVisible(true);
  };

  useEffect(() => {
    if (alertVisible) {
      iconRotate.setValue(0);
      iconPulse.setValue(1);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 600,
          easing: Easing.elastic(1),
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulse, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(iconPulse, {
            toValue: 1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [alertVisible]);

  const getAlertStyle = () => {
    switch (alertConfig.type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          colors: ['#4CAF50', '#45a049'],
          iconBg: '#E8F5E9',
        };
      case 'error':
        return {
          icon: 'close-circle',
          colors: ['#f44336', '#d32f2f'],
          iconBg: '#FFEBEE',
        };
      case 'warning':
        return {
          icon: 'warning',
          colors: ['#ff9800', '#f57c00'],
          iconBg: '#FFF3E0',
        };
      case 'confirm':
        return {
          icon: 'help-circle',
          colors: ['#9B7EBD', '#280137'],
          iconBg: '#F3E5F5',
        };
      default:
        return {
          icon: 'information-circle',
          colors: ['#2196F3', '#1976D2'],
          iconBg: '#E3F2FD',
        };
    }
  };

  useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (!state.isConnected) {
      showCustomAlert(
        "warning",
        "No Internet Connection",
        "Please connect to Mobile Data or Wi-Fi."
      );
    }
  });

  return () => unsubscribe();
}, []);


  const handleLogin = async () => {

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    showCustomAlert(
      "warning",
      "No Internet Connection",
      "Please connect to Mobile Data or Wi-Fi."
    );
    return;
  }

    if (!username || !password) {
      showCustomAlert('error', 'Missing Information', 'Please enter both username and password.');
      return;
    }

    setLoading(true); // <-- start loading

    const loginUser = async (username, password) => {
      try {
        const response = await fetch("https://lms-api-qa.abisaio.com/api/v1/Login/Login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        return result;
      } catch (error) {
        console.error("Login API Error:", error);
        return { succeeded: false, message: "Something went wrong. Please try again." };
      }
    };

    const response = await loginUser(username, password);
    setLoading(false); // <-- stop loading

    if (response?.succeeded) {
      const userData = response.data;
      try {
        await AsyncStorage.multiSet([
          ["employeeID", String(userData.employeeID)],
          ["sapid", userData.sapid],
          ["name", userData.name],
          ["token", userData.token],
          ["location", userData.location ? userData.location : ""],
          ["applicationProfile", userData.applicationProfile],
          ["userID", username],
        ]);

        if (rememberMe) {
          await AsyncStorage.multiSet([
            ["savedUsername", username],
            ["savedPassword", password],
            ["rememberMe", "true"],
          ]);
        } else {
          await AsyncStorage.multiRemove(["savedUsername", "savedPassword", "rememberMe"]);
        }

        // Direct navigation without success popup
        navigation.replace("Dashboard");

      } catch (e) {
        showCustomAlert('error', 'Storage Error', 'Failed to save login data. Please try again.');
      }
    } else {
      showCustomAlert('error', 'Login Failed', response?.message || 'Invalid credentials. Please check your username and password.');
    }
  };

  const handleForgotPassword = () => {
    const url = "https://myib.co.in:8052/employees/forgot-password";

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Cannot open the URL");
        }
      })
      .catch((err) => console.error("An error occurred", err));
  };


  useEffect(() => {
    const backAction = () => {
      showCustomAlert(
        'confirm',
        'Exit App',
        'Are you sure you want to exit the application?',
        () => BackHandler.exitApp(),
        true,
        () => { }
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  const alertStyle = getAlertStyle();
  const iconRotateInterpolate = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleAlertConfirm = () => { setAlertVisible(false); setTimeout(() => { alertConfig.onConfirm(); }, 300); }; const handleAlertCancel = () => { setAlertVisible(false); setTimeout(() => { alertConfig.onCancel(); }, 300); };

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraHeight={150}
          extraScrollHeight={150}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#FFFFFF', '#230131ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.container}
          >
            <View style={styles.illustrationContainer}>
              <Image
                source={require('../../Images/Login_images/img1.png')}
                style={styles.illustration}
                resizeMode="cover"
              />
            </View>

            <View style={styles.card}>
              <View style={styles.logoContainer}>
                <View style={styles.imageRow}>
                  <Image
                    source={require('../../Images/Login_images/img2.png')}
                    style={styles.img2}
                    resizeMode="contain"
                  />
                </View>
                <View style={[styles.imageRow, { marginTop: -50 }]}>
                  <Image
                    source={require('../../Images/Login_images/img3.png')}
                    style={styles.img3}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#9B7EBD" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="User ID"
                  placeholderTextColor="#999"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#9B7EBD" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <CheckBox
                    value={rememberMe}
                    onValueChange={setRememberMe}
                    color={rememberMe ? "#280137" : "#999"}
                    style={styles.checkbox}
                  />
                  <Text allowFontScaling={false} style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text allowFontScaling={false} style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>

              </View>

              <TouchableOpacity activeOpacity={0.8} onPress={!loading ? handleLogin : null}>
                <LinearGradient
                  colors={["#9B7EBD", "#280137"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text allowFontScaling={false} style={styles.loginButtonText}>Login</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>

      {/* Custom Animated Alert Modal */}
      <Modal
        transparent
        visible={alertVisible}
        animationType="none"
        onRequestClose={() => setAlertVisible(false)}
      >
        <TouchableWithoutFeedback onPress={alertConfig.showCancel ? handleAlertCancel : null}>
          <Animated.View style={[styles.alertOverlay, { opacity: fadeAnim }]}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.alertContainer,
                  {
                    transform: [
                      { scale: scaleAnim },
                      { translateY: slideAnim }
                    ],
                    opacity: fadeAnim,
                  },
                ]}
              >
                {/* Decorative Top Bar */}
                <LinearGradient
                  colors={alertStyle.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.alertTopBar}
                />

                {/* Animated Icon */}
                <View style={styles.alertIconSection}>
                  <Animated.View
                    style={[
                      styles.alertIconContainer,
                      {
                        backgroundColor: alertStyle.iconBg,
                        transform: [
                          { rotate: iconRotateInterpolate },
                          { scale: iconPulse }
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={alertStyle.colors}
                      style={styles.alertIconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons
                        name={alertStyle.icon}
                        size={45}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                  </Animated.View>
                </View>

                {/* Alert Content */}
                <View style={styles.alertContent}>
                  {alertConfig.title && (
                    <Text allowFontScaling={false} style={styles.alertTitle}>{alertConfig.title}</Text>
                  )}
                  {alertConfig.message && (
                    <Text allowFontScaling={false} style={styles.alertMessage}>{alertConfig.message}</Text>
                  )}
                </View>

                {/* Alert Buttons */}
                <View style={styles.alertButtonContainer}>
                  {alertConfig.showCancel && (
                    <TouchableOpacity
                      style={styles.alertCancelButton}
                      onPress={handleAlertCancel}
                      activeOpacity={0.8}
                    >
                      <Text allowFontScaling={false} style={styles.alertCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.alertConfirmButtonWrapper, { flex: alertConfig.showCancel ? 1 : 1 }]}
                    onPress={handleAlertConfirm}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={alertStyle.colors}
                      style={styles.alertConfirmButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text allowFontScaling={false} style={styles.alertConfirmButtonText}>OK</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  illustrationContainer: {
    width: '100%',
    height: '60%',
  },
  illustration: {
    width: '100%',
    height: '90%',
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 10,
    marginHorizontal: 20,
    marginTop: -220,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: -70,
  },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 0,
  },
  img2: {
    width: 145,
    height: 145,
  },
  img3: {
    width: 250,
    height: 250,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#C8B5E3",
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#FAFAFA",
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    height: "100%",
  },
  eyeIcon: {
    padding: 5,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    marginRight: 8,
    borderRadius: 4,
    width: 20,
    height: 20,
  },
  rememberMeText: {
    fontSize: 14,
    color: "#333",
  },
  forgotText: {
    fontSize: 14,
    color: "#333",
  },
  loginButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  // Custom Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
  },
  alertTopBar: {
    height: 5,
    width: '100%',
  },
  alertIconSection: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 20,
  },
  alertIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  alertIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: {
    paddingHorizontal: 25,
    paddingBottom: 25,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  alertButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  alertCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  alertCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  alertConfirmButtonWrapper: {
    flex: 1,
  },
  alertConfirmButton: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  alertConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

