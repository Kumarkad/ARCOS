import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND_LIST, getModelsForBrand } from '../../utils/vehicleData';

interface BrandModelPickerProps {
  selectedBrand: string;
  selectedModel: string;
  onSelectBrand: (brand: string) => void;
  onSelectModel: (model: string) => void;
}

export const BrandModelPicker: React.FC<BrandModelPickerProps> = ({
  selectedBrand,
  selectedModel,
  onSelectBrand,
  onSelectModel,
}) => {
  const [brandModalVisible, setBrandModalVisible] = useState(false);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  const filteredBrands = BRAND_LIST.filter((b) =>
    b.toLowerCase().includes(brandSearch.toLowerCase().trim())
  );

  const currentModels = selectedBrand ? getModelsForBrand(selectedBrand) : [];
  const filteredModels = currentModels.filter((m) =>
    m.toLowerCase().includes(modelSearch.toLowerCase().trim())
  );

  const handleBrandPick = (brand: string) => {
    onSelectBrand(brand);
    setBrandModalVisible(false);
    setBrandSearch('');
    // Auto pick the first model if available
    const models = getModelsForBrand(brand);
    if (models.length > 0) {
      onSelectModel(models[0]);
    }
  };

  const handleModelPick = (model: string) => {
    onSelectModel(model);
    setModelModalVisible(false);
    setModelSearch('');
  };

  return (
    <View className="mb-3">
      <View className="flex-row gap-2">
        {/* Brand Dropdown Button */}
        <View className="flex-1">
          <Text className="text-textSecondary text-xs mb-1 font-medium">Brand (Make) *</Text>
          <TouchableOpacity
            onPress={() => setBrandModalVisible(true)}
            className="bg-background border border-border rounded-xl px-3 py-2.5 flex-row justify-between items-center"
            activeOpacity={0.7}
          >
            <Text className={`text-sm ${selectedBrand ? 'text-text font-semibold' : 'text-muted'}`} numberOfLines={1}>
              {selectedBrand || 'Select Brand'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Model Dropdown Button */}
        <View className="flex-1">
          <Text className="text-textSecondary text-xs mb-1 font-medium">Model *</Text>
          <TouchableOpacity
            onPress={() => {
              if (!selectedBrand) {
                setBrandModalVisible(true);
              } else {
                setModelModalVisible(true);
              }
            }}
            className="bg-background border border-border rounded-xl px-3 py-2.5 flex-row justify-between items-center"
            activeOpacity={0.7}
          >
            <Text className={`text-sm ${selectedModel ? 'text-text font-semibold' : 'text-muted'}`} numberOfLines={1}>
              {selectedModel || (selectedBrand ? 'Select Model' : 'Pick Brand first')}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Brand Selection Modal */}
      <Modal visible={brandModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="car-sport" size={20} color="#6C63FF" />
                <Text className="text-lg font-bold text-text">Select Vehicle Brand</Text>
              </View>
              <TouchableOpacity onPress={() => setBrandModalVisible(false)}>
                <Ionicons name="close" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View className="bg-background border border-border rounded-xl px-3 py-2 flex-row items-center gap-2 mb-3">
              <Ionicons name="search" size={16} color="#64748b" />
              <TextInput
                value={brandSearch}
                onChangeText={setBrandSearch}
                placeholder="Search brand (e.g. Royal Enfield, Honda)..."
                placeholderTextColor="#64748b"
                className="flex-1 text-text text-sm"
                autoFocus
              />
              {brandSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBrandSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredBrands}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item === selectedBrand;
                return (
                  <TouchableOpacity
                    onPress={() => handleBrandPick(item)}
                    className={`py-3 px-4 rounded-xl mb-1.5 flex-row justify-between items-center ${
                      isSelected ? 'bg-primary/20 border border-primary/50' : 'bg-background/40 border border-border/40'
                    }`}
                  >
                    <Text className={`text-sm ${isSelected ? 'text-primary font-bold' : 'text-text'}`}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#6C63FF" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Model Selection Modal */}
      <Modal visible={modelModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="speedometer" size={20} color="#6C63FF" />
                <Text className="text-lg font-bold text-text">
                  Select {selectedBrand} Model
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModelModalVisible(false)}>
                <Ionicons name="close" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View className="bg-background border border-border rounded-xl px-3 py-2 flex-row items-center gap-2 mb-3">
              <Ionicons name="search" size={16} color="#64748b" />
              <TextInput
                value={modelSearch}
                onChangeText={setModelSearch}
                placeholder={`Search ${selectedBrand} models...`}
                placeholderTextColor="#64748b"
                className="flex-1 text-text text-sm"
                autoFocus
              />
              {modelSearch.length > 0 && (
                <TouchableOpacity onPress={() => setModelSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredModels}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item === selectedModel;
                return (
                  <TouchableOpacity
                    onPress={() => handleModelPick(item)}
                    className={`py-3 px-4 rounded-xl mb-1.5 flex-row justify-between items-center ${
                      isSelected ? 'bg-primary/20 border border-primary/50' : 'bg-background/40 border border-border/40'
                    }`}
                  >
                    <Text className={`text-sm ${isSelected ? 'text-primary font-bold' : 'text-text'}`}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#6C63FF" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};
