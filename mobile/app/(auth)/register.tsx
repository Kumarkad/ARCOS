import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, isLoading } = useAuthStore();
  const router = useRouter();

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    try {
      await register(email, password, fullName);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'An error occurred');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background justify-center px-6">
      <View className="items-center mb-8">
        <Text className="text-4xl text-primary font-bold mb-2">⚡</Text>
        <Text className="text-3xl text-text font-extrabold tracking-wider">Join ARCOS</Text>
        <Text className="text-textSecondary text-xs mt-1 text-center">
          Your Personal Financial Intelligence System
        </Text>
      </View>

      <View className="space-y-4 mb-8">
        <View className="bg-card rounded-xl p-4 border border-border">
          <TextInput
            className="text-text"
            placeholder="Full Name"
            placeholderTextColor="#6b7280"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View className="bg-card rounded-xl p-4 border border-border mt-4">
          <TextInput
            className="text-text"
            placeholder="Email"
            placeholderTextColor="#6b7280"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View className="bg-card rounded-xl p-4 border border-border flex-row justify-between items-center mt-4">
          <TextInput
            className="text-text flex-1"
            placeholder="Password"
            placeholderTextColor="#6b7280"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text className="text-primary">{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-card rounded-xl p-4 border border-border mt-4">
          <TextInput
            className="text-text flex-1"
            placeholder="Confirm Password"
            placeholderTextColor="#6b7280"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>
      </View>

      <TouchableOpacity
        className="bg-primary rounded-xl py-4 items-center mb-6"
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-text font-bold text-lg">Register</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center">
        <Text className="text-textSecondary">Already have an account? </Text>
        <Link href="/(auth)/login" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-bold">Login</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
