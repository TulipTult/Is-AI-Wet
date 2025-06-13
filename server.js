/**
 * Water Usage Tracking Server
 * 
 * This Express server tracks and aggregates water usage data from the "How Wet is AI?" Chrome extension.
 * It provides API endpoints for submitting and retrieving water usage statistics.
 * 
 * Data Structure:
 * - totalWaterML: Total water usage in milliliters
 * - contributorCount: Number of unique users contributing data
 * - submittedUsers: Object tracking per-user contributions
 * - lastUpdated: Timestamp of the last data update
 * 
 * Efficiency considerations:
 * - Uses simple JSON file storage for persistence without requiring a database
 * - Implements delta updates to avoid double-counting contributions
 * - Maintains backward compatibility with previous versions
 * 
 * @author How Wet is AI? Team
 * @version 1.0.0
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Data storage file
const dataFilePath = path.join(__dirname, 'water-usage-data.json');

/**
 * Initialize data storage with default values if file doesn't exist
 * INPUT: None
 * OUTPUT: JSON file with initial data structure
 * EXAMPLE: When server first runs, it creates a water-usage-data.json file with 0 water usage
 * 
 * Using synchronous file operations here is appropriate since this only runs once at startup
 */
if (!fs.existsSync(dataFilePath)) {
  const initialData = {
    totalWaterML: 0,
    contributorCount: 0,
    submittedUsers: {}, // Track per-user contributions
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(dataFilePath, JSON.stringify(initialData, null, 2));
}

// Middleware
app.use(express.json());
app.use(cors()); // Allow cross-origin requests for local testing

/**
 * Serve static files from the website directory
 * Enables hosting the landing page and extension information
 * Uses Express's built-in static file server for efficiency
 * Future enhancement: Could add caching headers for better performance
 */
app.use(express.static(path.join(__dirname, 'website')));

/**
 * GET /api/water-usage - Retrieve current water usage statistics
 * 
 * INPUT: None
 * OUTPUT: JSON object with water usage statistics:
 * {
 *   totalWaterML: 12500,
 *   contributorCount: 25,
 *   submittedUsers: {...},
 *   lastUpdated: "2023-06-01T12:00:00Z"
 * }
 * 
 * EXAMPLE: A browser requests GET http://localhost:3000/api/water-usage
 * and receives the current statistics in JSON format
 * 
 * Error handling included for file reading issues
 */
app.get('/api/water-usage', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataFilePath));
    res.json(data);
  } catch (err) {
    console.error('Error reading water usage data:', err);
    res.status(500).json({ error: 'Failed to retrieve water usage data' });
  }
});

/**
 * POST /api/submit-usage - Submit water usage data from extension
 * 
 * INPUT: JSON object in request body:
 * {
 *   waterUsageML: 250.5,        // Current total water usage from user
 *   userId: "user-abc123",      // Anonymous ID for tracking unique users
 *   previouslySubmitted: 125.2  // Optional: Previous submission amount
 * }
 * 
 * OUTPUT: JSON response with updated statistics:
 * {
 *   success: true,
 *   message: "Water usage data recorded successfully",
 *   totalWaterML: 10250.5,
 *   contributorCount: 42
 * }
 * 
 * EXAMPLE: Extension sends POST with 100ml new usage, server adds it to the total
 * 
 * Efficiency: Uses delta calculation to only add new water usage
 * Error handling for invalid inputs and file operations
 */
app.post('/api/submit-usage', (req, res) => {
  try {
    const { waterUsageML, userId, previouslySubmitted } = req.body;
    
    if (typeof waterUsageML !== 'number' || waterUsageML < 0) {
      return res.status(400).json({ error: 'Invalid water usage value' });
    }
    
    // Read current data
    const data = JSON.parse(fs.readFileSync(dataFilePath));
    
    // Initialize submittedUsers if it doesn't exist (for backwards compatibility)
    if (!data.submittedUsers) {
      data.submittedUsers = {};
    }
    
    // Calculate how much new water usage to add
    let newWaterUsage = waterUsageML;
    
    // If this user has submitted before, only add the difference
    if (data.submittedUsers[userId]) {
      // If client provides previous submission amount, use that to calculate the delta
      if (typeof previouslySubmitted === 'number') {
        newWaterUsage = waterUsageML - previouslySubmitted;
      } else {
        // Otherwise, use the stored value
        newWaterUsage = waterUsageML - data.submittedUsers[userId];
      }
      
      // Ensure we never add negative values (in case of data errors)
      if (newWaterUsage < 0) newWaterUsage = 0;
    } else {
      // This is a new contributor
      data.contributorCount += 1;
    }
    
    // Update total water usage with new (delta) amount
    data.totalWaterML += newWaterUsage;
    
    // Store this user's total submitted amount
    data.submittedUsers[userId] = waterUsageML;
    
    data.lastUpdated = new Date().toISOString();
    
    // Save updated data
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Water usage data recorded successfully',
      totalWaterML: data.totalWaterML,
      contributorCount: data.contributorCount
    });
  } catch (err) {
    console.error('Error updating water usage data:', err);
    res.status(500).json({ error: 'Failed to update water usage data' });
  }
});

/**
 * Start the server and listen for incoming connections
 * 
 * INPUT: PORT number (3000)
 * OUTPUT: Console logs with server information
 * EXAMPLE: Server starts and logs "Water tracking server running at http://localhost:3000"
 * 
 * Logs available endpoints for developer convenience
 */
app.listen(PORT, () => {
  console.log(`Water tracking server running at http://localhost:${PORT}`);
  console.log(`API endpoints available at:`);
  console.log(`  GET http://localhost:${PORT}/api/water-usage`);
  console.log(`  POST http://localhost:${PORT}/api/submit-usage`);
});
