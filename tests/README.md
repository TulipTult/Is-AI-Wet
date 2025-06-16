# How Wet is AI? - Testing Guide

This directory contains tests for the How Wet is AI? Chrome extension and website.

## Testing Setup

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Chrome browser

### Installation
```bash
# Install dependencies
npm install

# Install dev dependencies for testing
npm install --save-dev jest puppeteer @testing-library/dom @testing-library/jest-dom jest-environment-jsdom
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npx jest tests/unit/tokenEstimatorTest.js
```


## Test Structure

### Unit Tests
- `tokenEstimatorTest.js` - Tests for token estimation logic
- `energyCalculationTest.js` - Tests for energy and water usage calculations
- `conversationHistoryTest.js` - Tests for conversation history management
- `serverApiTest.js` - Tests for API communication with server

### GUI Tests
- `popupTest.js` - Tests for the extension popup UI
- `contentScriptTest.js` - Tests for content script overlay and interactions
- `websiteTest.js` - Tests for website display and functionality

## Test Coverage

The test suite aims to cover:
- All code branches (if/else, switch statements)
- Edge cases and boundary conditions
- Error handling and recovery
- Input validation and formatting
- User interactions and workflows

## Adding New Tests

When adding new functionality to the project, please add corresponding tests:

1. For new functions/methods, add unit tests
2. For UI changes, update or add GUI tests
3. For API changes, update server API tests

## Manual Testing Checklist

For features that are difficult to automatically test:

- [ ] Extension installation works correctly
- [ ] Popup displays correctly across different screen sizes
- [ ] Water visualization animates properly
- [ ] Data is persisted between sessions
- [ ] Extension works with ChatGPT's latest interface
- [ ] Website displays properly on mobile and desktop devices
