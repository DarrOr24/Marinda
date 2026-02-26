// components/getting-started-button.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GettingStartedButton() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 600 }),
        withTiming(0, { duration: 600 })
      ),
      -1,
      true
    );
  }, []);

  const fingerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Pressable
      onPress={() => router.push('/getting-started')}
      style={styles.button}
      hitSlop={8}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.finger, fingerStyle]}>
          <Text style={styles.fingerEmoji}>👆</Text>
        </Animated.View>
        <Text style={styles.label}>Get started</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  finger: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerEmoji: {
    fontSize: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338ca',
  },
});
