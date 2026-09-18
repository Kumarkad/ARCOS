import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { formatINR } from '../../utils/formatting';

interface ExtractedExpense {
  amount: number;
  category: string;
  paymentMethod: string;
  date: string;
  description?: string;
}

interface SafetyConfirmationCardProps {
  data: ExtractedExpense;
  onConfirm?: () => void;
  onEdit?: () => void;
}

export const SafetyConfirmationCard: React.FC<SafetyConfirmationCardProps> = ({
  data,
  onConfirm,
  onEdit,
}) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    if (onConfirm) onConfirm();
  };

  return (
    <View className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-3 my-2 shadow-md">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-indigo-500/20 pb-2">
        <Text className="font-bold text-indigo-300 text-xs flex-row items-center">
          📋 AI Extracted Transaction
        </Text>
        <View
          className={`px-1.5 py-0.5 rounded border ${
            confirmed
              ? 'bg-emerald-500/20 border-emerald-500/30'
              : 'bg-amber-500/20 border-amber-500/30'
          }`}
        >
          <Text
            className={`text-[10px] font-semibold ${
              confirmed ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {confirmed ? 'Logged to Database' : 'Needs Confirmation'}
          </Text>
        </View>
      </View>

      {/* Grid details */}
      <View className="flex-row flex-wrap justify-between gap-2 text-xs">
        <View className="w-[48%]">
          <Text className="text-textSecondary text-[10px]">Amount:</Text>
          <Text className="font-bold text-text text-sm">{formatINR(data.amount)}</Text>
        </View>
        <View className="w-[48%]">
          <Text className="text-textSecondary text-[10px]">Category:</Text>
          <Text className="font-bold text-cyan-400 text-xs">{data.category}</Text>
        </View>
        <View className="w-[48%]">
          <Text className="text-textSecondary text-[10px]">Payment Method:</Text>
          <Text className="font-bold text-primary text-xs">{data.paymentMethod}</Text>
        </View>
        <View className="w-[48%]">
          <Text className="text-textSecondary text-[10px]">Date:</Text>
          <Text className="font-bold text-text text-xs">{data.date}</Text>
        </View>
      </View>

      {/* Actions */}
      <View className="flex-row space-x-2 pt-1">
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={confirmed}
          className={`flex-1 py-2 rounded-xl items-center justify-center ${
            confirmed ? 'bg-slate-800' : 'bg-success'
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={`text-xs font-bold ${
              confirmed ? 'text-emerald-400' : 'text-white'
            }`}
          >
            {confirmed ? '✓ Logged to Database' : '✓ Confirm & Save'}
          </Text>
        </TouchableOpacity>

        {!confirmed && (
          <TouchableOpacity
            onPress={onEdit}
            className="px-4 py-2 rounded-xl bg-card border border-border items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="text-textSecondary text-xs font-semibold">Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
