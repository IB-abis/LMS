import { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width } = Dimensions.get("window");

export const Marquee = ({ text }) => {
  const translateX = useRef(new Animated.Value(width)).current;

  useEffect(() => {
    const loopAnimation = () => {
      translateX.setValue(width);
      Animated.timing(translateX, {
        toValue: -width * 2,
        duration: 15000,
        useNativeDriver: true,
      }).start(() => loopAnimation());
    };

    loopAnimation();
  }, []);

  return (
    <View style={stylesMarquee.container}>
      <Animated.Text
        style={[
          stylesMarquee.text,
          { transform: [{ translateX }] }
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  );
};

const stylesMarquee = StyleSheet.create({
  container: {
    overflow: "hidden",
    width: "100%",
    height: 30,
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
    paddingHorizontal: 20,
  },
});

// Dummy default export — required by Expo Router route scanning
export default function TickerTextPlaceholder() { return null; }