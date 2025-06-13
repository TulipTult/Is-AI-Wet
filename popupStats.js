/**
 * ChatGPT Energy Statistics Calculator
 * 
 * This module provides functionality for calculating, tracking, and reporting 
 * the environmental impact (energy usage and water consumption) of ChatGPT interactions.
 * 
 * Key features:
 * - Load conversation history from ChatGPT
 * - Calculate energy and water usage based on token counts
 * - Generate user-friendly environmental comparisons
 * - Anonymously report aggregated data to central server
 * 
 * Data privacy:
 * - Uses pseudonymous IDs to avoid tracking personally identifiable information
 * - Users can opt in/out of data reporting
 * 
 * Efficiency considerations:
 * - Uses Chrome storage for persistence with minimal overhead
 * - Implements delta updates to avoid redundant data reporting
 * 
 * @author How Wet is AI? Team
 * @version 1.0.0
 */
class EnergyStatisticsCalculator {
  /**
   * Initialize the energy statistics calculator
   * 
   * Sets up the conversation history storage and data reporting settings
   * Loads user preferences from Chrome storage
   * 
   * INPUT: None
   * OUTPUT: Configured calculator instance
   * EXAMPLE: const calculator = new EnergyStatisticsCalculator();
   */
  constructor() {
    this.conversationHistory = [];
    this.loaded = false;
    this.dataReportingEnabled = false;
    this.lastSubmittedWaterUsage = 0;
    
    // Check if data reporting is enabled and get last submitted value
    chrome.storage.local.get(['dataReportingEnabled', 'lastSubmittedWaterUsage'], (result) => {
      this.dataReportingEnabled = result.dataReportingEnabled === true;
      this.lastSubmittedWaterUsage = result.lastSubmittedWaterUsage || 0;
    });
  }
  
  /**
   * Load conversation history from the active ChatGPT tab
   * 
   * Attempts multiple methods to retrieve history:
   * 1. Request via content script message
   * 2. Direct localStorage access via chrome.scripting API
   * 
   * INPUT: None
   * OUTPUT: Promise resolving to conversation history array
   * EXAMPLE: await energyStats.loadConversationHistory() // Returns array of conversations
   * 
   * Error handling for multiple fallback approaches
   * Uses async/await pattern for cleaner promise handling
   */
  async loadConversationHistory() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getConversationHistory" }, (response) => {
          if (response && response.history) {
            this.conversationHistory = response.history;
            this.loaded = true;
            resolve(this.conversationHistory);
          } else {
            // Try loading from localStorage directly if content script messaging fails
            try {
              // Use chrome.scripting.executeScript instead of deprecated chrome.tabs.executeScript
              if (chrome.scripting && chrome.scripting.executeScript) {
                chrome.scripting.executeScript({
                  target: { tabId: tabs[0].id },
                  function: () => localStorage.getItem("chatgpt-conversation-history")
                }).then(result => {
                  if (result && result[0] && result[0].result) {
                    try {
                      this.conversationHistory = JSON.parse(result[0].result);
                      this.loaded = true;
                      resolve(this.conversationHistory);
                    } catch (e) {
                      console.error('Error parsing stored conversation history:', e);
                      this.conversationHistory = [];
                      resolve([]);
                    }
                  } else {
                    this.conversationHistory = [];
                    resolve([]);
                  }
                }).catch(err => {
                  console.error('Error executing script:', err);
                  this.conversationHistory = [];
                  resolve([]);
                });
              } else {
                console.error('chrome.scripting.executeScript not available. Check extension permissions.');
                this.conversationHistory = [];
                resolve([]);
              }
            } catch (e) {
              console.error('Error accessing localStorage:', e);
              this.conversationHistory = [];
              resolve([]);
            }
          }
        });
      });
    });
  }
  
  /**
   * Get statistics for a specific time period
   * 
   * Filters conversation history based on specified time range
   * Calculates aggregated energy and water usage metrics
   * 
   * INPUT: period - String representing time period ('today', 'week', 'month', 'all')
   * OUTPUT: Statistics object containing usage metrics and filtered prompts
   * EXAMPLE: getStatsByPeriod('week') // Returns statistics for current week
   * 
   * Optimized for performance by calculating everything in a single pass
   */
  getStatsByPeriod(period) {
    if (!this.loaded) {
      return null; // Not loaded yet
    }
    
    const now = new Date();
    let startDate;
    
    // Calculate start date based on period
    switch(period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        // Start of the current week (Sunday)
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Beginning of time
        break;
    }
    
    // Filter prompts for the selected period
    const filteredPrompts = this.conversationHistory.filter(item => {
      const promptDate = new Date(item.timestamp);
      return promptDate >= startDate && promptDate <= now;
    });
    
    // Calculate aggregate statistics
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
  
  /**
   * Generate environmental impact comparisons
   * 
   * Creates user-friendly comparisons to help understand the impact
   * Dynamically selects appropriate comparisons based on usage levels
   * 
   * INPUT: stats - Statistics object from getStatsByPeriod()
   * OUTPUT: String with human-readable comparisons
   * EXAMPLE: generateEcoComparisons(stats) // Returns "Your energy usage (0.125 Wh) is less than what your smartphone uses during a quick charge."
   * 
   * Uses conditional logic to select relevant comparisons at different scales
   */
  generateEcoComparisons(stats) {
    if (!stats) return "No data available for comparisons.";
    
    const { totalEnergyKwh, totalWaterMl } = stats;
    
    // Convert kWh to Wh for smaller values
    const energyWh = totalEnergyKwh * 1000;
    
    let comparisons = [];
    
    // Energy comparisons - modernized language
    if (energyWh < 1) {
      comparisons.push(`Your energy usage (${energyWh.toFixed(3)} Wh) is less than what your smartphone uses during a quick charge.`);
    } else if (energyWh < 5) {
      comparisons.push(`Your energy footprint (${energyWh.toFixed(2)} Wh) could pump approximately ${(energyWh * 15).toFixed(1)} liters of fresh water from a well.`);
    } else if (energyWh < 15) {
      comparisons.push(`Your energy consumption (${energyWh.toFixed(2)} Wh) equals running a modern LED bulb for about ${(energyWh / 10).toFixed(1)} hours.`);
    } else if (energyWh < 100) {
      comparisons.push(`Your energy impact (${energyWh.toFixed(1)} Wh) is equivalent to powering a laptop for approximately ${(energyWh / 50).toFixed(1)} hours.`);
    } else {
      comparisons.push(`Your energy consumption (${totalEnergyKwh.toFixed(3)} kWh) represents roughly ${(totalEnergyKwh / 0.05).toFixed(1)}% of an average US household's daily usage.`);
    }
    
    // Water comparisons - modernized language
    if (totalWaterMl < 50) {
      comparisons.push(`You've used about ${totalWaterMl.toFixed(1)} ml of water — less than a single espresso shot.`);
    } else if (totalWaterMl < 250) {
      comparisons.push(`Your water footprint is approximately ${totalWaterMl.toFixed(1)} ml — similar to a standard cup of coffee.`);
    } else if (totalWaterMl < 1000) {
      comparisons.push(`Your water usage totals about ${totalWaterMl.toFixed(1)} ml — equivalent to a regular bottle of water.`);
    } else {
      const liters = totalWaterMl / 1000;
      comparisons.push(`Your water consumption is approximately ${liters.toFixed(2)} liters — the same as ${(liters / 8).toFixed(2)} quick showers.`);
    }
    
    return comparisons.join(' ');
  }
  
  /**
   * Submit water usage data to the backend server
   * 
   * Only submits if data reporting is enabled by user
   * Uses delta reporting to only submit new data
   * 
   * INPUT: waterUsageML - Total water usage in milliliters
   * OUTPUT: Promise resolving to boolean success indicator
   * EXAMPLE: await submitWaterUsage(250.5) // Submits 250.5ml to server
   * 
   * Uses pseudonymous ID system for privacy
   * Error handling for network issues
   */
  async submitWaterUsage(waterUsageML) {
    if (!this.dataReportingEnabled) return false;
    
    try {
      // Retrieve the stored last submitted amount
      const storageData = await new Promise(resolve => {
        chrome.storage.local.get('lastSubmittedWaterUsage', resolve);
      });
      const previouslySubmitted = storageData.lastSubmittedWaterUsage || 0;
      
      // Only submit if there's new data to report
      if (waterUsageML <= previouslySubmitted) {
        console.log('No new water usage to submit');
        return true; // No error, just nothing to submit
      }
      
      const userId = this.generateAnonymousId();
      const response = await fetch('http://localhost:3000/api/submit-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          waterUsageML,
          previouslySubmitted,
          userId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Store the new submitted amount
        this.lastSubmittedWaterUsage = waterUsageML;
        chrome.storage.local.set({ lastSubmittedWaterUsage: waterUsageML });
        console.log(`Successfully submitted water usage: ${waterUsageML - previouslySubmitted}ml (new delta)`);
      }
      return data.success;
    } catch (error) {
      console.error('Error submitting water usage data:', error);
      return false;
    }
  }
  
  /**
   * Generate a pseudonymous ID for reporting
   * 
   * Creates or retrieves a user identifier that doesn't contain PII
   * 
   * INPUT: None
   * OUTPUT: String containing pseudonymous user ID
   * EXAMPLE: generateAnonymousId() // Returns "user-a7b9c3"
   * 
   * Uses localStorage for persistence across sessions
   * Avoids tracking personal information
   */
  generateAnonymousId() {
    // Check if we already have an ID stored
    const storedId = localStorage.getItem('hwiai-anonymous-id');
    if (storedId) return storedId;
    
    // Generate a new ID (simple uuid-like string)
    const newId = 'user-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('hwiai-anonymous-id', newId);
    return newId;
  }
  
  /**
   * Toggle data reporting setting
   * 
   * Enables/disables anonymous data reporting to server
   * 
   * INPUT: enabled - Boolean indicating whether reporting should be enabled
   * OUTPUT: None
   * EXAMPLE: toggleDataReporting(true) // Enables data reporting
   * 
   * Persists setting in Chrome storage
   * Submits accumulated data if newly enabled
   */
  toggleDataReporting(enabled) {
    this.dataReportingEnabled = enabled;
    chrome.storage.local.set({dataReportingEnabled: enabled});
    
    // If newly enabled, submit accumulated data
    if (enabled) {
      this.submitAccumulatedData();
    }
  }
  
  /**
   * Submit all accumulated data if opted-in
   * 
   * Submits total water usage data when user opts into reporting
   * 
   * INPUT: None
   * OUTPUT: None (submits data to server if enabled)
   * EXAMPLE: submitAccumulatedData() // Submits all water usage data if enabled
   * 
   * Only runs if data reporting is enabled
   */
  async submitAccumulatedData() {
    if (!this.dataReportingEnabled) return;
    
    const stats = this.getStatsByPeriod('all');
    if (stats && stats.totalWaterMl > 0) {
      await this.submitWaterUsage(stats.totalWaterMl);
    }
  }
}

// Create a global instance
window.energyStats = new EnergyStatisticsCalculator();
