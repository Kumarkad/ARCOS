import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect, Text as SvgText, G } from 'react-native-svg';
import { COLORS } from '../../utils/constants';

interface SpendingLineChartProps {
  totalAmount?: number;
  dataPoints?: number[];
  labels?: string[];
}

export const SpendingLineChart: React.FC<SpendingLineChartProps> = ({
  totalAmount = 34800,
}) => {
  const [activeTimeframe, setActiveTimeframe] = useState<'1M' | '3M' | '6M'>('1M');

  const displayTotal =
    activeTimeframe === '1M'
      ? totalAmount
      : activeTimeframe === '3M'
      ? totalAmount * 3.1
      : totalAmount * 6.2;

  return (
    <View className="bg-card p-4 rounded-2xl border border-border mb-4">
      {/* Chart Header */}
      <View className="flex-row justify-between items-center mb-3">
        <View>
          <Text className="text-textSecondary text-[10px] uppercase font-bold tracking-wider">
            Daily Spending Trend
          </Text>
          <Text className="text-text text-xl font-extrabold mt-0.5">
            ₹{displayTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View className="items-end">
          <View className="bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
            <Text className="text-success text-xs font-bold">▼ 8.4% vs last month</Text>
          </View>
          <Text className="text-muted text-[10px] mt-1">Avg ₹1,160 / day</Text>
        </View>
      </View>

      {/* SVG Line Graph */}
      <View className="w-full h-44 pt-1">
        <Svg width="100%" height="100%" viewBox="0 0 320 140">
          <Defs>
            <LinearGradient id="spendingAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.primary || '#6C63FF'} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={COLORS.primary || '#6C63FF'} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <Line x1="0" y1="20" x2="320" y2="20" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />
          <Line x1="0" y1="60" x2="320" y2="60" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />
          <Line x1="0" y1="100" x2="320" y2="100" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />

          {/* Gradient Area Fill */}
          <Path
            d="M0,110 C30,95 60,115 90,65 C120,80 150,45 180,75 C210,30 240,85 270,40 C290,55 310,25 320,35 L320,130 L0,130 Z"
            fill="url(#spendingAreaGrad)"
          />

          {/* Main Curve */}
          <Path
            d="M0,110 C30,95 60,115 90,65 C120,80 150,45 180,75 C210,30 240,85 270,40 C290,55 310,25 320,35"
            stroke={COLORS.primary || '#6C63FF'}
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Key Data Nodes */}
          <Circle cx="90" cy="65" r="4" fill="#00F2FE" stroke="#090D16" strokeWidth="2" />
          <Circle cx="150" cy="45" r="4" fill="#6C63FF" stroke="#090D16" strokeWidth="2" />
          <Circle cx="210" cy="30" r="5" fill="#EF4444" stroke="#ffffff" strokeWidth="2" />
          <Circle cx="270" cy="40" r="4" fill="#00F2FE" stroke="#090D16" strokeWidth="2" />

          {/* Peak Badge */}
          <G transform="translate(170, 8)">
            <Rect width="78" height="18" rx="5" fill="#1e1b4b" stroke="#6C63FF" strokeWidth="1" />
            <SvgText x="39" y="12" fill="#a5b4fc" fontSize="9" fontWeight="bold" textAnchor="middle">
              Peak: ₹4,200
            </SvgText>
          </G>
        </Svg>
      </View>

      {/* Timeframe Filter Buttons */}
      <View className="flex-row items-center bg-elevated p-1 rounded-xl mt-3">
        {(['1M', '3M', '6M'] as const).map((tf) => (
          <TouchableOpacity
            key={tf}
            onPress={() => setActiveTimeframe(tf)}
            className={`flex-1 py-1.5 rounded-lg items-center ${
              activeTimeframe === tf ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTimeframe === tf ? 'text-white' : 'text-textSecondary'
              }`}
            >
              {tf === '1M' ? 'This Month' : tf === '3M' ? 'Last 3M' : '6 Months'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};
