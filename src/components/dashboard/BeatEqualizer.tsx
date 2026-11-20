import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useBeatCapture } from '@/hooks/useBeatCapture';
import { BEAT_BANDS, systemAudioVisualizer, type BeatSource } from '@/native/systemAudioVisualizer';
import { colors } from '@/theme';

interface BeatEqualizerProps {
  playing: boolean;
  bars?: number;
  height?: number;
  gap?: number;
  /** Dims the bars when no media session is active. */
  inactive?: boolean;
}

const IDLE = 0.06;
const STALE_MS = 1_200;

/**
 * Beat meter for the music card.
 *
 * Every bar is `bandValue * seed`, so the 12 real FFT bands (kick, bass, mids,
 * presence) drive contiguous groups of bars while a fixed per-bar seed keeps the
 * silhouette organic. Values are animated with the native driver between the
 * ~20 Hz frames, so the bars move at 60 fps without a React render per frame.
 *
 * When no fresh frame arrives (capture blocked or still starting) the meter
 * falls back to a slow, quiet breathing pulse instead of the old fake beat
 * pattern that never matched the music.
 */
export function BeatEqualizer({
  playing,
  bars = 34,
  height = 86,
  gap = 3,
  inactive,
}: BeatEqualizerProps) {
  const values = useRef(
    Array.from({ length: BEAT_BANDS }, () => new Animated.Value(IDLE)),
  ).current;
  const targets = useRef(new Array<number>(BEAT_BANDS).fill(IDLE));
  const lastFrameAt = useRef(0);
  const source = useBeatCapture(playing);
  const [liveSource, setLiveSource] = useState<BeatSource>('none');

  const seeds = useMemo(
    () => Array.from({ length: 64 }, (_, index) => 0.74 + 0.26 * Math.abs(Math.sin(index * 1.7))),
    [],
  );

  // One multiplication node per bar, built once (rebuilding them per render
  // leaks animated nodes on every parent re-render).
  const scales = useMemo(
    () =>
      Array.from({ length: bars }, (_, index) => {
        const band = Math.min(BEAT_BANDS - 1, Math.floor((index * BEAT_BANDS) / bars));
        return Animated.multiply(values[band], seeds[index % seeds.length]);
      }),
    [bars, values, seeds],
  );

  useEffect(() => {
    setLiveSource(source);
  }, [source]);

  // Real FFT frames: retarget the band values (native driver interpolates).
  useEffect(() => {
    const subscription = systemAudioVisualizer.subscribe((frame) => {
      lastFrameAt.current = Date.now();
      frame.bands.forEach((band, index) => {
        const value = values[index];
        if (!value) return;
        const target = Math.min(1, IDLE + Math.max(band, frame.level * 0.55) * 1.18);
        if (Math.abs(target - targets.current[index]) < 0.015) return;
        targets.current[index] = target;
        Animated.timing(value, {
          toValue: target,
          duration: 85,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    });
    return () => subscription.remove();
  }, [values]);

  // Paused: settle to a flat line. Playing but silent: quiet breathing pulse.
  useEffect(() => {
    if (!playing) {
      lastFrameAt.current = 0;
      values.forEach((value) => {
        Animated.timing(value, {
          toValue: IDLE,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
      targets.current.fill(IDLE);
      return;
    }

    const timer = setInterval(() => {
      if (Date.now() - lastFrameAt.current < STALE_MS) return;
      const now = Date.now();
      values.forEach((value, index) => {
        const target = 0.1 + 0.1 * Math.abs(Math.sin(now / 640 + index * 0.7));
        targets.current[index] = target;
        Animated.timing(value, {
          toValue: target,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }).start();
      });
    }, 520);

    return () => clearInterval(timer);
  }, [playing, values]);

  return (
    <View style={[styles.container, { height, opacity: inactive ? 0.35 : 1 }]}>
      {Array.from({ length: bars }).map((_, index) => (
        // Bars flex to the measured card width, so the meter always spans the
        // full panel instead of a fixed 300 dp block on wide screens.
        <View
          key={index}
          style={[styles.bar, { height, marginRight: index === bars - 1 ? 0 : gap }]}
        >
          <Animated.View
            style={[
              styles.barFill,
              {
                transform: [{ scaleY: scales[index] }],
                transformOrigin: 'bottom',
                opacity: playing ? 1 : 0.55,
              },
            ]}
          >
            <View style={styles.barTop} />
            <View style={styles.barBottom} />
          </Animated.View>
        </View>
      ))}

      {liveSource === 'microphone' ? (
        <Text style={styles.sourceBadge} pointerEvents="none">
          MIC
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  barFill: {
    flex: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barTop: {
    flex: 0.42,
    backgroundColor: '#8FEBFF',
  },
  barBottom: {
    flex: 0.58,
    backgroundColor: colors.blue,
  },
  sourceBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    color: colors.cyanDim,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
