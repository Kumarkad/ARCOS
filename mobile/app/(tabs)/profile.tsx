import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { bikeApi } from '../../src/api/bikes';
import { Bike } from '../../src/types/bike';
import { COLORS } from '../../src/utils/constants';
import { BrandModelPicker } from '../../src/components/vehicle/BrandModelPicker';

const POPULAR_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: '$', name: 'Singapore Dollar' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, refreshUser, logout } = useAuthStore();

  // Personal details state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [savingProfile, setSavingProfile] = useState(false);

  // Bike management state
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loadingBikes, setLoadingBikes] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bike Modal state
  const [addBikeModalVisible, setAddBikeModalVisible] = useState(false);
  const [editBikeModalVisible, setEditBikeModalVisible] = useState(false);
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  const [submittingBike, setSubmittingBike] = useState(false);

  // Bike Form fields
  const [bikeName, setBikeName] = useState('');
  const [bikeMake, setBikeMake] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [bikeYear, setBikeYear] = useState('');
  const [bikeRegNum, setBikeRegNum] = useState('');
  const [bikeOdo, setBikeOdo] = useState('');
  const [bikeTankCapacity, setBikeTankCapacity] = useState('');
  const [bikeFuelType, setBikeFuelType] = useState('PETROL');

  // Sync user state when store updates
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setCurrency(user.currency || 'INR');
      setTimezone(user.timezone || 'Asia/Kolkata');
    }
  }, [user]);

  // Load bikes
  const loadBikes = useCallback(async () => {
    try {
      const data = await bikeApi.getBikes();
      setBikes(data || []);
    } catch (err) {
      console.error('Failed to load bikes in profile:', err);
    } finally {
      setLoadingBikes(false);
    }
  }, []);

  useEffect(() => {
    loadBikes();
  }, [loadBikes]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadBikes()]);
    setRefreshing(false);
  };

  // Save personal details
  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name cannot be empty.');
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        currency: currency.trim(),
        timezone: timezone.trim(),
      });
      Alert.alert('Success', 'Personal profile updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Open Add Bike Modal
  const openAddBikeModal = () => {
    setBikeName('');
    setBikeMake('');
    setBikeModel('');
    setBikeYear(new Date().getFullYear().toString());
    setBikeRegNum('');
    setBikeOdo('0');
    setBikeTankCapacity('13');
    setBikeFuelType('PETROL');
    setAddBikeModalVisible(true);
  };

  // Open Edit Bike Modal
  const openEditBikeModal = (bike: Bike) => {
    setSelectedBike(bike);
    setBikeName(bike.name || '');
    setBikeMake(bike.make || '');
    setBikeModel(bike.model || '');
    setBikeYear(bike.year ? String(bike.year) : '');
    setBikeRegNum(bike.registration_number || '');
    setBikeOdo(String(bike.current_odometer || 0));
    setBikeTankCapacity(bike.fuel_tank_capacity ? String(bike.fuel_tank_capacity) : '');
    setBikeFuelType(bike.fuel_type || 'PETROL');
    setEditBikeModalVisible(true);
  };

  // Create new Bike
  const handleCreateBike = async () => {
    const finalMake = bikeMake.trim();
    const finalModel = bikeModel.trim();
    const finalName = bikeName.trim() || `${finalMake} ${finalModel}`;

    if (!finalMake || !finalModel) {
      Alert.alert('Missing Fields', 'Please select Vehicle Brand (Make) and Model.');
      return;
    }

    setSubmittingBike(true);
    try {
      await bikeApi.createBike({
        name: finalName,
        make: finalMake,
        model: finalModel,
        year: bikeYear ? parseInt(bikeYear, 10) : undefined,
        registration_number: bikeRegNum.trim() || undefined,
        initial_odometer: bikeOdo ? parseFloat(bikeOdo) : 0,
        fuel_tank_capacity: bikeTankCapacity ? parseFloat(bikeTankCapacity) : undefined,
        fuel_type: bikeFuelType,
      });

      setAddBikeModalVisible(false);
      await loadBikes();
      Alert.alert('Vehicle Added', `${finalMake} ${finalModel} registered successfully!`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to add vehicle.');
    } finally {
      setSubmittingBike(false);
    }
  };

  // Update existing Bike
  const handleUpdateBike = async () => {
    if (!selectedBike) return;
    const finalMake = bikeMake.trim();
    const finalModel = bikeModel.trim();
    const finalName = bikeName.trim() || `${finalMake} ${finalModel}`;

    if (!finalMake || !finalModel) {
      Alert.alert('Missing Fields', 'Please select Vehicle Brand (Make) and Model.');
      return;
    }

    setSubmittingBike(true);
    try {
      await bikeApi.updateBike(selectedBike.id, {
        name: finalName,
        make: finalMake,
        model: finalModel,
        year: bikeYear ? parseInt(bikeYear, 10) : undefined,
        registration_number: bikeRegNum.trim() || undefined,
        current_odometer: bikeOdo ? parseFloat(bikeOdo) : undefined,
        fuel_tank_capacity: bikeTankCapacity ? parseFloat(bikeTankCapacity) : undefined,
        fuel_type: bikeFuelType,
      });

      setEditBikeModalVisible(false);
      setSelectedBike(null);
      await loadBikes();
      Alert.alert('Updated', 'Vehicle details updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to update vehicle.');
    } finally {
      setSubmittingBike(false);
    }
  };

  // Set bike as primary
  const handleSetPrimary = async (bike: Bike) => {
    try {
      await bikeApi.updateBike(bike.id, { is_primary: true });
      await loadBikes();
      Alert.alert('Primary Vehicle', `${bike.name} is now your primary vehicle.`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to set primary vehicle.');
    }
  };

  // Delete bike
  const handleDeleteBike = (bike: Bike) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${bike.name} (${bike.make} ${bike.model})? All logged fuel and maintenance records for this bike will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bikeApi.deleteBike(bike.id);
              await loadBikes();
              Alert.alert('Deleted', 'Vehicle deleted.');
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete vehicle.');
            }
          },
        },
      ]
    );
  };

  // Logout handler
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      logout();
      return;
    }
    Alert.alert('Logout', 'Are you sure you want to log out of ARCOS?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  // Get user initials
  const initials = (user?.full_name || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Top Header */}
      <View className="px-4 py-3 border-b border-border bg-card flex-row justify-between items-center">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.push('/(tabs)'))}
            className="p-1 -ml-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-text">Profile & Settings</Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center gap-1 bg-danger/10 px-3 py-1.5 rounded-full border border-danger/30"
        >
          <Ionicons name="log-out-outline" size={16} color={COLORS.danger} />
          <Text className="text-danger text-xs font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* User Card */}
        <View className="bg-card p-5 rounded-2xl border border-border mb-5 flex-row items-center gap-4 shadow-sm">
          <View className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary items-center justify-center">
            <Text className="text-primary font-bold text-2xl">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text text-xl font-bold">{user?.full_name || 'User'}</Text>
            <Text className="text-textSecondary text-xs mt-0.5">{user?.email}</Text>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="bg-success/20 px-2 py-0.5 rounded-full border border-success/30">
                <Text className="text-success text-[10px] font-bold tracking-wider">ACTIVE ACCOUNT</Text>
              </View>
              <View className="bg-primary/20 px-2 py-0.5 rounded-full border border-primary/30">
                <Text className="text-primary text-[10px] font-bold tracking-wider">{user?.currency || 'INR'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Personal Details Section */}
        <View className="bg-card p-4 rounded-2xl border border-border mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="person" size={18} color={COLORS.primary} />
              <Text className="text-text font-bold text-base">Personal Details</Text>
            </View>
            <Text className="text-textSecondary text-xs">Editable</Text>
          </View>

          {/* Full Name */}
          <View className="mb-3">
            <Text className="text-textSecondary text-xs mb-1 font-medium">Full Name</Text>
            <TextInput
              className="bg-background text-text p-3 rounded-xl border border-border font-medium"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor="#6b7280"
            />
          </View>

          {/* Email (Read Only) */}
          <View className="mb-3">
            <Text className="text-textSecondary text-xs mb-1 font-medium">Email Address (Registered)</Text>
            <View className="bg-background/50 p-3 rounded-xl border border-border/60 flex-row justify-between items-center">
              <Text className="text-textSecondary font-medium">{user?.email || 'N/A'}</Text>
              <Ionicons name="lock-closed" size={14} color="#6b7280" />
            </View>
          </View>

          {/* Preferred Currency */}
          <View className="mb-3">
            <Text className="text-textSecondary text-xs mb-1 font-medium">Preferred Currency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
              {POPULAR_CURRENCIES.map((c) => {
                const isSelected = currency === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => setCurrency(c.code)}
                    className={`px-3 py-2 rounded-xl border mr-2 flex-row items-center gap-1.5 ${
                      isSelected ? 'bg-primary border-primary' : 'bg-background border-border'
                    }`}
                  >
                    <Text className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-text'}`}>
                      {c.symbol} {c.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Timezone */}
          <View className="mb-4">
            <Text className="text-textSecondary text-xs mb-1 font-medium">Timezone</Text>
            <TextInput
              className="bg-background text-text p-3 rounded-xl border border-border font-medium"
              value={timezone}
              onChangeText={setTimezone}
              placeholder="e.g. Asia/Kolkata"
              placeholderTextColor="#6b7280"
            />
          </View>

          {/* Save Personal Details Button */}
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={savingProfile}
            className="bg-primary py-3 rounded-xl items-center justify-center flex-row gap-2"
          >
            {savingProfile ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text className="text-white font-bold text-sm">Save Personal Details</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bike & Vehicle Management Section */}
        <View className="bg-card p-4 rounded-2xl border border-border mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="bicycle" size={20} color={COLORS.primary} />
              <Text className="text-text font-bold text-base">Vehicle Details</Text>
            </View>
            <TouchableOpacity
              onPress={openAddBikeModal}
              className="bg-primary/20 px-3 py-1.5 rounded-full border border-primary flex-row items-center gap-1"
            >
              <Ionicons name="add" size={14} color={COLORS.primary} />
              <Text className="text-primary text-xs font-bold">Add Vehicle</Text>
            </TouchableOpacity>
          </View>

          {loadingBikes ? (
            <ActivityIndicator size="small" color={COLORS.primary} className="py-6" />
          ) : bikes.length === 0 ? (
            <View className="py-6 items-center px-4 bg-background/50 rounded-xl border border-dashed border-border">
              <Ionicons name="bicycle-outline" size={42} color="#6b7280" />
              <Text className="text-text font-bold text-sm mt-2">No Vehicle Registered Yet</Text>
              <Text className="text-textSecondary text-xs text-center mt-1">
                Add your vehicle (e.g. Honda City, KTM Duke, Hyundai Creta, RE Hunter) to start logging fuel and mileage!
              </Text>
              <TouchableOpacity
                onPress={openAddBikeModal}
                className="mt-3 bg-primary px-4 py-2 rounded-xl flex-row items-center gap-1.5"
              >
                <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
                <Text className="text-white font-bold text-xs">Add Your Vehicle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-3">
              {bikes.map((b) => (
                <View
                  key={b.id}
                  className="p-4 rounded-xl bg-background border border-border"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center gap-2">
                        <Text className="text-text font-bold text-base">{b.name}</Text>
                        {b.is_primary && (
                          <View className="bg-primary/20 px-2 py-0.5 rounded-full border border-primary/40">
                            <Text className="text-primary text-[10px] font-bold">PRIMARY</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-textSecondary text-xs mt-0.5">
                        {b.make} {b.model} {b.year ? `(${b.year})` : ''}
                      </Text>
                    </View>
                    <View className="bg-card px-2.5 py-1 rounded-full border border-border">
                      <Text className="text-textSecondary text-xs font-semibold">{b.fuel_type}</Text>
                    </View>
                  </View>

                  {/* Specs grid */}
                  <View className="grid grid-cols-2 flex-row flex-wrap gap-2 py-2 border-t border-border/40 mt-1">
                    <View className="w-[48%]">
                      <Text className="text-textSecondary text-[10px] uppercase">Reg Number</Text>
                      <Text className="text-text text-xs font-semibold mt-0.5">
                        {b.registration_number || 'Not specified'}
                      </Text>
                    </View>
                    <View className="w-[48%]">
                      <Text className="text-textSecondary text-[10px] uppercase">Current Odometer</Text>
                      <Text className="text-text text-xs font-semibold mt-0.5">
                        {b.current_odometer?.toLocaleString() || 0} km
                      </Text>
                    </View>
                    <View className="w-[48%]">
                      <Text className="text-textSecondary text-[10px] uppercase">Tank Capacity</Text>
                      <Text className="text-text text-xs font-semibold mt-0.5">
                        {b.fuel_tank_capacity ? `${b.fuel_tank_capacity} L` : 'N/A'}
                      </Text>
                    </View>
                    <View className="w-[48%]">
                      <Text className="text-textSecondary text-[10px] uppercase">Initial Odometer</Text>
                      <Text className="text-text text-xs font-semibold mt-0.5">
                        {b.initial_odometer?.toLocaleString() || 0} km
                      </Text>
                    </View>
                  </View>

                  {/* Action row */}
                  <View className="flex-row items-center justify-end gap-2 pt-3 border-t border-border/40 mt-1">
                    {!b.is_primary && (
                      <TouchableOpacity
                        onPress={() => handleSetPrimary(b)}
                        className="px-3 py-1.5 rounded-lg bg-card border border-border flex-row items-center gap-1"
                      >
                        <Ionicons name="star-outline" size={13} color={COLORS.primary} />
                        <Text className="text-primary text-xs font-medium">Make Primary</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => openEditBikeModal(b)}
                      className="px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/40 flex-row items-center gap-1"
                    >
                      <Ionicons name="pencil" size={13} color={COLORS.primary} />
                      <Text className="text-primary text-xs font-medium">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteBike(b)}
                      className="px-2.5 py-1.5 rounded-lg bg-danger/10 border border-danger/30 items-center justify-center"
                    >
                      <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ADD VEHICLE MODAL */}
      <Modal visible={addBikeModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[85%]">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="bicycle" size={22} color={COLORS.primary} />
                <Text className="text-xl font-bold text-text">Add Vehicle</Text>
              </View>
              <TouchableOpacity onPress={() => setAddBikeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Brand & Model Dropdowns */}
              <BrandModelPicker
                selectedBrand={bikeMake}
                selectedModel={bikeModel}
                onSelectBrand={(brand) => {
                  setBikeMake(brand);
                  setBikeName(`${brand} ${bikeModel || ''}`.trim());
                }}
                onSelectModel={(model) => {
                  setBikeModel(model);
                  setBikeName(`${bikeMake || ''} ${model}`.trim());
                }}
              />

              <View className="mb-3">
                <Text className="text-textSecondary text-xs mb-1 font-medium">Vehicle Name (Optional Nickname)</Text>
                <TextInput
                  className="bg-background text-text p-3 rounded-xl border border-border"
                  placeholder="e.g. My Commuter (defaults to Brand Model)"
                  placeholderTextColor="#6b7280"
                  value={bikeName}
                  onChangeText={setBikeName}
                />
              </View>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1 font-medium">Model Year</Text>
                  <TextInput
                    className="bg-background text-text p-3 rounded-xl border border-border"
                    placeholder="e.g. 2024"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={bikeYear}
                    onChangeText={setBikeYear}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1 font-medium">Registration No.</Text>
                  <TextInput
                    className="bg-background text-text p-3 rounded-xl border border-border"
                    placeholder="e.g. MH 02 AB 1234"
                    placeholderTextColor="#6b7280"
                    autoCapitalize="characters"
                    value={bikeRegNum}
                    onChangeText={setBikeRegNum}
                  />
                </View>
              </View>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1 font-medium">Starting Odometer (km)</Text>
                  <TextInput
                    className="bg-background text-text p-3 rounded-xl border border-border"
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={bikeOdo}
                    onChangeText={setBikeOdo}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1 font-medium">Fuel Tank (Liters)</Text>
                  <TextInput
                    className="bg-background text-text p-3 rounded-xl border border-border"
                    placeholder="e.g. 13"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={bikeTankCapacity}
                    onChangeText={setBikeTankCapacity}
                  />
                </View>
              </View>

              <View className="mb-5">
                <Text className="text-textSecondary text-xs mb-1 font-medium">Fuel Type</Text>
                <View className="flex-row gap-2">
                  {['PETROL', 'ELECTRIC', 'DIESEL'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setBikeFuelType(type)}
                      className={`flex-1 py-2.5 rounded-xl border items-center ${
                        bikeFuelType === type ? 'bg-primary border-primary' : 'bg-background border-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          bikeFuelType === type ? 'text-white' : 'text-textSecondary'
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCreateBike}
                disabled={submittingBike}
                className="bg-primary py-3.5 rounded-xl items-center justify-center mb-4 flex-row gap-2"
              >
                {submittingBike ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text className="text-white font-bold text-sm">Save & Register Vehicle</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT VEHICLE MODAL */}
      <Modal visible={editBikeModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[85%]">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="pencil" size={20} color={COLORS.primary} />
                <Text className="text-xl font-bold text-text">Edit Vehicle Details</Text>
              </View>
              <TouchableOpacity onPress={() => setEditBikeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Brand & Model Dropdowns */}
              <BrandModelPicker
                selectedBrand={bikeMake}
                selectedModel={bikeModel}
                onSelectBrand={(brand) => {
                  setBikeMake(brand);
                  setBikeName(`${brand} ${bikeModel || ''}`.trim());
                }}
                onSelectModel={(model) => {
                  setBikeModel(model);
                  setBikeName(`${bikeMake || ''} ${model}`.trim());
                }}
              />

              <View className="mb-3">
                <Text className="text-textSecondary text-xs mb-1 font-medium">Vehicle Name (Optional Nickname)</Text>
                <TextInput
                  className="bg-background text-text p-3 rounded-xl border border-border"
                  placeholder="e.g. My Vehicle (defaults to Brand Model)"
                  placeholderTextColor="#6b7280"
                  value={bikeName}
                  onChangeText={setBikeName}
                />
              </View>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1 font-medium">Model Year</Text>
                  <TextInput
                    className="bg-background text-text p-3 rounded-xl border border-border"
                    placeholder="e.g. 2024"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={bikeYear}
                    onChangeText={setBikeYear}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1 font-medium">Registration No.</Text>
                  <TextInput
                    className="bg-background text-text p-3 rounded-xl border border-border"
                    placeholder="e.g. MH 02 AB 1234"
                    placeholderTextColor="#6b7280"
                    autoCapitalize="characters"
                    value={bikeRegNum}
                    onChangeText={setBikeRegNum}
                  />
                </View>
              </View>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1 font-medium">Current Odometer (km)</Text>
                  <TextInput
                    className="bg-background text-text p-3 rounded-xl border border-border"
                    placeholder="0"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={bikeOdo}
                    onChangeText={setBikeOdo}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1 font-medium">Fuel Tank (Liters)</Text>
                  <TextInput
                    className="bg-background text-text p-3 rounded-xl border border-border"
                    placeholder="e.g. 13"
                    placeholderTextColor="#6b7280"
                    keyboardType="numeric"
                    value={bikeTankCapacity}
                    onChangeText={setBikeTankCapacity}
                  />
                </View>
              </View>

              <View className="mb-5">
                <Text className="text-textSecondary text-xs mb-1 font-medium">Fuel Type</Text>
                <View className="flex-row gap-2">
                  {['PETROL', 'ELECTRIC', 'DIESEL'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setBikeFuelType(type)}
                      className={`flex-1 py-2.5 rounded-xl border items-center ${
                        bikeFuelType === type ? 'bg-primary border-primary' : 'bg-background border-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          bikeFuelType === type ? 'text-white' : 'text-textSecondary'
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleUpdateBike}
                disabled={submittingBike}
                className="bg-primary py-3.5 rounded-xl items-center justify-center mb-4 flex-row gap-2"
              >
                {submittingBike ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                    <Text className="text-white font-bold text-sm">Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
