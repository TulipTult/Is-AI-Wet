// How Wet is AI? - Water & Energy Impact Tracker

// Initialize the UI
document.addEventListener('DOMContentLoaded', async () => {
  // Setup tab navigation
  setupTabs();
  
  // Load conversation history and calculate initial statistics
  await loadStats();
  
  // Setup event listeners
  setupEventListeners();
  
  // If popup was opened via browser action, no need to trigger overlay
  // Only trigger when opened via content script
  const queryParams = new URLSearchParams(window.location.search);
  if (queryParams.get('source') === 'contentScript') {
    triggerHistoryOverlay();
  }
});

// Setup tab navigation
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

// Load statistics and update UI
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

// Update the stats display for the selected period
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
  
  // Generate and display eco-comparison
  ecoComparisonEl.textContent = window.energyStats.generateEcoComparisons(stats);
}

// Update the prompts list
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

// Setup event listeners
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
}

// Export history as JSON
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

// Export history as CSV
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

// Clear history
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

// Function to send a message to the active tab to trigger the history overlay
function triggerHistoryOverlay() {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "showHistoryOverlay" });
  });
}
