// ChatGPT Prompt Recorder with Energy Calculation

// Import or include the token estimator functionality
// We'll include a simplified version directly in this file
function estimateResponseTokens(prompt, promptTokenCount) {
    // Simplified version of the token estimator from tokenEstimator.js
    const lower = prompt.toLowerCase();
    
    // Simple pattern checking for common requests
    if (lower.match(/^(is|are|was|were|do|does|did|can|could|will|would|should|has|have|had)\b.*\?$/i)) {
        return Math.max(promptTokenCount * 1.2, 20); // Simple yes/no questions
    }
    
    // Check for creative writing requests
    if (lower.includes("write a story") || lower.includes("write an essay") || 
        lower.includes("poem") || lower.includes("fiction")) {
        return Math.max(1500, promptTokenCount * 7); // Creative tasks get longer responses
    }
    
    // Check for code generation
    if (lower.includes("code") || lower.includes("program") || lower.includes("function") ||
        lower.includes("javascript") || lower.includes("python") || lower.includes("java")) {
        return Math.max(800, promptTokenCount * 5); // Code tends to have medium responses
    }
    
    // Default estimate - moderate to detailed response
    return Math.max(promptTokenCount * 3, 200);
}

// Simplified energy calculation based on the index.js file
function calculateEnergy(prompt, promptTokens) {
    // Constants
    const BASE_KWH_PER_1000_TOKENS = 0.002;
    const WATER_USAGE_ML_PER_KWH = 1500;
    const DATACENTER_OVERHEAD_FACTOR = 2.5;
    const IDLE_LOAD_FACTOR = 1.7;
    const NETWORK_OVERHEAD_FACTOR = 1.15;
    const AMORTIZED_TRAINING_FACTOR = 1.2;
    const PRODUCTION_ENVIRONMENT_FACTOR = 1.3;
    
    // Estimate response tokens
    const estimatedResponseTokens = estimateResponseTokens(prompt, promptTokens);
    const totalTokens = promptTokens + estimatedResponseTokens;
    
    // Basic complexity assessment (simplified)
    const complexity = Math.min((prompt.length / 500) * 0.5, 0.8);
    
    // Base energy calculation
    const baseKWh = (totalTokens / 1000) * BASE_KWH_PER_1000_TOKENS;
    
    // Apply a simplified modifier
    const totalModifier = 1 + (complexity * 0.5);
    
    // Direct inference energy calculation
    const directKWh = baseKWh * totalModifier;
    const directWaterUsageMl = directKWh * WATER_USAGE_ML_PER_KWH;
    
    // Real-world total energy with overhead
    const realWorldKWh = directKWh * DATACENTER_OVERHEAD_FACTOR * IDLE_LOAD_FACTOR * 
                       NETWORK_OVERHEAD_FACTOR * AMORTIZED_TRAINING_FACTOR * PRODUCTION_ENVIRONMENT_FACTOR;
    const realWorldWaterUsageMl = realWorldKWh * WATER_USAGE_ML_PER_KWH;
    
    return {
        promptTokens,
        estimatedResponseTokens,
        totalTokens,
        directKWh,
        directWaterUsageMl,
        realWorldKWh,
        realWorldWaterUsageMl
    };
}

// Function to count tokens (simplified)
function countTokens(text) {
    // Simple approximation: ~1.3 tokens per word
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words * 1.3);
}

// Data structure to store prompts
let conversationHistory = [];

// Load existing conversation history from localStorage
function loadConversationHistory() {
    const storedHistory = localStorage.getItem('chatgpt-conversation-history');
    if (storedHistory) {
        try {
            conversationHistory = JSON.parse(storedHistory);
            console.log('Loaded existing conversation history:', conversationHistory.length, 'prompts');
        } catch (e) {
            console.error('Error parsing stored conversation history:', e);
            conversationHistory = [];
        }
    }
}

// Save conversation history to localStorage
function saveConversationHistory() {
    localStorage.setItem('chatgpt-conversation-history', JSON.stringify(conversationHistory));
}

// Check if a prompt already exists in history
function isDuplicatePrompt(prompt) {
    return conversationHistory.some(item => item.prompt === prompt);
}

// Add a new prompt to history with energy calculation
function addPromptToHistory(prompt) {
    if (!prompt || isDuplicatePrompt(prompt)) {
        return false; // Don't add empty or duplicate prompts
    }
    
    const promptTokens = countTokens(prompt);
    const energyData = calculateEnergy(prompt, promptTokens);
    
    const newPrompt = {
        timestamp: new Date().toISOString(),
        prompt,
        energyData // Store energy calculations with the prompt
    };
    
    conversationHistory.push(newPrompt);
    saveConversationHistory();
    console.log('New prompt added with energy data:', prompt.substring(0, 50) + '...');
    return true;
}

// Function to extract text content from message elements
function extractMessageText(element) {
    if (!element) return '';
    
    // Clone the element to avoid modifying the DOM
    const clone = element.cloneNode(true);
    
    // Remove code blocks, buttons, and other non-text elements that might interfere
    const elementsToRemove = clone.querySelectorAll('pre, button, svg, img');
    elementsToRemove.forEach(el => el.remove());
    
    return clone.textContent.trim();
}

// Track the last processed messages to avoid duplicates
let lastProcessedPrompts = new Set();

// Process chat thread to find new prompts
function processChat() {
    console.log('Processing chat for new prompts...');
    
    // Find user messages
    const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
    
    console.log(`Found ${userMessages.length} user messages`);
    
    let allPromptsValid = true;
    
    // Process each user message
    userMessages.forEach(message => {
        const promptText = extractMessageText(message);
        
        // Generate a unique key for this prompt
        const promptKey = promptText.substring(0, 50);
        
        // Check if the prompt seems incomplete or unexpected
        if (promptText && promptText.length > 0) {
            if (!lastProcessedPrompts.has(promptKey)) {
                console.log('Found new prompt:', promptText.substring(0, 50) + '...');
                
                // Add the new prompt to our history
                const added = addPromptToHistory(promptText);
                
                // If the prompt couldn't be added (e.g., it's invalid), mark for retry
                if (!added) {
                    allPromptsValid = false;
                } else {
                    // Mark this prompt as processed
                    lastProcessedPrompts.add(promptKey);
                
                    // Keep the processed prompts set from growing too large
                    if (lastProcessedPrompts.size > 200) {
                        // Remove the oldest entries (approximately)
                        const iterator = lastProcessedPrompts.values();
                        for (let i = 0; i < 50; i++) {
                            lastProcessedPrompts.delete(iterator.next().value);
                        }
                    }
                }
            }
        } else if (promptText !== '') {
            // If promptText exists but appears incomplete, mark for retry
            allPromptsValid = false;
        }
    });
    
    // If any prompt appears incomplete, schedule another check
    if (!allPromptsValid) {
        console.log('Some prompts appear incomplete, will retry in 7 seconds');
        setTimeout(processChat, 7000);
    }
    
    // If the direct approach didn't find anything, try alternative selectors
    if (userMessages.length === 0) {
        console.log('Falling back to alternative message detection methods...');
        
        // Try to find user messages through other selectors
        const alternativeUserMessages = document.querySelectorAll('[role="row"] [data-role="user"], .message-thread [data-testid*="user"], .user-message');
        
        let allAlternativePromptsValid = true;
        
        alternativeUserMessages.forEach(message => {
            const promptText = extractMessageText(message);
            const promptKey = promptText.substring(0, 50);
            
            if (promptText && promptText.length > 0) {
                if (!lastProcessedPrompts.has(promptKey)) {
                    const added = addPromptToHistory(promptText);
                    if (!added) {
                        allAlternativePromptsValid = false;
                    } else {
                        lastProcessedPrompts.add(promptKey);
                    }
                }
            } else if (promptText !== '') {
                allAlternativePromptsValid = false;
            }
        });
        
        // If any alternative prompt appears incomplete, schedule another check
        if (!allAlternativePromptsValid) {
            console.log('Some alternative prompts appear incomplete, will retry in 7 seconds');
            setTimeout(processChat, 7000);
        }
    }
}

// Setup periodic check for new messages
function setupPeriodicCheck() {
    console.log('ChatGPT Recorder: Setting up periodic check for new messages (every 7 seconds)');
    
    // Do initial processing after a short delay to ensure page is loaded
    setTimeout(processChat, 2000);
    
    // Set up interval to check for new messages every 7 seconds
    setInterval(processChat, 7000);
}

// Add a floating button to view conversation history
function addViewerButton() {
    const button = document.createElement('button');
    button.textContent = 'View Prompts';
    button.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        padding: 8px 12px;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    
    button.addEventListener('click', function() {
        // Create popup URL with source parameter
        const popupUrl = chrome.runtime.getURL('popup.html') + '?source=contentScript';
        
        // Open the popup in a small window
        window.open(
            popupUrl,
            'HowWetIsAI', 
            'width=420,height=650,status=no,scrollbars=yes,resizable=no'
        );
        
        // Don't toggle the overlay here, the popup will handle that
    });
    document.body.appendChild(button);
}

// Create and toggle history overlay
function toggleHistoryOverlay() {
    let overlay = document.getElementById('chatgpt-history-overlay');
    
    if (overlay) {
        // Toggle visibility if overlay already exists
        if (overlay.style.display === 'none') {
            overlay.style.display = 'block';
            updateHistoryOverlay(overlay);
        } else {
            overlay.style.display = 'none';
        }
        return;
    }
    
    // Create overlay if it doesn't exist
    overlay = document.createElement('div');
    overlay.id = 'chatgpt-history-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 50px;
        right: 20px;
        width: 400px;
        max-height: 80vh;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
        overflow-y: auto;
        padding: 15px;
        display: block;
    `;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
    `;
    closeButton.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
    
    // Add controls
    const controls = document.createElement('div');
    controls.style.cssText = 'margin-bottom: 15px;';
    
    const exportJsonButton = document.createElement('button');
    exportJsonButton.textContent = 'Export JSON';
    exportJsonButton.style.cssText = 'margin-right: 8px; padding: 5px 10px;';
    exportJsonButton.addEventListener('click', exportHistoryAsJSON);
    
    const exportCsvButton = document.createElement('button');
    exportCsvButton.textContent = 'Export CSV';
    exportCsvButton.style.cssText = 'margin-right: 8px; padding: 5px 10px;';
    exportCsvButton.addEventListener('click', exportHistoryAsCSV);
    
    controls.appendChild(exportJsonButton);
    controls.appendChild(exportCsvButton);
    
    // Add header
    const header = document.createElement('h3');
    header.textContent = 'Recorded Prompts';
    header.style.cssText = 'margin-top: 0; margin-bottom: 15px;';
    
    // Create content container
    const content = document.createElement('div');
    content.id = 'chatgpt-history-content';
    
    overlay.appendChild(closeButton);
    overlay.appendChild(header);
    overlay.appendChild(controls);
    overlay.appendChild(content);
    
    document.body.appendChild(overlay);
    updateHistoryOverlay(overlay);
}

// Update the history overlay with current conversation history
function updateHistoryOverlay(overlay) {
    const content = overlay.querySelector('#chatgpt-history-content');
    
    if (conversationHistory.length === 0) {
        content.innerHTML = '<p style="color: #666; font-style: italic;">No prompts recorded yet.</p>';
        return;
    }
    
    content.innerHTML = '';
    
    // Sort conversations newest first
    const sortedHistory = [...conversationHistory].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Display the conversation history
    sortedHistory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.style.cssText = `
            border: 1px solid #e5e5e5;
            border-radius: 5px;
            padding: 10px;
            margin-bottom: 10px;
        `;
        
        const timestamp = document.createElement('div');
        timestamp.style.cssText = 'color: #666; font-size: 12px; margin-bottom: 5px;';
        const date = new Date(item.timestamp).toLocaleString();
        timestamp.textContent = date;
        
        const prompt = document.createElement('div');
        prompt.style.cssText = 'background-color: #f0f0f0; padding: 8px; border-radius: 4px; white-space: pre-wrap;';
        prompt.textContent = item.prompt;
        
        const energyInfo = document.createElement('div');
        energyInfo.style.cssText = 'margin-top: 8px; font-size: 12px; color: #333;';
        
        if (item.energyData) {
            energyInfo.innerHTML = `
                <strong>Environmental Impact:</strong><br>
                Energy: ${item.energyData.realWorldWattHours ? (item.energyData.realWorldWattHours.toFixed(2) + ' Wh') : 
                         (item.energyData.realWorldKWh.toFixed(6) + ' kWh')}<br>
                Water: ${item.energyData.realWorldWaterUsageMl.toFixed(2)} ml
            `;
        } else {
            energyInfo.textContent = 'Energy data not available for this prompt.';
        }
        
        itemElement.appendChild(timestamp);
        itemElement.appendChild(prompt);
        itemElement.appendChild(energyInfo);
        
        content.appendChild(itemElement);
    });
}

// Export conversation history as JSON
function exportHistoryAsJSON() {
    const dataStr = JSON.stringify(conversationHistory, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'chatgpt-prompts.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.style.display = 'none';
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
}

// Export conversation history as CSV
function exportHistoryAsCSV() {
    let csvContent = 'Timestamp,Prompt\n';
    
    conversationHistory.forEach(item => {
        // Escape quotes and format for CSV
        const timestamp = item.timestamp;
        const prompt = `"${item.prompt.replace(/"/g, '""')}"`;
        
        csvContent += `${timestamp},${prompt}\n`;
    });
    
    const dataUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
    const exportFileDefaultName = 'chatgpt-prompts.csv';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.style.display = 'none';
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
}

// Initialize when the page is loaded
function initialize() {
    console.log('ChatGPT Conversation Recorder initialized');
    loadConversationHistory();
    
    // Give page more time to fully load before starting
    setTimeout(() => {
        setupPeriodicCheck();
        addViewerButton();
    }, 3000);
    
    // Also process whenever the URL changes (for when navigating between chats)
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log('URL changed, processing chat...');
            setTimeout(processChat, 2000);
        }
    }).observe(document, {subtree: true, childList: true});
    
    // Listen for messages from the extension popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "showHistoryOverlay") {
            toggleHistoryOverlay();
            sendResponse({status: "Overlay toggled"});
        } else if (request.action === "getConversationHistory") {
            sendResponse({history: conversationHistory});
        } else if (request.action === "clearHistory") {
            conversationHistory = [];
            saveConversationHistory();
            sendResponse({success: true});
        }
        return true;
    });
}

// Wait for the page to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
