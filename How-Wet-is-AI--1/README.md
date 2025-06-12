# HWIAI

## Prompt Energy & Resource Calculator

A tool for estimating energy usage and water consumption of large language model prompts and responses.

### Features

- Accurately estimates token count for prompts and responses
- Calculates both theoretical direct inference energy and real-world total energy consumption
- Includes data center overhead, cooling inefficiencies, and other production factors
- Detects various content types including creative writing, code generation, and factual queries
- Handles line count estimation for code generation requests
- Vocabulary complexity analysis
- Reasoning level detection
- Response openness scoring

### Token Estimation

The token estimator uses pattern recognition to predict response size based on:

- Content type detection (essays, code, stories, etc.)
- Word and line count specifications
- Programming language detection for code generation requests
- Writing style and complexity indicators

For code generation requests with explicit line counts (e.g., "write a 4000 line program in Python"), 
the estimator calculates tokens based on language-specific averages of tokens per line.

### Energy & Water Calculations

The calculator provides two sets of estimations:

1. **Direct Inference Only (Theoretical)** - The energy and water used specifically for processing your prompt and generating a response, based on OpenAI's estimate of ~0.002 kWh per 1000 tokens.

2. **Real-World Usage (With Overhead)** - A more comprehensive estimate that includes:
   - Data center overhead (PUE)
   - Idle load and model memory retention
   - Network transmission energy
   - Partial amortization of training costs
   - Production environment factors (load balancing, redundancy)

The real-world estimates align more closely with published figures citing 20-50 mL of water usage per prompt.

### Usage

```
npm install
npm start
```

Then enter prompts to analyze their estimated energy usage and water consumption.

### License

MIT License
