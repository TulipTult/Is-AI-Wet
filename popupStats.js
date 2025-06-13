// ChatGPT Energy Statistics Calculator

class EnergyStatisticsCalculator {
  constructor() {
    this.conversationHistory = [];
    this.loaded = false;
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
              // Attempt to access localStorage through content script or background script
              chrome.tabs.executeScript(tabs[0].id, {
                code: 'localStorage.getItem("chatgpt-conversation-history");'
              }, (result) => {
                if (result && result[0]) {
                  try {
                    this.conversationHistory = JSON.parse(result[0]);
                    this.loaded = true;
                    resolve(this.conversationHistory);
                  } catch (e) {
                    console.error('Error parsing stored conversation history:', e);
                    this.conversationHistory = [];
                    resolve([]);
                  }
                } else {
                  // If we can't access localStorage or there's nothing stored
                  this.conversationHistory = [];
                  resolve([]);
                }
              });
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
}

// Create a global instance
window.energyStats = new EnergyStatisticsCalculator();
