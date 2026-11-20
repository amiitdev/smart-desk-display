import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { clamp } from '@/utils/format';

interface SliderProps {
  value: number; // 0..1
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  /** Left-hand portion of the track (reference uses yellow for both sliders). */
  fillColor?: string;
  trackColor?: string;
  thumbColor?: string;
  height?: number;
  thumbSize?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/** How often JS is told about a drag, in ms. The knob itself moves every frame. */
const EMIT_INTERVAL = 60;

/**
 * Minimal, dependency-free slider that matches the reference artwork (thin
 * rounded track, oversized white knob). Used for the backlight and volume.
 *
 * The knob is driven by an `Animated.Value` that is written straight from the
 * pan handler, so dragging never re-renders React on every touch event — the
 * old version re-rendered the whole dashboard per move, which is what made the
 * sliders feel jumpy and steppy. JS is only notified every [EMIT_INTERVAL] ms
 * (plus on release), which is plenty for the native volume/brightness calls.
 */
export function Slider({
  value,
  onChange,
  onChangeEnd,
  fillColor = '#FDDC2C',
  trackColor = '#0B2A47',
  thumbColor = '#FFFFFF',
  height = 8,
  thumbSize = 26,
  style,
  disabled,
}: SliderProps) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const pageXRef = useRef(0);
  const viewRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const progress = useRef(new Animated.Value(clamp(value, 0, 1))).current;
  const dragging = useRef(false);
  const latest = useRef(clamp(value, 0, 1));
  const lastEmit = useRef(0);

  // Callbacks live in refs so the PanResponder is created exactly once. The old
  // `useMemo([onChange, ...])` rebuilt the responder mid-drag whenever the
  // parent re-rendered, which dropped move events and made the knob stutter.
  const onChangeRef = useRef(onChange);
  const onChangeEndRef = useRef(onChangeEnd);
  const disabledRef = useRef(disabled);
  onChangeRef.current = onChange;
  onChangeEndRef.current = onChangeEnd;
  disabledRef.current = disabled;

  // Follow the prop while the user is not dragging.
  useEffect(() => {
    if (dragging.current) return;
    const next = clamp(value, 0, 1);
    latest.current = next;
    progress.setValue(next);
  }, [value, progress]);

  const emit = useCallback(
    (next: number, force: boolean) => {
      latest.current = next;
      progress.setValue(next);
      const now = Date.now();
      if (force || now - lastEmit.current >= EMIT_INTERVAL) {
        lastEmit.current = now;
        onChangeRef.current(next);
      }
    },
    [progress],
  );

  const valueAt = useCallback(
    (pageX?: number, locationX?: number) => {
      const trackWidth = widthRef.current;
      if (trackWidth <= 0) return latest.current;
      const x = pageX != null && pageX > 0 ? pageX - pageXRef.current : (locationX ?? 0);
      return clamp(x / trackWidth, 0, 1);
    },
    [],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabledRef.current,
      onMoveShouldSetPanResponder: () => !disabledRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        dragging.current = true;
        // Re-measure on grab so the slider still tracks correctly after the
        // page has been scrolled.
        viewRef.current?.measureInWindow((x: number) => {
          pageXRef.current = x;
        });
        emit(valueAt(event.nativeEvent.pageX, event.nativeEvent.locationX), true);
      },
      onPanResponderMove: (event) => {
        emit(valueAt(event.nativeEvent.pageX, event.nativeEvent.locationX), false);
      },
      onPanResponderRelease: (event) => {
        const next = valueAt(event.nativeEvent.pageX, event.nativeEvent.locationX);
        dragging.current = false;
        emit(next, true);
        onChangeEndRef.current?.(next);
      },
      onPanResponderTerminate: () => {
        dragging.current = false;
        onChangeEndRef.current?.(latest.current);
      },
    }),
  ).current;

  const onLayout = useCallback(() => {
    viewRef.current?.measureInWindow((x: number, _y: number, w: number) => {
      pageXRef.current = x;
      if (w > 0 && Math.abs(w - widthRef.current) > 0.5) {
        widthRef.current = w;
        setWidth(w);
      }
    });
  }, []);

  const thumbTravel = Math.max(0, width - thumbSize);
  const thumbLeft = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, thumbTravel],
      }),
    [progress, thumbTravel],
  );
  const fillWidth = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.max(0, width)],
      }),
    [progress, width],
  );

  return (
    <View
      ref={viewRef}
      style={[styles.container, { height: Math.max(thumbSize, 34) }, style]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(value, 0, 1) * 100) }}
    >
      <View pointerEvents="none" style={[styles.track, { height, backgroundColor: trackColor }]} />
      <Animated.View
        pointerEvents="none"
        style={[styles.fill, { height, width: fillWidth, backgroundColor: fillColor }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: thumbColor,
            transform: [{ translateX: thumbLeft }],
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    width: '100%',
  },
  track: {
    width: '100%',
    borderRadius: 999,
  },
  fill: {
    position: 'absolute',
    borderRadius: 999,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
  },
});
