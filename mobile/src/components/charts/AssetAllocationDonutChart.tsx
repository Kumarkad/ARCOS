import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Holding } from '../../types/investment';
import { formatCurrency } from '../../utils/formatting';

export interface AssetItem {
  label: string;
  sublabel: string;
  percentage: number;
  amount: number;
  amountFormatted: string;
  color: string;
}

interface AssetAllocationDonutChartProps {
  holdings?: Holding[];
  totalValue?: number;
}

const ASSET_TYPE_CONFIG: Record<string, { label: string; color: string; singular: string; plural: string }> = {
  STOCK: { label: 'Equity Stocks', color: '#6C63FF', singular: 'Direct Stock', plural: 'Direct Stocks' },
  MUTUAL_FUND: { label: 'Mutual Funds', color: '#A855F7', singular: 'Active Fund', plural: 'Active Funds' },
  ETF: { label: 'ETFs & Indices', color: '#00F2FE', singular: 'ETF Holding', plural: 'ETF Holdings' },
  SGB: { label: 'Gold & SGB', color: '#F59E0B', singular: 'SGB Tranche', plural: 'SGB Tranches' },
};

export const AssetAllocationDonutChart: React.FC<AssetAllocationDonutChartProps> = ({
  holdings = [],
  totalValue,
}) => {
  const calculatedTotal =
    totalValue !== undefined
      ? totalValue
      : holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);

  // Group holdings by asset type dynamically
  const grouped: Record<string, { count: number; total: number }> = {};
  holdings.forEach((h) => {
    const t = h.asset?.asset_type || 'STOCK';
    if (!grouped[t]) {
      grouped[t] = { count: 0, total: 0 };
    }
    grouped[t].count += 1;
    grouped[t].total += Number(h.current_value || 0);
  });

  const assetList: AssetItem[] = Object.entries(grouped).map(([typeKey, data]) => {
    const config = ASSET_TYPE_CONFIG[typeKey] || {
      label: typeKey,
      color: '#10B981',
      singular: 'Asset',
      plural: 'Assets',
    };
    const pct = calculatedTotal > 0 ? (data.total / calculatedTotal) * 100 : 0;
    return {
      label: config.label,
      sublabel: `${data.count} ${data.count === 1 ? config.singular : config.plural}`,
      percentage: Math.round(pct * 10) / 10,
      amount: data.total,
      amountFormatted: formatCurrency(data.total),
      color: config.color,
    };
  });

  const hasAssets = assetList.length > 0 && calculatedTotal > 0;
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
        <Text className="text-success text-xs font-semibold">
          {assetList.length} {assetList.length === 1 ? 'Asset Class' : 'Asset Classes'}
        </Text>
      </View>

      <View className="flex-row items-center justify-between gap-4">
        {/* SVG Donut Chart */}
        <View className="relative w-36 h-36 items-center justify-center">
          <Svg width="144" height="144" viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
            {/* Base Ring */}
            <Circle cx="50" cy="50" r="38" stroke="#1e293b" strokeWidth="20" fill="none" />

            {hasAssets &&
              assetList.map((asset, idx) => {
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
            <Text className="text-text text-xs font-extrabold" numberOfLines={1}>
              {calculatedTotal >= 100000
                ? `₹${(calculatedTotal / 100000).toFixed(2)}L`
                : calculatedTotal >= 1000
                ? `₹${(calculatedTotal / 1000).toFixed(1)}K`
                : `₹${Math.round(calculatedTotal)}`}
            </Text>
          </View>
        </View>

        {/* Legend Breakdown or Empty State */}
        <View className="flex-1 space-y-2">
          {hasAssets ? (
            assetList.map((asset, idx) => (
              <View
                key={idx}
                className="bg-elevated p-2 rounded-xl border border-border/50 flex-row items-center justify-between mb-1"
              >
                <View className="flex-row items-center space-x-2 flex-1 mr-2">
                  <View className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: asset.color }} />
                  <View className="flex-1">
                    <Text className="text-text font-bold text-xs" numberOfLines={1}>{asset.label}</Text>
                    <Text className="text-textSecondary text-[9px]">{asset.sublabel}</Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className="text-text font-extrabold text-xs">{asset.percentage}%</Text>
                  <Text className="text-textSecondary text-[9px]">{asset.amountFormatted}</Text>
                </View>
              </View>
            ))
          ) : (
            <View className="py-2">
              <Text className="text-textSecondary text-xs font-medium">No assets allocated yet</Text>
              <Text className="text-muted text-[10px] mt-1">
                Add stock or fund holdings to visualize your portfolio distribution.
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};
