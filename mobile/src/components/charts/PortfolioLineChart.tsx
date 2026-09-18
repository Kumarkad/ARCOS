import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect, Text as SvgText, G } from 'react-native-svg';
import { COLORS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatting';

interface PortfolioLineChartProps {
  currentValue?: number;
  investedValue?: number;
  unrealizedPnl?: number;
  gainPercent?: number;
}

export const PortfolioLineChart: React.FC<PortfolioLineChartProps> = ({
  currentValue = 0,
  investedValue = 0,
  unrealizedPnl = 0,
  gainPercent = 0,
}) => {
  const [activeHorizon, setActiveHorizon] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');

  const hasValue = currentValue > 0;
  const isPositive = unrealizedPnl >= 0;

  // Path coordinates
  const pathD = hasValue
    ? isPositive
      ? 'M0,120 C40,110 80,95 120,90 C160,70 200,60 240,40 C280,35 300,20 320,15'
      : 'M0,40 C40,50 80,65 120,80 C160,95 200,105 240,115 C280,120 300,125 320,125'
    : 'M0,120 L320,120';

  const areaD = `${pathD} L320,130 L0,130 Z`;
  const nodeY = hasValue ? (isPositive ? 15 : 125) : 120;
  const strokeColor = hasValue ? (isPositive ? '#10B981' : '#EF4444') : '#334155';
  const gradColor = hasValue ? (isPositive ? '#10B981' : '#EF4444') : '#334155';

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
          <View
            className={`px-2.5 py-1 rounded-full border ${
              hasValue
                ? isPositive
                  ? 'bg-emerald-500/20 border-emerald-500/30'
                  : 'bg-red-500/20 border-red-500/30'
                : 'bg-elevated border-border'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                hasValue
                  ? isPositive
                    ? 'text-success'
                    : 'text-danger'
                  : 'text-textSecondary'
              }`}
            >
              {isPositive && hasValue ? '+' : ''}₹{Math.abs(unrealizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%)
            </Text>
          </View>
          <Text className="text-textSecondary text-[10px] mt-1">Total Unrealized P&L</Text>
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
              <Stop offset="0%" stopColor={gradColor} stopOpacity={hasValue ? 0.35 : 0.05} />
              <Stop offset="100%" stopColor={gradColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <Line x1="0" y1="20" x2="320" y2="20" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />
          <Line x1="0" y1="60" x2="320" y2="60" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />
          <Line x1="0" y1="100" x2="320" y2="100" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />

          {/* Area Fill */}
          <Path d={areaD} fill="url(#portfolioAreaGrad)" />

          {/* Portfolio Main Line */}
          <Path
            d={pathD}
            stroke={strokeColor}
            strokeWidth={hasValue ? '3.5' : '2'}
            strokeLinecap="round"
            fill="none"
          />

          {hasValue ? (
            <>
              {/* Node */}
              <Circle cx="320" cy={nodeY} r="5" fill={strokeColor} stroke="#ffffff" strokeWidth="2" />

              {/* Callout Badge */}
              <G transform={`translate(200, ${Math.max(4, nodeY - 10)})`}>
                <Rect width="115" height="20" rx="6" fill="#064e3b" stroke={strokeColor} strokeWidth="1" />
                <SvgText x="57" y="14" fill="#a7f3d0" fontSize="9" fontWeight="bold" textAnchor="middle">
                  Valuation: {formatCurrency(currentValue)}
                </SvgText>
              </G>
            </>
          ) : (
            <SvgText x="160" y="75" fill="#64748b" fontSize="11" fontWeight="500" textAnchor="middle">
              No active holdings in portfolio
            </SvgText>
          )}
        </Svg>
      </View>

      {/* Dynamic Summary Footer */}
      <View className="flex-row items-center justify-around pt-2 border-t border-border">
        <View className="flex-row items-center space-x-1.5">
          <View className="w-2.5 h-1 rounded mr-1.5" style={{ backgroundColor: strokeColor }} />
          <Text className="text-textSecondary text-xs">
            Current: <Text className="text-text font-bold">{formatCurrency(currentValue)}</Text>
          </Text>
        </View>
        <View className="flex-row items-center space-x-1.5">
          <View className="w-2.5 h-1 rounded bg-muted mr-1.5" />
          <Text className="text-textSecondary text-xs">
            Invested: <Text className="text-text font-bold">{formatCurrency(investedValue)}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};
