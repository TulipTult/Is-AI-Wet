/**
 * Unit tests for conversation history management
 * Tests the functionality for storing, retrieving, and manipulating conversation history
 */

// Create mock implementations for testing based on the content.js and popupStats.js files

// Mock localStorage for testing
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    length: 0,
    key: jest.fn(i => null)
  };
})();

// Mock chrome.storage for testing
const mockChromeStorage = {
  local: {
    get: jest.fn(),
    set: jest.fn()
  }
};

// Mock implementation of conversation history functionality
class ConversationHistoryManager {
  constructor() {
    this.conversationHistory = [];
    this.localStorage = mockLocalStorage;
  }
  
  loadConversationHistory() {
    const storedHistory = this.localStorage.getItem('chatgpt-conversation-history');
    if (storedHistory) {
      try {
        this.conversationHistory = JSON.parse(storedHistory);
        return this.conversationHistory;
      } catch (e) {
        this.conversationHistory = [];
        return [];
      }
    }
    return [];
  }
  
  saveConversationHistory() {
    this.localStorage.setItem('chatgpt-conversation-history', JSON.stringify(this.conversationHistory));
    return true;
  }
  
  isDuplicatePrompt(prompt) {
    return this.conversationHistory.some(item => item.prompt === prompt);
  }
  
  addPromptToHistory(prompt) {
    if (!prompt || this.isDuplicatePrompt(prompt)) {
      return false;
    }
    
    const newPrompt = {
      timestamp: new Date().toISOString(),
      prompt,
      energyData: {
        promptTokens: 10,
        estimatedResponseTokens: 30,
        totalTokens: 40,
        directKWh: 0.00008,
        directWaterUsageMl: 0.12,
        realWorldKWh: 0.0006,
        realWorldWaterUsageMl: 0.9
      }
    };
    
    this.conversationHistory.push(newPrompt);
    this.saveConversationHistory();
    return true;
  }
  
  clearHistory() {
    this.conversationHistory = [];
    this.saveConversationHistory();
    return true;
  }
  
  getStatsByPeriod(period) {
    if (this.conversationHistory.length === 0) {
      return null;
    }
    
    const now = new Date();
    let startDate;
    
    switch(period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = new Date(0);
        break;
    }
    
    const filteredPrompts = this.conversationHistory.filter(item => {
      const promptDate = new Date(item.timestamp);
      return promptDate >= startDate && promptDate <= now;
    });
    
    let totalTokens = 0;
    let totalPrompts = filteredPrompts.length;
    let totalEnergyKwh = 0;
    let totalWaterMl = 0;
    
    filteredPrompts.forEach(item => {
      if (item.energyData) {
        totalTokens += item.energyData.totalTokens || 0;
        totalEnergyKwh += item.energyData.realWorldKWh || 0;
        totalWaterMl += item.energyData.realWorldWaterUsageMl || 0;
      }
    });
    
    return {
      totalPrompts,
      totalTokens,
      totalEnergyKwh,
      totalWaterMl,
      period,
      startDate,
      endDate: now,
      filteredPrompts
    };
  }
}

describe('Conversation History Tests', () => {
  let historyManager;
  
  beforeEach(() => {
    // Reset the mock localStorage before each test
    mockLocalStorage.clear();
    historyManager = new ConversationHistoryManager();
  });
  
  describe('Basic History Operations', () => {
    test('New history manager has empty conversation history', () => {
      expect(historyManager.conversationHistory).toEqual([]);
    });
    
    test('Adding prompt to history increases count', () => {
      historyManager.addPromptToHistory("Test prompt");
      expect(historyManager.conversationHistory.length).toBe(1);
    });
    
    test('Adding duplicate prompt is ignored', () => {
      historyManager.addPromptToHistory("Test prompt");
      const result = historyManager.addPromptToHistory("Test prompt");
      
      expect(result).toBe(false);
      expect(historyManager.conversationHistory.length).toBe(1);
    });
    
    test('Adding empty prompt is ignored', () => {
      const result = historyManager.addPromptToHistory("");
      
      expect(result).toBe(false);
      expect(historyManager.conversationHistory.length).toBe(0);
    });
    
    test('Clear history removes all prompts', () => {
      historyManager.addPromptToHistory("Test prompt 1");
      historyManager.addPromptToHistory("Test prompt 2");
      expect(historyManager.conversationHistory.length).toBe(2);
      
      historyManager.clearHistory();
      expect(historyManager.conversationHistory.length).toBe(0);
    });
  });
  
  describe('Local Storage Integration', () => {
    test('History is saved to localStorage', () => {
      historyManager.addPromptToHistory("Test local storage");
      
      // Check that setItem was called with the correct key
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'chatgpt-conversation-history',
        expect.any(String)
      );
    });
    
    test('History is loaded from localStorage', () => {
      // Setup mock localStorage with data
      const mockData = [{
        timestamp: new Date().toISOString(),
        prompt: "Stored prompt",
        energyData: { totalTokens: 20, realWorldKWh: 0.0005, realWorldWaterUsageMl: 0.75 }
      }];
      
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(mockData));
      
      // Load the history
      const loadedHistory = historyManager.loadConversationHistory();
      
      // Verify the mock was called and data was loaded
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('chatgpt-conversation-history');
      expect(loadedHistory.length).toBe(1);
      expect(loadedHistory[0].prompt).toBe("Stored prompt");
    });
    
    test('Invalid localStorage data is handled gracefully', () => {
      // Setup mock localStorage with invalid JSON
      mockLocalStorage.getItem.mockReturnValueOnce('{"invalid json":');
      
      // This should not throw an error
      const loadedHistory = historyManager.loadConversationHistory();
      expect(loadedHistory).toEqual([]);
    });
  });
  
  describe('Statistics by Period', () => {
    beforeEach(() => {
      // Setup test data with various dates
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      
      const lastMonth = new Date();
      lastMonth.setMonth(today.getMonth() - 1);
      
      historyManager.conversationHistory = [
        {
          timestamp: today.toISOString(),
          prompt: "Today's prompt",
          energyData: { totalTokens: 40, realWorldKWh: 0.001, realWorldWaterUsageMl: 1.5 }
        },
        {
          timestamp: yesterday.toISOString(),
          prompt: "Yesterday's prompt",
          energyData: { totalTokens: 30, realWorldKWh: 0.0008, realWorldWaterUsageMl: 1.2 }
        },
        {
          timestamp: lastWeek.toISOString(),
          prompt: "Last week's prompt",
          energyData: { totalTokens: 25, realWorldKWh: 0.0006, realWorldWaterUsageMl: 0.9 }
        },
        {
          timestamp: lastMonth.toISOString(),
          prompt: "Last month's prompt",
          energyData: { totalTokens: 20, realWorldKWh: 0.0005, realWorldWaterUsageMl: 0.75 }
        }
      ];
    });
    
    test('getStatsByPeriod("today") returns only today\'s prompts', () => {
      const todayStats = historyManager.getStatsByPeriod('today');
      
      expect(todayStats.totalPrompts).toBe(1);
      expect(todayStats.filteredPrompts[0].prompt).toBe("Today's prompt");
      expect(todayStats.totalEnergyKwh).toBe(0.001);
    });
    
    test('getStatsByPeriod("week") returns prompts from this week', () => {
      const weekStats = historyManager.getStatsByPeriod('week');
      
      // Should include today, yesterday, but not necessarily last week (depends on day of week)
      expect(weekStats.totalPrompts).toBeGreaterThanOrEqual(2);
    });
    
    test('getStatsByPeriod("month") returns prompts from this month', () => {
      const monthStats = historyManager.getStatsByPeriod('month');
      
      // Should include today, yesterday, and last week
      expect(monthStats.totalPrompts).toBeGreaterThanOrEqual(3);
    });
    
    test('getStatsByPeriod("all") returns all prompts', () => {
      const allStats = historyManager.getStatsByPeriod('all');
      
      expect(allStats.totalPrompts).toBe(4);
      expect(allStats.totalTokens).toBe(40 + 30 + 25 + 20);
      expect(allStats.totalEnergyKwh).toBe(0.001 + 0.0008 + 0.0006 + 0.0005);
      expect(allStats.totalWaterMl).toBe(1.5 + 1.2 + 0.9 + 0.75);
    });
    
    test('getStatsByPeriod returns null for empty history', () => {
      historyManager.conversationHistory = [];
      const stats = historyManager.getStatsByPeriod('all');
      
      expect(stats).toBeNull();
    });
    
    test('getStatsByPeriod handles missing energyData', () => {
      historyManager.conversationHistory = [
        {
          timestamp: new Date().toISOString(),
          prompt: "No energy data"
          // No energyData property
        }
      ];
      
      const stats = historyManager.getStatsByPeriod('all');
      
      expect(stats.totalPrompts).toBe(1);
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalEnergyKwh).toBe(0);
      expect(stats.totalWaterMl).toBe(0);
    });
  });
});
