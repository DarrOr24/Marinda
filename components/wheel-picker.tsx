// components/wheel-picker.tsx
import { Audio } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";

import { Colors } from "@/config/colors";


type WheelItem = { value: string; label: string };

type Props = {
  data: WheelItem[];
  initialIndex: number;
  itemHeight?: number;
  visibleCount?: number;
  onChange: (value: string, index: number) => void;
  style?: StyleProp<ViewStyle>;
  playSound?: boolean;
};

export function WheelPicker({
  data,
  initialIndex,
  itemHeight = 60,
  visibleCount = 5,
  onChange,
  style,
  playSound = true,
}: Props) {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? Colors.dark : Colors.light;

  const listRef = useRef<FlatList<WheelItem>>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(data.length - 1, 0))
  );

  const lastTickRef = useRef(0);
  const lastCenterIndexRef = useRef<number | null>(null);
  const programmaticRef = useRef(false);

  const centerOffset = Math.floor(visibleCount / 2);

  // ───────── SOUND ─────────
  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!playSound) return;
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("@/assets/sounds/camera-shutter-click.wav"),
          { volume: 0.7 }
        );
        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch (e) {
        console.warn("Failed to load wheel tick sound", e);
      }
    })();

    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [playSound]);

  function playTick() {
    if (!playSound) return;

    const now = Date.now();
    if (now - lastTickRef.current < 40) return;
    lastTickRef.current = now;

    const sound = soundRef.current;
    if (!sound) return;

    sound
      .setPositionAsync(0)
      .then(() => sound.playAsync())
      .catch(() => { });
  }

  // ───────── INITIAL CENTERING / RESET ─────────
  useEffect(() => {
    if (!listRef.current || data.length === 0) return;

    const safeIndex = Math.min(
      Math.max(initialIndex, 0),
      data.length - 1
    );
    setCurrentIndex(safeIndex);
    lastCenterIndexRef.current = safeIndex;

    const topIndex = Math.max(safeIndex - centerOffset, 0);
    programmaticRef.current = true;
    listRef.current.scrollToOffset({
      offset: topIndex * itemHeight,
      animated: false,
    });
    // let the first user scroll be treated as real
    setTimeout(() => {
      programmaticRef.current = false;
    }, 0);
  }, [initialIndex, data.length, itemHeight, centerOffset]);

  // ───────── ROULETTE TICKS WHILE SCROLLING ─────────
  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (programmaticRef.current) return;

    const offsetY = e.nativeEvent.contentOffset.y;

    const approxTopIndex = offsetY / itemHeight;
    const topIndex = Math.round(approxTopIndex);

    const centerIndex = topIndex + centerOffset;
    const clampedIndex = Math.min(
      Math.max(centerIndex, 0),
      data.length - 1
    );

    if (lastCenterIndexRef.current === clampedIndex) return;

    lastCenterIndexRef.current = clampedIndex;
    setCurrentIndex(clampedIndex);

    const item = data[clampedIndex];
    if (!item) return;

    playTick();
    onChange(item.value, clampedIndex);
  }

  // ───────── FINAL ALIGNMENT AFTER FINGER LIFT ─────────
  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (programmaticRef.current) return;
    if (data.length === 0) return;

    const offsetY = e.nativeEvent.contentOffset.y;

    const approxTopIndex = offsetY / itemHeight;
    const topIndex = Math.round(approxTopIndex);

    const centerIndex = topIndex + centerOffset;
    const clampedIndex = Math.min(
      Math.max(centerIndex, 0),
      data.length - 1
    );

    const targetTopIndex = Math.max(clampedIndex - centerOffset, 0);
    const targetOffset = targetTopIndex * itemHeight;
    const delta = Math.abs(targetOffset - offsetY);

    // If we're already basically centered, skip snapping
    if (delta < itemHeight * 0.2) {
      return;
    }

    programmaticRef.current = true;
    listRef.current?.scrollToOffset({
      offset: targetOffset,
      animated: true,
    });

    setTimeout(() => {
      programmaticRef.current = false;
    }, 180);
  }

  return (
    <View
      style={[
        {
          height: itemHeight * visibleCount,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) => item.value}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        // No snapToInterval → free, inertial scroll.
        decelerationRate={Platform.OS === "ios" ? 0.995 : 0.99}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumEnd}
        snapToInterval={itemHeight}
        renderItem={({ item, index }) => {
          const distance = Math.abs(index - currentIndex);
          const maxDist = Math.max(centerOffset, 1);
          const isCenter = index === currentIndex;

          // --- Fade (opacity + color) starts from the *second* line outward ---
          const adjustedDistance = Math.max(distance - 1, 0); // 0 for center + first neighbor
          const tFade = Math.min(maxDist > 1 ? adjustedDistance / maxDist : 0, 1);
          const weightFade = Math.exp(-0.6 * tFade * tFade); // 1 at neighbor, ~0.45 at far edge
          const opacity = distance <= 1 ? 1 : 0.6 + 0.4 * weightFade; // 0.6–1.0

          // --- Scale starts from the *first* line outward ---
          const tScale = distance === 0 ? 0 : Math.min(maxDist > 0 ? distance / maxDist : 0, 1);
          const weightScale = Math.exp(-0.6 * tScale * tScale);
          const scale = distance === 0 ? 1 : 0.6 + 0.4 * weightScale;

          return (
            <View
              style={{
                height: itemHeight,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={[
                  styles.textNormal,
                  {
                    opacity,
                    transform: [{ scale }],
                    // neighbors (distance 1) stay default color; falloff starts at distance 2
                    color:
                      distance <= 1
                        ? 'rgba(0,0,0,1)'
                        : `rgba(0,0,0,${weightFade})`,
                  },
                  isCenter && [
                    styles.textSelected,
                    { color: theme.ghostText ?? "#0f172a", opacity: 1, transform: [{ scale: 1 }] },
                  ],
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  textNormal: {
    fontSize: 20,
    fontWeight: "400",
  },
  textSelected: {
    fontSize: 20,
    fontWeight: "600",
  },
});