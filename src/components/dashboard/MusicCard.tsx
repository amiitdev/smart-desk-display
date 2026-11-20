import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BeatEqualizer } from '@/components/dashboard/BeatEqualizer';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Slider } from '@/components/ui/Slider';
import type { MediaAction, MediaInfo } from '@/native/types';
import { colors } from '@/theme';

interface MusicCardProps {
  media: MediaInfo | null;
  volume: number;
  onVolumeChange: (value: number) => void;
  onVolumeCommit: (value: number) => void;
  onControl: (action: MediaAction) => void;
  onRequestAccess: () => void;
  compact?: boolean;
}

export function MusicCard({
  media,
  volume,
  onVolumeChange,
  onVolumeCommit,
  onControl,
  onRequestAccess,
  compact,
}: MusicCardProps) {
  const [muted, setMuted] = useState(false);
  const lastVolume = useRef(volume);

  useEffect(() => {
    if (volume > 0) lastVolume.current = volume;
    if (volume > 0 && muted) setMuted(false);
  }, [volume, muted]);

  const playing = media?.isPlaying ?? false;
  const hasSession = media?.hasSession ?? false;
  const accessMissing = media ? !media.enabled : false;

  const toggleMute = () => {
    if (muted) {
      setMuted(false);
      onVolumeCommit(lastVolume.current || 0.5);
    } else {
      lastVolume.current = volume;
      setMuted(true);
      onVolumeCommit(0);
    }
  };

  return (
    <Card contentStyle={styles.content} style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="music-note" size={compact ? 20 : 24} color={colors.cyan} />
        <Text style={[styles.title, compact && styles.titleCompact]}>Music and Radio</Text>
        <View style={styles.spacer} />
        <MaterialCommunityIcons name="radio" size={compact ? 20 : 24} color={colors.yellow} />
      </View>

      <View style={styles.trackBlock}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {hasSession ? media?.title ?? 'Unknown track' : 'No active media session'}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {hasSession
            ? [media?.artist, media?.appLabel].filter(Boolean).join(' · ') || 'Unknown artist'
            : accessMissing
              ? 'Notification access is required to read media sessions'
              : 'Start playback in Spotify, YouTube Music or VLC'}
        </Text>
      </View>

      <View style={styles.equalizerWrap}>
        <BeatEqualizer
          playing={playing}
          height={compact ? 58 : 92}
          bars={compact ? 26 : 34}
          gap={compact ? 2 : 3}
          inactive={!hasSession}
        />
      </View>

      <View style={styles.controls}>
        <IconButton
          icon={muted ? 'volume-off' : 'speaker'}
          label={muted ? 'MUTED' : 'SPEAKER'}
          size={compact ? 34 : 42}
          onPress={toggleMute}
          flex={1.4}
        />
        <IconButton
          icon="skip-previous"
          size={compact ? 34 : 42}
          onPress={() => onControl('previous')}
          disabled={!hasSession}
          flex={1}
          accessibilityLabel="Previous track"
        />
        <IconButton
          icon={playing ? 'pause' : 'play'}
          size={compact ? 34 : 42}
          onPress={() => onControl('toggle')}
          disabled={!hasSession}
          flex={1}
          accessibilityLabel={playing ? 'Pause' : 'Play'}
        />
        <IconButton
          icon="skip-next"
          size={compact ? 34 : 42}
          onPress={() => onControl('next')}
          disabled={!hasSession}
          flex={1}
          accessibilityLabel="Next track"
        />
      </View>

      <View style={styles.volumeRow}>
        <Text style={styles.volumeLabel} numberOfLines={1}>
          Vol: {Math.round((muted ? 0 : volume) * 100)}%
        </Text>
        <Slider
          value={muted ? 0 : volume}
          onChange={onVolumeChange}
          onChangeEnd={onVolumeCommit}
          thumbSize={compact ? 20 : 24}
          style={styles.volumeSlider}
        />
      </View>

      {accessMissing ? (
        <Pressable onPress={onRequestAccess} style={styles.accessBanner}>
          <MaterialCommunityIcons name="shield-alert-outline" size={14} color={colors.yellow} />
          <Text style={styles.accessText}>Tap to grant media session access</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.borderStrong,
  },
  content: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  titleCompact: {
    fontSize: 15,
  },
  spacer: {
    flex: 1,
  },
  trackBlock: {
    marginTop: -2,
  },
  trackTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  trackArtist: {
    color: colors.textMuted,
    fontSize: 10.5,
  },
  equalizerWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
  },
  controls: {
    flexDirection: 'row',
    gap: 6,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  volumeLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    // Wide enough for "Vol: 100%" at the phone's 1.3x font scale without wrapping.
    minWidth: 74,
    flexShrink: 0,
  },
  volumeSlider: {
    flex: 1,
  },
  accessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(253, 220, 44, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(253, 220, 44, 0.45)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  accessText: {
    color: colors.yellow,
    fontSize: 10.5,
    flex: 1,
  },
});
