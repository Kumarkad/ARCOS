import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { bikeApi } from '../../../src/api/bikes';
import { BikeDashboardSummary, Bike } from '../../../src/types/bike';
import { formatCurrency } from '../../../src/utils/formatting';

export default function BikeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<BikeDashboardSummary | null>(null);
  const [allBikes, setAllBikes] = useState<Bike[]>([]);
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fuel' | 'maintenance'>('fuel');

  // Modals state
  const [fuelModalVisible, setFuelModalVisible] = useState(false);
  const [maintModalVisible, setMaintModalVisible] = useState(false);
  const [expModalVisible, setExpModalVisible] = useState(false);
  const [addBikeModalVisible, setAddBikeModalVisible] = useState(false);
  const [editBikeModalVisible, setEditBikeModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Bike Form state (for Add / Edit)
  const [formBikeName, setFormBikeName] = useState('');
  const [formBikeMake, setFormBikeMake] = useState('');
  const [formBikeModel, setFormBikeModel] = useState('');
  const [formBikeYear, setFormBikeYear] = useState('');
  const [formBikeRegNum, setFormBikeRegNum] = useState('');
  const [formBikeOdo, setFormBikeOdo] = useState('');
  const [formBikeTankCapacity, setFormBikeTankCapacity] = useState('');
  const [formBikeFuelType, setFormBikeFuelType] = useState('PETROL');

  // Fuel Form
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelOdo, setFuelOdo] = useState('');
  const [fuelLiters, setFuelLiters] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [fuelStation, setFuelStation] = useState('');

  // Maintenance Form
  const [maintDate, setMaintDate] = useState(new Date().toISOString().split('T')[0]);
  const [maintOdo, setMaintOdo] = useState('');
  const [maintType, setMaintType] = useState('GENERAL_SERVICE');
  const [maintCost, setMaintCost] = useState('');
  const [maintWorkshop, setMaintWorkshop] = useState('');
  const [nextServiceOdo, setNextServiceOdo] = useState('');

  // Expense Form
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expType, setExpType] = useState('INSURANCE');
  const [expAmount, setExpAmount] = useState('');
  const [expNotes, setExpNotes] = useState('');

  const loadDashboard = useCallback(async (targetBikeId?: string) => {
    try {
      const bikes = await bikeApi.getBikes();
      setAllBikes(bikes || []);
      if (bikes && bikes.length > 0) {
        const bikeToLoad = targetBikeId
          ? bikes.find((b) => b.id === targetBikeId) || bikes[0]
          : (selectedBikeId ? bikes.find((b) => b.id === selectedBikeId) : null) ||
            bikes.find((b) => b.is_primary) ||
            bikes[0];

        setSelectedBikeId(bikeToLoad.id);
        const data = await bikeApi.getDashboard(bikeToLoad.id);
        setDashboard(data);
        setFuelOdo(String(data.bike.current_odometer));
        setMaintOdo(String(data.bike.current_odometer));
      } else {
        setDashboard(null);
        setSelectedBikeId(null);
      }
    } catch (err) {
      console.error('Failed to load bike dashboard:', err);
    }
  }, [selectedBikeId]);

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  // Submit Fuel Refill
  const handleSaveFuel = async () => {
    if (!dashboard?.bike.id || !fuelOdo || !fuelLiters || !fuelCost) {
      Alert.alert('Error', 'Please fill odometer, liters, and total cost');
      return;
    }
    setSubmitting(true);
    try {
      await bikeApi.recordFuelLog(dashboard.bike.id, {
        fuel_date: fuelDate,
        odometer_reading: parseFloat(fuelOdo),
        fuel_amount_liters: parseFloat(fuelLiters),
        total_cost: parseFloat(fuelCost),
        is_full_tank: isFullTank,
        fuel_station: fuelStation.trim() || undefined,
      });
      setFuelModalVisible(false);
      setFuelLiters('');
      setFuelCost('');
      setFuelStation('');
      await loadDashboard();
      Alert.alert('Success', 'Fuel refill recorded');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to log fuel');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Maintenance
  const handleSaveMaintenance = async () => {
    if (!dashboard?.bike.id || !maintOdo || !maintCost) {
      Alert.alert('Error', 'Please fill odometer and service cost');
      return;
    }
    setSubmitting(true);
    try {
      await bikeApi.recordMaintenance(dashboard.bike.id, {
        service_date: maintDate,
        odometer_reading: parseFloat(maintOdo),
        service_type: maintType,
        cost: parseFloat(maintCost),
        workshop_name: maintWorkshop.trim() || undefined,
        next_service_odometer: nextServiceOdo ? parseFloat(nextServiceOdo) : undefined,
      });
      setMaintModalVisible(false);
      setMaintCost('');
      setMaintWorkshop('');
      setNextServiceOdo('');
      await loadDashboard();
      Alert.alert('Success', 'Maintenance record saved');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Expense
  const handleSaveExpense = async () => {
    if (!dashboard?.bike.id || !expAmount) {
      Alert.alert('Error', 'Please enter expense amount');
      return;
    }
    setSubmitting(true);
    try {
      await bikeApi.recordExpense(dashboard.bike.id, {
        expense_date: expDate,
        expense_type: expType,
        amount: parseFloat(expAmount),
        notes: expNotes.trim() || undefined,
      });
      setExpModalVisible(false);
      setExpAmount('');
      setExpNotes('');
      await loadDashboard();
      Alert.alert('Success', 'Vehicle expense logged');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to log expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAddBike = () => {
    setFormBikeName('');
    setFormBikeMake('');
    setFormBikeModel('');
    setFormBikeYear(new Date().getFullYear().toString());
    setFormBikeRegNum('');
    setFormBikeOdo('0');
    setFormBikeTankCapacity('13');
    setFormBikeFuelType('PETROL');
    setAddBikeModalVisible(true);
  };

  const handleOpenEditBike = () => {
    if (!dashboard?.bike) return;
    const b = dashboard.bike;
    setFormBikeName(b.name || '');
    setFormBikeMake(b.make || '');
    setFormBikeModel(b.model || '');
    setFormBikeYear(b.year ? String(b.year) : '');
    setFormBikeRegNum(b.registration_number || '');
    setFormBikeOdo(String(b.current_odometer || 0));
    setFormBikeTankCapacity(b.fuel_tank_capacity ? String(b.fuel_tank_capacity) : '');
    setFormBikeFuelType(b.fuel_type || 'PETROL');
    setEditBikeModalVisible(true);
  };

  const handleSaveNewBike = async () => {
    if (!formBikeName.trim() || !formBikeMake.trim() || !formBikeModel.trim()) {
      Alert.alert('Missing Fields', 'Please enter Vehicle Name, Make, and Model.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await bikeApi.createBike({
        name: formBikeName.trim(),
        make: formBikeMake.trim(),
        model: formBikeModel.trim(),
        year: formBikeYear ? parseInt(formBikeYear, 10) : undefined,
        registration_number: formBikeRegNum.trim() || undefined,
        initial_odometer: formBikeOdo ? parseFloat(formBikeOdo) : 0,
        fuel_tank_capacity: formBikeTankCapacity ? parseFloat(formBikeTankCapacity) : undefined,
        fuel_type: formBikeFuelType,
      });
      setAddBikeModalVisible(false);
      await loadDashboard(created.id);
      Alert.alert('Success', `${created.make} ${created.model} added!`);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to add vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditBike = async () => {
    if (!dashboard?.bike.id) return;
    if (!formBikeName.trim() || !formBikeMake.trim() || !formBikeModel.trim()) {
      Alert.alert('Missing Fields', 'Please enter Vehicle Name, Make, and Model.');
      return;
    }
    setSubmitting(true);
    try {
      await bikeApi.updateBike(dashboard.bike.id, {
        name: formBikeName.trim(),
        make: formBikeMake.trim(),
        model: formBikeModel.trim(),
        year: formBikeYear ? parseInt(formBikeYear, 10) : undefined,
        registration_number: formBikeRegNum.trim() || undefined,
        current_odometer: formBikeOdo ? parseFloat(formBikeOdo) : undefined,
        fuel_tank_capacity: formBikeTankCapacity ? parseFloat(formBikeTankCapacity) : undefined,
        fuel_type: formBikeFuelType,
      });
      setEditBikeModalVisible(false);
      await loadDashboard(dashboard.bike.id);
      Alert.alert('Success', 'Vehicle updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="text-textSecondary mt-2">Loading Bike Tracker...</Text>
      </SafeAreaView>
    );
  }

  const bike = dashboard?.bike;

  if (!bike) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="px-4 py-3 border-b border-border bg-card flex-row justify-between items-center">
          <Text className="text-xl font-bold text-text">Vehicle Tracker</Text>
          <TouchableOpacity
            onPress={handleOpenAddBike}
            className="bg-primary px-3 py-1.5 rounded-full flex-row items-center gap-1"
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text className="text-white text-xs font-bold">Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 justify-center items-center p-6">
          <View className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 items-center justify-center mb-4">
            <Ionicons name="bicycle" size={40} color="#6366f1" />
          </View>
          <Text className="text-xl font-bold text-text text-center">No Vehicle Registered</Text>
          <Text className="text-textSecondary text-xs text-center mt-2 mb-6">
            Register your motorcycle or car to start tracking mileage, fuel refills, and maintenance reminders!
          </Text>
          <TouchableOpacity
            onPress={handleOpenAddBike}
            className="bg-primary px-5 py-3 rounded-xl flex-row items-center gap-2"
          >
            <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
            <Text className="text-white font-bold text-sm">Add Your Vehicle</Text>
          </TouchableOpacity>
        </View>

        {/* ADD BIKE MODAL */}
        <Modal visible={addBikeModalVisible} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/70">
            <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[85%]">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-text">Add Vehicle</Text>
                <TouchableOpacity onPress={() => setAddBikeModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-textSecondary text-xs mb-1">Vehicle Name *</Text>
                <TextInput
                  value={formBikeName}
                  onChangeText={setFormBikeName}
                  placeholder="e.g. My Commuter or Hunter 350"
                  placeholderTextColor="#64748b"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text mb-3"
                />
                <View className="flex-row gap-2 mb-3">
                  <View className="flex-1">
                    <Text className="text-textSecondary text-xs mb-1">Make (Brand) *</Text>
                    <TextInput
                      value={formBikeMake}
                      onChangeText={setFormBikeMake}
                      placeholder="e.g. Royal Enfield"
                      placeholderTextColor="#64748b"
                      className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-textSecondary text-xs mb-1">Model *</Text>
                    <TextInput
                      value={formBikeModel}
                      onChangeText={setFormBikeModel}
                      placeholder="e.g. Hunter 350"
                      placeholderTextColor="#64748b"
                      className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                    />
                  </View>
                </View>
                <View className="flex-row gap-2 mb-3">
                  <View className="flex-1">
                    <Text className="text-textSecondary text-xs mb-1">Year</Text>
                    <TextInput
                      value={formBikeYear}
                      onChangeText={setFormBikeYear}
                      keyboardType="numeric"
                      placeholder="e.g. 2024"
                      placeholderTextColor="#64748b"
                      className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-textSecondary text-xs mb-1">Registration No.</Text>
                    <TextInput
                      value={formBikeRegNum}
                      onChangeText={setFormBikeRegNum}
                      placeholder="e.g. MH 02 AB 1234"
                      placeholderTextColor="#64748b"
                      autoCapitalize="characters"
                      className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                    />
                  </View>
                </View>
                <View className="flex-row gap-2 mb-3">
                  <View className="flex-1">
                    <Text className="text-textSecondary text-xs mb-1">Initial Odometer (km)</Text>
                    <TextInput
                      value={formBikeOdo}
                      onChangeText={setFormBikeOdo}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#64748b"
                      className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-textSecondary text-xs mb-1">Tank Capacity (L)</Text>
                    <TextInput
                      value={formBikeTankCapacity}
                      onChangeText={setFormBikeTankCapacity}
                      keyboardType="numeric"
                      placeholder="13"
                      placeholderTextColor="#64748b"
                      className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleSaveNewBike}
                  disabled={submitting}
                  className="bg-primary py-3 rounded-xl items-center mt-2 mb-4"
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-white font-bold text-base">Save Vehicle</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-3 border-b border-border bg-card">
        <View className="flex-row justify-between items-center">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-bold text-text">{bike?.name || 'My Bike'}</Text>
              <TouchableOpacity
                onPress={handleOpenEditBike}
                className="w-7 h-7 rounded-full bg-primary/20 items-center justify-center"
              >
                <Ionicons name="pencil" size={13} color="#6366f1" />
              </TouchableOpacity>
            </View>
            <Text className="text-textSecondary text-xs mt-0.5">
              {bike?.make} {bike?.model} {bike?.registration_number ? `• ${bike.registration_number}` : ''}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={handleOpenAddBike}
              className="w-8 h-8 rounded-full bg-card border border-border items-center justify-center"
            >
              <Ionicons name="add" size={18} color="#6366f1" />
            </TouchableOpacity>
            <View className="bg-primary/20 px-2.5 py-1 rounded-full border border-primary">
              <Text className="text-primary text-xs font-bold">{bike?.fuel_type || 'PETROL'}</Text>
            </View>
          </View>
        </View>

        {/* Multi-vehicle switcher */}
        {allBikes.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mt-2 pt-2 border-t border-border/40">
            {allBikes.map((b) => (
              <TouchableOpacity
                key={b.id}
                onPress={() => loadDashboard(b.id)}
                className={`px-3 py-1 rounded-full border mr-2 flex-row items-center gap-1 ${
                  b.id === bike.id ? 'bg-primary border-primary' : 'bg-background border-border'
                }`}
              >
                <Ionicons name="bicycle" size={12} color={b.id === bike.id ? '#ffffff' : '#9ca3af'} />
                <Text className={`text-xs font-medium ${b.id === bike.id ? 'text-white' : 'text-textSecondary'}`}>
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView
        className="flex-1 p-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* Core Metrics Card */}
        <View className="bg-card p-4 rounded-xl border border-border mb-4">
          <View className="flex-row justify-between items-start mb-3">
            <View>
              <Text className="text-textSecondary text-xs font-medium">CURRENT ODOMETER</Text>
              <Text className="text-3xl font-bold text-text mt-0.5">
                {bike?.current_odometer?.toLocaleString() || 0}{' '}
                <Text className="text-sm font-normal text-textSecondary">km</Text>
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-textSecondary text-xs font-medium">COST / KM</Text>
              <Text className="text-2xl font-bold text-accent mt-0.5">
                ₹{dashboard?.cost_per_km || '0.00'}{' '}
                <Text className="text-xs font-normal text-textSecondary">/km</Text>
              </Text>
            </View>
          </View>

          {/* Efficiency Row */}
          <View className="flex-row justify-between pt-3 border-t border-border">
            <View>
              <Text className="text-textSecondary text-xs">Avg Mileage</Text>
              <Text className="text-success font-bold text-base mt-0.5">
                {dashboard?.average_mileage_kmpl ? `${dashboard.average_mileage_kmpl} km/L` : '—'}
              </Text>
            </View>
            <View>
              <Text className="text-textSecondary text-xs">Latest Mileage</Text>
              <Text className="text-text font-bold text-base mt-0.5">
                {dashboard?.latest_mileage_kmpl ? `${dashboard.latest_mileage_kmpl} km/L` : '—'}
              </Text>
            </View>
            <View>
              <Text className="text-textSecondary text-xs">Total Tracked</Text>
              <Text className="text-text font-bold text-base mt-0.5">
                {dashboard?.total_distance_km || 0} km
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-2 mb-4">
          <TouchableOpacity
            onPress={() => {
              setFuelOdo(String(bike?.current_odometer || ''));
              setFuelModalVisible(true);
            }}
            className="flex-1 bg-primary py-2.5 rounded-xl flex-row items-center justify-center gap-1.5"
          >
            <Ionicons name="speedometer-outline" size={18} color="#ffffff" />
            <Text className="text-white font-bold text-xs">+ Add Fuel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setMaintOdo(String(bike?.current_odometer || ''));
              setMaintModalVisible(true);
            }}
            className="flex-1 bg-card border border-border py-2.5 rounded-xl flex-row items-center justify-center gap-1.5"
          >
            <Ionicons name="construct-outline" size={18} color="#94a3b8" />
            <Text className="text-text font-bold text-xs">+ Service</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setExpModalVisible(true)}
            className="flex-1 bg-card border border-border py-2.5 rounded-xl flex-row items-center justify-center gap-1.5"
          >
            <Ionicons name="receipt-outline" size={18} color="#94a3b8" />
            <Text className="text-text font-bold text-xs">+ Expense</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders Section */}
        {dashboard?.reminders && dashboard.reminders.length > 0 && (
          <View className="mb-4">
            <Text className="text-text font-bold text-base mb-2">Service Reminders</Text>
            {dashboard.reminders.map((r, idx) => (
              <View
                key={idx}
                className={`p-3 rounded-xl border flex-row items-center gap-3 mb-2 ${
                  r.severity === 'URGENT'
                    ? 'bg-danger/15 border-danger'
                    : 'bg-accent/15 border-accent'
                }`}
              >
                <Ionicons
                  name={r.severity === 'URGENT' ? 'warning' : 'notifications'}
                  size={24}
                  color={r.severity === 'URGENT' ? '#ef4444' : '#f59e0b'}
                />
                <View className="flex-1">
                  <Text
                    className={`font-bold text-xs ${
                      r.severity === 'URGENT' ? 'text-danger' : 'text-accent'
                    }`}
                  >
                    {r.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Total Cost of Ownership Card */}
        <View className="bg-card p-4 rounded-xl border border-border mb-4">
          <Text className="text-textSecondary text-xs font-medium">TOTAL COST OF OWNERSHIP (TCO)</Text>
          <Text className="text-2xl font-bold text-text mt-1">
            {formatCurrency(dashboard?.total_cost_of_ownership || 0)}
          </Text>

          <View className="flex-row justify-between mt-3 pt-3 border-t border-border">
            <View>
              <Text className="text-textSecondary text-xs">Fuel</Text>
              <Text className="text-text font-semibold text-sm">
                {formatCurrency(dashboard?.total_fuel_cost || 0)}
              </Text>
            </View>
            <View>
              <Text className="text-textSecondary text-xs">Maintenance</Text>
              <Text className="text-text font-semibold text-sm">
                {formatCurrency(dashboard?.total_maintenance_cost || 0)}
              </Text>
            </View>
            <View>
              <Text className="text-textSecondary text-xs">Other (PUC/Ins)</Text>
              <Text className="text-text font-semibold text-sm">
                {formatCurrency(dashboard?.total_other_cost || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Activity Tab Selector */}
        <View className="flex-row bg-card rounded-lg p-1 border border-border mb-3">
          <TouchableOpacity
            onPress={() => setActiveTab('fuel')}
            className={`flex-1 py-2 items-center rounded ${
              activeTab === 'fuel' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <Text
              className={`font-semibold text-xs ${
                activeTab === 'fuel' ? 'text-white' : 'text-textSecondary'
              }`}
            >
              Fuel Refills ({dashboard?.recent_fuel_logs.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('maintenance')}
            className={`flex-1 py-2 items-center rounded ${
              activeTab === 'maintenance' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <Text
              className={`font-semibold text-xs ${
                activeTab === 'maintenance' ? 'text-white' : 'text-textSecondary'
              }`}
            >
              Service Records ({dashboard?.recent_maintenance.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Activity List */}
        {activeTab === 'fuel' ? (
          (!dashboard?.recent_fuel_logs || dashboard.recent_fuel_logs.length === 0) ? (
            <View className="bg-card p-6 rounded-xl border border-border items-center">
              <Text className="text-textSecondary text-sm">No fuel logs yet. Tap "+ Add Fuel" to start.</Text>
            </View>
          ) : (
            dashboard.recent_fuel_logs.map((log) => (
              <View key={log.id} className="bg-card p-3.5 rounded-xl border border-border mb-2.5">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-text font-bold text-sm">
                      {log.odometer_reading.toLocaleString()} km
                    </Text>
                    <Text className="text-textSecondary text-xs">{log.fuel_date}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-text font-bold text-sm">
                      {formatCurrency(log.total_cost)}
                    </Text>
                    <Text className="text-textSecondary text-xs">
                      {log.fuel_amount_liters} L {log.is_full_tank ? '• Full Tank' : ''}
                    </Text>
                  </View>
                </View>
                {log.calculated_mileage && (
                  <View className="mt-2 pt-2 border-t border-border flex-row justify-between items-center">
                    <Text className="text-textSecondary text-xs">
                      Distance: {log.distance_traveled} km
                    </Text>
                    <View className="bg-success/20 px-2 py-0.5 rounded border border-success">
                      <Text className="text-success text-xs font-bold">
                        {log.calculated_mileage} km/L
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ))
          )
        ) : (
          (!dashboard?.recent_maintenance || dashboard.recent_maintenance.length === 0) ? (
            <View className="bg-card p-6 rounded-xl border border-border items-center">
              <Text className="text-textSecondary text-sm">No service records yet.</Text>
            </View>
          ) : (
            dashboard.recent_maintenance.map((m) => (
              <View key={m.id} className="bg-card p-3.5 rounded-xl border border-border mb-2.5">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-text font-bold text-sm">
                      {m.service_type.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text className="text-textSecondary text-xs">
                      {m.service_date} • @ {m.odometer_reading.toLocaleString()} km
                    </Text>
                  </View>
                  <Text className="text-text font-bold text-sm">
                    {formatCurrency(m.cost)}
                  </Text>
                </View>
                {m.workshop_name && (
                  <Text className="text-textSecondary text-xs mt-1">
                    Workshop: {m.workshop_name}
                  </Text>
                )}
              </View>
            ))
          )
        )}
        <View className="h-10" />
      </ScrollView>

      {/* MODAL: ADD FUEL */}
      <Modal visible={fuelModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-text">Log Fuel Refill</Text>
              <TouchableOpacity onPress={() => setFuelModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Odometer (km)</Text>
                <TextInput
                  value={fuelOdo}
                  onChangeText={setFuelOdo}
                  placeholder="e.g. 1250"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Fuel (Liters)</Text>
                <TextInput
                  value={fuelLiters}
                  onChangeText={setFuelLiters}
                  placeholder="e.g. 10.5"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Total Cost (₹)</Text>
                <TextInput
                  value={fuelCost}
                  onChangeText={setFuelCost}
                  placeholder="e.g. 1050"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Fuel Station</Text>
                <TextInput
                  value={fuelStation}
                  onChangeText={setFuelStation}
                  placeholder="e.g. Shell, IOCL"
                  placeholderTextColor="#64748b"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
            </View>

            <View className="flex-row justify-between items-center py-2 mb-4 border-t border-b border-border">
              <View>
                <Text className="text-text font-semibold text-sm">Full Tank Refill?</Text>
                <Text className="text-textSecondary text-xs">Enables automatic km/L mileage calculation</Text>
              </View>
              <Switch
                value={isFullTank}
                onValueChange={setIsFullTank}
                trackColor={{ false: '#334155', true: '#6366f1' }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveFuel}
              disabled={submitting}
              className="bg-primary py-3 rounded-xl items-center"
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Save Fuel Record</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD SERVICE */}
      <Modal visible={maintModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-text">Record Maintenance</Text>
              <TouchableOpacity onPress={() => setMaintModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs mb-1">Service Type</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {['GENERAL_SERVICE', 'OIL_CHANGE', 'BRAKES', 'CHAIN', 'TYRE'].map((st) => (
                <TouchableOpacity
                  key={st}
                  onPress={() => setMaintType(st)}
                  className={`px-3 py-1.5 rounded-lg border ${
                    maintType === st ? 'bg-primary border-primary' : 'bg-background border-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      maintType === st ? 'text-white' : 'text-textSecondary'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Odometer (km)</Text>
                <TextInput
                  value={maintOdo}
                  onChangeText={setMaintOdo}
                  keyboardType="numeric"
                  placeholderTextColor="#64748b"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Cost (₹)</Text>
                <TextInput
                  value={maintCost}
                  onChangeText={setMaintCost}
                  keyboardType="numeric"
                  placeholder="e.g. 1200"
                  placeholderTextColor="#64748b"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Workshop Name</Text>
                <TextInput
                  value={maintWorkshop}
                  onChangeText={setMaintWorkshop}
                  placeholder="e.g. Authorized Center"
                  placeholderTextColor="#64748b"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
              <View className="flex-1">
                <Text className="text-textSecondary text-xs mb-1">Next Service (km)</Text>
                <TextInput
                  value={nextServiceOdo}
                  onChangeText={setNextServiceOdo}
                  placeholder="e.g. 5000"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSaveMaintenance}
              disabled={submitting}
              className="bg-primary py-3 rounded-xl items-center"
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Save Service Record</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD VEHICLE EXPENSE */}
      <Modal visible={expModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-card p-5 rounded-t-2xl border-t border-border">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-text">Vehicle Expense</Text>
              <TouchableOpacity onPress={() => setExpModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text className="text-textSecondary text-xs mb-1">Expense Type</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {['INSURANCE', 'PUC', 'TOLL', 'PARKING', 'ACCESSORY', 'FINE'].map((et) => (
                <TouchableOpacity
                  key={et}
                  onPress={() => setExpType(et)}
                  className={`px-3 py-1.5 rounded-lg border ${
                    expType === et ? 'bg-primary border-primary' : 'bg-background border-border'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      expType === et ? 'text-white' : 'text-textSecondary'
                    }`}
                  >
                    {et}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-textSecondary text-xs mb-1">Amount (₹)</Text>
            <TextInput
              value={expAmount}
              onChangeText={setExpAmount}
              keyboardType="numeric"
              placeholder="e.g. 150"
              placeholderTextColor="#64748b"
              className="bg-background border border-border rounded-lg px-3 py-2 text-text mb-3"
            />

            <Text className="text-textSecondary text-xs mb-1">Notes (Optional)</Text>
            <TextInput
              value={expNotes}
              onChangeText={setExpNotes}
              placeholder="e.g. Fastag toll recharge, parking slip"
              placeholderTextColor="#64748b"
              className="bg-background border border-border rounded-lg px-3 py-2 text-text mb-4"
            />

            <TouchableOpacity
              onPress={handleSaveExpense}
              disabled={submitting}
              className="bg-primary py-3 rounded-xl items-center"
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Save Vehicle Expense</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EDIT VEHICLE MODAL */}
      <Modal visible={editBikeModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[85%]">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="pencil" size={20} color="#6366f1" />
                <Text className="text-xl font-bold text-text">Edit Vehicle Details</Text>
              </View>
              <TouchableOpacity onPress={() => setEditBikeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-textSecondary text-xs mb-1">Vehicle Name *</Text>
              <TextInput
                value={formBikeName}
                onChangeText={setFormBikeName}
                placeholder="e.g. My Bike"
                placeholderTextColor="#64748b"
                className="bg-background border border-border rounded-lg px-3 py-2 text-text mb-3"
              />

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Make (Brand) *</Text>
                  <TextInput
                    value={formBikeMake}
                    onChangeText={setFormBikeMake}
                    placeholder="e.g. Royal Enfield"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Model *</Text>
                  <TextInput
                    value={formBikeModel}
                    onChangeText={setFormBikeModel}
                    placeholder="e.g. Hunter 350"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
              </View>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Year</Text>
                  <TextInput
                    value={formBikeYear}
                    onChangeText={setFormBikeYear}
                    keyboardType="numeric"
                    placeholder="e.g. 2024"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Registration No.</Text>
                  <TextInput
                    value={formBikeRegNum}
                    onChangeText={setFormBikeRegNum}
                    placeholder="e.g. MH 02 AB 1234"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
              </View>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Current Odometer (km)</Text>
                  <TextInput
                    value={formBikeOdo}
                    onChangeText={setFormBikeOdo}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Tank Capacity (L)</Text>
                  <TextInput
                    value={formBikeTankCapacity}
                    onChangeText={setFormBikeTankCapacity}
                    keyboardType="numeric"
                    placeholder="13"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-textSecondary text-xs mb-1">Fuel Type</Text>
                <View className="flex-row gap-2">
                  {['PETROL', 'ELECTRIC', 'DIESEL'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setFormBikeFuelType(type)}
                      className={`flex-1 py-2 rounded-lg border items-center ${
                        formBikeFuelType === type ? 'bg-primary border-primary' : 'bg-background border-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          formBikeFuelType === type ? 'text-white' : 'text-textSecondary'
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSaveEditBike}
                disabled={submitting}
                className="bg-primary py-3 rounded-xl items-center mb-4"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-base">Save Vehicle Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ADD VEHICLE MODAL (Secondary) */}
      <Modal visible={addBikeModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-card rounded-t-3xl p-5 border-t border-border max-h-[85%]">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="add-circle" size={22} color="#6366f1" />
                <Text className="text-xl font-bold text-text">Add Vehicle</Text>
              </View>
              <TouchableOpacity onPress={() => setAddBikeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-textSecondary text-xs mb-1">Vehicle Name *</Text>
              <TextInput
                value={formBikeName}
                onChangeText={setFormBikeName}
                placeholder="e.g. Daily Commuter"
                placeholderTextColor="#64748b"
                className="bg-background border border-border rounded-lg px-3 py-2 text-text mb-3"
              />

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Make (Brand) *</Text>
                  <TextInput
                    value={formBikeMake}
                    onChangeText={setFormBikeMake}
                    placeholder="e.g. Royal Enfield"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Model *</Text>
                  <TextInput
                    value={formBikeModel}
                    onChangeText={setFormBikeModel}
                    placeholder="e.g. Hunter 350"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
              </View>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Year</Text>
                  <TextInput
                    value={formBikeYear}
                    onChangeText={setFormBikeYear}
                    keyboardType="numeric"
                    placeholder="e.g. 2024"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Registration No.</Text>
                  <TextInput
                    value={formBikeRegNum}
                    onChangeText={setFormBikeRegNum}
                    placeholder="e.g. MH 02 AB 1234"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
              </View>

              <View className="flex-row gap-2 mb-3">
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Initial Odometer (km)</Text>
                  <TextInput
                    value={formBikeOdo}
                    onChangeText={setFormBikeOdo}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-textSecondary text-xs mb-1">Tank Capacity (L)</Text>
                  <TextInput
                    value={formBikeTankCapacity}
                    onChangeText={setFormBikeTankCapacity}
                    keyboardType="numeric"
                    placeholder="13"
                    placeholderTextColor="#64748b"
                    className="bg-background border border-border rounded-lg px-3 py-2 text-text"
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-textSecondary text-xs mb-1">Fuel Type</Text>
                <View className="flex-row gap-2">
                  {['PETROL', 'ELECTRIC', 'DIESEL'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setFormBikeFuelType(type)}
                      className={`flex-1 py-2 rounded-lg border items-center ${
                        formBikeFuelType === type ? 'bg-primary border-primary' : 'bg-background border-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          formBikeFuelType === type ? 'text-white' : 'text-textSecondary'
                        }`}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSaveNewBike}
                disabled={submitting}
                className="bg-primary py-3 rounded-xl items-center mb-4"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-base">Add Vehicle</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
