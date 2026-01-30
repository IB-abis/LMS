import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

export const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const openNotification = async () => {
    setVisible(true);
    setLoading(true);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

    try {
      const employeeID = await AsyncStorage.getItem("employeeID");
      const res = await fetch(
        `https://lms-api-qa.abisaio.com/api/v1/Notification/GetUserNotifications?employeeId=${employeeID}`
      );
      const json = await res.json();

      // Filter only unread notifications (isRead === false)
      if (json?.data) {
        const unreadNotifications = json.data.filter(item => item.isRead === false);
        setNotifications(unreadNotifications);
        setUnreadCount(unreadNotifications.length); // Add this line
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const closeNotification = () => {
    Animated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: true })
      .start(() => setVisible(false));
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = await AsyncStorage.getItem("token");

      await fetch(
        `https://lms-api-qa.abisaio.com/api/v1/Notification/MarkNotificationAsRead?notificationId=${notificationId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Remove the notification from the list after marking as read
      setNotifications(prev => prev.filter(item => item.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const fetchUnreadCount = async () => {
  try {
    const employeeID = await AsyncStorage.getItem("employeeID");
    const res = await fetch(
      `https://lms-api-qa.abisaio.com/api/v1/Notification/GetUserNotifications?employeeId=${employeeID}`
    );
    const json = await res.json();
    if (json?.data) {
      const unreadNotifications = json.data.filter(item => item.isRead === false);
      setUnreadCount(unreadNotifications.length);
    }
  } catch (error) {
    console.error("Error fetching notification count:", error);
  }
};

useEffect(() => {
  // Call immediately on mount
  fetchUnreadCount();

  // Set up interval to call every 5 seconds
  const intervalId = setInterval(() => {
    fetchUnreadCount();
  }, 5000); // 5000ms = 5 seconds

  // Cleanup function to clear interval when component unmounts
  return () => {
    clearInterval(intervalId);
  };
}, []);


  return (
    <NotificationContext.Provider value={{
      openNotification,
      closeNotification,
      markAsRead,
      unreadCount,
      visible,
      notifications,
      loading,
      scaleAnim
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
