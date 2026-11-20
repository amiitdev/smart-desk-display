import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { WeatherIcon } from '@/components/ui/WeatherIcon';
import { colors } from '@/theme';
import { describeWeatherCode, formatTemperature } from '@/services/weather';
import type { WeatherSnapshot } from '@/native/types';
import { formatShortDate, relativeTime } from '@/utils/format';

interface WeatherCardProps {
  weather: WeatherSnapshot | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  unit: 'c' | 'f';
  onRefresh: () => void;
  onPickLocation: () => void;
  compact?: boolean;
}

export function WeatherCard({
  weather,
  status,
  error,
  unit,
  onRefresh,
  onPickLocation,
  compact,
}: WeatherCardProps) {
  const descriptor = weather ? describeWeatherCode(weather.code, weather.isDay) : null;

  if (!weather) {
    return (
      <Card tone="weather" contentStyle={[styles.content, styles.empty]}>
        <MaterialCommunityIcons name="weather-cloudy-alert" size={compact ? 30 : 42} color={colors.weatherInk} />
        <Text style={styles.emptyTitle}>{status === 'loading' ? 'Loading weather…' : 'No weather yet'}</Text>
        <Text style={styles.emptyText} numberOfLines={2}>
          {error ?? 'Pick a location to pull live conditions from Open-Meteo.'}
        </Text>
        <Pressable onPress={onPickLocation} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Set location</Text>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card tone="weather" contentStyle={styles.content}>
      <View style={styles.mainRow}>
        <WeatherIcon
          icon={descriptor?.icon ?? 'cloudy'}
          size={compact ? 46 : 60}
          color={colors.weatherInk}
          strokeWidth={3.4}
        />
        <View style={styles.tempColumn}>
          <Text style={[styles.temp, compact && styles.tempCompact]} allowFontScaling={false}>
            {formatTemperature(weather.tempC, unit)}
            <Text style={styles.tempUnit}>{unit === 'c' ? 'C' : 'F'}</Text>
          </Text>
          <Text style={styles.condition} numberOfLines={1}>
            {descriptor?.label ?? 'Weather'}
          </Text>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={12} color="rgba(3,37,59,0.7)" />
            <Text style={styles.location} numberOfLines={1}>
              {weather.locationName}
            </Text>
          </View>
        </View>
        <Pressable onPress={onRefresh} style={styles.refresh} accessibilityLabel="Refresh weather">
          <MaterialCommunityIcons
            name={status === 'loading' ? 'timer-sand' : 'refresh'}
            size={18}
            color={colors.weatherInk}
          />
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <Meta icon="water-percent" label="Humidity" value={`${weather.humidity}%`} />
        <Meta icon="thermometer" label="Feels" value={formatTemperature(weather.feelsLikeC, unit)} />
        <Meta icon="weather-windy" label="Wind" value={`${Math.round(weather.windKph)} km/h`} />
      </View>

      {weather.forecast.length > 0 ? (
        <View style={styles.forecastRow}>
          {weather.forecast.slice(0, compact ? 3 : 5).map((day) => {
            const forecastDescriptor = describeWeatherCode(day.code, true);
            const date = new Date(`${day.date}T12:00:00`);
            return (
              <View key={day.date} style={styles.forecastItem}>
                <Text style={styles.forecastDay} numberOfLines={1}>
                  {formatShortDate(date)}
                </Text>
                <WeatherIcon
                  icon={forecastDescriptor.icon}
                  size={18}
                  color={colors.weatherInk}
                  strokeWidth={4.2}
                />
                <Text style={styles.forecastTemp} numberOfLines={1}>
                  {Math.round(unit === 'f' ? (day.maxC * 9) / 5 + 32 : day.maxC)}°/
                  {Math.round(unit === 'f' ? (day.minC * 9) / 5 + 32 : day.minC)}°
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.footerText} numberOfLines={1}>
          Updated {relativeTime(weather.updatedAt)}
          {error ? ' · offline cache' : ''}
        </Text>
      </View>
    </Card>
  );
}

function Meta({ icon, label, value }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <MaterialCommunityIcons name={icon} size={13} color="rgba(3,37,59,0.72)" />
      <View>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 6,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  emptyTitle: {
    color: colors.weatherInk,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyText: {
    color: 'rgba(3,37,59,0.75)',
    fontSize: 11,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(3,37,59,0.85)',
  },
  emptyButtonText: {
    color: '#C9F0FF',
    fontSize: 11,
    fontWeight: '700',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tempColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  temp: {
    color: colors.weatherInk,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  tempCompact: {
    fontSize: 28,
    lineHeight: 32,
  },
  tempUnit: {
    fontSize: 20,
    fontWeight: '700',
  },
  condition: {
    color: colors.weatherInk,
    fontSize: 16,
    marginTop: -2,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  location: {
    color: 'rgba(3,37,59,0.78)',
    fontSize: 12,
    flexShrink: 1,
  },
  refresh: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignSelf: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaLabel: {
    fontSize: 8.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: 'rgba(3,37,59,0.62)',
    fontWeight: '700',
  },
  metaValue: {
    fontSize: 12,
    color: colors.weatherInk,
    fontWeight: '700',
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 2,
  },
  forecastItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.26)',
    borderRadius: 6,
    paddingVertical: 3,
    gap: 1,
  },
  forecastDay: {
    fontSize: 9,
    color: 'rgba(3,37,59,0.7)',
    fontWeight: '700',
  },
  forecastTemp: {
    fontSize: 10,
    color: colors.weatherInk,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  footerText: {
    fontSize: 9.5,
    color: 'rgba(3,37,59,0.62)',
  },
});
