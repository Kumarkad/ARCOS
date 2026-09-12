import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../../src/api/chat';
import { ChatMessage, PendingAction } from '../../src/types/chat';
import { formatINR } from '../../src/utils/formatting';

const QUICK_PROMPTS = [
  'I bought chai for 20',
  'Spent 450 on dinner',
  'Bought petrol for 1200',
  'How much did I spend today?',
  'Am I on budget this month?',
];

export default function ChatScreen() {
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      session_id: '',
      role: 'assistant',
      content:
        "Greetings! I am JARVIS, your Personal Financial Intelligence Assistant for ARCOS. ⚡\n\nHow may I assist with your finances today? You can command me to log transactions, inspect budgets, or analyze spending:\n• 'I bought chai for 20'\n• 'How much did I spend today?'\n• 'Am I on budget this month?'",
      created_at: new Date().toISOString(),
    },
  ]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId || '',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage(text, sessionId);
      if (response.success && response.data) {
        const assistantMsg = response.data;
        if (!sessionId) {
          setSessionId(assistantMsg.session_id);
        }
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(response.message || 'Could not get response');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          session_id: sessionId || '',
          role: 'assistant',
          content: 'Sorry, I ran into an error processing that. Please try again.',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (action: PendingAction, confirm: boolean) => {
    if (!sessionId || processingActionId) return;

    setProcessingActionId(action.action_id);
    try {
      const res = await chatApi.confirmAction(sessionId, action.action_id, confirm);
      if (res.success && confirm) {
        // Invalidate expense queries so Home and Expense tabs update immediately
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
        queryClient.invalidateQueries({ queryKey: ['expense-summary'] });
        queryClient.invalidateQueries({ queryKey: ['budgets'] });
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
      }

      // Update local message list
      setMessages((prev) =>
        prev.map((m) => {
          if (m.pending_action?.action_id === action.action_id) {
            return {
              ...m,
              action_status: confirm ? 'CONFIRMED' : 'CANCELLED',
            };
          }
          return m;
        })
      );

      // Add feedback message
      setMessages((prev) => [
        ...prev,
        {
          id: `res-${Date.now()}`,
          session_id: sessionId,
          role: 'assistant',
          content: confirm
            ? `✅ Added ${formatINR(Number(action.amount))} for ${action.description} (${action.category_name})!`
            : '❌ Expense cancelled.',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not process confirmation');
    } finally {
      setProcessingActionId(null);
    }
  };

  const handleNewChat = () => {
    setSessionId(undefined);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        session_id: '',
        role: 'assistant',
        content:
          "JARVIS session initialized. All financial intelligence systems online. How can I assist you today?",
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
    const pendingAction = msg.pending_action;
    const isProcessed = msg.action_status && msg.action_status !== 'PENDING';

    return (
      <View
        key={msg.id}
        className={`mb-4 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <View
          className={`rounded-2xl p-4 max-w-[85%] ${
            isUser
              ? 'bg-primary rounded-tr-sm'
              : 'bg-card rounded-tl-sm border border-border'
          }`}
        >
          <Text className="text-text text-sm leading-5">{msg.content}</Text>

          {/* Interactive Pending Confirmation Card */}
          {pendingAction && (
            <View className="mt-3 bg-background/80 rounded-xl p-3.5 border border-border">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Text className="text-xl mr-2">💳</Text>
                  <Text className="text-text font-bold text-sm">
                    {pendingAction.preview_title}
                  </Text>
                </View>
                <Text className="text-primary font-bold text-base">
                  {formatINR(Number(pendingAction.amount))}
                </Text>
              </View>

              <Text className="text-textSecondary text-xs leading-4 mb-3">
                {pendingAction.preview_text}
              </Text>

              {isProcessed ? (
                <View className="bg-elevated py-1.5 px-3 rounded-lg items-center">
                  <Text
                    className={`text-xs font-bold ${
                      msg.action_status === 'CONFIRMED' ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {msg.action_status === 'CONFIRMED' ? '✓ CONFIRMED' : '✕ CANCELLED'}
                  </Text>
                </View>
              ) : (
                <View className="flex-row space-x-2 mt-1">
                  <TouchableOpacity
                    className="flex-1 bg-primary py-2.5 rounded-lg items-center justify-center mr-1.5"
                    onPress={() => handleConfirmAction(pendingAction, true)}
                    disabled={processingActionId === pendingAction.action_id}
                  >
                    {processingActionId === pendingAction.action_id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-white font-bold text-xs">Add Expense</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 bg-card border border-border py-2.5 rounded-lg items-center justify-center ml-1.5"
                    onPress={() => handleConfirmAction(pendingAction, false)}
                    disabled={processingActionId === pendingAction.action_id}
                  >
                    <Text className="text-textSecondary font-bold text-xs">Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View className="px-4 py-3 border-b border-border flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-9 h-9 rounded-full bg-primary/20 items-center justify-center mr-2.5">
              <Text className="text-base">⚡</Text>
            </View>
            <View>
              <Text className="text-lg font-bold text-text">JARVIS</Text>
              <Text className="text-[10px] text-textSecondary uppercase tracking-wider font-semibold">
                ARCOS Intelligence
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleNewChat} className="p-1">
            <Ionicons name="refresh-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Quick Suggestion Chips */}
        <View className="py-2 border-b border-border/50">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-3">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                className="bg-card border border-border px-3 py-1.5 rounded-full mr-2"
                onPress={() => handleSend(prompt)}
                disabled={isLoading}
              >
                <Text className="text-textSecondary text-xs">{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Message Stream */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View className="flex-row items-center mb-4">
              <View className="bg-card rounded-2xl rounded-tl-sm p-3.5 border border-border flex-row items-center">
                <ActivityIndicator size="small" color="#6C63FF" />
                <Text className="text-textSecondary text-xs ml-2">Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View className="p-3 border-t border-border bg-background">
          <View className="flex-row items-center bg-card rounded-full px-3 py-1 border border-border">
            <TextInput
              className="flex-1 px-3 py-2 text-text text-sm"
              placeholder="Ask JARVIS or log an expense..."
              placeholderTextColor="#6b7280"
              value={inputMessage}
              onChangeText={setInputMessage}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />
            <TouchableOpacity
              className={`w-9 h-9 rounded-full items-center justify-center ${
                inputMessage.trim() && !isLoading ? 'bg-primary' : 'bg-elevated'
              }`}
              onPress={() => handleSend()}
              disabled={!inputMessage.trim() || isLoading}
            >
              <Ionicons
                name="send"
                size={16}
                color={inputMessage.trim() && !isLoading ? '#fff' : '#6b7280'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
