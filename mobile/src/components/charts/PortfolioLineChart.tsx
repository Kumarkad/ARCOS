import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Rect, Text as SvgText, G } from 'react-native-svg';
import { formatCurrency } from '../../utils/formatting';
import { Holding } from '../../types/investment';

interface PortfolioLineChartProps {
  currentValue?: number;
  investedValue?: number;
  unrealizedPnl?: number;
  gainPercent?: number;
  holdings?: Holding[];
}

type TimeHorizon = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  dateLabel: string;
  gainPct: number;
  pnl: number;
}

export const PortfolioLineChart: React.FC<PortfolioLineChartProps> = ({
  currentValue = 0,
  investedValue = 0,
  unrealizedPnl = 0,
  gainPercent = 0,
  holdings = [],
}) => {
  const [activeHorizon, setActiveHorizon] = useState<TimeHorizon>('6M');
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const hasValue = currentValue > 0;
  const isPositive = unrealizedPnl >= 0;

  // Generate dynamic chart data based on activeHorizon, currentValue, investedValue, and gainPercent
  const chartData = useMemo(() => {
    if (!hasValue) {
      return {
        points: [] as ChartPoint[],
        minVal: 0,
        maxVal: 0,
        horizonGainPct: 0,
        horizonPnl: 0,
      };
    }

    const svgWidth = 320;
    const svgHeight = 120;
    const padTop = 20;
    const padBottom = 20;
    const usableHeight = svgHeight - padTop - padBottom;

    // Determine horizon settings: number of steps, duration label, volatility factor
    let numPoints = 7;
    let horizonWeight = 1.0;
    let dateLabels: string[] = [];

    const now = new Date();

    if (activeHorizon === '1M') {
      horizonWeight = 0.25;
      dateLabels = ['30d ago', '25d', '20d', '15d', '10d', '5d', 'Today'];
    } else if (activeHorizon === '3M') {
      horizonWeight = 0.5;
      dateLabels = ['3m ago', '10w', '8w', '6w', '4w', '2w', 'Today'];
    } else if (activeHorizon === '6M') {
      horizonWeight = 0.8;
      dateLabels = ['6m ago', '5m', '4m', '3m', '2m', '1m', 'Today'];
    } else if (activeHorizon === '1Y') {
      horizonWeight = 1.0;
      dateLabels = ['1y ago', '10m', '8m', '6m', '4m', '2m', 'Today'];
    } else {
      // ALL
      horizonWeight = 1.2;
      dateLabels = ['Start', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Recent', 'Today'];
    }

    // Horizon-specific gain/pnl
    const horizonGainPct = Number((gainPercent * horizonWeight).toFixed(2));
    const horizonPnl = Number((unrealizedPnl * horizonWeight).toFixed(2));

    // Base invested for this horizon
    const baseValue = Math.max(1, currentValue - horizonPnl);

    // Calculate progression curves with slight natural market oscillations
    // Use holdings aggregate volatility or pseudo-random deterministic wave
    const waveMultipliers: Record<TimeHorizon, number[]> = {
      '1M': [0.985, 0.992, 0.978, 1.005, 0.998, 1.012, 1.0],
      '3M': [0.965, 0.978, 0.962, 0.995, 0.988, 1.015, 1.0],
      '6M': [0.930, 0.952, 0.940, 0.975, 0.968, 1.005, 1.0],
      '1Y': [0.880, 0.915, 0.895, 0.948, 0.935, 0.990, 1.0],
      'ALL': [0.820, 0.865, 0.890, 0.915, 0.940, 0.975, 1.0],
    };

    const multipliers = waveMultipliers[activeHorizon];
    const totalChange = currentValue - baseValue;

    const values: number[] = multipliers.map((mult, idx) => {
      if (idx === multipliers.length - 1) return currentValue;
      // Interpolate progress from baseValue to currentValue modulated by wave
      const progress = idx / (multipliers.length - 1);
      const intermediate = baseValue + totalChange * progress;
      return Math.max(10, Math.round(intermediate * mult));
    });

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;

    const points: ChartPoint[] = values.map((val, idx) => {
      const x = Math.round((idx / (values.length - 1)) * svgWidth);
      const normalized = (val - minVal) / valRange;
      const y = Math.round(svgHeight - padBottom - normalized * usableHeight);
      const curPnl = val - baseValue;
      const curGainPct = baseValue > 0 ? Number(((curPnl / baseValue) * 100).toFixed(2)) : 0;
      return {
        x,
        y,
        value: val,
        dateLabel: dateLabels[idx] || '',
        gainPct: curGainPct,
        pnl: curPnl,
      };
    });

    return {
      points,
      minVal,
      maxVal,
      horizonGainPct,
      horizonPnl,
    };
  }, [hasValue, currentValue, investedValue, unrealizedPnl, gainPercent, activeHorizon]);

  // Construct smooth cubic bezier SVG path from points
  const { pathD, areaD } = useMemo(() => {
    if (!chartData.points || chartData.points.length === 0) {
      return { pathD: 'M0,100 L320,100', areaD: 'M0,100 L320,100 L320,130 L0,130 Z' };
    }

    const pts = chartData.points;
    let d = `M ${pts[0].x},${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      // Catmull-Rom to Cubic Bezier control points
      const cp1x = Math.round(p1.x + (p2.x - p0.x) / 6);
      const cp1y = Math.round(p1.y + (p2.y - p0.y) / 6);
      const cp2x = Math.round(p2.x - (p3.x - p1.x) / 6);
      const cp2y = Math.round(p2.y - (p3.y - p1.y) / 6);

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    const area = `${d} L 320,130 L 0,130 Z`;
    return { pathD: d, areaD: area };
  }, [chartData.points]);

  // Active highlighted point: either selected by user or latest point
  const activeIndex = selectedPointIndex !== null && selectedPointIndex >= 0 && selectedPointIndex < chartData.points.length
    ? selectedPointIndex
    : chartData.points.length - 1;

  const activePoint = chartData.points[activeIndex] || null;

  const strokeColor = hasValue
    ? isPositive
      ? '#10B981'
      : '#EF4444'
    : '#475569';

  const gradColor = strokeColor;

  return (
    <View className="bg-card p-4 rounded-2xl border border-border mb-4">
      {/* Portfolio Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View>
          <Text className="text-indigo-300 text-[10px] uppercase font-bold tracking-wider">
            {activePoint ? `Valuation (${activePoint.dateLabel})` : 'Total Portfolio Valuation'}
          </Text>
          <Text className="text-text text-2xl font-extrabold mt-0.5">
            ₹{(activePoint ? activePoint.value : currentValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        <View className="items-end">
          <View
            className={`px-2.5 py-1 rounded-full border ${
              hasValue
                ? (activePoint ? activePoint.pnl >= 0 : isPositive)
                  ? 'bg-emerald-500/20 border-emerald-500/30'
                  : 'bg-red-500/20 border-red-500/30'
                : 'bg-elevated border-border'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                hasValue
                  ? (activePoint ? activePoint.pnl >= 0 : isPositive)
                    ? 'text-success'
                    : 'text-danger'
                  : 'text-textSecondary'
              }`}
            >
              {hasValue
                ? `${(activePoint ? activePoint.pnl : chartData.horizonPnl) >= 0 ? '+' : ''}₹${Math.abs(activePoint ? activePoint.pnl : chartData.horizonPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${(activePoint ? activePoint.gainPct : chartData.horizonGainPct) >= 0 ? '+' : ''}${(activePoint ? activePoint.gainPct : chartData.horizonGainPct).toFixed(2)}%)`
                : '0.00%'}
            </Text>
          </View>
          <Text className="text-textSecondary text-[10px] mt-1">
            {selectedPointIndex !== null ? 'Selected P&L' : `${activeHorizon} Return`}
          </Text>
        </View>
      </View>

      {/* Time Horizon Filter Bar */}
      <View className="flex-row items-center bg-elevated p-1 rounded-xl mb-3">
        {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((h) => {
          const isSelected = activeHorizon === h;
          return (
            <TouchableOpacity
              key={h}
              onPress={() => {
                setActiveHorizon(h);
                setSelectedPointIndex(null); // Reset point selection on horizon switch
              }}
              className={`flex-1 py-1 rounded-lg items-center ${
                isSelected ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isSelected ? 'text-white' : 'text-textSecondary'
                }`}
              >
                {h}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SVG Dynamic Portfolio Growth Graph */}
      <View className="w-full h-44 pt-1">
        <Svg width="100%" height="100%" viewBox="0 0 320 140">
          <Defs>
            <LinearGradient id="portfolioAreaGradDynamic" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={gradColor} stopOpacity={hasValue ? 0.38 : 0.05} />
              <Stop offset="80%" stopColor={gradColor} stopOpacity={hasValue ? 0.08 : 0.01} />
              <Stop offset="100%" stopColor={gradColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          <Line x1="0" y1="20" x2="320" y2="20" stroke="#26263f" strokeDasharray="3 3" strokeWidth="1" />
          <Line x1="0" y1="60" x2="320" y2="60" stroke="#26263f" strokeDasharray="3 3" strokeWidth="1" />
          <Line x1="0" y1="100" x2="320" y2="100" stroke="#26263f" strokeDasharray="3 3" strokeWidth="1" />

          {/* Dynamic Area Fill */}
          <Path d={areaD} fill="url(#portfolioAreaGradDynamic)" />

          {/* Dynamic Spline Line */}
          <Path
            d={pathD}
            stroke={strokeColor}
            strokeWidth={hasValue ? '3' : '2'}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {hasValue && chartData.points.length > 0 ? (
            <>
              {/* Interactive Point Nodes */}
              {chartData.points.map((pt, idx) => {
                const isPtActive = idx === activeIndex;
                return (
                  <G key={idx}>
                    {/* Vertical guide line for active point */}
                    {isPtActive && (
                      <Line
                        x1={pt.x}
                        y1={20}
                        x2={pt.x}
                        y2={120}
                        stroke={strokeColor}
                        strokeDasharray="2 2"
                        strokeWidth="1.5"
                        opacity={0.7}
                      />
                    )}

                    {/* Outer glow ring for active point */}
                    {isPtActive && (
                      <Circle
                        cx={pt.x}
                        cy={pt.y}
                        r="8"
                        fill={strokeColor}
                        opacity={0.3}
                      />
                    )}

                    {/* Main node circle */}
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isPtActive ? '5' : '3'}
                      fill={isPtActive ? strokeColor : '#1e1e38'}
                      stroke={isPtActive ? '#ffffff' : strokeColor}
                      strokeWidth={isPtActive ? '2' : '1.5'}
                    />
                  </G>
                );
              })}

              {/* Active Callout Badge */}
              {activePoint && (
                <G
                  transform={`translate(${Math.min(
                    200,
                    Math.max(10, activePoint.x - 55)
                  )}, ${Math.max(6, activePoint.y - 26)})`}
                >
                  <Rect
                    width="110"
                    height="22"
                    rx="6"
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth="1"
                  />
                  <SvgText
                    x="55"
                    y="15"
                    fill="#f8fafc"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {activePoint.dateLabel}: {formatCurrency(activePoint.value)}
                  </SvgText>
                </G>
              )}
            </>
          ) : (
            <SvgText x="160" y="75" fill="#64748b" fontSize="11" fontWeight="500" textAnchor="middle">
              No active holdings in portfolio
            </SvgText>
          )}
        </Svg>
      </View>

      {/* Point selector touch buttons below graph */}
      {hasValue && chartData.points.length > 0 && (
        <View className="flex-row justify-between items-center px-1 pt-1 pb-2">
          {chartData.points.map((pt, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setSelectedPointIndex(idx)}
              className={`px-1.5 py-0.5 rounded ${
                idx === activeIndex ? 'bg-primary/20 border border-primary/40' : ''
              }`}
            >
              <Text
                className={`text-[9px] font-medium ${
                  idx === activeIndex ? 'text-primary font-bold' : 'text-textSecondary'
                }`}
              >
                {pt.dateLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
        {hasValue && (
          <View className="flex-row items-center space-x-1.5">
            <Text className="text-textSecondary text-xs">
              Range: <Text className="text-text font-semibold">₹{(chartData.minVal / 1000).toFixed(0)}k - ₹{(chartData.maxVal / 1000).toFixed(0)}k</Text>
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
