// Screens/ELearning/CourseDetailsScreen.js
import { useNotification } from '@/app/Components/NotificationContext';
import { FontAwesome } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { WebView } from "react-native-webview";
import Header from '../../Components/Header';

const API_COURSE_DETAILS = (courseId, employeeID) => `https://lms-api.abisaio.com/api/v1/ELearning/course/details/${courseId}/${employeeID}`;
const API_SAVE_PROGRESS = "https://lms-api.abisaio.com/api/v1/ELearning/course/saveprogress";
const API_CERTIFICATE_PDF = (empId, templateId, trainingId) =>
  `https://lms-api.abisaio.com/api/v1/CertificateTemplate/generatepdf?EmployeeId=${empId}&templateId=${templateId}&TrainingSessionID=${trainingId}`;
const API_GET_PROGRESS = (courseId, userId) =>
  `https://lms-api.abisaio.com/api/v1/ELearning/course/getprogress/${courseId}/${userId}`;


const { width, height } = Dimensions.get("window");

const CourseDetailsScreen = ({ route, navigation }) => {
  const { courseId } = route.params || {};
  const origin = route.params?.from || route.params?.returnTo || null;

  const { openNotification } = useNotification();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [learner, setLearner] = useState(null);
  const [token, setToken] = useState(null);
  const [employeeID, setEmployeeID] = useState(route.params?.employeeID ?? null);
  const [error, setError] = useState(null);

  // web modal / scorm
  const [webModalVisible, setWebModalVisible] = useState(false);
  const [webUrl, setWebUrl] = useState(null);
  const [webSavedState, setWebSavedState] = useState({});
  const webRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // throttle
  const progressLock = useRef(false);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (webModalVisible) {
        closeWebModal();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [webModalVisible]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true })
    ]).start();

    setTimeout(() => {
      Animated.spring(cardAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start();
    }, 200);

    (async () => {
      try {
        const t = await AsyncStorage.getItem("token");
        const emp = employeeID || (await AsyncStorage.getItem("employeeID")) || (await AsyncStorage.getItem("userID"));
        if (!t || !emp) {
          setError("Missing token or employee id. Please login again.");
          setLoading(false);
          return;
        }
        setToken(t);
        setEmployeeID(String(emp));
        await fetchCourseDetails(courseId, String(emp), t);
      } catch (e) {
        setError("Failed to load credentials");
        setLoading(false);
      }
    })();
  }, []);

  // refresh on focus (in case assessment/feedback changed)
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (courseId && token && employeeID) {
        fetchCourseDetails(courseId, employeeID, token);
      }
    });
    return unsubscribe;
  }, [navigation, courseId, token, employeeID]);

  // safe back behavior
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (webModalVisible) {
        closeWebModal();
        return true;
      }
      if (origin) {
        navigation.navigate(origin);
        return true;
      }
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, [navigation, webModalVisible, origin]);

  const fetchCourseDetails = async (id, empId, authToken) => {
    setLoading(true);
    setError(null);
    try {
      const url = API_COURSE_DETAILS(id, empId);
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : undefined,
          Accept: "application/json",
        }
      });
      const json = await resp.json();
      if (!json?.succeeded) {
        setCourse(json?.data ?? null);
        setLoading(false);
        setError(json?.message ?? "Failed to fetch course");
        return;
      }
      const data = json.data;
      setCourse(data);

      // find learner object
      const empEntry = Array.isArray(data.employees)
        ? data.employees.find(e => String(e.employeeID) === String(empId))
        : null;
      setLearner(empEntry ?? null);
    } catch (err) {
      setError("Failed to load course details");
      console.error("fetchCourseDetails err", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: return assessment object normalized, nil-safe
  const getAssessmentForType = (type) => {
    if (!course) return null;
    // API sometimes includes pre/post at top-level or inside employee
    if (learner) {
      if (type === "pre" && learner.preAssessment) return learner.preAssessment;
      if (type === "post" && learner.postAssessment) return learner.postAssessment;
    }
    if (type === "pre" && course.preAssessment) return course.preAssessment;
    if (type === "post" && course.postAssessment) return course.postAssessment;
    return null;
  };

  const isAssessmentActive = (assObj) => {
    if (!assObj) return false;
    const status = String(assObj.assessmentStatus ?? assObj.status ?? "").toLowerCase();
    const activeFlag = (assObj.active !== undefined) ? !!assObj.active : true;
    const attemptsRemaining = Number(assObj.attemptsRemaining ?? assObj.remainingAttempts ?? -1);
    if (attemptsRemaining === 0) return false;
    return activeFlag && status !== "inactive";
  };

  const isCompleted = (assObj) => {
    if (!assObj) return false;
    const status = String(assObj.assessmentStatus ?? "").toLowerCase();
    if (status === "completed") return true;
    if (assObj.assessmentCompletedOn) return true;
    return false;
  };

  const isFeedbackActive = () => {
    if (!learner && !course) return false;
    return !!(learner?.feedbackActive ?? course?.feedbackActive ?? false);
  };
  const [timeSpent, setTimeSpent] = useState(null);

  useEffect(() => {
    if (courseId && employeeID && token) {
      (async () => {
        try {
          const res = await fetch(API_GET_PROGRESS(courseId, employeeID), {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          const json = await res.json();

          console.log("API_GET_PROGRESS full response:", json);
          if (json?.succeeded && json.data) {
            setTimeSpent(Math.floor(json.data.timeSpent / 60)); // convert sec to min
          }
        } catch (e) {
          console.warn("Get progress error", e);
        }
      })();
    }
  }, [courseId, employeeID, token]);

  

  // compute step objects and availability
  const computeSteps = () => {
    const pre = getAssessmentForType("pre");
    const post = getAssessmentForType("post");
    const videoExists = !!course?.path;

    const preActive = pre?.active === true;
    const preCompleted = pre?.assessmentCompletedOn || (pre?.assessmentStatus || "").toLowerCase() === "completed";

    const videoCompleted = learner?.completed === true;

    const postActive = post?.active === true;
    const postCompleted = post?.assessmentCompletedOn || (post?.assessmentStatus || "").toLowerCase() === "completed";

    const feedbackActive = learner?.feedbackActive === true;
    const feedbackCompleted = !!learner?.feedbackCompletedOn;

    const courseActive = learner?.courseActive === true;

    return [
      {
        key: "pre",
        title: "Pre-Assessment",
        exists: !!pre,
        active: preActive,
        completed: !!preCompleted,
        available: !!pre, // Always shown
        subtitle: pre ? `${pre?.attemptsRemaining ?? 0} attempts left` : "Not available"
      },

      {
        key: "video",
        title: "E-Learning Course",
        exists: videoExists,
       active: (courseActive || preCompleted),  // Only active when pre completed
        completed: videoCompleted,
        available: (courseActive || preCompleted) && videoExists,
        subtitle: (courseActive || preCompleted) ? "Available now" : "Complete Pre-Assessment first"
      },

      {
        key: "post",
        title: "Post-Assessment",
        exists: !!post,
        active: postActive && videoCompleted, // Only active if post.active true & video done
        completed: !!postCompleted,
        available: postActive && videoCompleted,
        subtitle: post ? `${post?.attemptsRemaining ?? 0} attempts left` : "Not available"
      },

      {
        key: "feedback",
        title: "Feedback",
        exists: feedbackActive,
        active: feedbackActive && postCompleted, // Only after post completed
        completed: feedbackCompleted,
        available: feedbackActive && postCompleted,
        subtitle: feedbackActive ? "Provide feedback" : "Locked"
      }
    ];
  };


  const steps = computeSteps();

  // navigation actions
  const openAssessment = (type) => {
    const assObj = getAssessmentForType(type);

    if (!assObj) {
      Alert.alert("Assessment", `${type} assessment not available`);
      return;
    }

    if (!isAssessmentActive(assObj)) {
      Alert.alert("Assessment", `${type} assessment is inactive.`);
      return;
    }

    const remainingAttempts = Number(assObj.attemptsRemaining ?? assObj.remainingAttempts ?? -1);
    if (remainingAttempts === 0) {
      Alert.alert("Attempts exhausted", "You have 0 attempts left for this assessment.");
      return;
    }

    navigation.navigate("EAssessment", {
      assessmentMeta: {
        assessmentId: assObj.id,                 // ✅ correct field
        eLearningCourseId: course.id,            // ✅ correct course id
        assessmentType: type,                    // ✅ "pre" or "post"
        empId: employeeID                        // ✅ logged-in employee
      },
    });
  };

  const openFeedback = () => {
    navigation.navigate("EFeedback", { details: course });
  };

  const downloadCertificate = async () => {
    try {
      if (!course?.certificateID) {
        Alert.alert("Certificate", "No certificate available for this course.");
        return;
      }
      const url = API_CERTIFICATE_PDF(employeeID, course.certificateID, courseId);
      const fileUri = FileSystem.documentDirectory + `certificate_${courseId}.pdf`;
      const result = await FileSystem.downloadAsync(url, fileUri, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert("Success", "Certificate downloaded successfully.");
      Sharing.shareAsync(result.uri);
    } catch (err) {
      console.error("download certificate err", err);
      Alert.alert("Error", "Failed to download certificate.");
    }
  };

  // --- Modal WebView / SCORM logic ---
  const openWebModal = () => {
    if (!course?.path) {
      Alert.alert("Content", "No SCORM content found.");
      return;
    }

    navigation.navigate("SCORMPlayer", {
      course,
      employeeID,
      token
    });
  };


  const closeWebModal = async () => {
    if (isFullscreen) {
      try { await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT); } catch (e) { }
      setIsFullscreen(false);
    }
    setWebModalVisible(false);
    // refresh after a short delay to allow modal to close animation
    setTimeout(() => {
      if (courseId && employeeID && token) fetchCourseDetails(courseId, employeeID, token);
    }, 600);
  };

  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT);
        setIsFullscreen(true);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn("Screen orientation lock failed", e);
      Alert.alert("Notice", "Full-screen orientation not available on this device.");
    }
  };

  const injectedSCORM = `
  (function() {
    window.__RN_SCORM_STATE = ${JSON.stringify(webSavedState || {})};
    function postState(type) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type || "PROGRESS", state: window.__RN_SCORM_STATE }));
      } catch (e) {}
    }
    function setValue(k, v) {
      window.__RN_SCORM_STATE[k] = v;
      postState("PROGRESS");
      return "true";
    }
    var API = {
      LMSInitialize: function() { return "true"; },
      LMSFinish: function() { postState("FINISH"); return "true"; },
      LMSGetValue: function(key) { return window.__RN_SCORM_STATE[key] || ""; },
      LMSSetValue: function(key, value) { return setValue(key, value); },
      LMSCommit: function() { postState("PROGRESS"); return "true"; },
      LMSGetLastError: function() { return "0"; }
    };
    window.API = API;
    window.parent.API = API;
    window.top.API = API;
  })();
  `;

  const saveProgressToServer = async (state) => {
    try {
      await fetch(API_SAVE_PROGRESS, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : undefined },
        body: JSON.stringify({
          id: 0,
          courseId,
          userId: Number(employeeID),
          completed: state["cmi.core.lesson_status"] === "completed" || state["cmi.completed"] === "completed",
          score: Number(state["cmi.core.score.raw"]) || Number(state["cmi.score.raw"]) || 0,
          timeSpent: Number(state["cmi.total_time"] || 0),
          scormDataJson: JSON.stringify(state)
        })
      });
    } catch (err) {
      console.warn("saveProgressToServer err", err);
    }
  };

  const onWebMessage = async (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (!payload || !payload.state) return;

      if (!progressLock.current) {
        progressLock.current = true;
        saveProgressToServer(payload.state).finally(() => {
          setTimeout(() => { progressLock.current = false; }, 4000);
        });
      }

      if (payload.type === "FINISH") {
        Alert.alert("Finished", "Course finished. Progress saved.");
        closeWebModal();
      }
    } catch (e) {
      console.warn("onWebMessage parse err", e);
    }
  };

  // Derived UI values
  const preAss = getAssessmentForType("pre");
  const postAss = getAssessmentForType("post");

  // Loading state UI
  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <LinearGradient colors={["#4A3B7C", "#2D1B69", "#1a1a2e"]} style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
          <Header
            title="Course Details"
            showBackButton
            onBackPress={() => origin ? navigation.navigate(origin) : navigation.goBack()}
            onNotificationPress={openNotification}
          />
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#c8b9ff" />
            <Text allowFontScaling={false} style={{ color: "#fff", marginTop: 12 }}>Loading course...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }


  // Render main
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <LinearGradient colors={["#4A3B7C", "#2D1B69", "#1a1a2e"]} style={styles.gradientBg}>
        <View style={styles.mainContent}>
          <Header
            title="Course Details"
            showBackButton
            onBackPress={() => origin ? navigation.navigate(origin) : navigation.goBack()}
            onNotificationPress={openNotification}
          />

          <ScrollView style={styles.scrollContent} contentContainerStyle={{ padding: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
            {/* === NEW COURSE INFORMATION CARD === */}
            <Animated.View style={[styles.infoCard, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
              <Text allowFontScaling={false} style={{ fontSize: 18, fontWeight: "800", marginBottom: 10, color: "#111" }}>E-learning Course</Text>

              <Text allowFontScaling={false} style={{ color: "#444", marginBottom: 4 }}>
                <Text allowFontScaling={false} style={{ fontWeight: "700" }}>Course: </Text>{course?.name ?? "-"}
              </Text>

              <Text allowFontScaling={false} style={{ color: "#444", marginBottom: 4 }}>
                <Text allowFontScaling={false} style={{ fontWeight: "700" }}>Content: </Text>{course?.contentName ?? "-"}
              </Text>

              <Text allowFontScaling={false} style={{ color: "#444", marginBottom: 4 }}>
                <Text allowFontScaling={false} style={{ fontWeight: "700" }}>Start Date: </Text>
                {course?.startDate ? course.startDate.split("T")[0] : "-"}
              </Text>

              <Text allowFontScaling={false} style={{ color: "#444" }}>
                <Text allowFontScaling={false} style={{ fontWeight: "700" }}>End Date: </Text>
                {course?.endDate ? course.endDate.split("T")[0] : "-"}
              </Text>
            </Animated.View>

            <Animated.View style={[styles.infoCard, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
              <View>
                <Text allowFontScaling={false} style={{ color: "#111", marginBottom: 6 }}>Learning as: <Text allowFontScaling={false} style={{ fontWeight: "800" }}>{learner?.employeeName ?? "Unknown"}</Text></Text>
                <Text allowFontScaling={false} style={{ color: "#444", marginBottom: 2 }}>{learner?.department ?? ""} • {learner?.designation ?? ""}</Text>
                <Text allowFontScaling={false} style={{ color: "#444", marginBottom: 2 }}>Last accessed: {learner?.lastAccessedOn ?? "Not started"}</Text>
                <Text allowFontScaling={false} style={{ color: "#444" }}>Course Status: {learner?.completed ? "Completed" : (learner?.timeSpent ? "In Progress" : "Not Started")}</Text>
              </View>
            </Animated.View>

            <Text allowFontScaling={false} style={styles.sectionTitle}>Learning Progress</Text>

            {/* list items */}
            <View style={styles.progressList}>
              {steps.map((s) => {
                const isActiveVisual = s.active;


                const isAvailable = s.available && s.exists;
                return (
                  <TouchableOpacity
                    key={s.key}
                    activeOpacity={isAvailable ? 0.7 : 1}
                    onPress={() => {
                      if (!isAvailable) return;
                      if (s.key === "pre") openAssessment("pre");
                      if (s.key === "video") openWebModal();
                      if (s.key === "post") openAssessment("post");
                      if (s.key === "feedback") openFeedback();
                    }}
                    style={[styles.stepItem, isActiveVisual ? styles.stepActive : !isAvailable ? styles.stepDisabled : styles.stepAvailable]}
                  >
                    <View style={styles.stepLeft}>
                      <View style={[styles.iconWrap, isActiveVisual ? styles.iconActive : styles.iconInactive]}>
                        <FontAwesome name={s.key === "video" ? "play-circle" : (s.key === "pre" || s.key === "post" ? "clock-o" : "comment")} size={18} color={isActiveVisual ? "#4A3B7C" : "#6b7280"} />
                      </View>
                    </View>

                    <View style={styles.stepBody}>
                      <Text allowFontScaling={false} style={[styles.stepTitle, isActiveVisual ? styles.stepTitleActive : null]}>{s.title}</Text>
                      <Text allowFontScaling={false} style={styles.stepSubtitle}>{s.subtitle}</Text>
                    </View>

                    <View style={styles.stepRight}>
                      {s.completed ? (
                        <Text allowFontScaling={false} style={styles.completedText}>Completed</Text>
                      ) : isActiveVisual ? (
                        <Text allowFontScaling={false} style={styles.availableText}>Available</Text>
                      ) : (
                        <Text allowFontScaling={false} style={styles.lockText}>Locked</Text>
                      )}

                      {/* ✅ Show time spent only for video step */}
                      {s.key === "video" && timeSpent !== null && (
                        <Text allowFontScaling={false} style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                          Time spent: {timeSpent} min
                        </Text>
                      )}
                    </View>

                  </TouchableOpacity>
                );
              })}
            </View>

            {/* helper note area */}
            <View style={styles.noteBox}>
              <FontAwesome name="info-circle" size={16} color="#6B4FD7" style={{ marginRight: 8 }} />
              <Text allowFontScaling={false} style={styles.noteText}>
                Steps activate in order. Complete earlier active steps to proceed. Tappable items are available to you.
              </Text>
            </View>

            {/* certificate (optional) */}
            {course?.certificateStatus?.toLowerCase?.() === "active" && course?.certificateID && (
              <TouchableOpacity style={styles.certificateRow} onPress={downloadCertificate}>
                <FontAwesome name="download" size={18} color="#6B7FD7" />
                <Text allowFontScaling={false} style={{ marginLeft: 10, color: "#6B7FD7", fontWeight: "700" }}>Download Certificate</Text>
              </TouchableOpacity>
            )}

            {error ? <Text allowFontScaling={false} style={{ color: "red", marginTop: 10 }}>{error}</Text> : null}
          </ScrollView>
        </View>
      </LinearGradient>

      {/* WebView Modal */}
      <Modal
        visible={webModalVisible}
        animationType="slide"
        onRequestClose={closeWebModal}
        supportedOrientations={["portrait", "landscape"]}
        transparent={!isFullscreen}
      >
        <View style={isFullscreen ? styles.webFullscreenWrapper : styles.webModalWrapper}>
          <View style={styles.webHeader}>
            <TouchableOpacity onPress={closeWebModal} style={{ padding: 8 }}>
              <Text allowFontScaling={false} style={{ color: "#fff" }}>Close</Text>
            </TouchableOpacity>

            <Text allowFontScaling={false} numberOfLines={1} style={{ color: "#fff", fontWeight: "700", flex: 1, textAlign: "center" }}>
              {course?.name ?? "Course Content"}
            </Text>

            <TouchableOpacity onPress={toggleFullscreen} style={{ padding: 8 }}>
              <Text allowFontScaling={false} style={{ color: "#fff" }}>
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </Text>
            </TouchableOpacity>
          </View>

          {webUrl ? (
            <WebView
              ref={webRef}
              source={{ uri: webUrl }}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              injectedJavaScriptBeforeContentLoaded={injectedSCORM}
              injectedJavaScript={injectedSCORM}
              onMessage={onWebMessage}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" color="#c8b9ff" />
                </View>
              )}
              style={{ flex: 1 }}
            />
          ) : (
            <View style={styles.loader}>
              <Text allowFontScaling={false} style={{ color: "#fff" }}>Preparing content...</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBg: { flex: 1 },
  mainContent: { flex: 1 },
  scrollContent: { flex: 1 },

  headerTop: { padding: 0 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#6B7FD7", marginBottom: 8 },
  headerMeta: { marginTop: 4 },
  metaLabel: { color: "#334155", marginTop: 4 },

  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#ecebf8"
  },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#ffffffff", marginTop: 18, marginBottom: 10 },

  progressList: { marginTop: 6 },

  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#efecf8"
  },
  stepActive: {
    backgroundColor: "#f4f1ff",
    borderColor: "#e0d7ff"
  },
  stepAvailable: {
    backgroundColor: "#fff"
  },
  stepDisabled: {
    backgroundColor: "#f3f4f6",
    opacity: 0.9
  },
  stepLeft: { width: 40, alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  iconActive: { backgroundColor: "#efe8ff" },
  iconInactive: { backgroundColor: "#f1f5f9" },

  stepBody: { flex: 1, paddingHorizontal: 8 },
  stepTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  stepTitleActive: { color: "#6B7FD7" },
  stepSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 4 },

  stepRight: { minWidth: 90, alignItems: "flex-end" },
  completedText: { color: "#059669", fontWeight: "700" },
  availableText: { color: "#6B7FD7", fontWeight: "700" },
  lockText: { color: "#9ca3af", fontWeight: "600" },

  noteBox: {
    marginTop: 12,
    backgroundColor: "#f6f3ff",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e8e0ff"
  },
  noteText: { color: "#4a3b7c", flex: 1 },

  certificateRow: {
    marginTop: 18,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#efe8ff",
    flexDirection: "row",
    alignItems: "center"
  },

  // modal styles
  webModalWrapper: {
    width: width * 0.94,
    height: height * 0.78,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "center",
    marginTop: height * 0.06,
  },
  webFullscreenWrapper: {
    flex: 1,
    backgroundColor: "#000",
  },
  webHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: "#111",
  },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

});

export default CourseDetailsScreen;
