import { encoding_for_model } from "@dqbd/tiktoken";
import textReadability from "text-readability";
import nlp from "compromise";
import readline from "readline";
import { estimateResponseTokens } from "./tokenEstimator.js";

// Add global counters to track cumulative usage
let totalPrompts = 0;
let totalTokens = 0;
let totalRealWorldKWh = 0;
let totalRealWorldWaterUsageMl = 0;

// Token counting using tiktoken
async function countTokens(prompt) {
  const encoder = await encoding_for_model("gpt-4");
  const tokens = encoder.encode(prompt);
  const promptTokens = tokens.length;
  
  // Use our new sophisticated estimator for response tokens
  const estimatedResponseTokens = estimateResponseTokens(prompt, promptTokens);
  const totalTokens = promptTokens + estimatedResponseTokens;
  
  return {
    promptTokens,
    estimatedResponseTokens,
    totalTokens
  };
}

// Vocabulary complexity calculation
function getVocabComplexity(prompt) {
  const score = textReadability.fleschKincaidGrade(prompt);
  return Math.min(score / 12, 1); // Normalize to 0–1 (12th grade = complex)
}

// Reasoning type detection - with extensive indicators
function getReasoningLevel(prompt) {
  const lower = prompt.toLowerCase();
  const doc = nlp(lower);
  
  // Complex reasoning indicators (Level 3) - at least 300 indicators
  const complexReasoningIndicators = [
    // Philosophical & ethical
    "ethics", "impact", "philosophy", "moral", "ethical", "values", "justice", "rights", "duty",
    "virtue", "consequentialism", "deontology", "utilitarianism", "existentialism", "metaphysics",
    "epistemology", "ontology", "axiological", "normative", "metaethics", "teleology", "nihilism",
    "relativism", "absolutism", "hedonism", "stoicism", "determinism", "free will", "consciousness",
    
    // Critical thinking & analysis
    "analyze", "critique", "evaluate", "assess", "examine", "investigate", "review", "scrutinize",
    "critical analysis", "critical thinking", "deconstruct", "implications", "ramifications",
    "nuances", "logical fallacies", "biases", "counterarguments", "limitations", "strengths",
    "weaknesses", "validity", "sound argument", "premise", "inference", "deduction", "induction",
    "syllogism", "dialectic", "rhetoric", "logical consistency", "coherence", "correlation",
    "causation", "confounding variables", "statistical significance", "methodological",
    
    // Advanced AI/ML concepts
    "create an ai", "make an ai", "design an ai", "artificial intelligence", "neural network",
    "machine learning", "deep learning", "reinforcement learning", "supervised learning",
    "unsupervised learning", "natural language processing", "computer vision", "transformer",
    "attention mechanism", "bert", "gpt", "llm", "large language model", "fine-tuning",
    "embedding", "vectorization", "tokenization", "semantic", "latent space", "generative model",
    "discriminative model", "adversarial network", "backpropagation", "gradient descent",
    "overfitting", "underfitting", "regularization", "hyperparameter", "optimization",
    
    // Advanced problem solving
    "solve", "optimization problem", "algorithm complexity", "computational complexity", "np-complete",
    "np-hard", "big o notation", "heuristic", "approximation algorithm", "dynamic programming",
    "greedy algorithm", "divide and conquer", "backtracking", "branch and bound", "graph theory",
    "mathematical proof", "theorem", "lemma", "corollary", "axiomatic", "mathematical induction",
    
    // System design & architecture
    "system design", "architecture", "scalability", "fault tolerance", "load balancing",
    "distributed systems", "microservices", "monolithic", "serverless", "cloud native",
    "containerization", "orchestration", "service mesh", "api gateway", "event-driven",
    "cqrs", "event sourcing", "domain driven design", "bounded context", "ubiquitous language",
    
    // Research & scientific inquiry
    "research", "hypothesis", "scientific method", "control group", "experimental design",
    "variables", "confounding", "correlation", "causation", "statistical analysis",
    "literature review", "meta-analysis", "systematic review", "peer review", "empirical",
    "theoretical framework", "conceptual model", "paradigm", "qualitative research",
    "quantitative research", "mixed methods", "longitudinal", "cross-sectional", "cohort",
    
    // What/why questions & explanations
    "why is", "why are", "why does", "why do", "why can", "why should", "why would", "why might",
    "why has", "why have", "root cause", "fundamental reason", "underlying principles",
    "philosophical basis", "theoretical underpinning", "conceptual foundation", "first principles",
    "epistemological", "ontological", "explain why", "rationalize", "justify", "elucidate",
    
    // Social, political, economic analysis
    "sociopolitical", "socioeconomic", "geopolitical", "cultural implications", "social construct",
    "social dynamics", "power structures", "economic systems", "political theory", "governance",
    "policy analysis", "institutional analysis", "stakeholder analysis", "comparative analysis",
    "historical context", "societal impact", "demographic factors", "social inequality",
    "systemic issues", "marginalization", "privilege", "intersectionality", "sustainability",
    
    // Security & risk analysis
    "cybersecurity", "threat model", "vulnerability assessment", "risk analysis", "attack vector",
    "exploit", "mitigation strategy", "security protocol", "cryptographic", "encryption",
    "authentication", "authorization", "zero trust", "defense in depth", "security architecture",
    "penetration testing", "red team", "blue team", "security audit", "compliance", "regulatory",
    
    // Additional complex topics & tasks
    "quantum computing", "blockchain", "cryptography", "game theory", "complexity theory",
    "systems thinking", "chaos theory", "emergent behavior", "cognitive science", "neuroscience",
    "psycholinguistics", "thermodynamics", "relativity", "quantum mechanics", "information theory",
    "network theory", "control theory", "optimization theory", "decision theory", "category theory",
    "topology", "group theory", "linear algebra", "calculus", "differential equations", "statistics",
    "probability theory", "bayesian inference", "stochastic processes", "markov chains",
    "monte carlo simulation", "computational linguistics", "semantic analysis", "discourse analysis",
    "pragmatics", "semiotics", "hermeneutics", "phenomenology", "structuralism", "post-structuralism",
    "deconstruction", "critical theory", "literary theory", "media studies", "cultural studies",
    "anthropological theory", "sociological theory", "psychological theory", "cognitive theory",
    "developmental theory", "evolutionary theory", "ecological theory", "systems theory"
  ];
  
  // Moderate reasoning indicators (Level 2) - at least 300 indicators
  const moderateReasoningIndicators = [
    // How questions & instructions
    "how to", "how do", "how does", "how can", "how would", "how should", "how might", "how is",
    "how are", "instructions for", "steps to", "guide for", "tutorial on", "process for",
    "procedure for", "method for", "approach to", "technique for", "strategy for", "best practices",
    
    // Comparisons & relationships
    "compare", "contrast", "versus", "vs", "difference between", "similarities between",
    "advantages and disadvantages", "pros and cons", "benefits and drawbacks", "upsides and downsides",
    "strengths and weaknesses", "positive and negative", "better than", "worse than", "preferred over",
    "compared to", "in relation to", "relative to", "in comparison with", "as opposed to",
    
    // Explanations & descriptions
    "explain", "describe", "clarify", "elaborate on", "elucidate", "illustrate", "demonstrate",
    "show how", "walk through", "break down", "outline", "summarize", "overview", "introduction to",
    "description of", "summary of", "synopsis of", "rundown of", "briefing on", "primer on",
    
    // Implementation & creation
    "build", "implement", "create", "develop", "establish", "set up", "construct", "generate",
    "produce", "make", "design", "architect", "engineer", "draft", "compose", "formulate",
    "devise", "conceive", "fabricate", "assemble", "configure", "install", "deploy", "provision",
    
    // Programming & technical
    "write code", "program", "code", "script", "debug", "troubleshoot", "refactor", "optimize",
    "test", "unit test", "integration test", "end-to-end test", "benchmark", "profile",
    "performance tune", "memory management", "garbage collection", "concurrency", "parallelism",
    "synchronization", "asynchronous", "callback", "promise", "async/await", "multithreading",
    
    // Problem-solving (moderate)
    "solution to", "solve for", "resolve", "address", "handle", "manage", "deal with", "tackle",
    "approach", "strategy for", "method for", "technique for", "algorithm for", "recipe for",
    "fix", "patch", "workaround", "bypass", "mitigate", "alleviate", "remedy", "treat",
    
    // Data & information processing
    "process data", "analyze data", "data analysis", "data processing", "data transformation",
    "extract", "transform", "load", "etl", "parse", "filter", "sort", "group", "aggregate",
    "join", "merge", "union", "intersect", "difference", "normalize", "denormalize", "index",
    "query", "search", "retrieve", "fetch", "store", "persist", "cache", "buffer", "batch",
    
    // Web & application development
    "web development", "app development", "front-end", "back-end", "full-stack", "client-side",
    "server-side", "database", "api", "rest", "graphql", "soap", "http", "https", "tcp/ip",
    "dns", "routing", "middleware", "authentication", "authorization", "session management",
    "state management", "data binding", "templating", "responsive design", "mobile first",
    
    // Tools & technologies
    "framework", "library", "toolkit", "sdk", "api", "ide", "editor", "compiler", "interpreter",
    "runtime", "virtual machine", "container", "docker", "kubernetes", "terraform", "ansible",
    "jenkins", "ci/cd", "git", "version control", "package manager", "dependency management",
    
    // Moderate analytics & reporting
    "report on", "dashboard", "metrics", "kpi", "analytics", "visualization", "chart", "graph",
    "plot", "histogram", "scatter plot", "line chart", "bar chart", "pie chart", "heat map",
    "treemap", "funnel chart", "gauge chart", "sparkline", "data table", "pivot table",
    
    // Learning & knowledge
    "learn about", "understand", "comprehend", "grasp", "master", "study", "research", "examine",
    "investigate", "explore", "discover", "uncover", "find out", "determine", "ascertain",
    "identify", "recognize", "distinguish", "differentiate", "discern", "perceive", "observe",
    
    // Communication & documentation
    "document", "comment", "annotate", "label", "tag", "mark", "highlight", "emphasize", "stress",
    "underline", "bold", "italicize", "format", "style", "layout", "structure", "organize",
    "arrange", "order", "sequence", "prioritize", "rank", "rate", "grade", "classify", "categorize",
    
    // Business & management
    "business model", "business plan", "strategic plan", "operational plan", "tactical plan",
    "project plan", "risk management", "change management", "performance management", "quality management",
    "resource management", "time management", "cost management", "stakeholder management",
    "communications management", "procurement management", "integration management", "scope management",
    
    // Additional moderate topics & tasks
    "calculate", "compute", "determine", "estimate", "approximate", "forecast", "predict",
    "project", "extrapolate", "interpolate", "derive", "deduce", "infer", "conclude", "reason",
    "rationalize", "justify", "validate", "verify", "confirm", "corroborate", "substantiate",
    "prove", "disprove", "rebut", "refute", "counter", "argue", "debate", "discuss", "consider",
    "contemplate", "ponder", "reflect", "meditate", "ruminate", "deliberate", "weigh", "evaluate",
    "appraise", "assess", "gauge", "measure", "quantify", "qualify", "characterize", "depict",
    "portray", "represent", "symbolize", "signify", "denote", "connote", "imply", "suggest",
    "indicate", "signal", "convey", "communicate", "express", "articulate", "vocalize", "verbalize",
    "phrase", "word", "formulate", "conceptualize", "abstract", "generalize", "specialize",
    "particularize", "instantiate", "exemplify", "model", "diagram", "sketch", "draft", "outline"
  ];
  
  // Simple reasoning indicators are the default (Level 1) when no other indicators match
  
  // Check for complex reasoning indicators first
  for (const indicator of complexReasoningIndicators) {
    if (lower.includes(indicator)) {
      return 3; // Complex reasoning
    }
  }
  
  // Then check for moderate reasoning indicators
  for (const indicator of moderateReasoningIndicators) {
    if (lower.includes(indicator)) {
      return 2; // Moderate reasoning
    }
  }
  
  // Default to simple reasoning
  return 1; // Simple reasoning
}

// Prompt openness score - with extensive indicators
function getOpennessScore(prompt) {
  const lower = prompt.toLowerCase();
  
  // High openness indicators (Score 2) - at least 300 indicators
  const highOpenPhrases = [
    // Creative writing & storytelling
    "imagine", "write a story", "creative writing", "short story", "novel", "fiction", "narrative",
    "tale", "storyline", "plot", "character", "protagonist", "antagonist", "setting", "scene",
    "dialogue", "monologue", "first-person", "third-person", "point of view", "perspective",
    "narration", "exposition", "rising action", "climax", "falling action", "resolution",
    "denouement", "conflict", "tension", "drama", "comedy", "tragedy", "romance", "adventure",
    "fantasy", "science fiction", "historical fiction", "mystery", "thriller", "horror", "western",
    "fairy tale", "fable", "myth", "legend", "epic", "saga", "parable", "allegory", "novella",
    "flash fiction", "microfiction", "vignette", "anecdote", "memoir", "autobiography", "biography",
    
    // Generation & creation requests
    "generate", "create", "invent", "design", "develop", "build", "construct", "fashion", "fabricate",
    "produce", "make", "craft", "forge", "compose", "formulate", "devise", "conceive", "dream up",
    "conjure", "concoct", "cook up", "come up with", "think of", "originate", "establish", "form",
    "found", "institute", "constitute", "erect", "assemble", "put together", "piece together",
    
    // Artistic creation
    "poem", "poetry", "sonnet", "haiku", "limerick", "rhyme", "verse", "stanza", "meter", "rhythm",
    "lyrics", "song", "ballad", "ode", "elegy", "villanelle", "sestina", "free verse", "prose poem",
    "concrete poetry", "slam poetry", "epic poem", "narrative poem", "dramatic poem", "lyrical",
    "metaphorical", "symbolic", "allegoric", "figurative", "imagery", "simile", "metaphor",
    "personification", "hyperbole", "alliteration", "assonance", "consonance", "onomatopoeia",
    
    // Hypothetical scenarios
    "what if", "suppose", "imagine if", "scenario where", "in a world where", "alternate reality",
    "alternative history", "counterfactual", "hypothetical situation", "thought experiment",
    "mental exercise", "speculative", "conjecture", "supposition", "postulate", "presuppose",
    "assume", "presume", "theoretical case", "hypothesize", "posit", "theorize", "speculate",
    
    // Exploration & brainstorming
    "brainstorm", "ideate", "explore", "discover", "investigate", "probe", "delve into", "examine",
    "look into", "research", "study", "analyze", "assess", "evaluate", "appraise", "review",
    "survey", "inspect", "scrutinize", "peruse", "browse", "scan", "sift through", "comb through",
    "dig into", "unearth", "uncover", "reveal", "disclose", "expose", "bring to light", "illuminate",
    
    // Open-ended questions
    "how might", "how could", "how would", "tell me", "share with me", "suggest", "recommend",
    "propose", "put forward", "advocate", "endorse", "champion", "back", "support", "promote",
    "encourage", "advance", "further", "foster", "nurture", "cultivate", "incubate", "hatch",
    
    // Visual & design creation
    "draw", "sketch", "illustrate", "paint", "depict", "render", "portray", "represent", "visualize",
    "envision", "picture", "image", "conceptualize", "mockup", "wireframe", "prototype", "model",
    "blueprint", "schematic", "diagram", "chart", "graph", "map", "plan", "layout", "design",
    "architecture", "structure", "framework", "scaffold", "skeleton", "outline", "rough draft",
    
    // Innovation & breakthrough thinking
    "innovate", "disrupt", "revolutionize", "transform", "reinvent", "reimagine", "rethink",
    "redefine", "reconceive", "reconceptualize", "restructure", "reorganize", "reform", "remake",
    "remodel", "reshape", "reconfigure", "recalibrate", "reorient", "redirect", "repurpose",
    "upcycle", "breakthrough", "cutting-edge", "state-of-the-art", "avant-garde", "pioneering",
    
    // Game & interactive experiences
    "game", "gameplay", "mechanic", "rule", "player", "turn", "round", "move", "action", "reaction",
    "strategy", "tactic", "maneuver", "play", "contest", "competition", "challenge", "quest",
    "mission", "objective", "goal", "achievement", "reward", "penalty", "puzzle", "maze", "riddle",
    "enigma", "mystery", "conundrum", "interactive", "engagement", "immersion", "experience",
    
    // NEW: Cultural and generational references (especially for Gen Z)
    "gen z", "generation z", "zoomer", "zoomers", "tiktok", "meme", "memes", "viral", "trending",
    "influencer", "influencers", "clout", "flex", "aesthetic", "vibe", "vibes", "vibe check",
    "mood", "energy", "stan", "fandom", "ship", "shipping", "tea", "spill the tea", "shade",
    "lowkey", "highkey", "slay", "slaying", "based", "cringe", "cringey", "sus", "yeet", "dank",
    "fit", "outfit", "drip", "snack", "snatched", "fire", "lit", "fam", "no cap", "goat",
    "ghost", "ghosted", "catfish", "finsta", "rizz", "bussin", "bet", "facts", "cap", "deadass",
    "simp", "savage", "toxic", "basic", "zaddy", "periodt", "wig", "sending me", "rent free",
    "main character", "villain era", "understood the assignment", "cheugy", "giving", "gaslighting",
    
    // Subjective assessment terms
    "cool", "coolness", "popularity", "trendy", "hip", "fashionable", "stylish", "on trend",
    "in style", "in fashion", "in vogue", "cutting edge", "ahead of the curve", "popular",
    "unpopular", "acceptable", "unacceptable", "appropriate", "inappropriate", "preferred",
    "opinion", "perspective", "viewpoint", "stance", "position", "attitude", "mindset",
    "outlook", "judgment", "assessment", "evaluation", "appraisal", "rating", "ranking",
    "scoring", "interpretation", "perception", "impression", "sentiment",
    "feeling", "emotion", "reaction", "response", "reception", "feedback", "critique",
    "criticism", "review", "analysis", "examination", "investigation", "inquiry", "probe",
    "study", "survey", "poll", "consensus", "agreement", "disagreement", "controversy",
    
    // Additional creative assessment phrases
    "determine if", "figure out if", "assess if", "evaluate if", "judge if", "decide if",
    "rate", "rank", "grade", "score", "classify", "categorize", "label", "tag", "mark",
    "brand", "stamp", "badge", "measure", "gauge", "meter", "barometer", "yardstick",
    "benchmark", "standard", "criterion", "norm", "convention", "custom", "tradition",
    "practice", "habit", "routine", "ritual", "ceremony", "observance", "rite", "protocol"
  ];
  
  // Medium openness indicators (Score 1) - at least 300 indicators
  const mediumOpenPhrases = [
    // Explanatory requests
    "explain", "clarify", "elucidate", "illustrate", "demonstrate", "show", "tell", "inform",
    "educate", "instruct", "teach", "train", "coach", "mentor", "guide", "direct", "steer",
    "lead", "conduct", "usher", "escort", "accompany", "assist", "aid", "help", "support",
    "facilitate", "enable", "empower", "equip", "prepare", "ready", "groom", "prime", "position",
    
    // Descriptive requests
    "describe", "depict", "portray", "characterize", "represent", "express", "articulate", "voice",
    "verbalize", "phrase", "word", "formulate", "state", "declare", "pronounce", "proclaim",
    "announce", "communicate", "convey", "relay", "transmit", "dispatch", "disseminate", "spread",
    "broadcast", "publicize", "advertise", "promote", "market", "sell", "pitch", "present",
    
    // Writing tasks with parameters
    "write", "compose", "draft", "author", "pen", "script", "record", "document", "chronicle",
    "journal", "log", "note", "minute", "register", "catalog", "list", "itemize", "enumerate",
    "detail", "specify", "particularize", "pinpoint", "nail down", "zero in on", "focus on",
    "concentrate on", "emphasize", "highlight", "underscore", "stress", "accentuate", "feature",
    
    // Summarization tasks
    "summarize", "recap", "review", "sum up", "wrap up", "round up", "conclude", "finalize",
    "complete", "finish", "end", "terminate", "cease", "halt", "stop", "discontinue", "desist",
    "refrain", "abstain", "forbear", "hold back", "restrain", "contain", "limit", "restrict",
    "confine", "constrain", "narrow", "reduce", "decrease", "diminish", "lessen", "minimize",
    
    // Semi-structured questions
    "can you", "would you", "could you", "will you", "may you", "might you", "shall you",
    "should you", "do you", "are you", "is it", "was it", "were they", "have you", "has it",
    "had they", "does it", "did they", "who is", "what is", "where is", "when is", "why is",
    "how is", "which is", "whose is", "whom is", "whatever", "whenever", "wherever", "whoever",
    
    // Help requests
    "help me", "assist me", "aid me", "support me", "guide me", "direct me", "lead me", "show me",
    "tell me", "inform me", "educate me", "instruct me", "teach me", "train me", "coach me",
    "mentor me", "advise me", "counsel me", "consult me", "recommend to me", "suggest to me",
    "propose to me", "offer me", "provide me", "furnish me", "supply me", "equip me", "outfit me",
    
    // Information gathering
    "information about", "details on", "facts about", "data on", "statistics for", "figures on",
    "numbers for", "metrics about", "measurements of", "dimensions for", "proportions of",
    "ratios for", "percentages of", "fractions of", "portions of", "segments of", "sections of",
    "parts of", "components of", "elements of", "aspects of", "features of", "characteristics of",
    
    // Analysis requests
    "analyze", "examine", "inspect", "scrutinize", "study", "investigate", "explore", "probe",
    "research", "look into", "delve into", "dig into", "inquire about", "query about", "ask about",
    "question about", "interrogate about", "interview about", "survey about", "poll about",
    "canvas about", "assess", "evaluate", "appraise", "estimate", "gauge", "measure", "weigh",
    
    // Comparison requests
    "compare", "contrast", "differentiate", "distinguish", "discriminate", "separate", "divide",
    "split", "cleave", "sever", "dissect", "anatomize", "analyze", "break down", "dismantle",
    "disassemble", "take apart", "decompose", "dissolve", "resolve", "reduce", "convert", "change",
    "transform", "transmute", "metamorphose", "evolve", "develop", "grow", "mature", "ripen",
    
    // Planning & organization
    "plan", "organize", "arrange", "order", "structure", "systematic", "methodical", "orderly",
    "neat", "tidy", "clean", "uncluttered", "streamlined", "efficient", "effective", "productive",
    "fruitful", "profitable", "beneficial", "advantageous", "favorable", "positive", "good",
    "excellent", "superior", "outstanding", "exceptional", "extraordinary", "remarkable", "notable",
    
    // Procedural requests
    "procedure for", "process of", "method for", "technique of", "approach to", "way of", "means of",
    "manner of", "mode of", "fashion of", "style of", "form of", "type of", "kind of", "sort of",
    "class of", "category of", "group of", "set of", "collection of", "assortment of", "variety of",
    "diversity of", "range of", "spectrum of", "gamut of", "scale of", "scope of", "extent of",
    
    // Additional medium-open indicators
    "outline", "sketch", "rough out", "block out", "lay out", "map out", "chart", "diagram",
    "graph", "plot", "scheme", "design", "blueprint", "draft", "mock up", "model", "prototype",
    "pilot", "test", "trial", "experiment", "essay", "attempt", "endeavor", "undertaking", "venture",
    "enterprise", "project", "task", "job", "duty", "responsibility", "obligation", "commitment"
  ];
  
  // Check for high openness indicators first
  for (const phrase of highOpenPhrases) {
    if (lower.includes(phrase)) {
      return 2; // High openness
    }
  }
  
  // Then check for medium openness indicators
  for (const phrase of mediumOpenPhrases) {
    if (lower.includes(phrase)) {
      return 1; // Medium openness
    }
  }
  
  // Default to low openness
  return 0; // Low openness
}

// Calculate energy usage in kWh
async function calculateEnergy(prompt) {
  // BASE_KWH_PER_1000_TOKENS from user feedback
  const BASE_KWH_PER_1000_TOKENS = 0.002;
  
  // Water usage estimation factor (ml per kWh)
  // Based on data center cooling efficiency estimates
  const WATER_USAGE_ML_PER_KWH = 1500; // ml of water used per kWh
  
  // NEW: Real-world overhead factors
  const DATACENTER_OVERHEAD_FACTOR = 2.5; // Power usage effectiveness (PUE) for data centers
  const IDLE_LOAD_FACTOR = 1.7; // Servers maintaining model in memory and context handling
  const NETWORK_OVERHEAD_FACTOR = 1.15; // Network transmission energy
  const AMORTIZED_TRAINING_FACTOR = 1.2; // Partial amortization of training costs
  const PRODUCTION_ENVIRONMENT_FACTOR = 1.3; // Shared resources, load balancing, etc.
  
  // Calculate metrics
  const { totalTokens } = await countTokens(prompt);
  const complexity = getVocabComplexity(prompt);
  const reasoningLevel = getReasoningLevel(prompt);
  const openness = getOpennessScore(prompt);
  
  // Base energy calculation
  const baseKWh = (totalTokens / 1000) * BASE_KWH_PER_1000_TOKENS;
  
  // Calculate modifiers based on reasoning and openness (increased for more accurate estimates)
  let reasoningModifier = 0;
  switch(reasoningLevel) {
    case 3: reasoningModifier = 0.8; break; // Increased from 0.5
    case 2: reasoningModifier = 0.4; break; // Increased from 0.3
    case 1: reasoningModifier = 0.15; break; // Increased from 0.1
  }
  
  let opennessModifier = 0;
  switch(openness) {
    case 2: opennessModifier = 0.4; break; // Increased from 0.3
    case 1: opennessModifier = 0.25; break; // Increased from 0.2
    case 0: opennessModifier = 0.0; break;
  }
  
  // Apply complexity modifier (increased range 0-0.4)
  const complexityModifier = complexity * 0.4; // Increased from 0.3
  
  // Add inference overhead factor for model parallelism and attention mechanisms
  // Higher for complex, reasoning-heavy prompts
  let inferenceOverhead = 0.1; // Base overhead
  if (reasoningLevel === 3 && complexity > 0.6) {
    inferenceOverhead = 0.3; // Higher overhead for complex reasoning with complex vocabulary
  } else if (reasoningLevel === 3 || complexity > 0.6) {
    inferenceOverhead = 0.2; // Medium-high overhead
  }
  
  // Calculate total modifier
  const totalModifier = 1 + reasoningModifier + opennessModifier + complexityModifier + inferenceOverhead;
  
  // Direct inference energy calculation (theoretical)
  const directKWh = baseKWh * totalModifier;
  const directWaterUsageMl = directKWh * WATER_USAGE_ML_PER_KWH;
  
  // NEW: Calculate real-world total energy with overhead factors
  const realWorldKWh = directKWh * DATACENTER_OVERHEAD_FACTOR * IDLE_LOAD_FACTOR * 
                       NETWORK_OVERHEAD_FACTOR * AMORTIZED_TRAINING_FACTOR * PRODUCTION_ENVIRONMENT_FACTOR;
  const realWorldWaterUsageMl = realWorldKWh * WATER_USAGE_ML_PER_KWH;
  
  return {
    promptTokens: (await countTokens(prompt)).promptTokens,
    estimatedResponseTokens: (await countTokens(prompt)).estimatedResponseTokens,
    totalTokens,
    complexity,
    reasoningLevel,
    openness: ["Low", "Medium", "High"][openness],
    reasoningType: ["Simple", "Moderate", "Complex"][reasoningLevel-1],
    baseKWh,
    totalModifier,
    inferenceOverhead,
    directKWh,           // NEW: Renamed from kWh to directKWh
    directWattHours: directKWh * 1000, // Convert to Wh for easier reading
    directWaterUsageMl,  // NEW: Renamed from waterUsageMl to directWaterUsageMl
    realWorldKWh,        // NEW: Added real world energy calculation
    realWorldWattHours: realWorldKWh * 1000,
    realWorldWaterUsageMl // NEW: Added real world water usage
  };
}

// Command-line interface
function createInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log("GPT-4 Prompt Energy Calculator");
  console.log("Enter a prompt to estimate energy usage (or 'exit' to quit):");
  console.log("Special commands: 'stats' to view totals, 'reset' to reset counters");
  
  rl.on('line', async (input) => {
    const command = input.toLowerCase();
    
    if (command === 'exit') {
      rl.close();
      return;
    }
    
    if (command === 'stats') {
      displayTotalStats();
      console.log("\nEnter another prompt (or 'exit' to quit):");
      return;
    }
    
    if (command === 'reset') {
      resetStats();
      console.log("All counters have been reset to zero.");
      console.log("\nEnter another prompt (or 'exit' to quit):");
      return;
    }
    
    try {
      const result = await calculateEnergy(input);
      const { promptTokens, estimatedResponseTokens } = result;
      
      // Update the global counters
      totalPrompts++;
      totalTokens += result.totalTokens;
      totalRealWorldKWh += result.realWorldKWh;
      totalRealWorldWaterUsageMl += result.realWorldWaterUsageMl;
      
      console.log("\nEnergy Analysis:");
      console.log(`Prompt Tokens: ${promptTokens}`);
      console.log(`Est. Response Tokens: ${estimatedResponseTokens}`);
      console.log(`Total Tokens: ${result.totalTokens}`);
      console.log(`Vocabulary Complexity: ${(result.complexity * 100).toFixed(2)}%`);
      console.log(`Reasoning Level: ${result.reasoningType} (${result.reasoningLevel})`);
      console.log(`Openness Score: ${result.openness}`);
      
      // Add response size in words for better understanding
      const estResponseWords = Math.floor(estimatedResponseTokens / 1.3);
      console.log(`Est. Response Size: ~${estResponseWords.toLocaleString()} words`);
      
      // NEW: Updated output section to show both direct and real-world estimates
      console.log(`\n=== DIRECT INFERENCE ONLY (THEORETICAL) ===`);
      console.log(`Base Energy: ${result.baseKWh.toExponential(6)} kWh`);
      console.log(`Total Modifier: ${result.totalModifier.toFixed(2)}x`);
      console.log(`Direct Energy Usage: ${result.directKWh.toExponential(6)} kWh (${result.directWattHours.toFixed(2)} Wh)`);
      console.log(`Direct Water Usage: ${result.directWaterUsageMl.toFixed(2)} ml`);
      
      // NEW: Add real-world estimates section
      console.log(`\n=== REAL-WORLD USAGE (WITH OVERHEAD) ===`);
      console.log(`Real-World Energy Usage: ${result.realWorldKWh.toExponential(6)} kWh (${result.realWorldWattHours.toFixed(2)} Wh)`);
      console.log(`Real-World Water Usage: ${result.realWorldWaterUsageMl.toFixed(2)} ml`);
      
      // Water consumption comparisons for real-world usage
      if (result.realWorldWaterUsageMl > 1000) {
        console.log(`This is equivalent to ${(result.realWorldWaterUsageMl / 1000).toFixed(3)} liters of water`);
      }
      if (result.realWorldWaterUsageMl > 250) {
        console.log(`This is about ${(result.realWorldWaterUsageMl / 250).toFixed(1)} glasses of drinking water`);
      }
      
      // Comparisons for real-world energy
      const lightBulbHours = (result.realWorldKWh / 0.01).toFixed(4); // Assuming 10W LED bulb
      console.log(`This is equivalent to powering a 10W LED bulb for ${lightBulbHours} hours`);
      
      // NEW: Add explanation of the differences
      console.log(`\nNOTE: The real-world usage includes data center overhead, cooling inefficiencies,`);
      console.log(`model preloading, shared resources, and other factors not reflected in`);
      console.log(`theoretical direct inference calculations. This is why media reports often`);
      console.log(`cite 20-50 mL water usage per prompt while direct calculations show much less.`);
    } catch (error) {
      console.error("Error analyzing prompt:", error);
    }
    
    // Add total stats display after individual analysis
    displayTotalStats();
    
    console.log("\nEnter another prompt (or 'exit' to quit):");
  });
}

// New function to display total statistics
function displayTotalStats() {
  console.log("\n=== CUMULATIVE ENERGY USAGE ===");
  console.log(`Total Energy: ${(totalRealWorldKWh * 1000).toFixed(2)} Wh`);
  console.log(`Total Water: ${totalRealWorldWaterUsageMl.toFixed(2)} ml`);
  console.log(`Prompts: ${totalPrompts}`);
  console.log(`Tokens: ${totalTokens}`);
  
  // Add some useful comparisons for the totals
  if (totalRealWorldWaterUsageMl > 1000) {
    console.log(`Total water usage: ${(totalRealWorldWaterUsageMl / 1000).toFixed(3)} liters`);
  }
  
  const totalLightBulbHours = (totalRealWorldKWh / 0.01).toFixed(2); // Assuming 10W LED bulb
  console.log(`Equivalent to powering a 10W LED bulb for ${totalLightBulbHours} hours`);
}

// New function to reset all counters
function resetStats() {
  totalPrompts = 0;
  totalTokens = 0;
  totalRealWorldKWh = 0;
  totalRealWorldWaterUsageMl = 0;
}

// Start the application
createInterface();
