

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Header from '../../Components/Header';


const API_SUBMIT_FEEDBACK = 'https://lms-api-qa.abisaio.com/api/v1/ELearning/submitfeedback';


const QUESTIONS = [
  "Overall, how do you rate the training you have just completed?",
  "How would you rate this training in terms of its relevance & usefulness to your work?",
  "How would you rate this training in terms of depth of coverage of various topics?",
  "How would you rate on the duration of the program?",
  "Rate on the course topics, were they presented in a logical manner?",
  "How would you rate the trainer's presentation pace?",
  "How would you rate the trainer's ability to handle your questions?",
  "How would you rate the trainer in terms of their command over the topic?",
  "How would you rate the trainer's effort in keeping everyone involved during the session?",
  "Improvement in my level of understanding after the training / after the induction",
  "How would you rate the venue",
];


const emojiOptions = [
  { value: 1, emoji: "😞", label: "Poor" },
  { value: 2, emoji: "😐", label: "Average" },
  { value: 3, emoji: "😊", label: "Good" },
];


const EFeedbackScreen = ({ navigation, route }) => {
  const { details } = route?.params || {};
  const [ratings, setRatings] = useState(Array(12).fill(null));
  const [likedAspects, setLikedAspects] = useState("");
  const [improvementSuggestions, setImprovementSuggestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState({});


  const animatedValues = ratings.map(() => emojiOptions.map(() => new Animated.Value(1)));


  const animateScale = (qIndex, eIndex) => {
    Animated.sequence([
      Animated.timing(animatedValues[qIndex][eIndex], { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.timing(animatedValues[qIndex][eIndex], { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  };


  useEffect(() => {
    (async () => {
      const sapid = await AsyncStorage.getItem("sapid");
      const name = await AsyncStorage.getItem("name");
      const empID = await AsyncStorage.getItem("employeeID");
      setUserInfo({ sapid, name, empID });
    })();
  }, []);

  useEffect(() => {
    if (!details) {
      Alert.alert("Error", "Course details not found", [
        { text: "Go Back", onPress: () => navigation.goBack() }
      ]);
    }
  }, [details]);


  const setRating = (index, value, eIndex) => {
    const updated = [...ratings];
    updated[index] = value;
    setRatings(updated);
    animateScale(index, eIndex);
  };


  const onSubmit = async () => {
    if (!details?.id) {
      Alert.alert("Error", "Course ID not found");
      return;
    }

    const token = await AsyncStorage.getItem("token");

    const payload = {
      eLearningCourseID: Number(details.id),
      empID: Number(userInfo.empID),
      likedAspects,
      improvementSuggestions,
      ...Object.fromEntries(ratings.map((v, i) => [`q${i + 1}Rating`, v ?? 3]))
    };

    setLoading(true);
    try {
      const resp = await fetch(API_SUBMIT_FEEDBACK, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const json = await resp.json();
      Alert.alert("Success", json.message || "Feedback submitted!");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to submit.");
    }
    setLoading(false);
  };

  if (!details) {
    return (
      <LinearGradient colors={['#4A3B7C', '#2D1B69', '#1a1a2e']} style={{ flex: 1 }}>
        <Header title="Training Feedback" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text allowFontScaling={false} style={{ color: '#fff', fontSize: 16 }}>Loading course details...</Text>
        </View>
      </LinearGradient>
    );
  }


  return (
    <LinearGradient colors={['#4A3B7C', '#2D1B69', '#1a1a2e']} style={{ flex: 1 }}>
      <Header title="Training Feedback" showBackButton onBackPress={() => navigation.goBack()} />


      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.infoBox}>
          <Text allowFontScaling={false} style={styles.infoText}>
            <Text allowFontScaling={false} style={styles.bold}>Course:</Text> {details?.title || "N/A"}
          </Text>
          <Text allowFontScaling={false} style={styles.infoText}>
            <Text allowFontScaling={false} style={styles.bold}>Date:</Text> {
              (details && details.trainingBatches && details.trainingBatches.trainingDate)
                ? new Date(details.trainingBatches.trainingDate).toLocaleString()
                : "N/A"
            }
          </Text>
          <Text allowFontScaling={false} style={styles.infoText}>
            <Text allowFontScaling={false} style={styles.bold}>Trainer:</Text> {
              (details && details.trainingBatches && details.trainingBatches.trainerName)
                ? details.trainingBatches.trainerName
                : "N/A"
            }
          </Text>
          <Text allowFontScaling={false} style={styles.infoText}>
            <Text allowFontScaling={false} style={styles.bold}>Name:</Text> {userInfo?.name || "N/A"}
          </Text>
          <Text allowFontScaling={false} style={styles.infoText}>
            <Text allowFontScaling={false} style={styles.bold}>SAP ID:</Text> {userInfo?.sapid || "N/A"}
          </Text>
          <Text allowFontScaling={false} style={styles.infoText}>
            <Text allowFontScaling={false} style={styles.bold}>Venue:</Text> {
              (details && details.trainingBatches && details.trainingBatches.venueName)
                ? details.trainingBatches.venueName
                : "N/A"
            }
          </Text>
        </View>



        {QUESTIONS.map((q, i) => (
          <View key={i} style={styles.qBlock}>
            <Text allowFontScaling={false} style={styles.qText}>{i + 1}. {q}</Text>


            <View style={styles.emojiRow}>
              {emojiOptions.map((opt, eIndex) => (
                <TouchableWithoutFeedback key={eIndex} onPress={() => setRating(i, opt.value, eIndex)}>
                  <Animated.View style={[
                    styles.emojiBox,
                    ratings[i] === opt.value && styles.selectedBox,
                    { transform: [{ scale: animatedValues[i][eIndex] }] }
                  ]}>
                    <Text allowFontScaling={false} style={styles.emoji}>{opt.emoji}</Text>
                    <Text allowFontScaling={false} style={styles.emojiLabel}>{opt.label}</Text>
                  </Animated.View>
                </TouchableWithoutFeedback>
              ))}
            </View>
          </View>
        ))}


        <Text allowFontScaling={false} style={styles.sectionHeading}>What aspects of the training did you like the most?</Text>
        <TextInput
          placeholder="Write your response..."
          placeholderTextColor="#888"
          style={styles.input}
          multiline
          value={likedAspects}
          onChangeText={setLikedAspects}
        />


        <Text allowFontScaling={false} style={styles.sectionHeading}>What would you like to see improved in this training to make it more useful?</Text>
        <TextInput
          placeholder="Write your suggestions..."
          placeholderTextColor="#888"
          style={styles.input}
          multiline
          value={improvementSuggestions}
          onChangeText={setImprovementSuggestions}
        />


        <TouchableWithoutFeedback onPress={onSubmit} disabled={loading}>
          <LinearGradient colors={['#6B7FD7', '#5A4D8F']} style={styles.submitGrad}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text allowFontScaling={false} style={styles.submitText}>Submit Feedback</Text>}
          </LinearGradient>
        </TouchableWithoutFeedback>


      </ScrollView>
    </LinearGradient>
  );
};


const styles = StyleSheet.create({
  container: { padding: 20 },
  infoBox: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 18 },
  infoText: { color: "#333", marginBottom: 4 },
  bold: { fontWeight: "700" },
  qBlock: { marginBottom: 22 },
  qText: { color: "#fff", fontSize: 15, marginBottom: 12 },
  emojiRow: { flexDirection: "row", justifyContent: "space-between" },


  emojiBox: {
    backgroundColor: "#fff",
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4
  },
  emoji: { fontSize: 30 },
  emojiLabel: { marginTop: 4, fontSize: 12, color: "#333" },
  selectedBox: { backgroundColor: "#d7d9ff" },


  sectionHeading: { color: "#fff", marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 12, marginBottom: 20, minHeight: 70, color: "#000" },


  submitGrad: { padding: 14, borderRadius: 12, alignItems: "center", marginBottom: 25 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" }
});


export default EFeedbackScreen;
