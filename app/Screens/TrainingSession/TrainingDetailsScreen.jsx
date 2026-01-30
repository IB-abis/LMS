import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import training from "../../Images/training.jpg";

import { useNotification } from '@/app/Components/NotificationContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import BottomNavigation from '../../Components/BottomNavigation';
import Header from '../../Components/Header';
import { useBottomNav } from '../../Components/useBottomNav';

const { width } = Dimensions.get('window');

const API_DETAILS_BASE = 'https://lms-api-qa.abisaio.com/api/v1/TrainingSession/GetTrainingSessionDetails';
const API_ASSESSMENT_BASE = 'https://lms-api-qa.abisaio.com/api/v1/Assessment/GetAssessmentDetails';
const API_SUBMIT_ASSESSMENT = 'https://lms-api-qa.abisaio.com/api/v1/Assessment/SubmitAssessment';

const TrainingDetailsScreen = ({ navigation, route }) => {
  const { openNotification } = useNotification();
  const trainingSessionId = route?.params?.trainingSessionId ?? route?.params?.session?.id ?? route?.params?.sessionId;

  const {
    selectedTab,
    tabScaleAnims,
    rotateAnims,
    handleTabPress
  } = useBottomNav('Sessions');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  const [loadingDetails, setLoadingDetails] = useState(false);
  const [details, setDetails] = useState(null);
  const [token, setToken] = useState(null);
  const [employeeID, setEmployeeID] = useState(null);
  const [error, setError] = useState(null);

  const [showPreWindow, setShowPreWindow] = useState(false);
  const [showPostWindow, setShowPostWindow] = useState(false);
  const [showFeedbackWindow, setShowFeedbackWindow] = useState(false);

  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessmentData, setAssessmentData] = useState(null);
  const [answersMap, setAnswersMap] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // 🔙 Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true })
    ]).start();

    setTimeout(() => {
      Animated.spring(cardAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
    }, 300);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedEmployeeID = await AsyncStorage.getItem('employeeID') || await AsyncStorage.getItem('userID');
        if (!storedToken || !storedEmployeeID) {
          setError('Missing token or user ID. Please login again.');
          return;
        }
        setToken(storedToken);
        setEmployeeID(storedEmployeeID);
        if (trainingSessionId) {
          fetchDetails(trainingSessionId, storedEmployeeID, storedToken);
        } else {
          setError('No trainingSessionId provided');
        }
      } catch (e) {
        setError('Failed to load credentials');
      }
    })();
  }, [trainingSessionId]);

  const fetchDetails = async (id, userId, authToken) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const params = new URLSearchParams({ UserID: String(userId), trainingSessionId: String(id) });
      const url = `${API_DETAILS_BASE}?${params.toString()}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      const json = await resp.json();
      if (!json.succeeded) throw new Error(json.message || 'API returned failed');
      setDetails(json.data);
    } catch (err) {
      setError('Failed to load training details');
      Alert.alert('Warning', err.message || 'Failed to fetch details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const getAssessmentForType = (type) => {
    if (!details || !Array.isArray(details.assessments)) return null;
    return details.assessments.find(a => (a.assessmentType || '').toLowerCase() === (type || '').toLowerCase()) || null;
  };

  const openMeetingLink = async (url) => {
  if (!url) {
    Alert.alert('Error', 'Meeting link not available');
    return;
  }

  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert('Error', 'Unable to open meeting link');
  }
};


  const isAssessmentActive = (assObj) => {
    if (!assObj) return false;
    const status = (assObj.status || '').toLowerCase();
    const aStatus = (assObj.assessmentStatus || '').toLowerCase();
    return !(status === 'inactive' || aStatus === 'inactive');
  };

  const isFeedbackActive = () => {
    if (!details) return false;
    const fb = (details.feedback || '').toLowerCase();
    const fbStatus = (details.feedbackStatus || '').toLowerCase();
    return !(fb === 'inactive' || fbStatus === 'inactive');
  };

  const openAssessment = async (type) => {
    setShowFeedbackWindow(false);
    setSubmitResult(null);
    setAssessmentData(null);
    setAnswersMap({});
    setSubmitLoading(false);

    const assObj = getAssessmentForType(type);
    if (!assObj) {
      Alert.alert('Assessment', `${type} assessment not available`);
      return;
    }
    if (!isAssessmentActive(assObj)) {
      Alert.alert('Assessment', `${type} assessment is inactive`);
      return;
    }

    // Prevent if no attempts left
    if (Number(assObj.remainingAttempts ?? 0) <= 0) {
      Alert.alert('Attempts exhausted', 'You have 0 attempts left for this assessment.');
      return;
    }

    // Navigate to assessment screen and pass the required metadata
    navigation.navigate('Assessment', {
      assessmentMeta: assObj,
      trainingSessionId: trainingSessionId
    });
  };


  const submitAssessment = async () => {
    if (!assessmentData || !assessmentData.meta) {
      Alert.alert('Error', 'Assessment data missing');
      return;
    }
    const assessmentId = assessmentData.id;
    const assessmentType = (assessmentData.meta.assessmentType || 'pre');
    const trainingId = assessmentData.meta.trainingSessionID ?? details?.id ?? trainingSessionId;
    const empId = Number(employeeID);

    const answers = [];
    (assessmentData.questions || []).forEach(q => {
      const selected = answersMap[q.id];
      answers.push({ questionId: Number(q.id), selectedAnswer: selected ?? '' });
    });

    const unanswered = answers.filter(a => !a.selectedAnswer || a.selectedAnswer.trim() === '');
    if (unanswered.length > 0) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }

    const payload = {
      assessmentId: Number(assessmentId),
      assessmentType: String(assessmentType),
      trainingSessionId: Number(trainingId),
      empId: Number(empId),
      answers: answers
    };

    setSubmitLoading(true);
    setSubmitResult(null);
    try {
      const resp = await fetch(API_SUBMIT_ASSESSMENT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const json = await resp.json();
      setSubmitResult(json);
      Alert.alert('Assessment Submitted', json.message || 'Submitted successfully');
      fetchDetails(trainingSessionId, employeeID, token);
    } catch (err) {
      Alert.alert('Submit Error', err.message || 'Failed to submit assessment');
    } finally {
      setSubmitLoading(false);
    }
  };

  const renderOption = (question, optionText) => {
    const qId = question.id;
    const selected = answersMap[qId] === optionText;
    return (
      <TouchableOpacity
        key={optionText + String(qId)}
        style={[styles.optionButton, selected && styles.optionButtonSelected]}
        activeOpacity={0.8}
        onPress={() => setAnswersMap(prev => ({ ...prev, [qId]: optionText }))}
      >
        <Text allowFontScaling={false} style={[styles.optionText, selected && styles.optionTextSelected]}>{optionText}</Text>
      </TouchableOpacity>
    );
  };

  const preAss = getAssessmentForType('pre');
  const preDisabled = !preAss || !isAssessmentActive(preAss) || Number(preAss.remainingAttempts ?? 0) <= 0;

  const postAss = getAssessmentForType('post');
  const postDisabled = !postAss || !isAssessmentActive(postAss) || Number(postAss.remainingAttempts ?? 0) <= 0;



  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (trainingSessionId && token && employeeID) {
        fetchDetails(trainingSessionId, employeeID, token);
      }
    });
    return unsubscribe;
  }, [navigation, trainingSessionId, token, employeeID]);

  const downloadCertificate = async () => {
    try {
      const url = `https://lms-api-qa.abisaio.com/api/v1/CertificateTemplate/generatepdf?EmployeeId=${employeeID}&templateId=${details.certificateID}&TrainingSessionID=${trainingSessionId}`;

      const fileUri = FileSystem.documentDirectory + `certificate_${trainingSessionId}.pdf`;
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      Alert.alert("Success", "Certificate downloaded successfully.");
      Sharing.shareAsync(result.uri);
    } catch (err) {
      Alert.alert("Error", "Failed to download certificate.");
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <LinearGradient colors={['#4A3B7C', '#2D1B69', '#1a1a2e']} style={styles.gradientBg}>
        <View style={styles.mainContent}>
          {/* 🔙 Header with Back Button instead of Drawer */}
          <Header
            title="Training Details"
            showBackButton
            onBackPress={() => navigation.navigate("TrainingSession")}
            onNotificationPress={openNotification}
          />

          <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.heroImageContainer}>
                <Image source={training} style={styles.heroImage} resizeMode="cover" />
              </View>


              <Animated.View style={[styles.detailsCard, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
                {loadingDetails && <ActivityIndicator size="small" />}
                {error && <Text allowFontScaling={false} style={{ color: '#000' }}>{error}</Text>}

                {details && (
                  <>
                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Training Name:</Text>
                      <Text allowFontScaling={false} style={styles.detailValue}>{details.title ?? 'N/A'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Course Name:</Text>
                      <Text allowFontScaling={false} style={styles.detailValue}>{Array.isArray(details.courseName) ? details.courseName.join(', ') : details.courseName}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Created Date:</Text>
                      <Text allowFontScaling={false} style={styles.detailValue}>{details.createdOn ? new Date(details.createdOn).toLocaleString() : 'N/A'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Training Date:</Text>
                      <Text allowFontScaling={false} style={styles.detailValue}>
                        {details.trainingBatches?.trainingDate ? new Date(details.trainingBatches.trainingDate).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Training Mode:</Text>
                      <Text allowFontScaling={false} style={styles.detailValue}>{details.type ?? ''}</Text>
                    </View>

                    {details.type?.toLowerCase() === 'virtual' && (
  <>
    {/* Meeting Link */}
    <View style={styles.detailRow}>
      <Text allowFontScaling={false} style={styles.detailLabel}>
        Meeting Link:
      </Text>

      <TouchableOpacity
        onPress={() => openMeetingLink(details.virtualSessionUrl)}
        activeOpacity={0.7}
      >
        <Text
          allowFontScaling={false}
          style={styles.linkText}
          numberOfLines={1}
        >
          {details.virtualSessionUrl || 'N/A'}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Meeting ID */}
    <View style={styles.detailRow}>
      <Text allowFontScaling={false} style={styles.detailLabel}>
        Meeting ID:
      </Text>
      <Text allowFontScaling={false} style={styles.detailValue}>
        {details.virtualMeetingID || 'N/A'}
      </Text>
    </View>

    {/* Meeting Password */}
    <View style={styles.detailRow}>
      <Text allowFontScaling={false} style={styles.detailLabel}>
        Meeting Password:
      </Text>
      <Text allowFontScaling={false} style={styles.detailValue}>
        {details.virtualMeetingPassword || 'N/A'}
      </Text>
    </View>
  </>
)}

                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Venue:</Text>
                      <Text allowFontScaling={false} style={styles.detailValueBlue}>{details.trainingBatches?.venueName ?? 'N/A'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Trainer Name:</Text>
                      <Text allowFontScaling={false} style={styles.detailValue}>{details.trainingBatches?.trainerName ?? 'N/A'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Pre-Assessment Status:</Text>
                      <Text allowFontScaling={false} style={styles.detailValue}>{getAssessmentForType('pre')?.assessmentStatus ?? 'N/A'}</Text>
                    </View>

                    {getAssessmentForType('post') && (
                      <View style={styles.detailRow}>
                        <Text allowFontScaling={false} style={styles.detailLabel}>Post-Assessment Status:</Text>
                        <Text allowFontScaling={false} style={styles.detailValue}>{getAssessmentForType('post')?.assessmentStatus ?? 'N/A'}</Text>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Feedback Status:</Text>
                      <Text allowFontScaling={false} style={styles.detailValue}>{details.feedbackStatus ?? 'N/A'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text allowFontScaling={false} style={styles.detailLabel}>Certificate Status:</Text>
                      <View style={styles.inactiveTag}>
                        <Text allowFontScaling={false} style={styles.inactiveText}>{details.certificateStatus ?? 'Inactive'}</Text>
                      </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                      {/* Pre Assessment */}
                      <TouchableOpacity
                        style={[styles.actionButton, preDisabled && styles.disabledButton]}
                        onPress={() => openAssessment('pre')}
                        disabled={preDisabled}
                      >
                        <LinearGradient colors={['#6B7FD7', '#5A4D8F']} style={styles.buttonGradient}>
                          <Text allowFontScaling={false} style={styles.buttonText}>{preAss && Number(preAss.remainingAttempts ?? 0) <= 0 ? 'No Attempts' : 'Pre-Assessment'}</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      {/* Post Assessment (only if exists) */}
                      {getAssessmentForType('post') && (
                        <TouchableOpacity
                          style={[styles.actionButton, postDisabled && styles.disabledButton]}
                          onPress={() => openAssessment('post')}
                          disabled={postDisabled}
                        >
                          <LinearGradient colors={['#6B7FD7', '#5A4D8F']} style={styles.buttonGradient}>
                            <Text allowFontScaling={false} style={styles.buttonText}>{postAss && Number(postAss.remainingAttempts ?? 0) <= 0 ? 'No Attempts' : 'Post-Assessment'}</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.feedbackButton, !isFeedbackActive() && styles.disabledButton]}
                      onPress={() => navigation.navigate("Feedback", { details })}

                      disabled={!isFeedbackActive()}
                    >
                      <LinearGradient colors={['#6B7FD7', '#5A4D8F']} style={styles.feedbackGradient}>
                        <Text allowFontScaling={false} style={styles.feedbackText}>Fill Feedback</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    {details.certificateStatus?.toLowerCase() === "active" && (
                      <TouchableOpacity
                        style={styles.feedbackButton}
                        onPress={downloadCertificate}
                      >
                        <LinearGradient colors={['#00BFA6', '#00796B']} style={styles.feedbackGradient}>
                          <Text allowFontScaling={false} style={styles.feedbackText}>Download Certificate</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}





                    {showFeedbackWindow && (
                      <View style={styles.assessmentWindow}>
                        <Text allowFontScaling={false} style={styles.assessmentTitle}>Feedback</Text>
                        <Text allowFontScaling={false} style={{ marginTop: 8, color: '#666' }}>Feedback functionality will be added later.</Text>
                      </View>
                    )}
                  </>
                )}
              </Animated.View>
            </Animated.View>
          </ScrollView>
        </View>


        {/* universal bottom nav and drawer */}
        <BottomNavigation
          selectedTab={selectedTab}
          tabScaleAnims={tabScaleAnims}
          rotateAnims={rotateAnims}
          handleTabPress={handleTabPress}
          navigation={navigation}
        />

        {/* <CustomDrawer
          drawerVisible={drawerVisible}
          drawerSlideAnim={drawerSlideAnim}
          overlayOpacity={overlayOpacity}
          menuItemAnims={menuItemAnims}
          selectedMenuItem={selectedMenuItem}
          handleMenuItemPress={(index) => handleMenuItemPress(index, navigation)}
          toggleDrawer={toggleDrawer}
          navigation={navigation}
        /> */}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  linkText: {
  fontSize: 14,
  color: '#1E90FF',
  fontWeight: '600',
  textAlign: 'right',
  textDecorationLine: 'underline',
  maxWidth: width * 0.55
},

  // re-used styles from your provided screen; kept design same
  container: { flex: 1 },
  gradientBg: { flex: 1 },
  mainContent: { flex: 1 },
  scrollContent: { flex: 1 },
  contentContainer: { paddingHorizontal: 20 },
  heroImageContainer: { height: 220, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  bookImagePlaceholder: { width: 200, height: 180, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailLabel: { fontSize: 14, color: '#000', fontWeight: '500', flex: 1 },
  detailValue: { fontSize: 14, color: '#FF6B6B', fontWeight: '600', flex: 1, textAlign: 'right' },
  detailValueBlue: { fontSize: 14, color: '#6B7FD7', fontWeight: '600', flex: 1, textAlign: 'right' },
  inactiveTag: { backgroundColor: '#D3D3D3', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 15 },
  inactiveText: { fontSize: 12, color: '#666', fontWeight: '600' },
  buttonContainer: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 12 },
  actionButton: { flex: 1, height: 45, borderRadius: 10, overflow: 'hidden' },
  disabledButton: { opacity: 0.45 },
  buttonGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  feedbackButton: { height: 50, borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  feedbackGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  feedbackText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Assessment window styles (keeps theme)
  assessmentWindow: {
    marginTop: 18,
    backgroundColor: '#f8f9ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e2f8'
  },
  assessmentTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  assessmentDesc: { marginTop: 8, color: '#444' },
  questionBlock: { marginTop: 12, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#eee' },
  questionText: { fontSize: 14, fontWeight: '600', color: '#222' },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  optionButtonSelected: {
    borderColor: '#6B7FD7',
    backgroundColor: '#eef0ff'
  },
  optionText: { color: '#333' },
  optionTextSelected: { color: '#2a2a72', fontWeight: '700' },

  submitButton: { marginTop: 12, height: 44, borderRadius: 10, overflow: 'hidden' },

  resultBox: { marginTop: 12, padding: 10, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e6e6e6' },
  resultText: { color: '#222', fontWeight: '700' },
  resultSmall: { color: '#666', marginTop: 4, fontSize: 12 },

  heroImageContainer: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },

  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },

});

export default TrainingDetailsScreen;