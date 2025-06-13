const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Data storage file
const dataFilePath = path.join(__dirname, 'water-usage-data.json');

// Initialize with default data if file doesn't exist
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

// Serve static files from the website directory
app.use(express.static(path.join(__dirname, 'website')));

// API endpoint to get current water usage stats
app.get('/api/water-usage', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(dataFilePath));
    res.json(data);
  } catch (err) {
    console.error('Error reading water usage data:', err);
    res.status(500).json({ error: 'Failed to retrieve water usage data' });
  }
});

// API endpoint to submit water usage from extension
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

// Start the server
app.listen(PORT, () => {
  console.log(`Water tracking server running at http://localhost:${PORT}`);
  console.log(`API endpoints available at:`);
  console.log(`  GET http://localhost:${PORT}/api/water-usage`);
  console.log(`  POST http://localhost:${PORT}/api/submit-usage`);
});
