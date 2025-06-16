/**
 * Unit tests for tokenEstimator.js
 * Tests the token estimation functionality for different types of prompts
 */

import { estimateResponseTokens } from '../../How-Wet-is-AI--1/tokenEstimator.js';

// Mock the encoding_for_model function if needed
jest.mock('@dqbd/tiktoken', () => ({
  encoding_for_model: jest.fn()
}));

describe('Token Estimator Tests', () => {
  
  describe('Simple Factual Queries', () => {
    test('Simple yes/no question returns minimal tokens', () => {
      const prompt = "Is Paris the capital of France?";
      const promptTokens = 7;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeLessThan(50); // Simple factual responses should be small
      expect(result).toBeGreaterThan(5); // But still have some minimum content
    });
    
    test('What/where/when questions return appropriate size', () => {
      const prompt = "What is the capital of Japan?";
      const promptTokens = 8;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeLessThan(100);
      expect(result).toBeGreaterThan(10);
    });
    
    test('Conversion question returns appropriate size', () => {
      const prompt = "Convert 100 miles to kilometers";
      const promptTokens = 6;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeLessThan(100);
    });
  });
  
  describe('Code Generation Tests', () => {
    test('Python code generation with explicit lines', () => {
      const prompt = "Write 50 lines of Python code to scrape a website";
      const promptTokens = 12;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      // Python is ~30 tokens per line, plus overhead
      expect(result).toBeGreaterThanOrEqual(50 * 30);
      expect(result).toBeLessThanOrEqual(50 * 40);
    });
    
    test('JavaScript code generation with explicit lines', () => {
      const prompt = "Create a JavaScript program that is 20 lines";
      const promptTokens = 10;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      // JavaScript is ~35 tokens per line, plus overhead
      expect(result).toBeGreaterThanOrEqual(20 * 30);
      expect(result).toBeLessThanOrEqual(20 * 45);
    });
    
    test('Code generation with extremely large line count is capped', () => {
      const prompt = "Write 5000 lines of Java code for a web server";
      const promptTokens = 11;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeLessThanOrEqual(120000); // Should be capped
    });
    
    test('Alternative code generation pattern is detected', () => {
      const prompt = "I need a Python program that is 30 lines long";
      const promptTokens = 11;
      const python30LineResult = estimateResponseTokens(prompt, promptTokens);
      
      const jsPrompt = "I need a JavaScript program that is 30 lines long";
      const jsPromptTokens = 11;
      const js30LineResult = estimateResponseTokens(jsPrompt, jsPromptTokens);
      
      // JavaScript should estimate slightly higher token count than Python
      expect(js30LineResult).toBeGreaterThan(python30LineResult);
      expect(python30LineResult).toBeGreaterThanOrEqual(30 * 30); // At least 30 tokens per line
    });
  });
  
  describe('Creative Writing Tests', () => {
    test('Story writing prompt returns high token count', () => {
      const prompt = "Write a short story about a detective solving a mystery";
      const promptTokens = 11;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeGreaterThan(500);
    });
    
    test('Fan fiction generates very high token count', () => {
      const prompt = "Write a Harry Potter fanfic where Harry and Hermione go on an adventure";
      const promptTokens = 15;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeGreaterThan(1000);
    });
    
    test('Poem generates moderate token count', () => {
      const prompt = "Write a poem about the ocean";
      const promptTokens = 6;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeGreaterThan(100);
      expect(result).toBeLessThan(1000);
    });
    
    test('Writing with word count specified', () => {
      const prompt = "Write a 500 word essay about renewable energy";
      const promptTokens = 9;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeCloseTo(500 * 1.3, -1); // ~1.3 tokens per word, allow some variance
    });
  });
  
  describe('Complex and Socio-Political Topics', () => {
    test('Why questions about complex topics return more tokens', () => {
      const prompt = "Why do healthcare systems differ between countries?";
      const promptTokens = 9;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeGreaterThanOrEqual(200);
    });
    
    test('Political topics generate nuanced responses', () => {
      const prompt = "Explain the different forms of democracy around the world";
      const promptTokens = 10;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeGreaterThan(promptTokens * 3);
    });
  });
  
  describe('Edge Cases', () => {
    test('Empty prompt returns minimum tokens', () => {
      const prompt = "";
      const promptTokens = 0;
      const result = estimateResponseTokens(prompt, promptTokens);
      
      expect(result).toBeGreaterThan(0); // Should still return some minimum value
    });
    
    test('Extremely long prompts still return reasonable estimates', () => {
      // Generate a very long prompt
      const longPrompt = "What is the meaning of life? ".repeat(100);
      const promptTokens = 700; // Approximate
      const result = estimateResponseTokens(longPrompt, promptTokens);
      
      expect(result).toBeLessThan(100000); // Should be reasonable
      expect(result).toBeGreaterThan(100); // But still substantive
    });
    
    test('Special characters are handled correctly', () => {
      const promptWithSpecialChars = "What is ∑(n=1 to ∞) 1/n²? Explain this mathematical series.";
      const promptTokens = 15; // Approximate
      const result = estimateResponseTokens(promptWithSpecialChars, promptTokens);
      
      expect(result).toBeGreaterThan(20);
    });
  });
  
  describe('Content Type Detection', () => {
    test('Business document types are detected correctly', () => {
      const businessPlanPrompt = "Write a business plan for a tech startup";
      const businessPlanTokens = 9;
      const businessPlanResult = estimateResponseTokens(businessPlanPrompt, businessPlanTokens);
      
      const memoPrompt = "Write a memo about the quarterly results";
      const memoTokens = 8;
      const memoResult = estimateResponseTokens(memoPrompt, memoTokens);
      
      // Business plan should be longer than a memo
      expect(businessPlanResult).toBeGreaterThan(memoResult);
    });
    
    test('Technical documentation types are detected', () => {
      const apiDocPrompt = "Create api documentation for a REST API";
      const apiDocTokens = 9;
      const apiDocResult = estimateResponseTokens(apiDocPrompt, apiDocTokens);
      
      expect(apiDocResult).toBeGreaterThan(apiDocTokens * 5);
    });
    
    test('Academic content types are detected', () => {
      const researchPaperPrompt = "Write a research paper on quantum computing";
      const researchPaperTokens = 8;
      const researchPaperResult = estimateResponseTokens(researchPaperPrompt, researchPaperTokens);
      
      expect(researchPaperResult).toBeGreaterThan(1000);
    });
  });
});
