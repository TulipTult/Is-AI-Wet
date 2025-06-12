/**
 * Smart response token estimator for GPT-4 prompts
 * Uses pattern recognition and content analysis to predict response length
 */

// Token estimation based on word count and pattern recognition
function estimateResponseTokens(prompt, promptTokenCount) {
  const lower = prompt.toLowerCase();
  
  // Check for simple factual queries that require very short responses
  // These typically return just a few words or a simple list
  const simpleFactualPatterns = [
    // Simple name/list requests with small number limits
    /\bname\s+(\d+|a|an|some|few)\s+.*\b/i,
    /\blist\s+(\d+|a|an|some|few)\s+.*\b/i,
    /\bgive\s+(\d+|a|an|some|few)\s+.*\b/i,
    /\bshow\s+(\d+|a|an|some|few)\s+.*\b/i,
    /\btell\s+me\s+(\d+|a|an|some|few)\s+.*\b/i,
    // Yes/no questions
    /^(is|are|was|were|do|does|did|can|could|will|would|should|has|have|had)\b.*\?$/i,
    // What/when/where/who simple factual questions
    /^what\s+is\s+the\s+(name|capital|population|height|age|date|time|year|color|distance|temperature|size|location)\s+of.*\?$/i,
    /^when\s+(was|is|did|will)\b.*\?$/i,
    /^where\s+is\b.*\?$/i,
    /^who\s+(is|was|were)\b.*\?$/i,
    // Simple conversion requests
    /\bconvert\s+\d+\s+.*\s+to\s+.*\b/i,
    // Simple calculation requests
    /\bcalculate\s+\d+\s*[\+\-\*\/\^]\s*\d+\b/i,
    /\bcompute\s+\d+\s*[\+\-\*\/\^]\s*\d+\b/i,
    /\bsolve\s+\d+\s*[\+\-\*\/\^]\s*\d+\b/i,
    // Simple definition requests
    /^define\s+\w+\b/i,
    /^what\s+does\s+\w+\s+mean\b/i,
    // Simple factual requests
    /^how\s+(many|much|tall|old|long|far)\s+is\b.*\?$/i,
  ];
  
  // Check if this is a simple factual query
  const isSimpleFactualQuery = simpleFactualPatterns.some(pattern => pattern.test(lower));
  
  // If it's a simple factual query, return a much lower token count
  if (isSimpleFactualQuery) {
    // Extract number if present to refine the estimate
    const numberMatch = lower.match(/\b(\d+)\b/);
    if (numberMatch) {
      const number = parseInt(numberMatch[1], 10);
      if (number <= 10) {
        // Small number requests get a very small response estimate
        // e.g., "Name 2 random oceans" → ~20 tokens
        return Math.max(number * 10, 15);
      } else if (number <= 100) {
        // Medium-sized lists still have reasonable response sizes
        return Math.max(number * 5, 30);
      }
    }
    
    // Default for simple factual queries without numbers or with larger numbers
    return Math.max(promptTokenCount * 1.2, 20);
  }
  
  // NEW: Enhanced code generation detection with better line count recognition
  // This covers more patterns like "need java program that is 1000 lines" and variations
  const codeGenerationPatterns = [
    // Standard pattern: write/create/generate X lines of code in Y
    /(?:write|create|generate|make|code|program|script|develop)\s+(?:a|an|the)?\s*(\d+)\s*(?:line|lines)\s+(?:of\s+)?(?:code|program|script|application|app)?\s+(?:that\s+is\s+like\s+)?(?:in|using|with)?\s+(\w+)/i,
    
    // Need/want pattern: need/want X lines of Y code/program
    /(?:need|want)\s+(?:a|an|the)?\s*(\w+)\s+(?:code|program|script|application|app)\s+(?:that\s+is|of|which\s+is)?\s*(\d+)\s+(?:line|lines)/i,
    
    // Reversed pattern: Y program/code that is X lines
    /(?:need|want|create|make|write|generate)?\s+(?:a|an|the)?\s*(\w+)\s+(?:program|code|script|application|app)\s+(?:that|which)\s+is\s+(\d+)\s+(?:line|lines)/i,
    
    // Simplified patterns for "X lines of Y" or "Y that is X lines"
    /(\d+)\s+(?:line|lines)\s+(?:of)?\s+(\w+)/i,
    /(\w+)\s+(?:program|code|script|app|application)\s+(?:that\s+is)?\s*(\d+)\s+(?:line|lines)/i
  ];
  
  // Try each pattern to find code generation requests
  for (const pattern of codeGenerationPatterns) {
    const match = lower.match(pattern);
    if (match) {
      let lineCount, language;
      
      // Determine which group is the line count and which is the language
      // This depends on the pattern matched
      if (pattern.source.startsWith('\\(\\?:need|want')) {
        // For patterns where language comes first, then line count
        language = match[1].toLowerCase();
        lineCount = parseInt(match[2], 10);
      } else if (pattern.source.startsWith('\\(\\d+')) {
        // For patterns where line count comes first, then language
        lineCount = parseInt(match[1], 10);
        language = match[2].toLowerCase();
      } else if (pattern.source.includes('\\w+\\)\\s+\\(\\?:program|code')) {
        // For patterns with language first then line count
        language = match[1].toLowerCase();
        lineCount = parseInt(match[2], 10);
      } else {
        // Default pattern - language is second group, line count is first
        lineCount = parseInt(match[1], 10);
        language = match[2].toLowerCase();
      }
      
      // Comprehensive tokens per line for different languages - adjusted for accuracy
      const tokensPerLine = {
        'python': 30,
        'javascript': 35,
        'typescript': 40,
        'java': 45,
        'c#': 40,
        'cpp': 35,
        'c++': 35,
        'ruby': 25,
        'go': 30,
        'rust': 40,
        'swift': 35,
        'kotlin': 35,
        'php': 40,
        'html': 25,
        'css': 20,
        'sql': 25,
        'r': 25,
        'bash': 20,
        'powershell': 30,
        'default': 35 // Default if language not in list
      };
      
      // Get average tokens per line for the specified language, or use default
      const avgTokensPerLine = tokensPerLine[language] || tokensPerLine.default;
      
      // Calculate total tokens based on line count with a small overhead factor for explanations
      const baseTotalTokens = lineCount * avgTokensPerLine * 1.2;
      const tokenEstimate = Math.min(baseTotalTokens, 120000); // Cap at 120K tokens for realistic limits
      
      console.log(`Code generation detected: ${lineCount} lines of ${language} code, estimated ${tokenEstimate} tokens`);
      
      return tokenEstimate;
    }
  }
  
  // OLD: Check for code generation with explicit line count - keep for backward compatibility
  const codeGenerationLineCountMatch = lower.match(/(?:write|create|generate|make|code|program|script|develop)\s+(?:a|an|the)?\s*(\d+)\s*(?:line|lines)\s+(?:of\s+)?(?:code|program|script|application|app)?\s+(?:that\s+is\s+like\s+)?(?:in|using|with)?\s+(\w+)/i);
  
  if (codeGenerationLineCountMatch) {
    const lineCount = parseInt(codeGenerationLineCountMatch[1], 10);
    const language = codeGenerationLineCountMatch[2].toLowerCase();
    
    // Average tokens per line for different programming languages
    const tokensPerLine = {
      'python': 30,
      'javascript': 35,
      'typescript': 40,
      'java': 45,
      'c#': 40,
      'cpp': 35,
      'c++': 35,
      'ruby': 25,
      'go': 30,
      'rust': 40,
      'swift': 35,
      'kotlin': 35,
      'php': 40,
      'html': 25,
      'css': 20,
      'sql': 25,
      'r': 25,
      'bash': 20,
      'powershell': 30,
      'default': 35 // Default if language not in list
    };
    
    // Get average tokens per line for the specified language, or use default
    const avgTokensPerLine = tokensPerLine[language] || tokensPerLine.default;
    
    // Calculate total tokens based on line count with a small overhead factor
    // And account for explanations and comments that might accompany the code
    const baseTotalTokens = lineCount * avgTokensPerLine;
    const tokenEstimate = Math.min(baseTotalTokens, 120000); // Cap at 120K tokens for realistic limits
    
    // If extremely large request, add comment about token limitations
    if (lineCount > 1000) {
      console.log(`Note: Request for ${lineCount} lines of ${language} code would require approximately ${baseTotalTokens} tokens, which exceeds model context limits.`);
      return tokenEstimate;
    }
    
    return tokenEstimate;
  }
  
  // Check for socio-political topics that tend to receive nuanced, longer responses
  const sociopoliticalPatterns = [
    // Political systems and governance
    /\b(?:government|congress|senate|parliament|democracy|republic|dictatorship|monarchy)\b/i,
    // Policy domains
    /\b(?:healthcare|universal healthcare|medicare|medicaid|social security|welfare|tax|taxation)\b/i,
    // Social issues
    /\b(?:abortion|gun control|immigration|racism|inequality|discrimination|gender|sexuality)\b/i,
    // Economic systems
    /\b(?:capitalism|socialism|communism|economy|wealth|poverty|class|income)\b/i,
    // International relations
    /\b(?:foreign policy|diplomacy|war|conflict|treaty|international|global)\b/i,
    // Rights and freedoms
    /\b(?:rights|freedom|liberty|constitution|amendment|law|regulation|justice)\b/i,
    // Political parties and ideologies
    /\b(?:democrat|republican|liberal|conservative|progressive|left wing|right wing|centrist)\b/i
  ];
  
  // Check if prompt contains "why" or explanation requests about socio-political topics
  const isWhyQuestion = /\b(?:why|reason|explain why|tell me why)\b/i.test(lower);
  const containsSociopoliticalTopic = sociopoliticalPatterns.some(pattern => pattern.test(lower));
  
  if (isWhyQuestion && containsSociopoliticalTopic) {
    // These tend to be longer as they explain complex systems with multiple perspectives
    return Math.max(200, promptTokenCount * 5); // Minimum 200 tokens, typically more
  }
  
  // For general socio-political topics (even without explicit "why")
  if (containsSociopoliticalTopic) {
    // Check for opinion indicators that suggest presenting multiple perspectives
    const hasOpinionIndicator = /\b(?:think|opinion|view|stance|position|perspective|debate|controversy)\b/i.test(lower);
    
    if (hasOpinionIndicator) {
      return Math.max(180, promptTokenCount * 4.5); // Multiple perspectives need more tokens
    }
    
    return Math.max(150, promptTokenCount * 4); // Still higher than average factual response
  }
  
  // First, check for creative writing requests explicitly - these need special handling
  const creativeWritingPatterns = [
    /\b(?:write|create|generate|make)\s+(?:a|an|some|the)?\s*(?:story|narrative|tale|fiction|novel|fanfic|fan\s*fic|fan\s*fiction|short\s*story)/i,
    /\bfan\s*fic(?:tion)?/i,
    /\b(?:story|narrative|tale)\s+(?:about|with|featuring|of|where)/i,
    /\bwrite\s+(?:a|an|some|the)?\s*(?:creepy|scary|funny|romantic|dramatic|epic|fantasy|sci-fi|adventure|mystery|thriller|horror)/i
  ];
  
  // Check if this is a creative writing request
  if (creativeWritingPatterns.some(pattern => pattern.test(lower))) {
    // Creative writing requests usually get longer responses
    // Minimum 500 tokens for any creative writing request (roughly 350-400 words)
    // This represents a short scene or introduction to a story
    const baseCreativeLength = 500;
    
    // Check for specific creative type indicators to refine the estimate
    if (lower.includes("fan fic") || lower.includes("fanfic") || lower.includes("fan fiction")) {
      // Fan fiction typically gets 1500+ tokens
      return Math.max(1800, promptTokenCount * 8);
    }
    
    if (lower.includes("short") || lower.includes("brief")) {
      return Math.max(700, promptTokenCount * 5);
    }
    
    if (lower.includes("detailed") || lower.includes("elaborate") || 
        lower.includes("long") || lower.includes("comprehensive")) {
      return Math.max(2500, promptTokenCount * 10);
    }
    
    // Default creative writing length
    return Math.max(baseCreativeLength, promptTokenCount * 7);
  }
  
  // NEW: Enhanced pattern for detecting line count requests more broadly for any language or context
  const lineCountMatch = lower.match(/(\d{2,})\s*(?:line|lines)\s+(?:of\s+)?(?:code|program|script|text|content)/i);
  if (lineCountMatch) {
    const lineCount = parseInt(lineCountMatch[1], 10);
    
    // Base estimate on the content type - detect common programming languages
    let tokensPerLine = 35; // Default for generic code
    
    // Check for programming language mentions
    const languages = ["python", "javascript", "java", "c#", "c\\+\\+", "ruby", "php", "go", "swift", "rust"];
    for (const lang of languages) {
      if (lower.includes(lang)) {
        // Slightly adjust tokens per line based on language verbosity
        if (["java", "c#"].includes(lang)) tokensPerLine = 45;
        else if (["python", "ruby"].includes(lang)) tokensPerLine = 30;
        break;
      }
    }
    
    // Calculate total tokens with adjustment for explanations/comments
    const totalTokens = Math.min(lineCount * tokensPerLine * 1.2, 100000); // Cap at 100K
    return totalTokens;
  }
  
  // Much broader regex for word count requests - catches more patterns
  const wordCountMatch = lower.match(/(\d{3,})\s*(?:word|words|wor(?:ds)?)/i);
  if (wordCountMatch) {
    const wordCount = parseInt(wordCountMatch[1], 10);
    // Approximate 1.3 tokens per word for English text
    return Math.ceil(wordCount * 1.3);
  }
  
  // More flexible pattern to catch variations like "write a 10000 word ai prompt"
  const wordCountAltMatch = lower.match(/(?:write|create|generate|make)(?:\s+\w+){0,3}\s+(\d{3,})\s*(?:word|words|wor(?:ds)?)/i);
  if (wordCountAltMatch) {
    const wordCount = parseInt(wordCountAltMatch[1], 10);
    return Math.ceil(wordCount * 1.3);
  }
  
  // Check for page count requests
  const pageCountMatch = lower.match(/(\d+)\s+page(s)?\s+(essay|story|article|text|paper|document|response|writing)/);
  if (pageCountMatch) {
    const pageCount = parseInt(pageCountMatch[1], 10);
    // Approximate 500 words per page, 1.3 tokens per word
    return Math.ceil(pageCount * 500 * 1.3);
  }
  
  // Check for "tell me about X" pattern which often gets medium-sized responses
  const tellMeAboutMatch = /\btell\s+(?:me|us)\s+(?:about|why|how)\s+.{3,}/i.test(lower);
  if (tellMeAboutMatch) {
    // Open-ended "tell me about" questions typically get medium responses
    // Minimum 120 tokens (roughly 90-100 words)
    return Math.max(120, promptTokenCount * 3.5);
  }
  
  // Check for specific content type indicators that suggest response length
  const contentTypes = {
    // Creative writing (typically verbose)
    "essay": 2000,
    "story": 1500,
    "poem": 300,
    "novel": 3000,
    "book": 3000,
    "screenplay": 2000,
    "script": 1500,
    // Add more specific creative writing types with their token estimates
    "fan fic": 1800,
    "fanfic": 1800,
    "fan fiction": 1800,
    "fanfiction": 1800,
    
    // Technical/analytical (medium length)
    "analysis": 1000,
    "report": 1200,
    "review": 800,
    "summary": 500,
    "outline": 400,
    
    // Short-form content
    "tweet": 15,
    "headline": 10,
    "title": 10,
    "caption": 20,
    "slogan": 15,
    
    // Academic content
    "dissertation": 5000,
    "thesis": 4000,
    "research paper": 2500,
    "term paper": 1800,
    "assignment": 1200,
    "lecture": 2000,
    "case study": 1500,
    "presentation": 1000,
    "syllabus": 700,
    "lesson plan": 800,
    "study guide": 1200,
    "literature review": 2000,
    "annotated bibliography": 1000,
    "concept map": 400,
    "lab report": 1000,
    "bibliography": 500,
    "abstract": 200,
    "conference paper": 1800,
    "monograph": 3500,
    "textbook chapter": 2500,
    
    // Extended creative writing
    "short story": 1200,
    "novella": 2500,
    "flash fiction": 300,
    "memoir": 2500,
    "biography": 3000,
    "autobiography": 3000,
    "fanfiction": 1800,
    "fairy tale": 1000,
    "fable": 700,
    "myth": 900,
    "legend": 1000,
    "epic": 2500,
    "sonnet": 150,
    "haiku": 30,
    "limerick": 70,
    "ballad": 400,
    "song lyrics": 300,
    "play": 2000,
    "monologue": 500,
    "dialogue": 700,
    "character profile": 600,
    "setting description": 500,
    "plot outline": 800,
    
    // Business documents
    "business plan": 3000,
    "proposal": 1500,
    "memo": 400,
    "executive summary": 600,
    "swot analysis": 800,
    "market analysis": 1500,
    "financial report": 1800,
    "annual report": 2500,
    "white paper": 2000,
    "case brief": 1000,
    "project plan": 1500,
    "risk assessment": 1200,
    "feasibility study": 1800,
    "business letter": 300,
    "invoice": 200,
    "receipt": 150,
    "contract": 1500,
    "agreement": 1200,
    "minutes": 800,
    "agenda": 400,
    "status report": 700,
    
    // Technical documentation
    "technical manual": 2500,
    "user guide": 1800,
    "specification": 1200,
    "api documentation": 1500,
    "code documentation": 1000,
    "troubleshooting guide": 1200,
    "installation guide": 800,
    "configuration guide": 1000,
    "reference manual": 2000,
    "system architecture": 1500,
    "flowchart": 500,
    "diagram": 400,
    "schema": 600,
    "protocol": 900,
    "readme": 400,
    "changelog": 500,
    "release notes": 600,
    "technical spec": 1400,
    "algorithm": 700,
    "pseudocode": 500,
    
    // Online/Digital content
    "blog post": 800,
    "article": 1000,
    "newsletter": 700,
    "email": 300,
    "landing page": 500,
    "about page": 400,
    "faq": 600,
    "product description": 250,
    "social media post": 50,
    "forum post": 300,
    "comment": 100,
    "review comment": 200,
    "listicle": 1000,
    "how-to guide": 1200,
    "tutorial": 1500,
    "infographic text": 400,
    "quiz": 600,
    "poll": 200,
    "survey": 800,
    "podcast script": 1500,
    "webinar script": 1800,
    
    // Personal communication
    "cover letter": 400,
    "resume": 500,
    "cv": 700,
    "personal statement": 800,
    "recommendation letter": 500,
    "reference letter": 500,
    "thank you note": 150,
    "invitation": 200,
    "condolence letter": 300,
    "complaint letter": 400,
    "apology": 250,
    "congratulatory message": 200,
    "greeting card": 100,
    "diary entry": 500,
    "journal entry": 600,
    
    // Media and entertainment
    "movie review": 800,
    "book review": 700,
    "music review": 600,
    "game review": 900,
    "film analysis": 1200,
    "movie synopsis": 700,
    "show notes": 500,
    "interview questions": 600,
    "interview transcript": 1800,
    "podcast transcript": 2000,
    "speech": 1200,
    "toast": 200,
    "eulogy": 500,
    "roast": 600,
    "comedy routine": 900,
    "storyboard": 700,
    "game design document": 2000,
    "character sheet": 500,
    
    // Legal documents
    "legal brief": 2000,
    "affidavit": 800,
    "deposition": 1500,
    "will": 600,
    "trust": 1000,
    "patent application": 2000,
    "trademark application": 1500,
    "license agreement": 1200,
    "privacy policy": 1000,
    "terms of service": 1500,
    "disclaimer": 300,
    "statement of work": 1000,
    "cease and desist": 500,
    "legal opinion": 1200,
    "court filing": 1800,
    "motion": 1000,
    
    // Marketing materials
    "press release": 500,
    "brochure": 600,
    "flyer": 300,
    "pamphlet": 400,
    "catalog": 1500,
    "advertisement": 200,
    "marketing email": 400,
    "campaign proposal": 1200,
    "value proposition": 300,
    "elevator pitch": 150,
    "tagline": 10,
    "mission statement": 200,
    "vision statement": 200,
    "brand story": 700,
    "promotional copy": 500,
    "sales letter": 800,
    "case testimonial": 400,
    
    // Educational content
    "worksheet": 600,
    "quiz questions": 500,
    "test": 800,
    "exam": 1000,
    "answer key": 600,
    "rubric": 400,
    "curriculum": 1500,
    "glossary": 800,
    "definition list": 500,
    "study notes": 1000,
    "flashcards": 400,
    "cheat sheet": 300,
    "formula sheet": 200,
    "timeline": 600,
    "historical account": 1200,
    
    // Scientific content
    "scientific paper": 2500,
    "experiment protocol": 1000,
    "hypothesis": 200,
    "methodology": 800,
    "data analysis": 1000,
    "statistical report": 1200,
    "findings summary": 700,
    "research proposal": 1800,
    "grant application": 2000,
    "patent description": 1500,
    "clinical trial design": 1800,
    "medical history": 1000,
    "diagnostic report": 800,
    "autopsy report": 1200,
    "drug information": 900,
    
    // Miscellaneous content
    "recipe": 400,
    "travel itinerary": 600,
    "packing list": 300,
    "checklist": 400,
    "instructions": 700,
    "manual": 1500,
    "guidebook": 2000,
    "handbook": 1800,
    "dictionary entry": 150,
    "encyclopedia entry": 800,
    "rule book": 1200,
    "transcript": 1500,
    "translation": 1000,
    "paraphrase": 800,
    "critique": 1000,
    "evaluation": 900,
    "assessment": 800,
    "testimonial": 300,
    "anthology": 3000,
    "collection": 2500,
    "compilation": 2000,
    "catalog entry": 250,
    "menu": 300,
    "itinerary": 500,
    "schedule": 400,
    "program": 500,
    "bulletin": 600,
    "newsletter": 800,
    "leaflet": 400,
    "manifesto": 1000,
    "proclamation": 700,
    "decree": 500,
    "resolution": 600,
    "policy": 900,
    "regulation": 1000,
    "statute": 1200,
    "ordinance": 1000,
    "code of conduct": 800,
    "user agreement": 1200,
    "subscription terms": 900,
    "rental agreement": 800,
    "lease": 1000,
    "deed": 700,
    "certificate": 200,
    "diploma": 150,
    "credential": 200,
    "badge description": 150,
    "achievement": 300,
    "award nomination": 500,
    "obituary": 400,
    "bulletin board post": 200,
    "classified ad": 100,
    "job description": 500,
    "job posting": 600,
    "application form": 400,
    "feedback form": 300,
    "evaluation form": 500,
    "survey questions": 700,
    "questionnaire": 800,
    "census form": 600,
    "demographic report": 900,
    "weather report": 300,
    "traffic report": 250,
    "stock analysis": 1000,
    "trend report": 1200,
    "forecast": 800,
    "prediction": 500,
    "horoscope": 300,
    "fortune": 100,
    "riddle": 150,
    "puzzle": 200,
    "crossword clue": 50,
    "sudoku hint": 100,
    "game rules": 700,
    "formula description": 400,
    "theorem explanation": 500,
    "proof": 800,
    "axiom": 150,
    "postulate": 300,
    "definition": 200,
    "debate script": 1500,
    "argument": 800,
    "rebuttal": 600,
    "counterargument": 700,
    "persuasive essay": 1800,
    "op-ed": 1000,
    "editorial": 900,
    "column": 800,
    "advice column": 700,
    "ask me anything": 1500,
    "confession": 500,
    "secret": 200,
    "gossip": 300,
    "rumor": 250,
    "news bulletin": 400,
    "breaking news": 300,
    "weather alert": 200,
    "emergency notice": 300,
    "recall notice": 400,
    "public service announcement": 500,
    "safety instruction": 600,
    "warning label": 150,
    "nutrition facts": 200,
    "ingredient list": 300,
    "allergen information": 200,
    "food label": 150,
    "menu description": 300,
    "cocktail recipe": 250,
    "wine description": 200,
    "beer review": 350,
    "tasting notes": 300,
    "product review": 700,
    "user review": 400,
    "critical review": 900,
    "peer review": 1000
  };
  
  // Improve content type detection with fuzzy matching for key terms
  const fuzzyContentTypes = {
    // Map variations to canonical content types
    "fic": "fanfiction",
    "fiction": "story",
    "fictional": "story",
    "narrative": "story",
    "fable": "story",
    "prose": "story"
  };
  
  // Check for fuzzy content type matches first
  for (const [fuzzyType, canonicalType] of Object.entries(fuzzyContentTypes)) {
    if (lower.includes(fuzzyType)) {
      // Use the canonical type's token estimate
      if (contentTypes[canonicalType]) {
        return contentTypes[canonicalType];
      }
    }
  }
  
  // Check for content type indicators with improved pattern matching
  for (const [type, tokenEstimate] of Object.entries(contentTypes)) {
    // Check different verb patterns (write, create, make, generate) followed by article + type
    if (lower.match(new RegExp(`(?:write|create|generate|make)\\s+(?:an?|the)?\\s+${type}\\b`, 'i'))) {
      return tokenEstimate;
    }
    
    // Check for possessive forms ("thesis about X")
    if (lower.match(new RegExp(`\\b${type}\\s+(?:about|on|for|regarding)\\b`, 'i'))) {
      return tokenEstimate;
    }
    
    // Simple content type presence check as fallback
    if (lower.includes(type)) {
      return tokenEstimate;
    }
  }
  
  // Detect numeric indicators of length in various formats
  const numericIndicators = [
    // Match patterns like "5k words", "5K word", etc.
    { pattern: /(\d+)k\s*word/i, multiplier: 1000 },
    // Match X,000 format
    { pattern: /(\d+),(\d{3})\s*word/i, handler: (match) => parseInt(match[1] + match[2], 10) },
    // Match formats like "five thousand words"
    { pattern: /(one|two|three|four|five|six|seven|eight|nine|ten)\s+thousand\s+word/i, 
      handler: (match) => {
        const wordToNum = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
                           'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10 };
        return wordToNum[match[1].toLowerCase()] * 1000;
      }
    },
    // Match formats like "a thousand words"
    { pattern: /\b(a|one)\s+thousand\s+word/i, value: 1000 },
    // Match formats like "few thousand words"
    { pattern: /\b(few|couple(\s+of)?|several)\s+thousand\s+word/i, value: 3000 },
  ];
  
  for (const indicator of numericIndicators) {
    const match = lower.match(indicator.pattern);
    if (match) {
      if (indicator.value) {
        return Math.ceil(indicator.value * 1.3); 
      } else if (indicator.multiplier) {
        return Math.ceil(parseInt(match[1], 10) * indicator.multiplier * 1.3);
      } else if (indicator.handler) {
        return Math.ceil(indicator.handler(match) * 1.3);
      }
    }
  }
  
  // Detect writing style requests (some styles are more verbose)
  const styles = {
    "shakespeare": 1.5,
    "shakespearean": 1.5,
    "victorian": 1.4,
    "academic": 1.3,
    "technical": 1.2,
    "detailed": 1.5,
    "comprehensive": 1.7,
    "thorough": 1.6,
    "brief": 0.7,
    "concise": 0.6,
    "terse": 0.5
  };
  
  // Base multiplier starts at 2.0
  let styleMultiplier = 2.0;
  
  // Adjust multiplier based on detected styles
  for (const [style, factor] of Object.entries(styles)) {
    if (lower.includes(style)) {
      styleMultiplier *= factor;
    }
  }
  
  // Check for list generation (lists tend to be longer)
  if (lower.includes("list") || 
      lower.match(/\d+\s+things/) || 
      lower.match(/\d+\s+ways/) || 
      lower.match(/\d+\s+steps/) || 
      lower.match(/\d+\s+tips/)) {
    
    // Try to extract the number of items
    const listCountMatch = lower.match(/(\d+)\s+(things|ways|steps|tips|items|examples|reasons|factors|methods)/);
    if (listCountMatch) {
      const itemCount = parseInt(listCountMatch[1], 10);
      // Each item might take about 50 tokens plus introduction and conclusion
      return Math.ceil(itemCount * 50 + 200);
    } else {
      // Default list length if no number specified
      return 500;
    }
  }
  
  // Look for length-related requests even without specific numbers
  const lengthIndicators = {
    "detailed": 1.5,
    "comprehensive": 2.0,
    "thorough": 1.8,
    "in-depth": 1.7,
    "elaborate": 1.6,
    "extensive": 1.9,
    "long": 1.5,
    "lengthy": 1.6,
    "exhaustive": 2.0,
    "complete": 1.5,
    "brief": 0.7,
    "concise": 0.6,
    "short": 0.5,
    "quick": 0.5,
    "summary": 0.6
  };
  
  // Apply length indicators
  let lengthMultiplier = 1.0;
  for (const [indicator, multiplier] of Object.entries(lengthIndicators)) {
    if (lower.includes(indicator)) {
      lengthMultiplier *= multiplier;
    }
  }
  
  // Check for "why" questions (which tend to get longer explanations)
  if (lower.match(/^why\s+/i) || lower.includes(" why ")) {
    return Math.max(130, promptTokenCount * 3.5); // "Why" questions get longer responses
  }
  
  // Simple default based on prompt length and request complexity
  // Longer prompts often expect longer responses
  // Set higher minimum value for prompts that appear to be asking for content generation
  // but don't match our explicit patterns
  const contentCreationIndicators = [
    "write", "create", "generate", "produce", "compose", "author", "draft", "make"
  ];
  
  const isContentCreationRequest = contentCreationIndicators.some(indicator => lower.includes(indicator));
  
  // Lower the minimum value from 300 to 100 for more accurate estimates on shorter prompts
  // But increase it for content creation requests
  const baseEstimate = isContentCreationRequest 
    ? Math.max(promptTokenCount * 3, 300)  // Higher multiplier and minimum for content creation
    : Math.max(promptTokenCount * 1.5, 100);
  
  // Check for reasoning complexity modifiers
  if (lower.includes("explain") || lower.includes("why")) {
    styleMultiplier *= 1.3;
  }
  
  if (lower.includes("detail") || lower.includes("thorough")) {
    styleMultiplier *= 1.4;
  }
  
  if (lower.includes("compare") || lower.includes("contrast")) {
    styleMultiplier *= 1.5;
  }
  
  if (lower.includes("analyze") || lower.includes("evaluate")) {
    styleMultiplier *= 1.6;
  }
  
  // Apply the style multiplier to the base token count
  return Math.max(Math.ceil(baseEstimate * lengthMultiplier), 20);
}

export { estimateResponseTokens };
