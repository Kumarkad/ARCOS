import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect, Text as SvgText, G } from 'react-native-svg';
import { COLORS } from '../../utils/constants';

interface PortfolioLineChartProps {
  currentValue?: number;
  gainPercent?: number;
}

export const PortfolioLineChart: React.FC<PortfolioLineChartProps> = ({
  currentValue = 580000,
  gainPercent = 12.4,
}) => {
  const [activeHorizon, setActiveHorizon] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');

  return (
    <View className="bg-card p-4 rounded-2xl border border-border mb-4">
      {/* Portfolio Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View>
          <Text className="text-indigo-300 text-[10px] uppercase font-bold tracking-wider">
            Total Portfolio Valuation
          </Text>
          <Text className="text-text text-2xl font-extrabold mt-0.5">
            ₹{currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View className="items-end">
          <View className="bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <Text className="text-success text-xs font-bold">+ ₹72,400 ({gainPercent}%)</Text>
          </View>
          <Text className="text-textSecondary text-[10px] mt-1">Vs benchmark Nifty 50</Text>
        </View>
      </View>

      {/* Time Horizon Filter Bar */}
      <View className="flex-row items-center bg-elevated p-1 rounded-xl mb-3">
        {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((h) => (
          <TouchableOpacity
            key={h}
            onPress={() => setActiveHorizon(h)}
            className={`flex-1 py-1 rounded-lg items-center ${
              activeHorizon === h ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeHorizon === h ? 'text-white' : 'text-textSecondary'
              }`}
            >
              {h}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SVG Portfolio Growth Graph */}
      <View className="w-full h-44 pt-1">
        <Svg width="100%" height="100%" viewBox="0 0 320 140">
          <Defs>
            <LinearGradient id="portfolioAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <Line x1="0" y1="20" x2="320" y2="20" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />
          <Line x1="0" y1="60" x2="320" y2="60" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />
          <Line x1="0" y1="100" x2="320" y2="100" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />

          {/* Area Fill */}
          <Path
            d="M0,120 C40,110 80,90 120,95 C160,70 200,60 240,40 C280,35 300,20 320,15 L320,130 L0,130 Z"
            fill="url(#portfolioAreaGrad)"
          />

          {/* Portfolio Main Line (Green) */}
          <Path
            d="M0,120 C40,110 80,90 120,95 C160,70 200,60 240,40 C280,35 300,20 320,15"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Benchmark Line (Nifty 50 Dashed) */}
          <Path
            d="M0,125 C40,118 80,105 120,100 C160,85 200,80 240,65 C280,60 300,50 320,45"
            stroke="#64748b"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Nodes */}
          <Circle cx="320" cy="15" r="5" fill="#10B981" stroke="#ffffff" strokeWidth="2" />
          <Circle cx="240" cy="40" r="4" fill="#00F2FE" stroke="#090D16" strokeWidth="2" />

          {/* Callout Badge */}
          <G transform="translate(220, 4)">
            <Rect width="95" height="20" rx="6" fill="#064e3b" stroke="#10B981" strokeWidth="1" />
            <SvgText x="47" y="13" fill="#a7f3d0" fontSize="9" fontWeight="bold" textAnchor="middle">
              Valuation: ₹5.80L
            </SvgText>
          </G>
        </Svg>
      </View>

      {/* Legend Footer */}
      <View className="flex-row items-center justify-around pt-2 border-t border-border">
        <View className="flex-row items-center space-x-1.5">
          <View className="w-2.5 h-1 rounded bg-emerald-400" />
          <Text className="text-textSecondary text-[10px]">Your Portfolio (+12.4%)</Text>
        </View>
        <View className="flex-row items-center space-x-1.5">
          <View className="w-2.5 h-0.5 rounded bg-muted border border-dashed" />
          <Text className="text-textSecondary text-[10px]">Nifty 50 (+8.1%)</Text>
        </View>
      </View>
    </View>
  );
};
