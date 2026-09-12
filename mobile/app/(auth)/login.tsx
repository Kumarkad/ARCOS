import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/authStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    try {
      await login(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background justify-center px-6">
      <View className="items-center mb-10">
        <Text className="text-4xl text-primary font-bold mb-2">💰</Text>
        <Text className="text-3xl text-text font-bold">Expense Tracker</Text>
        <Text className="text-textSecondary mt-2">Welcome back!</Text>
      </View>

      <View className="space-y-4 mb-8">
        <View className="bg-card rounded-xl p-4 border border-border">
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
      </View>

      <TouchableOpacity
        className="bg-primary rounded-xl py-4 items-center mb-6"
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-text font-bold text-lg">Login</Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center">
        <Text className="text-textSecondary">Don't have an account? </Text>
        <Link href="/(auth)/register" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-bold">Register</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
