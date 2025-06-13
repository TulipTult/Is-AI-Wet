// ChatGPT Energy Statistics Calculator

class EnergyStatisticsCalculator {
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
  
  // Get statistics for a specific time period
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
  
  // Generate environmental impact comparisons
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
  
  // New method to submit water usage to the backend
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
  
  // Generate a pseudonymous ID for reporting
  generateAnonymousId() {
    // Check if we already have an ID stored
    const storedId = localStorage.getItem('hwiai-anonymous-id');
    if (storedId) return storedId;
    
    // Generate a new ID (simple uuid-like string)
    const newId = 'user-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('hwiai-anonymous-id', newId);
    return newId;
  }
  
  // Toggle data reporting setting
  toggleDataReporting(enabled) {
    this.dataReportingEnabled = enabled;
    chrome.storage.local.set({dataReportingEnabled: enabled});
    
    // If newly enabled, submit accumulated data
    if (enabled) {
      this.submitAccumulatedData();
    }
  }
  
  // Submit accumulated data if opted-in
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
