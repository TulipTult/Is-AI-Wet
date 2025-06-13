/**
 * How Wet is AI? - Water & Energy Impact Tracker
 * 
 * This file manages the popup UI for the Chrome extension, displaying water
 * and energy usage statistics for ChatGPT conversations.
 * 
 * Key functionality:
 * - Tab navigation between Statistics and Prompts views
 * - Loading and displaying statistics from different time periods
 * - Visualizing water usage with animated graphics
 * - Exporting conversation history in JSON and CSV formats
 * 
 * UI Components:
 * - Water cup visualization with dynamic fill level
 * - Statistical counters for energy and water usage
 * - Prompt history list with timestamps
 * - Data sharing toggle for anonymized reporting
 * 
 * @author How Wet is AI? Team
 * @version 1.0.0
 */

/**
 * Initialize the UI
 * 
 * Sets up the extension popup with loading animation
 * Delays full initialization to improve perceived performance
 * 
 * INPUT: None (triggered by DOM content loaded event)
 * OUTPUT: Initialized popup interface
 * EXAMPLE: When popup opens, shows loading animation, then transitions to app
 * 
 * Uses setTimeout for smoother visual transitions
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Show loading animation first
  const loadingScreen = document.getElementById('loading-screen');
  
  // Hide loading screen after 1.5 seconds
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      initializeApp(); // Initialize the app after loading animation
    }, 300); // Additional time for fade out animation
  }, 1500);
});

/**
 * Initialize the application components
 * 
 * Sets up tabs, loads statistics, and configures event listeners
 * Checks for source parameter to determine if overlay should be shown
 * 
 * INPUT: None
 * OUTPUT: Fully initialized application
 * EXAMPLE: initializeApp() sets up all interactive elements and displays initial data
 * 
 * Separating initialization improves code organization and testability
 */
function initializeApp() {
  // Setup tab navigation
  setupTabs();
  
  // Load conversation history and calculate initial statistics
  loadStats();
  
  // Setup event listeners
  setupEventListeners();
  
  // If popup was opened via browser action, no need to trigger overlay
  // Only trigger when opened via content script
  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.get('source') === 'contentScript') {
    triggerHistoryOverlay();
  }
}

/**
 * Setup tab navigation system
 * 
 * Configures tab navigation between Statistics and Prompts views
 * 
 * INPUT: None
 * OUTPUT: Configured tab navigation system
 * EXAMPLE: Clicking "Statistics" tab shows statistics content and hides prompts content
 * 
 * Uses event delegation for efficiency
 * Applies CSS classes to show/hide appropriate content
 */
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show corresponding content
      const tabName = tab.getAttribute('data-tab');
      document.getElementById(`${tabName}-content`).classList.add('active');
    });
  });
}

/**
 * Load statistics and update UI
 * 
 * Loads conversation history and updates statistics display
 * 
 * INPUT: None
 * OUTPUT: Updated UI with latest statistics and prompts list
 * EXAMPLE: loadStats() fetches data and updates counters, water visualization
 * 
 * Uses async/await for clean promise handling
 * Error handling for data loading issues
 */
async function loadStats() {
  try {
    // Load conversation history
    await window.energyStats.loadConversationHistory();
    
    // Get the selected time period
    const periodSelect = document.getElementById('time-period');
    const selectedPeriod = periodSelect.value;
    
    updateStatsDisplay(selectedPeriod);
    updatePromptsList();
  } catch (error) {
    console.error('Error loading statistics:', error);
    document.getElementById('total-energy').textContent = 'Error loading data';
  }
}

/**
 * Update the statistics display for the selected period
 * 
 * Updates all UI elements with statistics for the selected time period
 * 
 * INPUT: period - String representing time period ('today', 'week', 'month', 'all')
 * OUTPUT: Updated UI elements with new statistics
 * EXAMPLE: updateStatsDisplay('week') shows statistics for the current week
 * 
 * Contains intelligent formatting for different units (ml/L, Wh/kWh)
 * Animates the water cup fill level based on usage
 */
function updateStatsDisplay(period) {
  const stats = window.energyStats.getStatsByPeriod(period);
  
  if (!stats) {
    console.error('No stats available');
    return;
  }
  
  // Update UI elements
  const totalEnergyEl = document.getElementById('total-energy');
  const totalWaterEl = document.getElementById('total-water');
  const promptCountEl = document.getElementById('prompt-count');
  const tokenCountEl = document.getElementById('token-count');
  const ecoComparisonEl = document.getElementById('eco-comparison-text');
  const waterCupEl = document.getElementById('water');
  
  // Format energy value (use Wh for small values, kWh for larger)
  let energyDisplay;
  if (stats.totalEnergyKwh < 0.001) {
    energyDisplay = `${(stats.totalEnergyKwh * 1000).toFixed(2)} Wh`;
  } else {
    energyDisplay = `${stats.totalEnergyKwh.toFixed(6)} kWh`;
  }
  
  // Format water usage
  let waterDisplay;
  if (stats.totalWaterMl >= 1000) {
    waterDisplay = `${(stats.totalWaterMl / 1000).toFixed(2)} liters`;
  } else {
    waterDisplay = `${stats.totalWaterMl.toFixed(2)} ml`;
  }
  
  // Update UI
  totalEnergyEl.textContent = energyDisplay;
  totalWaterEl.textContent = waterDisplay;
  promptCountEl.textContent = stats.totalPrompts.toString();
  tokenCountEl.textContent = stats.totalTokens.toLocaleString();
  
  // Update water cup fill level
  // Calculate fill percentage based on water usage with period-specific multipliers
  let fillMultiplier;
  switch(period) {
    case 'today':
      fillMultiplier = 0.8;
      break;
    case 'week':
      fillMultiplier = 0.1;
      break;
    case 'month':
      fillMultiplier = 0.025;
      break;
    case 'all':
    default:
      fillMultiplier = 0.005;
      break;
  }
  // Cap at 100% to avoid overflow
  const fillLevel = Math.min(stats.totalWaterMl * fillMultiplier, 100);
  waterCupEl.style.height = fillLevel + '%';
  
  // Generate and display eco-comparison
  ecoComparisonEl.textContent = window.energyStats.generateEcoComparisons(stats);
  
  // Check if data reporting is enabled and submit stats
  chrome.storage.local.get('dataReportingEnabled', (result) => {
    if (result.dataReportingEnabled === true && period === 'all') {
      // Only submit data for "all time" view to avoid duplicate submissions
      window.energyStats.submitWaterUsage(stats.totalWaterMl);
    }
  });
}

/**
 * Update the prompts list in the UI
 * 
 * Populates the prompts tab with recorded conversations
 * 
 * INPUT: None (uses conversation history from energyStats)
 * OUTPUT: Updated UI with list of recorded prompts
 * EXAMPLE: updatePromptsList() displays all recorded prompts with timestamps and impact data
 * 
 * Sorts prompts by timestamp (newest first)
 * Truncates very long prompts for better display
 */
function updatePromptsList() {
  const conversationList = document.getElementById('conversation-list');
  const history = window.energyStats.conversationHistory;
  
  if (!history || history.length === 0) {
    conversationList.innerHTML = '<p class="empty-state">No prompts recorded yet.</p>';
    return;
  }
  
  conversationList.innerHTML = '';
  
  // Sort prompts by timestamp (newest first)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  // Display prompts
  sortedHistory.forEach(item => {
    const promptElement = document.createElement('div');
    promptElement.className = 'prompt-item';
    
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date(item.timestamp).toLocaleString();
    
    const promptText = document.createElement('div');
    promptText.className = 'prompt';
    promptText.textContent = item.prompt.length > 300 
      ? item.prompt.substring(0, 300) + '...' 
      : item.prompt;
    
    const impactInfo = document.createElement('div');
    impactInfo.className = 'environmental-impact';
    
    if (item.energyData) {
      // Format energy (use Wh for small values)
      let energyText;
      if (item.energyData.realWorldKWh < 0.001) {
        energyText = `${(item.energyData.realWorldKWh * 1000).toFixed(2)} Wh`;
      } else {
        energyText = `${item.energyData.realWorldKWh.toFixed(6)} kWh`;
      }
      
      impactInfo.innerHTML = `
        <strong>Tokens:</strong> ${item.energyData.totalTokens.toLocaleString()}<br>
        <strong>Energy:</strong> ${energyText}<br>
        <strong>Water:</strong> ${item.energyData.realWorldWaterUsageMl.toFixed(2)} ml
      `;
    } else {
      impactInfo.textContent = 'Energy data not available';
    }
    
    promptElement.appendChild(timestamp);
    promptElement.appendChild(promptText);
    promptElement.appendChild(impactInfo);
    
    conversationList.appendChild(promptElement);
  });
}

/**
 * Setup event listeners for UI elements
 * 
 * Configures all interactive elements in the UI
 * 
 * INPUT: None
 * OUTPUT: Configured event listeners
 * EXAMPLE: Clicking "Export JSON" button triggers exportAsJSON function
 * 
 * Uses event delegation where appropriate
 * Initializes toggle states from saved preferences
 */
function setupEventListeners() {
  // Period selector
  document.getElementById('time-period').addEventListener('change', function() {
    updateStatsDisplay(this.value);
  });
  
  // Export buttons
  document.getElementById('export-json').addEventListener('click', exportAsJSON);
  document.getElementById('export-csv').addEventListener('click', exportAsCSV);
  
  // Clear history button
  document.getElementById('clear-history').addEventListener('click', clearHistory);
  
  // Data sharing toggle
  const dataSharingToggle = document.getElementById('data-sharing-toggle');
  if (dataSharingToggle) {
    // Initialize toggle state from storage
    chrome.storage.local.get('dataReportingEnabled', (result) => {
      dataSharingToggle.checked = result.dataReportingEnabled === true;
    });
    
    // Add event listener for toggle
    dataSharingToggle.addEventListener('change', function() {
      window.energyStats.toggleDataReporting(this.checked);
      
      // If enabled, submit accumulated data
      if (this.checked) {
        window.energyStats.submitAccumulatedData();
      }
    });
  }
}

/**
 * Export conversation history as JSON
 * 
 * Creates and triggers download of conversation history in JSON format
 * 
 * INPUT: None (gets data from energyStats)
 * OUTPUT: Downloaded JSON file with conversation history
 * EXAMPLE: User clicks "Export JSON" and receives a file with all recorded data
 * 
 * Uses data URI approach for browser downloads
 * Includes date in filename for better organization
 */
function exportAsJSON() {
  const history = window.energyStats.conversationHistory;
  
  if (!history || history.length === 0) {
    alert('No history to export');
    return;
  }
  
  const dataStr = JSON.stringify(history, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileName = `chatgpt-history-${new Date().toISOString().slice(0,10)}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileName);
  linkElement.style.display = 'none';
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
}

/**
 * Export history as CSV
 * 
 * Creates and triggers download of conversation history in CSV format
 * 
 * INPUT: None (gets data from energyStats)
 * OUTPUT: Downloaded CSV file with conversation history
 * EXAMPLE: User clicks "Export CSV" and receives a CSV file with all prompt data
 * 
 * Properly escapes CSV content (handles quotes in text)
 * Uses data URI approach for browser downloads
 */
function exportAsCSV() {
  const history = window.energyStats.conversationHistory;
  
  if (!history || history.length === 0) {
    alert('No history to export');
    return;
  }
  
  let csvContent = 'Timestamp,Prompt,Tokens,Energy (kWh),Water (ml)\n';
  
  history.forEach(item => {
    // Escape and format for CSV
    const timestamp = item.timestamp;
    const prompt = `"${item.prompt.replace(/"/g, '""')}"`;
    
    let tokens = 0, energy = 0, water = 0;
    if (item.energyData) {
      tokens = item.energyData.totalTokens || 0;
      energy = item.energyData.realWorldKWh || 0;
      water = item.energyData.realWorldWaterUsageMl || 0;
    }
    
    csvContent += `${timestamp},${prompt},${tokens},${energy},${water}\n`;
  });
  
  const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  const exportFileName = `chatgpt-history-${new Date().toISOString().slice(0,10)}.csv`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileName);
  linkElement.style.display = 'none';
  document.body.appendChild(linkElement);
  linkElement.click();
  document.body.removeChild(linkElement);
}

/**
 * Clear conversation history
 * 
 * Removes all recorded conversations after confirmation
 * 
 * INPUT: None (user confirmation via dialog)
 * OUTPUT: Cleared history if confirmed
 * EXAMPLE: User clicks "Clear History", confirms, and all recorded data is removed
 * 
 * Uses confirmation dialog to prevent accidental data loss
 * Sends message to content script to clear localStorage data
 */
function clearHistory() {
  if (confirm('Are you sure you want to clear all conversation history? This cannot be undone.')) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: "clearHistory" }, (response) => {
        if (response && response.success) {
          window.energyStats.conversationHistory = [];
          updateStatsDisplay('today');
          updatePromptsList();
        } else {
          alert('Failed to clear history. Try reloading the page.');
        }
      });
    });
  }
}

/**
 * Trigger the history overlay in the content script
 * 
 * Sends a message to the active tab to display the history overlay
 * 
 * INPUT: None
 * OUTPUT: Message sent to content script
 * EXAMPLE: triggerHistoryOverlay() shows history overlay in ChatGPT page
 * 
 * Uses Chrome messaging API to communicate with content script
 */
function triggerHistoryOverlay() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "showHistoryOverlay" });
  });
}
