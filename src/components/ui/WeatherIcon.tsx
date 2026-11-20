import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';

import type { WeatherDescriptor } from '@/services/weather';

interface WeatherIconProps {
  icon: WeatherDescriptor['icon'];
  size?: number;
  color?: string;
  accentColor?: string;
  /** Line-only rendering, matching the reference fog glyph. */
  strokeWidth?: number;
}

/**
 * Hand-drawn WMO weather glyphs. The reference artwork uses a minimal line
 * style (fog = stacked lines), so everything is strokes on purpose.
 */
export function WeatherIcon({
  icon,
  size = 48,
  color = '#04243D',
  accentColor = '#0D7FB5',
  strokeWidth = 3,
}: WeatherIconProps) {
  const box = 64;
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, fill: 'none' as const };

  const content = (() => {
    switch (icon) {
      case 'clear':
        return (
          <G>
            <Circle cx={32} cy={32} r={12} {...common} fill="none" />
            {Array.from({ length: 8 }).map((_, index) => {
              const angle = (index * Math.PI) / 4;
              const x1 = 32 + Math.cos(angle) * 18;
              const y1 = 32 + Math.sin(angle) * 18;
              const x2 = 32 + Math.cos(angle) * 24;
              const y2 = 32 + Math.sin(angle) * 24;
              return <Line key={index} x1={x1} y1={y1} x2={x2} y2={y2} {...common} />;
            })}
          </G>
        );
      case 'partly':
        return (
          <G>
            <Circle cx={24} cy={24} r={9} {...common} />
            <Path d="M20 46h24a9 9 0 0 0 0-18 13 13 0 0 0-24 4 7 7 0 0 0 0 14z" {...common} />
          </G>
        );
      case 'cloudy':
        return <Path d="M14 46h34a10 10 0 0 0 1-20 15 15 0 0 0-27 3 9 9 0 0 0-8 17z" {...common} />;
      case 'fog':
        return (
          <G>
            <Line x1={12} y1={22} x2={46} y2={22} {...common} strokeWidth={strokeWidth + 1} />
            <Line x1={18} y1={30} x2={44} y2={30} {...common} />
            <Line x1={10} y1={38} x2={40} y2={38} {...common} />
            <Line x1={20} y1={46} x2={48} y2={46} {...common} />
          </G>
        );
      case 'drizzle':
      case 'rain':
        return (
          <G>
            <Path d="M14 36h34a10 10 0 0 0 1-20 15 15 0 0 0-27 3 9 9 0 0 0-8 17z" {...common} />
            {[20, 32, 44].map((x, index) => (
              <Line key={index} x1={x} y1={44} x2={x - 3} y2={52} {...common} strokeWidth={strokeWidth - 0.5} />
            ))}
          </G>
        );
      case 'snow':
        return (
          <G>
            <Path d="M14 34h34a10 10 0 0 0 1-20 15 15 0 0 0-27 3 9 9 0 0 0-8 17z" {...common} />
            {[22, 34, 46].map((x, index) => (
              <Circle key={index} cx={x} cy={48} r={2.4} fill={color} stroke="none" />
            ))}
          </G>
        );
      case 'sleet':
        return (
          <G>
            <Path d="M14 34h34a10 10 0 0 0 1-20 15 15 0 0 0-27 3 9 9 0 0 0-8 17z" {...common} />
            <Line x1={22} y1={44} x2={22} y2={52} {...common} />
            <Circle cx={34} cy={48} r={2.4} fill={color} stroke="none" />
            <Line x1={46} y1={44} x2={46} y2={52} {...common} />
          </G>
        );
      case 'thunder':
        return (
          <G>
            <Path d="M14 34h34a10 10 0 0 0 1-20 15 15 0 0 0-27 3 9 9 0 0 0-8 17z" {...common} />
            <Path d="M34 36l-8 12h7l-3 10 12-14h-8l3-8z" fill={accentColor} stroke="none" />
          </G>
        );
      default:
        return <Path d="M14 46h34a10 10 0 0 0 1-20 15 15 0 0 0-27 3 9 9 0 0 0-8 17z" {...common} />;
    }
  })();

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${box} ${box}`}>
        {content}
      </Svg>
    </View>
  );
}
