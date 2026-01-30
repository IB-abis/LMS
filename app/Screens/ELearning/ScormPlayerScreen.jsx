// Screens/ELearning/SCORMPlayerScreen.js
import { LinearGradient } from "expo-linear-gradient";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import Header from "../../Components/Header";

const API_SAVE_PROGRESS =
  "https://lms-api-qa.abisaio.com/api/v1/ELearning/course/saveprogress";
const API_GET_PROGRESS =
  "https://lms-api-qa.abisaio.com/api/v1/ELearning/course/getprogress";

const SCORMPlayerScreen = ({ route, navigation }) => {
  const { course, employeeID, token } = route.params;
  const webRef = useRef(null);
  const [webSavedState, setWebSavedState] = useState({});
  const [webUrl, setWebUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const totalTimeSpent = useRef(0);
  const intervalRef = useRef(null);
  const latestStateRef = useRef({});
  const resumeDataRef = useRef(null);
  const loggingIntervalRef = useRef(null); // 🔥 NEW: for 10s logging

  // === INIT: Load saved progress and setup SCORM resume ===
  useEffect(() => {
    async function init() {
      try {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        NavigationBar.setVisibilityAsync("hidden");

        const url = `${API_GET_PROGRESS}/${course.id}/${employeeID}`;

        console.group("📡 GET SCORM Progress API Called");
        console.log("🔗 URL:", url);
        console.log("🔐 Headers:", { Authorization: `Bearer ${token}` });

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = await res.json();

        console.log("📥 Raw JSON Response:");
        console.table(json);
        console.groupEnd();

        let savedState = {};
        let previousTimeSpent = 0;

        if (json?.succeeded && json.data) {
          resumeDataRef.current = json.data;
          previousTimeSpent = Number(json.data.timeSpent) || 0;

          if (json.data.scormDataJson) {
            try {
              const parsed = JSON.parse(json.data.scormDataJson);

              console.group("🧠 Parsed SCORM Resume Data");
              console.table(parsed);
              console.groupEnd();

              if (parsed.allScormData) {
                savedState = parsed.allScormData;
              } else {
                savedState = {
                  "cmi.core.lesson_location": parsed.lessonLocation || "",
                  "cmi.core.session_time": parsed.sessionTime || "0000:00:00",
                  "cmi.core.lesson_status":
                    parsed.completionStatus || "incomplete",
                  "cmi.core.score.raw": parsed.scoreRaw?.toString() || "0",
                  "cmi.suspend_data": parsed.suspendData || "",
                };
              }

              // Resume from last location if available
              if (parsed.lessonLocation && parsed.lessonLocation.includes("#")) {
                const hash = parsed.lessonLocation.substring(
                  parsed.lessonLocation.indexOf("#")
                );
                setWebUrl(`https://lms-qa.abisaio.com/${course.path}${hash}`);
              } else {
                setWebUrl(`https://lms-qa.abisaio.com/${course.path}`);
              }
            } catch (e) {
              console.log("⚠️ Error parsing scormDataJson:", e);
              setWebUrl(`https://lms-qa.abisaio.com/${course.path}`);
            }
          } else {
            console.log("📄 No previous SCORM data, starting fresh.");
            setWebUrl(`https://lms-qa.abisaio.com/${course.path}`);
          }
        } else {
          console.log("🆕 No previous progress found, starting fresh.");
          setWebUrl(`https://lms-qa.abisaio.com/${course.path}`);
        }

        setWebSavedState(savedState);
        latestStateRef.current = savedState;
        totalTimeSpent.current = previousTimeSpent;
        setIsLoading(false);

        // Start auto-save every 10 seconds
        intervalRef.current = setInterval(() => {
          totalTimeSpent.current += 10;
          console.log("⏰ Auto-saving SCORM progress...");
          if (Object.keys(latestStateRef.current).length > 0) {
            saveProgressToServer(latestStateRef.current, totalTimeSpent.current);
          }
        }, 10000);

        // 🔥 NEW — FORMATTED LOGGING EVERY 10 SECONDS
        loggingIntervalRef.current = setInterval(async () => {
          console.group("🕒 10s GET + POST LOGGING CYCLE");

          // --- GET LOG ---
          const getUrl = `${API_GET_PROGRESS}/${course.id}/${employeeID}`;
          console.group("📡 GET API Log");
          console.log("URL:", getUrl);
          console.log("Headers:", { Authorization: `Bearer ${token}` });

          try {
            const g = await fetch(getUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const gJson = await g.json();
            console.log("Response:");
            console.table(gJson);
          } catch (e) {
            console.log("❌ GET Error:", e);
          }
          console.groupEnd();

          // --- POST LOG ---
          console.group("📤 POST Payload Preview");
          console.table({
            ...latestStateRef.current,
            timeSpent: totalTimeSpent.current,
          });
          console.groupEnd();

          console.groupEnd();
        }, 10000);
      } catch (e) {
        console.log("❌ Init error:", e);
        setIsLoading(false);
      }
    }

    init();

    const back = BackHandler.addEventListener("hardwareBackPress", handleExit);
    return () => {
      back.remove();
      clearInterval(intervalRef.current);
      clearInterval(loggingIntervalRef.current);
      NavigationBar.setVisibilityAsync("visible");
    };
  }, []);

  const handleExit = () => {
    console.log("⬅️ Exiting SCORM Player...");
    navigation.goBack();
    return true;
  };

  // === Inject SCORM API ===
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
        LMSGetLastError: function() { return "0"; },
      };
      window.API = API;
      window.parent.API = API;
      window.top.API = API;
    })();
  `;

  // === SAVE PROGRESS TO API (exact web format) ===
  const saveProgressToServer = async (state, timeSpentSeconds) => {
    try {
      const completionStatus =
        state["cmi.core.lesson_status"] || "incomplete";
      const scoreRaw = parseInt(state["cmi.core.score.raw"]) || 0;
      const sessionTime = state["cmi.core.session_time"] || "0000:00:00";
      const lessonLocation = state["cmi.core.lesson_location"] || "";
      const suspendData = state["cmi.suspend_data"] || "";

      const scormDataJson = {
        lessonLocation,
        sessionTime,
        completionStatus,
        scoreRaw,
        lastPosition: lessonLocation,
        suspendData,
        allScormData: state,
        coreData: {},
        interactions: {},
        objectives: {},
        otherData: {},
      };

      Object.keys(state).forEach((key) => {
        const value = state[key];
        if (key.startsWith("cmi.core.")) {
          scormDataJson.coreData[key] = value;
        } else if (key.startsWith("cmi.interactions.")) {
          scormDataJson.interactions[key] = value;
        } else if (key.startsWith("cmi.objectives.")) {
          scormDataJson.objectives[key] = value;
        } else if (key.startsWith("cmi.")) {
          scormDataJson.otherData[key] = value;
        }
      });

      const payload = {
        id: 0,
        courseId: course.id,
        userId: Number(employeeID),
        completed: ["completed", "passed", "failed"].includes(completionStatus),
        score: scoreRaw,
        timeSpent: timeSpentSeconds,
        lastAccessed: new Date().toISOString(),
        scormDataJson: JSON.stringify(scormDataJson),
        timestamp: new Date().toISOString(),
      };

      console.group("📤 POST Save Progress");
      console.log("📦 Payload:");
      console.table(payload);
      console.groupEnd();

      const res = await fetch(API_SAVE_PROGRESS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const response = await res.json();

      console.group("✅ POST Save Response");
      console.table(response);
      console.groupEnd();
    } catch (e) {
      console.log("❌ Save progress error:", e);
    }
  };

  // === WebView onMessage handler ===
  const onWebMessage = (event) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (!payload?.state) return;
      latestStateRef.current = payload.state;

      console.log("📩 SCORM message received:", payload.type);

      if (payload.type === "FINISH") {
        console.log("🏁 SCORM Finish detected. Saving final progress...");
        saveProgressToServer(payload.state, totalTimeSpent.current).then(() => {
          navigation.goBack();
        });
      }
    } catch (e) {
      console.log("⚠️ onWebMessage parse error:", e);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <LinearGradient
        colors={["#4A3B7C", "#2D1B69", "#1a1a2e"]}
        style={styles.bg}
      >
        <Header
          title={course?.name ?? "Course"}
          showBackButton
          onBackPress={handleExit}
          showNotification={false}
          showSpinner={false}
        />
        {isLoading || !webUrl ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#c8b9ff" />
          </View>
        ) : (
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
            style={{ flex: 1, backgroundColor: "#000" }}
          />
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default SCORMPlayerScreen;
