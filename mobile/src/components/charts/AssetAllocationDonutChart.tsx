import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface AssetItem {
  label: string;
  sublabel: string;
  percentage: number;
  amountFormatted: string;
  color: string;
}

const DEFAULT_ASSETS: AssetItem[] = [
  {
    label: 'Equity Stocks',
    sublabel: '14 Direct Stocks',
    percentage: 55.0,
    amountFormatted: '₹ 3.19L',
    color: '#6C63FF',
  },
  {
    label: 'Mutual Funds',
    sublabel: '4 Active SIPs',
    percentage: 30.0,
    amountFormatted: '₹ 1.74L',
    color: '#A855F7',
  },
  {
    label: 'ETFs & Gold',
    sublabel: 'NiftyBeES / Gold',
    percentage: 15.0,
    amountFormatted: '₹ 0.87L',
    color: '#00F2FE',
  },
];

export const AssetAllocationDonutChart: React.FC = () => {
  const circumference = 238.76;
  let cumulativeOffset = 0;

  return (
    <View className="bg-card p-4 rounded-2xl border border-border mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <View>
          <Text className="text-textSecondary text-[10px] uppercase font-bold tracking-wider">
            Asset Distribution
          </Text>
          <Text className="text-text text-sm font-bold mt-0.5">Investment Asset Allocation</Text>
        </View>
        <Text className="text-success text-xs font-semibold">3 Asset Classes</Text>
      </View>

      <View className="flex-row items-center justify-between gap-4">
        {/* SVG Donut Chart */}
        <View className="relative w-36 h-36 items-center justify-center">
          <Svg width="144" height="144" viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx="50" cy="50" r="38" stroke="#1e293b" strokeWidth="20" fill="none" />

            {DEFAULT_ASSETS.map((asset, idx) => {
              const strokeDasharray = `${(asset.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativeOffset;
              cumulativeOffset += (asset.percentage / 100) * circumference;

              return (
                <Circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r="38"
                  stroke={asset.color}
                  strokeWidth="20"
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              );
            })}
          </Svg>

          <View className="absolute items-center justify-center">
            <Text className="text-textSecondary text-[9px] uppercase font-bold">Total</Text>
            <Text className="text-text text-xs font-extrabold">₹5.80L</Text>
          </View>
        </View>

        {/* Legend Breakdown */}
        <View className="flex-1 space-y-2">
          {DEFAULT_ASSETS.map((asset, idx) => (
            <View key={idx} className="bg-elevated p-2 rounded-xl border border-border/50 flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2">
                <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: asset.color }} />
                <View>
                  <Text className="text-text font-bold text-xs">{asset.label}</Text>
                  <Text className="text-textSecondary text-[9px]">{asset.sublabel}</Text>
                </View>
              </View>

              <View className="items-end">
                <Text className="text-text font-extrabold text-xs">{asset.percentage}%</Text>
                <Text className="text-textSecondary text-[9px]">{asset.amountFormatted}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};
