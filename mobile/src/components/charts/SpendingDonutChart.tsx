import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export interface CategoryItem {
  name: string;
  percentage: number;
  color: string;
  amount: number;
}

interface SpendingDonutChartProps {
  categories?: CategoryItem[];
  totalAmount?: number;
}

export const SpendingDonutChart: React.FC<SpendingDonutChartProps> = ({
  categories = [],
  totalAmount,
}) => {
  const calculatedTotal =
    totalAmount !== undefined
      ? totalAmount
      : categories.reduce((sum, item) => sum + item.amount, 0);

  const hasCategories = categories.length > 0 && calculatedTotal > 0;

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
        <Text className="text-primary text-xs font-semibold">
          {categories.length} {categories.length === 1 ? 'Category' : 'Categories'}
        </Text>
      </View>

      <View className="flex-row items-center justify-between gap-4">
        {/* SVG Donut Chart */}
        <View className="relative w-36 h-36 items-center justify-center">
          <Svg width="144" height="144" viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
            {/* Background Circle */}
            <Circle cx="50" cy="50" r="38" stroke="#1e293b" strokeWidth="20" fill="none" />

            {hasCategories &&
              categories.map((cat, idx) => {
                const pct = Math.max(0, Math.min(100, cat.percentage));
                const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -cumulativeOffset;
                cumulativeOffset += (pct / 100) * circumference;

                return (
                  <Circle
                    key={idx}
                    cx="50"
                    cy="50"
                    r="38"
                    stroke={cat.color || '#6C63FF'}
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
            <Text className="text-text text-xs font-extrabold" numberOfLines={1}>
              {calculatedTotal >= 100000
                ? `₹${(calculatedTotal / 100000).toFixed(1)}L`
                : calculatedTotal >= 1000
                ? `₹${(calculatedTotal / 1000).toFixed(1)}K`
                : `₹${Math.round(calculatedTotal)}`}
            </Text>
          </View>
        </View>

        {/* Legend List or Empty State */}
        <View className="flex-1 space-y-2">
          {hasCategories ? (
            categories.slice(0, 6).map((cat, idx) => (
              <View key={idx} className="flex-row items-center justify-between my-0.5">
                <View className="flex-row items-center space-x-2 flex-1 mr-2">
                  <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: cat.color || '#6C63FF' }} />
                  <Text className="text-textSecondary text-xs font-medium" numberOfLines={1}>
                    {cat.name}
                  </Text>
                </View>
                <Text className="text-text font-bold text-xs">{Math.round(cat.percentage)}%</Text>
              </View>
            ))
          ) : (
            <View className="py-2">
              <Text className="text-textSecondary text-xs font-medium">No expenses logged yet</Text>
              <Text className="text-muted text-[10px] mt-1">
                Your spending breakdown across categories will show up here.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
