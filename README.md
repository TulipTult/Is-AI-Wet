# How Wet is AI? - Water & Energy Impact Tracker

"How Wet is AI?" is a Chrome extension that tracks the environmental impact of ChatGPT interactions, showing you the water and energy usage of your AI conversations in real-time.


## Overview

Large Language Models like ChatGPT consume significant computational resources. This project helps raise awareness about the environmental footprint of AI by:

- Estimating water and energy usage for each prompt
- Providing a visual representation of your AI water footprint
- Allowing anonymous contribution to global usage statistics
- Creating environmental impact comparisons to understand the scale

## Getting Started

### Prerequisites

- Google Chrome browser or any browser with web extension for manifest V3.
- A ChatGPT account (free or paid)

### Installation

#### Manual Installation (Developer Mode)
1. Download this repository as a ZIP file and extract it
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extracted folder
5. The extension should now appear in your extensions list

## How to Use

### Tracking Your ChatGPT Usage

1. After installation, visit [ChatGPT](https://chat.openai.com)
2. Use ChatGPT normally - the extension will automatically track your prompts
3. Click on the extension icon in your browser toolbar to see your usage statistics:
   - Total water usage
   - Energy consumption
   - Number of prompts/tokens used
   - Environmental impact comparisons

### Viewing Different Time Periods

The extension allows you to view your usage over different time frames:
- Today
- This Week 
- This Month
- All Time

Simply select your preferred time period from the dropdown menu.

### Exporting Your Data

To export your conversation data:
1. Open the extension popup
2. Switch to the "Prompts" tab
3. Click either "Export JSON" or "Export CSV" button

### Contributing to Global Statistics

You can help build awareness about AI's environmental impact by sharing anonymous data:
1. Open the extension popup
2. Find the data sharing toggle at the bottom of the Statistics tab
3. Enable the toggle to anonymously contribute your water usage statistics
   - Only water consumption metrics are shared, no prompts or personal data

## Features

- 💧 **Water usage visualization**: See your water consumption represented as a filling cup
- ⚡ **Energy calculation**: Estimates both direct inference and real-world energy usage
- 📊 **Usage statistics**: Track tokens, prompts, and environmental impact over time
- 🌍 **Environmental comparisons**: Understand your impact through relatable examples
- 📝 **Prompt history**: View and export your conversation history
- 🔄 **Real-time updates**: Automatic data collection as you use ChatGPT
- 🧩 **Compatible with ChatGPT**: Works with both free and paid versions
- 🔒 **Privacy-focused**: All calculations happen locally; only anonymized metrics can be shared (opt-in)

## Development Setup

If you want to contribute to the development:

1. Clone the repository
```bash
git clone https://github.com/yourusername/Is-AI-Wet.git
cd Is-AI-Wet
```

2. Install dependencies for the server component
```bash
npm install
```

3. Run the server locally
```bash
node server.js
```

4. Load the extension in Chrome as described in the Manual Installation steps above

5. For running tests, refer to the [testing guide](./tests/README.md)

## Technical Details

The extension estimates water and energy usage based on:
- Token count for prompts and responses
- Complexity analysis of prompts
- Data center efficiency factors
- Real-world overhead calculations including PUE (Power Usage Effectiveness)
- Published research on LLM inference energy consumption

## License

[MIT License](LICENSE)

## Acknowledgements

- Based on research into energy consumption patterns of large language models
- Water usage calculations derived from data center cooling efficiency estimates
- Special thanks to all contributors and early testers
