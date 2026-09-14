import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CategoryItem {
  name: string;
  percentage: number;
  color: string;
  amount: number;
}

interface SpendingDonutChartProps {
  categories?: CategoryItem[];
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { name: 'Food & Dining', percentage: 35.8, color: '#F59E0B', amount: 12450 },
  { name: 'Shopping', percentage: 25.6, color: '#A855F7', amount: 8900 },
  { name: 'Bike & Fuel', percentage: 17.8, color: '#00F2FE', amount: 6200 },
  { name: 'Utilities', percentage: 12.2, color: '#10B981', amount: 4250 },
  { name: 'Misc', percentage: 8.6, color: '#6C63FF', amount: 3000 },
];

export const SpendingDonutChart: React.FC<SpendingDonutChartProps> = ({
  categories = DEFAULT_CATEGORIES,
}) => {
  const totalAmount = categories.reduce((sum, item) => sum + item.amount, 0);

  // Circumference for r=38 is 2 * PI * 38 = 238.76
  const circumference = 238.76;
  let cumulativeOffset = 0;

  return (
    <View className="bg-card p-4 rounded-2xl border border-border mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <View>
          <Text className="text-textSecondary text-[10px] uppercase font-bold tracking-wider">
            Spending Distribution
          </Text>
          <Text className="text-text text-sm font-bold mt-0.5">Category Breakdown</Text>
        </View>
        <Text className="text-primary text-xs font-semibold">{categories.length} Categories</Text>
      </View>

      <View className="flex-row items-center justify-between gap-4">
        {/* SVG Donut Chart */}
        <View className="relative w-36 h-36 items-center justify-center">
          <Svg width="144" height="144" viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx="50" cy="50" r="38" stroke="#1e293b" strokeWidth="20" fill="none" />

            {categories.map((cat, idx) => {
              const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -cumulativeOffset;
              cumulativeOffset += (cat.percentage / 100) * circumference;

              return (
                <Circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r="38"
                  stroke={cat.color}
                  strokeWidth="20"
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
              );
            })}
          </Svg>

          {/* Donut Center Text */}
          <View className="absolute items-center justify-center">
            <Text className="text-textSecondary text-[9px] uppercase font-bold">Total</Text>
            <Text className="text-text text-xs font-extrabold">
              ₹{(totalAmount / 1000).toFixed(1)}K
            </Text>
          </View>
        </View>

        {/* Legend List */}
        <View className="flex-1 space-y-2">
          {categories.map((cat, idx) => (
            <View key={idx} className="flex-row items-center justify-between my-0.5">
              <View className="flex-row items-center space-x-2">
                <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <Text className="text-textSecondary text-xs font-medium">{cat.name}</Text>
              </View>
              <Text className="text-text font-bold text-xs">{cat.percentage}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};
