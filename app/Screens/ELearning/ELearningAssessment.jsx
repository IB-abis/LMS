// AssessmentScreen.js
import { FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Header from '../../Components/Header';

const API_ASSESSMENT_BASE = 'https://lms-api-qa.abisaio.com/api/v1/Assessment/GetAssessmentDetails';
const API_SUBMIT_ASSESSMENT = 'https://lms-api-qa.abisaio.com/api/v1/ELearning/SubmitAssessment';


const EAssessmentScreen = ({ route, navigation }) => {
  // Accept several possible shapes for incoming params and normalize them
  const rawMeta = route?.params?.assessmentMeta ?? route?.params?.meta ?? route?.params ?? null;
  const assessmentMeta = {
    assessmentId: rawMeta?.assessmentId ?? rawMeta?.assessmentID ?? rawMeta?.id,
    eLearningCourseId: rawMeta?.eLearningCourseId ?? rawMeta?.eLearningCourseID ?? rawMeta?.courseId,
    assessmentType: rawMeta?.assessmentType ?? rawMeta?.type,
    remainingAttempts: rawMeta?.attemptsRemaining ?? rawMeta?.remainingAttempts
  };
  const trainingSessionIdFromParams = route?.params?.trainingSessionId ?? rawMeta?.trainingSessionID;
  const [token, setToken] = useState(null);
  const [employeeID, setEmployeeID] = useState(null);

  const [loading, setLoading] = useState(false);
  const [assessmentData, setAssessmentData] = useState(null);
  const [answersMap, setAnswersMap] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('token');
        const emp = await AsyncStorage.getItem('employeeID') || await AsyncStorage.getItem('userID');
        if (!t || !emp) {
          Alert.alert('Authentication', 'Missing token or employee ID. Please login again.', [
            { text: 'OK', onPress: () => navigation.popToTop() }
          ]);
          return;
        }
        setToken(t);
        setEmployeeID(emp);

        // Validate we have an assessment id (accept multiple possible keys)
        const normalizedAssessmentId = assessmentMeta.assessmentId ?? rawMeta?.assessmentID ?? rawMeta?.id;
        if (!normalizedAssessmentId && normalizedAssessmentId !== 0) {
          Alert.alert('Error', 'Assessment metadata missing. Returning back.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
          return;
        }

        // If no attempts left, block upfront
        const remainingAttempts = Number(assessmentMeta.remainingAttempts ?? rawMeta?.remainingAttempts ?? -1);
        if (remainingAttempts === 0) {
          Alert.alert('Attempts exhausted', 'You have 0 attempts left for this assessment.', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
          return;
        }

        await fetchAssessmentDetails(normalizedAssessmentId, t);
      } catch (e) {
        console.log('init err', e);
        Alert.alert('Error', 'Failed to initialize assessment. Returning back.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    })();
  }, []);

  const fetchAssessmentDetails = async (assessmentId, authToken) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ AssessmentId: String(assessmentId) });
      const url = `${API_ASSESSMENT_BASE}?${params.toString()}`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      const json = await resp.json();
      if (!json.succeeded) throw new Error(json.message || 'Assessment API failed');
      const assData = Array.isArray(json.data) ? json.data[0] : json.data;
      // Normalize: ensure questions array exists
      if (!assData || !Array.isArray(assData.questions)) {
        throw new Error('Invalid assessment data');
      }
      setAssessmentData({ ...assData, meta: assessmentMeta });
      // Pre-fill answers map keys to '' for validation clarity
      const initialMap = {};
      (assData.questions || []).forEach(q => { initialMap[q.id] = ''; });
      setAnswersMap(initialMap);
    } catch (err) {
      console.log('fetch assessment error', err);
      Alert.alert('Error', err.message || 'Failed to load assessment', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderOption = (question, optionText) => {
    const qId = question.id;
    const selected = answersMap[qId] === optionText;
    return (
      <TouchableOpacity
        key={String(qId) + optionText}
        style={[styles.optionButton, selected && styles.optionButtonSelected]}
        activeOpacity={0.8}
        onPress={() => {
          setAnswersMap(prev => ({ ...prev, [qId]: optionText }));
        }}
      >
        <Text allowFontScaling={false} style={[styles.optionText, selected && styles.optionTextSelected]}>{optionText}</Text>
      </TouchableOpacity>
    );
  };

  const validateAllAnswered = () => {
    if (!assessmentData || !Array.isArray(assessmentData.questions)) return false;
    const unanswered = (assessmentData.questions || []).filter(q => {
      const ans = answersMap[q.id];
      return !ans || String(ans).trim() === '';
    });
    return unanswered.length === 0;
  };

  const submitAssessment = async () => {
    if (hasSubmitted) return;
    if (!validateAllAnswered()) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }
    if (!assessmentData || !assessmentData.meta) {
      Alert.alert('Error', 'Assessment metadata missing.');
      return;
    }

    // Re-check remaining attempts before submitting (use meta.remainingAttempts if available)
    const remainingAttempts = Number(assessmentData.meta.remainingAttempts ?? assessmentMeta.remainingAttempts ?? -1);
    if (remainingAttempts === 0) {
      Alert.alert('Not allowed', 'You have no attempts left for this assessment.');
      return;
    }

  // Build payload using normalized meta and fallbacks
  const payload = {
    assessmentId: Number(assessmentMeta.assessmentId ?? rawMeta?.assessmentID ?? rawMeta?.id),
    eLearningCourseId: Number(assessmentMeta.eLearningCourseId ?? rawMeta?.eLearningCourseId ?? rawMeta?.courseId),
    assessmentType: String(assessmentMeta.assessmentType ?? rawMeta?.assessmentType ?? ''),
    empId: Number(employeeID),
    answers: (assessmentData.questions || []).map(q => ({
      questionId: Number(q.id),
      selectedAnswer: answersMap[q.id] ?? ""
    }))
  };


    setSubmitLoading(true);
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
      // mark submitted (single submit)
      setHasSubmitted(true);
      setSubmitLoading(false);

      const msg = json?.message ?? 'Submitted';
      const totalScore = json?.totalScore ?? json?.totalMarks ?? 'N/A';
      const percentage = json?.percentageScore !== undefined ? Number(json.percentageScore).toFixed(2) : 'N/A';
      const remaining = json?.remainingAttempts ?? assessmentData.meta.remainingAttempts ?? -1;
      const passed = json?.isPassed;

      // Show popup and navigate back to Training Details page
      const alertMessage = `${msg}\n\nScore: ${totalScore}\nPercentage: ${percentage}%\nPassed: ${passed ? 'Yes' : 'No'}\nAttempts left: ${remaining}`;
      Alert.alert('Assessment Submitted', alertMessage, [
        {
          text: 'OK',
          onPress: () => {
            // Prefer to go back to the existing CourseDetails on the stack instead of pushing a new one.
            // If the caller passed an onSubmitted callback (safe in-memory), call it to allow immediate refresh.
            try {
              if (typeof rawMeta?.onSubmitted === 'function') {
                rawMeta.onSubmitted();
              } else if (typeof route?.params?.onSubmitted === 'function') {
                route.params.onSubmitted();
              }
            } catch (e) {
              // ignore
            }
            navigation.goBack();
          }
        }
      ]);
    } catch (err) {
      console.log('submit err', err);
      setSubmitLoading(false);
      Alert.alert('Submit Error', err.message || 'Failed to submit assessment');
    }
  };

  if (loading || !assessmentData) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={['#4A3B7C', '#2D1B69', '#1a1a2e']} style={{ flex: 1 }}>
          <Header
            title={assessmentMeta?.assessmentName ? `Assessment - ${assessmentMeta.assessmentName}` : 'Assessment'}
            showBackButton
            onBackPress={() => navigation.goBack()}
          />
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" />
            <Text allowFontScaling={false} style={{ marginTop: 12, color: '#fff' }}>Loading assessment...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // If assessment exists and loaded
  const attemptsLeft = Number(assessmentMeta?.remainingAttempts ?? assessmentData?.meta?.remainingAttempts ?? -1);
  const disabledDueToAttempts = attemptsLeft === 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#4A3B7C', '#2D1B69', '#1a1a2e']} style={styles.gradientBg}>
        <Header
          title={assessmentData?.name ? `${assessmentData.name}` : 'Assessment'}
          showBackButton
          onBackPress={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.innerCard}>
            <View style={styles.headerRow}>
              <FontAwesome5 name="clipboard-list" size={28} color="#FF6B6B" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text allowFontScaling={false} style={styles.title}>{assessmentData.name}</Text>
                <Text allowFontScaling={false} style={styles.sub}>{assessmentData.description}</Text>
                <Text allowFontScaling={false} style={styles.metaSmall}>Duration: {assessmentData.duration ?? 'N/A'} mins • Attempts left: {attemptsLeft === -1 ? 'N/A' : attemptsLeft}</Text>
              </View>
            </View>

            {(assessmentData.questions || []).map((q, idx) => (
              <View key={q.id} style={styles.questionBlock}>
                <Text allowFontScaling={false} style={styles.questionText}>{idx + 1}. {q.questions}</Text>
                <View style={{ marginTop: 8 }}>
                  {[q.option1, q.option2, q.option3, q.option4, q.option5].filter(Boolean).map(opt => renderOption(q, opt))}
                </View>
              </View>
            ))}

            <View style={{ marginTop: 16 }}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submitLoading || hasSubmitted || disabledDueToAttempts) && { opacity: 0.6 }
                ]}
                onPress={submitAssessment}
                disabled={submitLoading || hasSubmitted || disabledDueToAttempts}
              >
                <LinearGradient colors={['#6B7FD7', '#5A4D8F']} style={styles.submitGradient}>
                  <Text allowFontScaling={false} style={styles.submitText}>
                    {disabledDueToAttempts ? 'No Attempts Left' : hasSubmitted ? 'Submitted' : (submitLoading ? 'Submitting...' : 'Submit Assessment')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              {disabledDueToAttempts && <Text allowFontScaling={false} style={styles.attemptWarning}>You have 0 attempts left for this assessment.</Text>}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBg: { flex: 1 },
  scrollContent: { padding: 16 },
  innerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#222' },
  sub: { marginTop: 6, color: '#444' },
  metaSmall: { marginTop: 6, color: '#666', fontSize: 12 },

  questionBlock: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  questionText: { fontWeight: '700', color: '#222', fontSize: 14 },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  optionButtonSelected: {
    borderColor: '#6B7FD7',
    backgroundColor: '#eef0ff'
  },
  optionText: { color: '#333' },
  optionTextSelected: { color: '#2a2a72', fontWeight: '700' },

  submitButton: { height: 48, borderRadius: 12, overflow: 'hidden', marginTop: 6 },
  submitGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  attemptWarning: { marginTop: 10, color: '#b00020', fontSize: 13 }
});

export default EAssessmentScreen;
