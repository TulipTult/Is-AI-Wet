# "How Wet is AI?" Chrome Extension - GUI Testing Guide

This document provides comprehensive instructions for testing the graphical user interface (GUI) of the "How Wet is AI?" Chrome extension. These tests ensure that all visual elements, interactions, and displays function correctly across different scenarios.

## Prerequisites

Before beginning the GUI tests, ensure you have:

1. Google Chrome browser (latest stable version)
2. The "How Wet is AI?" extension installed in developer mode
3. Access to [ChatGPT](https://chat.openai.com) with a valid account
4. Chrome DevTools knowledge (basic)

## Test Environment Setup

1. **Install the extension in developer mode:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top-right corner)
   - Click "Load unpacked" and select the extension directory
   - Verify the extension icon appears in your Chrome toolbar

2. **Prepare test ChatGPT conversations:**
   - Prepare 1-2 new conversations in ChatGPT
   - Have at least one existing conversation with multiple prompts

## GUI Test Cases

### 1. Basic Popup Interface Tests

#### 1.1 Extension Icon & Popup Launch
- **Test:** Click the "How Wet is AI?" extension icon in the Chrome toolbar
- **Expected:** Popup should open smoothly with loading animation followed by the main interface
- **Verify:** 
  - Loading animation appears and fades out properly
  - Title "How Wet is AI?" is displayed
  - Water cup visualization appears below the title
  - Two tabs ("Statistics" and "Prompts") are visible
  - Statistics tab is selected by default

#### 1.2 Compatibility Message
- **Test:** Open the extension popup while on a non-ChatGPT website (e.g., google.com)
- **Expected:** Popup should display a compatibility message instead of the main interface
- **Verify:**
  - Extension icon and header are visible
  - Message states the extension only works on ChatGPT
  - "Visit ChatGPT" button is displayed and functional

#### 1.3 Tab Navigation
- **Test:** Click between the "Statistics" and "Prompts" tabs
- **Expected:** Interface should change between views without page reload
- **Verify:**
  - Active tab has different styling (background color change)
  - Content area updates to show appropriate view
  - Transition between views is smooth (with fade animation)

### 2. Statistics View Tests

#### 2.1 Period Selector
- **Test:** Change the time period dropdown (Today, This Week, This Month, All Time)
- **Expected:** Statistics should update to reflect the selected period
- **Verify:**
  - Dropdown has all four options
  - Selecting a different period updates displayed statistics
  - Water visualization level changes appropriately
  - Environmental comparison text updates

#### 2.2 Water Cup Visualization
- **Test:** Observe the water cup visualization after several prompts
- **Expected:** Water level should represent usage based on selected period
- **Verify:**
  - Water has blue gradient appearance
  - Level increases after new prompts are recorded
  - Animation is smooth when level changes

#### 2.3 Statistics Display
- **Test:** Verify all statistics metrics are displayed correctly
- **Expected:** All metrics should show appropriate values and units
- **Verify:**
  - "Total Energy" shows value with appropriate units (Wh or kWh)
  - "Total Water" shows value with appropriate units (ml or liters)
  - "Prompts" shows number of tracked prompts
  - "Tokens" shows number with proper formatting for large numbers

#### 2.4 Environmental Context
- **Test:** Read the environmental comparison text
- **Expected:** Text should provide relevant comparisons based on usage
- **Verify:**
  - Text is grammatically correct and readable
  - Comparisons are appropriate for the usage level
  - Both energy and water comparisons are included

#### 2.5 Data Sharing Toggle
- **Test:** Toggle the data sharing option on and off
- **Expected:** Toggle should change state visually and save preference
- **Verify:**
  - Toggle switches between on/off states with animation
  - Setting persists if popup is closed and reopened
  - Info text explains what data is shared

### 3. Prompts View Tests

#### 3.1 Prompts List
- **Test:** Open the Prompts tab after using ChatGPT
- **Expected:** List should display recorded prompts in reverse chronological order
- **Verify:**
  - Each prompt entry shows timestamp, text content, and environmental impact
  - Most recent prompts appear at the top
  - Long prompts are truncated with ellipsis
  - Environmental impact shows tokens, energy (Wh/kWh), and water (ml)

#### 3.2 Empty State
- **Test:** Clear history (or test on new installation) and check Prompts tab
- **Expected:** Empty state message should display when no prompts are recorded
- **Verify:** Message indicates no prompts have been recorded yet

#### 3.3 Export Controls
- **Test:** Click the "Export JSON" and "Export CSV" buttons
- **Expected:** Files should download with prompt history data
- **Verify:**
  - Files download without errors
  - Downloaded files contain correct data in appropriate format
  - Filenames have appropriate extensions (.json/.csv)

#### 3.4 Clear History
- **Test:** Click the "Clear History" button
- **Expected:** Confirmation dialog should appear and, if confirmed, history should be cleared
- **Verify:**
  - Confirmation dialog shows appropriate warning
  - After confirming, prompt list is emptied
  - Statistics reset to zero
  - Empty state message appears in Prompts tab

### 4. In-Page Integration Tests

#### 4.1 Floating Button
- **Test:** Visit ChatGPT and look for the "View Prompts" button
- **Expected:** Button should be visible in the bottom-right corner
- **Verify:**
  - Button has correct styling (blue background, white text)
  - Button position is fixed when scrolling

#### 4.2 Popup From Page Button
- **Test:** Click the "View Prompts" button on ChatGPT page
- **Expected:** Extension popup should open in a new window
- **Verify:**
  - Popup opens in a separate window
  - Window has appropriate size
  - Statistics reflect current conversation

#### 4.3 Real-Time Updating
- **Test:** Send several prompts to ChatGPT while keeping the extension popup open
- **Expected:** Statistics should update after new prompts are sent
- **Verify:**
  - After refreshing the popup, new prompts appear in the list
  - Water and energy usage statistics increase
  - Environmental comparison text updates accordingly

### 5. Visual Consistency Tests

#### 5.1 Responsive Layout
- **Test:** Resize the popup window (when opened as separate window)
- **Expected:** Layout should adjust to different widths
- **Verify:**
  - No horizontal scrollbar appears
  - Elements resize appropriately
  - Text remains readable

#### 5.2 Text Truncation
- **Test:** Check very long prompts in the Prompts tab
- **Expected:** Text should truncate with ellipsis if too long
- **Verify:** Long text is cut off with "..." and doesn't break layout

#### 5.3 Large Numbers
- **Test:** Accumulate large token counts (50,000+)
- **Expected:** Large numbers should format correctly
- **Verify:** Numbers display with thousand separators (e.g., 50,000 not 50000)



## Troubleshooting Common Testing Issues

### Extension Not Loading
- Ensure Developer mode is enabled in Chrome extensions page
- Check for Console errors in DevTools
- Try reloading the extension using the refresh icon in chrome://extensions/

### Statistics Not Updating
- Make sure you're using the extension on chat.openai.com
- Check if multiple extension instances are running (disable other versions)
- Verify the content script is loading by checking Console logs

### Export Not Working
- Check if downloads are being blocked by Chrome
- Inspect browser console for JavaScript errors
- Verify you have write permissions on the download destination
