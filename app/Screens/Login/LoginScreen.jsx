
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from "@react-native-community/netinfo";
import { useNavigation } from "@react-navigation/native";
import CheckBox from "expo-checkbox";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Linking,
  TextInput
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

  // Quiz Modal States
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizData, setQuizData] = useState({ data: [], title: "", description: "" });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizToken, setQuizToken] = useState("");
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);



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

    setLoading(true);

    const loginUser = async (username, password, source) => {
      try {
        const response = await fetch("https://lms-api.abisaio.com/api/v1/Login/Login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, source }),
        });
        const result = await response.json();
        return result;
      } catch (error) {
        console.error("Login API Error:", error);
        return { succeeded: false, message: "Something went wrong. Please try again." };
      }
    };

    const response = await loginUser(username, password, "Mobile");
    setLoading(false);

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
          ["isQuizEnabled", String(userData.isQuizEnabled)],
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

        // Check if quiz is enabled
        if (userData.isQuizEnabled) {
          setQuizToken(userData.token);
          await fetchQuizQuestions(userData.token);
        } else {
          navigation.replace("Dashboard");
        }

      } catch (e) {
        showCustomAlert('error', 'Storage Error', 'Failed to save login data. Please try again.');
      }
    } else {
      showCustomAlert('error', 'Login Failed', response?.message || 'Invalid credentials. Please check your username and password.');
    }
  };

  // Add to your existing quiz states
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");

  const fetchQuizQuestions = async (token) => {
    setQuizLoading(true);
    try {
      const response = await fetch("https://lms-api.abisaio.com/api/v1/Quiz", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
      });

      const result = await response.json();

      if (result?.succeeded && result.data) {
        // Store the entire result with title and description
        setQuizData(result);
        setQuizTitle(result.title || "Quiz Alert!");
        setQuizDescription(result.description || "Something exciting is up for grabs for first 500 learners. Ready to begin?");
        setCurrentQuestionIndex(-1); // Set to -1 to show intro screen
        setQuizVisible(true);
      } else {
        showCustomAlert('error', 'Quiz Error', 'Failed to load quiz questions.');
        navigation.replace("Dashboard");
      }
    } catch (error) {
      console.error("Quiz Fetch Error:", error);
      showCustomAlert('error', 'Quiz Error', 'Failed to load quiz questions.');
      navigation.replace("Dashboard");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizSkip = () => {
    showCustomAlert(
      'confirm',
      'Skip Quiz',
      'Are you sure you want to skip the quiz? You can take it later.',
      async () => {
        setQuizLoading(true);
        try {
          const response = await fetch("https://lms-api.abisaio.com/api/v1/Quiz/Skip", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${quizToken}`
            },
          });
          const result = await response.json();

          if (result?.succeeded) {
            setQuizVisible(false);
            navigation.replace("Dashboard");
          } else {
            showCustomAlert('error', 'Error', 'Failed to skip quiz. Please try again.');
          }
        } catch (error) {
          console.error("Quiz Skip Error:", error);
          showCustomAlert('error', 'Error', 'Failed to skip quiz. Please try again.');
        } finally {
          setQuizLoading(false);
        }
      },
      true,
      () => { }
    );
  };

  const [successData, setSuccessData] = useState({
    title: '',
    description: '',
    message: ''
  });


  const handleQuizSubmit = async () => {
    // Check if quiz data exists
    if (!quizData || !quizData.data || quizData.data.length === 0) {
      showCustomAlert('error', 'Error', 'No quiz data available.');
      return;
    }

    // Check for unanswered questions - FIXED: Use quizData.data.filter()
    const unansweredQuestions = quizData.data.filter(q => !selectedAnswers[q.id]);

    if (unansweredQuestions.length > 0) {
      showCustomAlert(
        'warning',
        'Incomplete Quiz',
        `Please answer all questions before submitting. You have ${unansweredQuestions.length} unanswered question${unansweredQuestions.length > 1 ? 's' : ''}.`
      );
      return;
    }

    setQuizLoading(true);
    try {
      // Prepare submission data - FIXED: Use quizData.data.map()
      const submissionData = quizData.data.map(q => ({
        questionId: q.id,
        selectedOption: selectedAnswers[q.id]
      }));

      console.log('Submitting quiz data:', JSON.stringify(submissionData, null, 2));

      const response = await fetch('https://lms-api.abisaio.com/api/v1/Quiz/Submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${quizToken}`
        },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();

      console.log('Quiz submit response:', result);

      if (result?.succeeded) {
        await AsyncStorage.setItem('isQuizEnabled', 'false');
        setSuccessData({
          title: result?.title || 'Success!',
          description: result?.description || 'Your prize awaits.',
          message: result?.message || ''
        });
        setQuizSubmitted(true);
      } else {
        showCustomAlert('error', 'Submission Failed', result?.message || 'Failed to submit quiz. Please try again.');
      }
    } catch (error) {
      console.error('Quiz Submit Error:', error);
      showCustomAlert('error', 'Submission Failed', 'Failed to submit quiz. Please try again.');
    } finally {
      setQuizLoading(false);
    }
  };

  const getSuccessIcon = () => {
    if (successData.title?.toLowerCase().includes('mic')) {
      return 'mic';
    }

    if (successData.description?.toLowerCase().includes('prize')) {
      return 'gift';
    }

    return 'trophy'; // default fallback
  };




  const handleOptionSelect = (questionId, option) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const getQuestionStatus = (questionId) => {
    return selectedAnswers[questionId] ? 'answered' : 'unanswered';
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
                  placeholder="Employee ID"
                  placeholderTextColor="#999"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#9B7EBD" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="MyIB Password"
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

      {/* Quiz Modal */}
      <Modal
        visible={quizVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => { }}
      >
        <View style={styles.quizOverlay}>
          {quizSubmitted ? (
            // Success Screen (unchanged)
            <View style={styles.quizSuccessContainer}>
              <LinearGradient
                colors={['#9B7EBD', '#280137']}
                style={styles.quizSuccessGradient}
              >
                {/* Close Button */}
                <TouchableOpacity
                  onPress={() => {
                    setQuizVisible(false);
                    navigation.replace("Dashboard");
                  }}
                  style={styles.quizCloseButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={20} color="#280137" />
                </TouchableOpacity>

                {/* Success Icon */}
                <View style={styles.quizSuccessIconContainer}>
                <Ionicons name="gift" size={90} color="#FFFFFF" />


                </View>

                {/* Success Message */}
                <Text style={styles.quizSuccessTitle}>
                  {successData.title}
                </Text>

                <Text style={styles.quizSuccessMessage}>
                  {successData.description}
                </Text>


                {/* Go to Dashboard Button */}
                <TouchableOpacity
                  onPress={() => {
                    setQuizVisible(false);
                    navigation.replace("Dashboard");
                  }}
                  style={styles.quizSuccessButton}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FFFFFF', '#F5F5F5']}
                    style={styles.quizSuccessButtonGradient}
                  >
                    <Text style={styles.quizSuccessButtonText}>Go to Dashboard</Text>
                    <Ionicons name="arrow-forward" size={24} color="#280137" />
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ) : currentQuestionIndex === -1 ? (
            // Pre-Quiz Introduction Screen
            <View style={styles.quizIntroContainer}>
              <LinearGradient
                colors={['#9B7EBD', '#280137']}
                style={styles.quizIntroGradient}
              >
                {/* Quiz Icon */}
                <View style={styles.quizIntroIconContainer}>
                  <Ionicons name="trophy" size={80} color="#FFFFFF" />
                </View>

                {/* Title and Description */}
                <Text style={styles.quizIntroTitle}>{quizData.title || "Quiz Alert!"}</Text>
                <Text style={styles.quizIntroDescription}>
                  {quizData.description || "Something exciting is up for grabs for first 500 learners. Ready to begin?"}
                </Text>

                {/* Action Buttons */}
                <View style={styles.quizIntroButtonsContainer}>
                  <TouchableOpacity
                    onPress={() => setCurrentQuestionIndex(0)}
                    style={styles.quizIntroStartButton}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#FFFFFF', '#F5F5F5']}
                      style={styles.quizIntroStartButtonGradient}
                    >
                      <Ionicons name="play" size={24} color="#280137" />
                      <Text style={styles.quizIntroStartButtonText}>Start Quiz</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleQuizSkip}
                    style={styles.quizIntroSkipButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.quizIntroSkipButtonText}>Skip Quiz</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ) : (
            // Quiz Questions Screen
            <View style={styles.quizContainer}>
              {/* Quiz Header */}
              <LinearGradient
                colors={['#9B7EBD', '#280137']}
                style={styles.quizHeader}
              >
                <Text style={styles.quizHeaderTitle}>Daily Quiz</Text>
                <Text style={styles.quizHeaderSubtitle}>
                  Question {currentQuestionIndex + 1} of {quizData.data.length}
                </Text>
              </LinearGradient>

              {/* Question Numbers Grid */}
              <View style={styles.quizNumbersContainer}>
                <Text style={styles.quizNumbersLabel}>Questions</Text>
                <View style={styles.quizNumbersGrid}>
                  {quizData.data.map((q, index) => (
                    <TouchableOpacity
                      key={q.id}
                      onPress={() => setCurrentQuestionIndex(index)}
                      activeOpacity={0.7}
                      style={[
                        styles.quizNumberBox,
                        selectedAnswers[q.id] && styles.quizNumberBoxAnswered,
                        currentQuestionIndex === index && styles.quizNumberBoxActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.quizNumberText,
                          selectedAnswers[q.id] && styles.quizNumberTextAnswered,
                          currentQuestionIndex === index && styles.quizNumberTextActive,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Question Content - No ScrollView */}
              <View style={styles.quizContentContainer}>
                {quizData.data[currentQuestionIndex] && (
                  <>
                    <Text style={styles.quizQuestionText}>
                      {quizData.data[currentQuestionIndex].questionText}
                    </Text>

                    {/* Options - Only A, B, C */}
                    <View style={styles.quizOptionsContainer}>
                      {['A', 'B', 'C'].map(option => (
                        <TouchableOpacity
                          key={option}
                          onPress={() =>
                            handleOptionSelect(quizData.data[currentQuestionIndex].id, option)
                          }
                          activeOpacity={0.7}
                          style={[
                            styles.quizOptionBox,
                            selectedAnswers[quizData.data[currentQuestionIndex].id] === option &&
                            styles.quizOptionBoxSelected,
                          ]}
                        >
                          <View
                            style={[
                              styles.quizOptionCircle,
                              selectedAnswers[quizData.data[currentQuestionIndex].id] === option &&
                              styles.quizOptionCircleSelected,
                            ]}
                          >
                            {selectedAnswers[quizData.data[currentQuestionIndex].id] === option && (
                              <View style={styles.quizOptionCircleInner} />
                            )}
                          </View>
                          <View style={styles.quizOptionTextContainer}>
                            <Text style={styles.quizOptionLabel}>{option}</Text>
                            <Text style={styles.quizOptionText}>
                              {quizData.data[currentQuestionIndex][`option${option}`]}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>

              {/* Quiz Footer Actions */}
              <View style={styles.quizFooter}>
                {/* First Row: Previous and Next */}
                <View style={styles.quizNavigationRow}>
                  {/* Previous Button */}
                  <TouchableOpacity
                    onPress={() => currentQuestionIndex > 0 && setCurrentQuestionIndex(prev => prev - 1)}
                    activeOpacity={currentQuestionIndex > 0 ? 0.8 : 1}
                    disabled={currentQuestionIndex === 0}
                    style={[
                      styles.quizNavButton,
                      currentQuestionIndex === 0 && styles.quizNavButtonDisabled
                    ]}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={currentQuestionIndex === 0 ? "#CCCCCC" : "#280137"}
                    />
                    <Text style={[
                      styles.quizNavButtonText,
                      currentQuestionIndex === 0 && styles.quizNavButtonTextDisabled
                    ]}>
                      Previous
                    </Text>
                  </TouchableOpacity>

                  {/* Next Button */}
                  <TouchableOpacity
                    onPress={() => currentQuestionIndex < quizData.data.length - 1 && setCurrentQuestionIndex(prev => prev + 1)}
                    activeOpacity={currentQuestionIndex < quizData.data.length - 1 ? 0.8 : 1}
                    disabled={currentQuestionIndex === quizData.data.length - 1}
                    style={[
                      styles.quizNavButton,
                      currentQuestionIndex === quizData.data.length - 1 && styles.quizNavButtonDisabled
                    ]}
                  >
                    <Text style={[
                      styles.quizNavButtonText,
                      currentQuestionIndex === quizData.data.length - 1 && styles.quizNavButtonTextDisabled
                    ]}>
                      Next
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={currentQuestionIndex === quizData.data.length - 1 ? "#CCCCCC" : "#280137"}
                    />
                  </TouchableOpacity>
                </View>

                {/* Second Row: Skip and Submit */}
                <View style={styles.quizActionRow}>
                  {/* Skip Button - flex: 1 */}
                  <TouchableOpacity
                    onPress={handleQuizSkip}
                    activeOpacity={0.8}
                    style={styles.quizSkipButtonNew}
                  >
                    <Ionicons name="play-skip-forward" size={18} color="#ff9800" />
                    <Text style={styles.quizSkipButtonText}>Skip</Text>
                  </TouchableOpacity>

                  {/* Submit Button - flex: 2 (only on last question) */}
                  {currentQuestionIndex === quizData.data.length - 1 && (
                    <TouchableOpacity
                      onPress={handleQuizSubmit}
                      activeOpacity={0.8}
                      style={styles.quizSubmitButtonNew}
                    >
                      <LinearGradient
                        colors={['#9B7EBD', '#280137']}
                        style={styles.quizSubmitButtonGradient}
                      >
                        {quizLoading ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                            <Text style={styles.quizSubmitButtonText}>Submit</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
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
  // Quiz Modal Styles
  // Quiz Modal Styles
  quizOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizContainer: {
    width: width * 0.95,
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

  // Pre-Quiz Introduction Screen
  quizIntroContainer: {
    width: width * 0.9,
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
  quizIntroGradient: {
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  quizIntroIconContainer: {
    marginBottom: 25,
  },
  quizIntroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  quizIntroDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.95,
    marginBottom: 35,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  quizIntroButtonsContainer: {
    width: '100%',
    gap: 15,
  },
  quizIntroStartButton: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
  },
  quizIntroStartButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  quizIntroStartButtonText: {
    fontSize: 18,
    color: '#280137',
    fontWeight: '700',
  },
  quizIntroSkipButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  quizIntroSkipButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  quizHeader: {
    paddingVertical: 20,
    paddingHorizontal: 25,
    alignItems: 'center',
    position: 'relative',
  },
  quizCloseButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  quizHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  quizHeaderSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  quizNumbersContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  quizNumbersLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '600',
  },
  quizNumbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quizNumberBox: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizNumberBoxAnswered: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  quizNumberBoxActive: {
    backgroundColor: '#280137',
    borderColor: '#9B7EBD',
  },
  quizNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  quizNumberTextAnswered: {
    color: '#4CAF50',
  },
  quizNumberTextActive: {
    color: '#FFFFFF',
  },
  quizContentContainer: {
    padding: 20,
  },
  quizQuestionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '500',
  },
  quizOptionsContainer: {
    gap: 12,
  },
  quizOptionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  quizOptionBoxSelected: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9B7EBD',
  },
  quizOptionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quizOptionCircleSelected: {
    borderColor: '#280137',
  },
  quizOptionCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#280137',
  },
  quizOptionTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quizOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#280137',
    marginRight: 8,
  },
  quizOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },

  // Footer with Two Rows
  quizFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  quizNavigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  quizNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    gap: 5,
    flex: 1,
    justifyContent: 'center',
  },
  quizNavButtonText: {
    fontSize: 14,
    color: '#280137',
    fontWeight: '600',
  },
  quizActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quizSkipButtonNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 25,
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#ff9800',
    gap: 5,
  },
  quizSkipButtonText: {
    fontSize: 14,
    color: '#ff9800',
    fontWeight: '600',
  },
  quizSubmitButtonNew: {
    flex: 2,
    borderRadius: 25,
    overflow: 'hidden',
  },
  quizSubmitButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quizSubmitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Quiz Success Screen
  quizSuccessContainer: {
    width: width * 0.85,
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
  quizSuccessGradient: {
    paddingVertical: 50,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  quizSuccessIconContainer: {
    marginBottom: 25,
  },
  quizSuccessTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  quizSuccessMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 30,
    lineHeight: 24,
  },
  quizSuccessButton: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
  },
  quizSuccessButtonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  quizSuccessButtonText: {
    fontSize: 18,
    color: '#280137',
    fontWeight: '700',
  },
  quizNavButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.5,
  },
  quizNavButtonTextDisabled: {
    color: '#CCCCCC',
  },


});

