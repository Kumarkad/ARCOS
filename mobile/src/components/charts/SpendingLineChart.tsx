import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect, Text as SvgText, G } from 'react-native-svg';
import { COLORS } from '../../utils/constants';

interface SpendingLineChartProps {
  totalAmount?: number;
  dailyAverage?: number;
  monthOverMonthPct?: number | null;
  peakAmount?: number;
  dailyData?: { day: string; amount: number }[];
}

export const SpendingLineChart: React.FC<SpendingLineChartProps> = ({
  totalAmount = 0,
  dailyAverage,
  monthOverMonthPct,
  peakAmount,
  dailyData = [],
}) => {
  const [activeTimeframe, setActiveTimeframe] = useState<'1M' | '3M' | '6M'>('1M');

  const displayTotal =
    activeTimeframe === '1M'
      ? totalAmount
      : activeTimeframe === '3M'
      ? totalAmount * 3.1
      : totalAmount * 6.2;

  const currentDayOfMonth = Math.max(1, new Date().getDate());
  const calculatedAvg = dailyAverage ?? (totalAmount > 0 ? Math.round(totalAmount / currentDayOfMonth) : 0);

  // Calculate actual peak
  const computedPeak =
    peakAmount !== undefined
      ? peakAmount
      : dailyData.length > 0
      ? Math.max(...dailyData.map((d) => d.amount))
      : totalAmount;

  // Build SVG path based on actual daily data if available
  const hasData = totalAmount > 0 || dailyData.length > 0;

  // Coordinate calculations
  let pathD = 'M0,120 L320,120';
  let areaD = 'M0,120 L320,120 L320,130 L0,130 Z';
  let peakNode = { x: 160, y: 120 };

  if (hasData && dailyData.length > 1 && computedPeak > 0) {
    const width = 320;
    const height = 100;
    const paddingBottom = 20;
    const paddingTop = 20;

    const points = dailyData.map((item, idx) => {
      const x = (idx / (dailyData.length - 1)) * width;
      const normalizedY = (item.amount / computedPeak) * (height - paddingTop);
      const y = height - normalizedY + paddingBottom;
      return { x, y, amount: item.amount };
    });

    // Find peak point coordinates
    const peakPt = points.reduce((prev, curr) => (curr.amount > prev.amount ? curr : prev), points[0]);
    peakNode = { x: peakPt.x, y: peakPt.y };

    pathD = `M${points[0].x},${points[0].y} ` + points.slice(1).map((p) => `L${p.x},${p.y}`).join(' ');
    areaD = `${pathD} L${width},130 L0,130 Z`;
  } else if (hasData && totalAmount > 0) {
    // Single month data summary curve
    pathD = 'M0,110 C50,105 100,70 160,40 C220,60 270,30 320,35';
    areaD = 'M0,110 C50,105 100,70 160,40 C220,60 270,30 320,35 L320,130 L0,130 Z';
    peakNode = { x: 270, y: 30 };
  }

  const momText =
    monthOverMonthPct !== undefined && monthOverMonthPct !== null
      ? `${monthOverMonthPct >= 0 ? '▲' : '▼'} ${Math.abs(monthOverMonthPct).toFixed(1)}% vs last month`
      : hasData
      ? 'Active spending velocity'
      : 'No prior month data';

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
          <View className={`px-2 py-0.5 rounded-full border ${hasData ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-elevated border-border'}`}>
            <Text className={`text-xs font-bold ${hasData ? 'text-success' : 'text-textSecondary'}`}>
              {momText}
            </Text>
          </View>
          <Text className="text-muted text-[10px] mt-1">
            Avg ₹{calculatedAvg.toLocaleString('en-IN')} / day
          </Text>
        </View>
      </View>

      {/* SVG Line Graph */}
      <View className="w-full h-44 pt-1">
        <Svg width="100%" height="100%" viewBox="0 0 320 140">
          <Defs>
            <LinearGradient id="spendingAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.primary || '#6C63FF'} stopOpacity={hasData ? 0.45 : 0.05} />
              <Stop offset="100%" stopColor={COLORS.primary || '#6C63FF'} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <Line x1="0" y1="20" x2="320" y2="20" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />
          <Line x1="0" y1="60" x2="320" y2="60" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />
          <Line x1="0" y1="100" x2="320" y2="100" stroke="#26263f" strokeDasharray="4 4" strokeWidth="1" />

          {/* Gradient Area Fill */}
          <Path d={areaD} fill="url(#spendingAreaGrad)" />

          {/* Main Curve */}
          <Path
            d={pathD}
            stroke={hasData ? (COLORS.primary || '#6C63FF') : '#334155'}
            strokeWidth={hasData ? '3.5' : '2'}
            strokeLinecap="round"
            fill="none"
          />

          {hasData && computedPeak > 0 ? (
            <>
              {/* Peak Node */}
              <Circle cx={peakNode.x} cy={peakNode.y} r="5" fill="#EF4444" stroke="#ffffff" strokeWidth="2" />

              {/* Peak Badge */}
              <G transform={`translate(${Math.max(10, Math.min(230, peakNode.x - 45))}, ${Math.max(4, peakNode.y - 28)})`}>
                <Rect width="90" height="20" rx="6" fill="#1e1b4b" stroke="#6C63FF" strokeWidth="1" />
                <SvgText x="45" y="14" fill="#a5b4fc" fontSize="9" fontWeight="bold" textAnchor="middle">
                  Peak: ₹{computedPeak.toLocaleString('en-IN')}
                </SvgText>
              </G>
            </>
          ) : (
            <SvgText x="160" y="80" fill="#64748b" fontSize="11" fontWeight="500" textAnchor="middle">
              No daily expenses logged in this period
            </SvgText>
          )}
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
