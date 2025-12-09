import { Contract, User, RecentAnalysis } from '../types';

const STORAGE_KEYS = {
  USERS: 'legallens_users',
  CONTRACTS: 'legallens_contracts',
  CURRENT_USER: 'legallens_current_user',
  RECENT_ANALYSES: 'legallens_recent_analyses',
};

// Helper to simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const storageService = {
  getUsers: (): User[] => {
    try {
      const users = localStorage.getItem(STORAGE_KEYS.USERS);
      return users ? JSON.parse(users) : [];
    } catch (e) {
      console.error("Failed to load users from storage", e);
      return [];
    }
  },

  saveUser: (user: User) => {
    try {
      const users = storageService.getUsers();
      // Update existing user or add new one
      const existingIndex = users.findIndex(u => u.id === user.id);
      
      if (existingIndex >= 0) {
        users[existingIndex] = { ...users[existingIndex], ...user };
      } else {
        users.push(user);
      }
      
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch (e) {
      console.error("Failed to save user", e);
    }
  },

  getCurrentUser: (): User | null => {
    try {
      const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return user ? JSON.parse(user) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  getContracts: (userId: string): Contract[] => {
    try {
      const allContracts = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTRACTS) || '[]');
      // Ensure we match case-insensitively if needed, but IDs should be normalized by Auth
      return allContracts.filter((c: Contract) => c.userId === userId).sort((a: Contract, b: Contract) => b.uploadDate - a.uploadDate);
    } catch (e) {
      console.error("Failed to get contracts", e);
      // If parsing fails (e.g. corruption), try to recover by returning empty array to avoid app crash
      return [];
    }
  },

  saveContract: async (contract: Contract): Promise<Contract> => {
    await delay(300); // Simulate save latency
    
    const saveToStorage = (contractToSave: Contract) => {
      const allContracts = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTRACTS) || '[]');
      // Update if exists, else add
      const index = allContracts.findIndex((c: Contract) => c.id === contractToSave.id);
      if (index >= 0) {
        allContracts[index] = contractToSave;
      } else {
        allContracts.push(contractToSave);
      }
      localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(allContracts));
    };

    try {
      // Try saving full contract first
      saveToStorage(contract);
      return contract;
    } catch (e: any) {
      // Check if it's a quota exceeded error
      if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
        console.warn("LocalStorage quota exceeded. Attempting to save without file data.");
        
        // Create a copy without the large file data
        const lightContract: Contract = {
            ...contract,
            fileData: undefined // Remove base64 data to save space
        };
        
        try {
            saveToStorage(lightContract);
            // Return the full contract so the UI still shows it correctly for this session
            return contract; 
        } catch (retryError) {
             console.error("Failed to save even the light version of contract", retryError);
             throw retryError;
        }
      }
      
      console.error("Failed to save contract", e);
      throw e;
    }
  },
  
  getContractById: (id: string): Contract | undefined => {
    try {
      const allContracts = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTRACTS) || '[]');
      return allContracts.find((c: Contract) => c.id === id);
    } catch (e) {
      return undefined;
    }
  },

  // --- Recent Analyses Methods ---

  getRecentAnalyses: (): RecentAnalysis[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_ANALYSES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to get recent analyses", e);
      return [];
    }
  },

  saveRecentAnalysis: (analysis: RecentAnalysis) => {
    try {
      const recent = storageService.getRecentAnalyses();
      // Remove duplicates if any
      const filtered = recent.filter(item => item.id !== analysis.id);
      
      // Add new to start
      filtered.unshift(analysis);
      
      // Keep only last 10
      const trimmed = filtered.slice(0, 10);
      
      localStorage.setItem(STORAGE_KEYS.RECENT_ANALYSES, JSON.stringify(trimmed));
    } catch (e) {
      console.error("Failed to save recent analysis", e);
    }
  },

  clearRecentAnalyses: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.RECENT_ANALYSES);
    } catch (e) {
      console.error("Failed to clear recent analyses", e);
    }
  }
};