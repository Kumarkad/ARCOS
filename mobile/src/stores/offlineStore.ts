import { create } from 'zustand';
import { storage } from '../utils/storage';
import { ExpenseCreate } from '../types/expense';
import { expensesApi } from '../api/expenses';

interface OfflineState {
  pendingQueue: ExpenseCreate[];
  isSyncing: boolean;
  queueExpense: (expense: ExpenseCreate) => Promise<void>;
  syncPendingExpenses: () => Promise<number>;
  loadQueue: () => Promise<void>;
}

const QUEUE_STORAGE_KEY = 'offline_expenses_queue';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  pendingQueue: [],
  isSyncing: false,

  loadQueue: async () => {
    try {
      const stored = await storage.getItemAsync(QUEUE_STORAGE_KEY);
      if (stored) {
        set({ pendingQueue: JSON.parse(stored) });
      }
    } catch {
      // ignore
    }
  },

  queueExpense: async (expense: ExpenseCreate) => {
    const itemWithKey: ExpenseCreate = {
      ...expense,
      idempotency_key: expense.idempotency_key || generateUUID(),
    };
    const updated = [...get().pendingQueue, itemWithKey];
    set({ pendingQueue: updated });
    try {
      await storage.setItemAsync(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  syncPendingExpenses: async () => {
    const queue = get().pendingQueue;
    if (queue.length === 0 || get().isSyncing) return 0;

    set({ isSyncing: true });
    try {
      const response = await expensesApi.bulkCreateExpenses(queue);
      if (response.success) {
        set({ pendingQueue: [] });
        await storage.deleteItemAsync(QUEUE_STORAGE_KEY);
        return response.data.length;
      }
      return 0;
    } catch {
      return 0;
    } finally {
      set({ isSyncing: false });
    }
  },
}));
