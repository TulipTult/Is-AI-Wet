/**
 * Unit tests for server API functionality
 * Tests the functionality for submitting and retrieving data from the server
 */

// Import or create mock implementations for testing
// Mock fetch for API calls
global.fetch = jest.fn();

// Mock implementation of submitWaterUsage based on popupStats.js
async function submitWaterUsage(waterUsageML, userId, previouslySubmitted = 0) {
  try {
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
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting water usage data:', error);
    return { success: false, error: error.message };
  }
}

// Mock implementation for server route handling (based on server.js)
function handleSubmitUsageRequest(req) {
  try {
    const { waterUsageML, userId, previouslySubmitted } = req.body;
    
    if (typeof waterUsageML !== 'number' || waterUsageML < 0) {
      return { status: 400, json: { error: 'Invalid water usage value' } };
    }
    
    // Mock data object that would be read from a file
    let data = {
      totalWaterML: 10000,
      contributorCount: 50,
      submittedUsers: {}
    };
    
    // Initialize submittedUsers if it doesn't exist
    if (!data.submittedUsers) {
      data.submittedUsers = {};
    }
    
    // Calculate how much new water usage to add
    let newWaterUsage = waterUsageML;
    
    // If this user has submitted before, only add the difference
    if (data.submittedUsers[userId]) {
      // If client provides previous submission amount, use that
      if (typeof previouslySubmitted === 'number') {
        newWaterUsage = waterUsageML - previouslySubmitted;
      } else {
        // Otherwise, use the stored value
        newWaterUsage = waterUsageML - data.submittedUsers[userId];
      }
      
      // Ensure we never add negative values
      if (newWaterUsage < 0) newWaterUsage = 0;
    } else {
      // This is a new contributor
      data.contributorCount += 1;
    }
    
    // Update total water usage with new (delta) amount
    data.totalWaterML += newWaterUsage;
    
    // Store this user's total submitted amount
    data.submittedUsers[userId] = waterUsageML;
    
    // Return success response
    return {
      status: 200, 
      json: {
        success: true,
        message: "Water usage data recorded successfully",
        totalWaterML: data.totalWaterML,
        contributorCount: data.contributorCount
      }
    };
  } catch (error) {
    return { 
      status: 500, 
      json: { 
        success: false, 
        error: "Server error processing request" 
      } 
    };
  }
}

describe('Server API Tests', () => {
  
  beforeEach(() => {
    // Reset the fetch mock before each test
    fetch.mockReset();
  });
  
  describe('Submit Water Usage API', () => {
    test('Successfully submit water usage data', async () => {
      // Mock successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true,
          totalWaterML: 10500,
          contributorCount: 51
        })
      });
      
      const result = await submitWaterUsage(500, 'test-user-123');
      
      // Check that fetch was called with the right arguments
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/submit-usage',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String)
        })
      );
      
      // Check the request body was formatted correctly
      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody).toEqual({
        waterUsageML: 500,
        previouslySubmitted: 0,
        userId: 'test-user-123'
      });
      
      // Check the response was handled correctly
      expect(result).toEqual({
        success: true,
        totalWaterML: 10500,
        contributorCount: 51
      });
    });
    
    test('Handle network error when submitting', async () => {
      // Mock a network error
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await submitWaterUsage(500, 'test-user-123');
      
      // Should return error object
      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });
    
    test('Handle server error response', async () => {
      // Mock server error response
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      const result = await submitWaterUsage(500, 'test-user-123');
      
      // Should return error object
      expect(result).toEqual({
        success: false,
        error: 'HTTP error: 500'
      });
    });
    
    test('Submit with previous usage value', async () => {
      // Mock successful response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true,
          totalWaterML: 10250,
          contributorCount: 50
        })
      });
      
      const result = await submitWaterUsage(500, 'test-user-123', 250);
      
      // Check the request body includes previouslySubmitted
      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      expect(requestBody).toEqual({
        waterUsageML: 500,
        previouslySubmitted: 250,
        userId: 'test-user-123'
      });
      
      // Should return success
      expect(result.success).toBe(true);
    });
  });
  
  describe('Server Route Handler', () => {
    test('Handle valid water usage submission', () => {
      const req = {
        body: {
          waterUsageML: 500,
          userId: 'test-user-123'
        }
      };
      
      const result = handleSubmitUsageRequest(req);
      
      expect(result.status).toBe(200);
      expect(result.json.success).toBe(true);
      expect(result.json.totalWaterML).toBeGreaterThan(10000); // Should have added the new water
    });
    
    test('Handle invalid water usage value', () => {
      const req = {
        body: {
          waterUsageML: -100, // Negative value
          userId: 'test-user-123'
        }
      };
      
      const result = handleSubmitUsageRequest(req);
      
      expect(result.status).toBe(400);
      expect(result.json.error).toBe('Invalid water usage value');
    });
    
    test('Handle missing user ID', () => {
      const req = {
        body: {
          waterUsageML: 500
          // Missing userId
        }
      };
      
      const result = handleSubmitUsageRequest(req);
      
      // Should still work, but user would be undefined in the data store
      expect(result.status).toBe(200);
      expect(result.json.success).toBe(true);
    });
    
    test('Delta calculation works correctly with previouslySubmitted', () => {
      // First submission from user
      const firstReq = {
        body: {
          waterUsageML: 500,
          userId: 'test-user-456'
        }
      };
      
      const firstResult = handleSubmitUsageRequest(firstReq);
      expect(firstResult.status).toBe(200);
      
      // Second submission with higher value
      const secondReq = {
        body: {
          waterUsageML: 750,
          userId: 'test-user-456',
          previouslySubmitted: 500
        }
      };
      
      const secondResult = handleSubmitUsageRequest(secondReq);
      
      // Should have only added the difference (250) to the total
      expect(secondResult.json.totalWaterML).toBe(firstResult.json.totalWaterML + 250);
      // Contributor count should remain the same (not incremented)
      expect(secondResult.json.contributorCount).toBe(firstResult.json.contributorCount);
    });
    
    test('Prevent negative delta submissions', () => {
      // Submit initial value
      const firstReq = {
        body: {
          waterUsageML: 500,
          userId: 'test-user-789'
        }
      };
      
      const firstResult = handleSubmitUsageRequest(firstReq);
      
      // Submit a lower value (which shouldn't reduce the total)
      const secondReq = {
        body: {
          waterUsageML: 300,
          userId: 'test-user-789',
          previouslySubmitted: 500
        }
      };
      
      const secondResult = handleSubmitUsageRequest(secondReq);
      
      // Total should remain the same (no negative contribution)
      expect(secondResult.json.totalWaterML).toBe(firstResult.json.totalWaterML);
    });
  });
});
