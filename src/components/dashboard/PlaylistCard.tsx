import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors } from '@/theme';
import type { MediaHistoryEntry, MediaInfo } from '@/native/types';
import { relativeTime } from '@/utils/format';

interface PlaylistCardProps {
  history: MediaHistoryEntry[];
  current: MediaInfo | null;
  onRequestAccess: () => void;
  onClear: () => void;
  compact?: boolean;
}

export function PlaylistCard({ history, current, onRequestAccess, onClear, compact }: PlaylistCardProps) {
  const visible = history.slice(0, compact ? 5 : 9);

  return (
    <Card contentStyle={styles.content} style={styles.card}>
      <View style={styles.list}>
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="playlist-music" size={28} color={colors.textDim} />
            <Text style={styles.emptyText}>
              {current?.enabled === false
                ? 'Grant notification access to read media sessions.'
                : 'No tracks yet. Play something in Spotify, YouTube Music or VLC.'}
            </Text>
            {current?.enabled === false ? (
              <Pressable onPress={onRequestAccess} style={styles.linkButton}>
                <Text style={styles.linkText}>Enable media access</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          visible.map((entry, index) => {
            const isCurrent =
              !!current?.title &&
              current.title === entry.title &&
              (current.artist ?? '') === (entry.artist ?? '');
            return (
              <View
                key={`${entry.title}-${entry.playedAt}-${index}`}
                style={[styles.row, isCurrent && styles.rowActive]}
              >
                <MaterialCommunityIcons
                  name={isCurrent ? 'play' : 'music-note'}
                  size={12}
                  color={isCurrent ? colors.green : colors.textDim}
                  style={styles.rowIcon}
                />
                <View style={styles.rowText}>
                  <Text
                    style={[styles.rowTitle, isCurrent && styles.rowTitleActive]}
                    numberOfLines={1}
                  >
                    {entry.title}
                  </Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>
                    {entry.artist ?? entry.packageName ?? 'Unknown artist'} · {relativeTime(entry.playedAt)}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel} numberOfLines={1}>
          Recently played · {history.length}
        </Text>
        {history.length > 0 ? (
          <Pressable onPress={onClear} accessibilityLabel="Clear media history" hitSlop={6}>
            <MaterialCommunityIcons name="broom" size={14} color={colors.textDim} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: colors.borderStrong,
  },
  content: {
    padding: 8,
    gap: 6,
  },
  list: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  rowActive: {
    backgroundColor: 'rgba(24, 122, 46, 0.55)',
    borderWidth: 1,
    borderColor: '#2FA24C',
  },
  rowIcon: {
    marginTop: 1,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    color: colors.yellow,
    fontSize: 12.5,
    fontWeight: '700',
  },
  rowTitleActive: {
    color: '#C9FFD2',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 10.5,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 11.5,
    textAlign: 'center',
  },
  linkButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cyan,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  linkText: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: 4,
  },
  footerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontWeight: '700',
    flexShrink: 1,
  },
});
