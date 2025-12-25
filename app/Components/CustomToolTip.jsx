import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

/**
 * @typedef {Object} Labels
 * @property {string} [previous]
 * @property {string} [next]
 * @property {string} [skip]
 * @property {string} [finish]
 *
 * @typedef {Object} TooltipProps
 * @property {boolean} [isFirstStep]
 * @property {boolean} [isLastStep]
 * @property {() => void} [handleNext]
 * @property {() => void} [handlePrev]
 * @property {() => void} [handleStop]
 * @property {Object} [currentStep]
 * @property {Labels} [labels]
 *
 * @param {TooltipProps} props
 */
const CustomTooltip = ({
    isFirstStep = false,
    isLastStep = false,
    handleNext = () => { },
    handlePrev = () => { },
    handleStop = () => { },
    currentStep = {},
    labels = { previous: 'Back', next: 'Next', skip: 'Skip', finish: 'Got it!' },
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const [anchorCoords, setAnchorCoords] = useState(null);

    useEffect(() => {
        // Pulse animation for step number
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Glow animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(glowAnim, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Try to extract anchor coordinates from the tour step object.
    // Different tour libraries expose different keys, and some setups pass a JSON string in `text`.
    useEffect(() => {
        let step = currentStep || {};

        // If text is a JSON string containing anchor, parse it and merge
        if (step?.text && typeof step.text === 'string') {
            try {
                const parsed = JSON.parse(step.text);
                if (parsed && typeof parsed === 'object') {
                    // Keep original text but expose parsed fields (anchor/text)
                    step = { ...step, ...parsed, text: parsed.text ?? step.text };
                }
            } catch (e) {
                // not JSON, ignore
            }
        }

        // proceed with extracted/parsed step
        step = step;
        let x = null;
        let y = null;

        // Common properties used by different tour libraries
        if (step?.anchor) {
            x = step.anchor.x ?? step.anchor.left ?? step.anchor[0];
            y = step.anchor.y ?? step.anchor.top ?? step.anchor[1];
        }

        if ((x === null || y === null) && step?.position) {
            x = step.position.x ?? step.position.left ?? step.position[0];
            y = step.position.y ?? step.position.top ?? step.position[1];
        }

        if ((x === null || y === null) && step?.x !== undefined && step?.y !== undefined) {
            x = step.x;
            y = step.y;
        }

        // Some libraries provide layout or bounds
        if ((x === null || y === null) && step?.layout) {
            x = step.layout.x ?? step.layout.left;
            y = step.layout.y ?? step.layout.top;
        }

        if ((x === null || y === null) && step?.bounds) {
            x = step.bounds.x ?? step.bounds.left ?? (step.bounds.width ? step.bounds.left + step.bounds.width / 2 : null);
            y = step.bounds.y ?? step.bounds.top ?? (step.bounds.height ? step.bounds.top + step.bounds.height / 2 : null);
        }

        // If we only have center-like values (left/top + width/height), compute center
        if (x !== null && y === null && step?.width && step?.height && step?.left !== undefined && step?.top !== undefined) {
            x = step.left + step.width / 2;
            y = step.top + step.height / 2;
        }

        // Final fallback: if found both, use them
      if (x !== null && y !== null) {
  // Subtract half icon size (40x40 from Header) + header padding adjustment
  y -= 20;  // Half of 40px icon height
  y += 50;  // Compensate Header's paddingTop: 50
  setAnchorCoords({x, y, adjustY: 0});  // Reset adjustY
} else {
            setAnchorCoords(null);
        }
    }, [currentStep]);

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    // Step highlight size
    const insets = useSafeAreaInsets();
    const STEP_SIZE = 60;
    // Global vertical offset (px) to tweak highlight position. Positive moves the circle down.
    // Adjust this value if the circle appears above the icon on some devices.
    const GLOBAL_HIGHLIGHT_OFFSET = 10; // tweak as needed

    const stepCircle = (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient colors={['#7B68EE', '#9D7FEA']} style={styles.stepGradient}>
                <View style={styles.stepInnerCircle}>
                    <Text style={styles.stepNumberText}>{currentStep?.order ?? 1}</Text>
                </View>
            </LinearGradient>
            <Animated.View style={[styles.stepGlowRing, { opacity: glowOpacity }]} />
        </Animated.View>
    );

    return (
        <View style={styles.tooltipContainer} pointerEvents="box-none">
            {/* If anchor coordinates available, render the highlight circle absolutely on screen */}
            {anchorCoords ? (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                    <View style={{
                        position: 'absolute',
                        left: anchorCoords.x - STEP_SIZE / 2,  // Center horizontally
                        top: anchorCoords.y - STEP_SIZE / 2 + (anchorCoords.adjustY ?? currentStep?.adjustY ?? GLOBAL_HIGHLIGHT_OFFSET),  // Center + offset
                        width: STEP_SIZE,
                        height: STEP_SIZE,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    >
                        {stepCircle}
                    </View>
                </View>
            ) : (
                // Fallback: render circle above the tooltip card (existing behavior)
                <View style={styles.stepNumberContainer}>{stepCircle}</View>
            )}

            {/* Modern glassmorphic card */}
            <LinearGradient
                colors={['rgba(123, 104, 238, 0.2)', 'rgba(157, 127, 234, 0.1)']}
                style={styles.tooltipGradient}
            >
                <View style={styles.glassEffect}>
                    {/* Step indicator badge */}
                    <View style={styles.stepBadge}>
                        <LinearGradient colors={['#7B68EE', '#9D7FEA']} style={styles.badgeGradient}>
                            <Ionicons name="bulb" size={14} color="#fff" />
                            <Text style={styles.stepText}>Step {currentStep?.order ?? 1}</Text>
                        </LinearGradient>
                    </View>

                    {/* Tooltip content */}
                    <Text style={styles.tooltipText}>
                        {currentStep?.text || 'Welcome to the tutorial!'}
                    </Text>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Action buttons */}
                    <View style={styles.buttonContainer}>
                        {!isFirstStep && (
                            <TouchableOpacity style={styles.secondaryButton} onPress={handlePrev}>
                                <Ionicons name="arrow-back" size={18} color="#9D7FEA" />
                                <Text style={styles.secondaryButtonText}>{labels.previous}</Text>
                            </TouchableOpacity>
                        )}

                        {isFirstStep && (
                            <TouchableOpacity style={styles.skipButton} onPress={handleStop}>
                                <Text style={styles.skipButtonText}>{labels.skip}</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.primaryButtonWrapper}
                            onPress={isLastStep ? handleStop : handleNext}
                        >
                            <LinearGradient colors={['#7B68EE', '#9D7FEA']} style={styles.primaryButton}>
                                <Text style={styles.primaryButtonText}>
                                    {isLastStep ? labels.finish : labels.next}
                                </Text>
                                <Ionicons
                                    name={isLastStep ? 'checkmark-circle' : 'arrow-forward'}
                                    size={20}
                                    color="#fff"
                                />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );


};

const styles = StyleSheet.create({
    tooltipContainer: {
        maxWidth: width - 60,
        alignItems: 'center',
        marginTop: 60, // Space for step number circle (increase this to push tooltip down)
        paddingHorizontal: 8, // additional horizontal padding for tooltip positioning
    },
    // Step Number Styles
    stepNumberContainer: {
        position: 'absolute',
        top: -20, // move step number circle down (less negative)
        zIndex: 10,
    },
    stepGradient: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 15,
        shadowColor: '#7B68EE',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
    },
    stepInnerCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    stepNumberText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    stepGlowRing: {
        position: 'absolute',
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: 'rgba(123, 104, 238, 0.5)',
        top: -5,
        left: -5,
    },
    // Tooltip Card Styles
    tooltipGradient: {
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
        overflow: 'hidden',
        elevation: 20,
        shadowColor: '#7B68EE',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        width: '100%',
        marginTop: 10,
    },
    glassEffect: {
        backgroundColor: 'rgba(29, 29, 39, 0.95)',
        padding: 24,
    },
    stepBadge: {
        alignSelf: 'flex-start',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 5,
    },
    badgeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 14,
        gap: 6,
    },
    stepText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    tooltipText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.95)',
        lineHeight: 24,
        marginBottom: 20,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 16,
        backgroundColor: 'rgba(157, 127, 234, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(157, 127, 234, 0.3)',
        gap: 6,
    },
    secondaryButtonText: {
        color: '#9D7FEA',
        fontSize: 15,
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    skipButtonText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        fontWeight: '600',
    },
    primaryButtonWrapper: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#7B68EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        gap: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

export default CustomTooltip;
