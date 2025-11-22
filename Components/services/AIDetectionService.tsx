// services/AIDetectionService.js
import axios from 'axios';

class AIDetectionService {
  constructor() {
    this.detectionApis = [
      {
        name: 'openai-detector',
        url: 'https://api.openai.com/v1/detections',
        method: 'POST'
      },
      // Add more detection services as needed
    ];

    this.patterns = {
      aiIndicators: [
        /certainly|undoubtedly|moreover|furthermore|additionally|however.*therefore/gi,
        /as an AI language model|as a large language model/gi,
        /in conclusion|to summarize|it is important to note/gi,
        /comprehensive.*analysis|thorough.*examination/gi,
        /\bI\b.*\b(?:think|believe|would say)\b.*\bbut\b/gi,
        /on the one hand.*on the other hand/gi,
        /it is worth noting|it should be mentioned/gi
      ],
      structurePatterns: [
        /^(?:first|second|third|finally)/gmi,
        /^in summary|^conclusion|^to conclude/gmi,
        /^dear user|^hello|^thank you for asking/gmi
      ]
    };
  }

  // Pattern-based detection
  detectAIPatterns(text) {
    const indicators = {
      score: 0,
      matches: [],
      reasons: []
    };

    // Check for AI-specific phrases
    this.patterns.aiIndicators.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        indicators.score += matches.length * 2;
        indicators.matches.push(...matches);
        indicators.reasons.push(`Found AI-style phrasing: ${matches.join(', ')}`);
      }
    });

    // Check for structured responses
    this.patterns.structurePatterns.forEach(pattern => {
      if (pattern.test(text)) {
        indicators.score += 3;
        indicators.reasons.push('Detected structured AI response pattern');
      }
    });

    // Check for perfection (AI tends to write perfectly)
    const sentenceCount = text.split(/[.!?]+/).length;
    const wordCount = text.split(/\s+/).length;
    const avgSentenceLength = wordCount / sentenceCount;

    if (avgSentenceLength > 15 && avgSentenceLength < 25) {
      indicators.score += 2;
      indicators.reasons.push('Sentence structure appears AI-optimized');
    }

    // Check for lack of personal pronouns (AI often avoids "I", "we", etc.)
    const personalPronouns = (text.match(/\b(I|my|mine|we|our|ours)\b/gi) || []).length;
    if (personalPronouns < wordCount * 0.01) { // Less than 1% personal pronouns
      indicators.score += 1;
      indicators.reasons.push('Low use of personal pronouns');
    }

    return indicators;
  }

  // Statistical analysis
  analyzeWritingStyle(text) {
    const analysis = {
      entropy: this.calculateEntropy(text),
      punctuationDensity: this.calculatePunctuationDensity(text),
      wordComplexity: this.calculateWordComplexity(text),
      repetitionScore: this.calculateRepetitionScore(text)
    };

    return analysis;
  }

  calculateEntropy(text) {
    // Calculate Shannon entropy of the text
    const charCount = {};
    let length = text.length;

    for (let char of text) {
      charCount[char] = (charCount[char] || 0) + 1;
    }

    let entropy = 0;
    for (let char in charCount) {
      const p = charCount[char] / length;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  calculatePunctuationDensity(text) {
    const punctuationMatches = text.match(/[.,!?;:]/g) || [];
    return punctuationMatches.length / text.length;
  }

  calculateWordComplexity(text) {
    const words = text.split(/\s+/);
    const complexWords = words.filter(word => word.length > 7);
    return complexWords.length / words.length;
  }

  calculateRepetitionScore(text) {
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = {};

    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const maxFreq = Math.max(...Object.values(wordFreq));
    return maxFreq / words.length;
  }

  async checkWithExternalAPI(text) {
    try {
      // Example using a hypothetical AI detection API
      const response = await axios.post('https://ai-detection-api.com/v1/detect', {
        text: text,
        language: 'en'
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.AI_DETECTION_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.warn('External AI detection API failed:', error);
      return null;
    }
  }

  isLikelyAI(text, threshold = 0.7) {
    if (!text || text.length < 50) return { isAI: false, confidence: 0, reasons: [] };

    const patternDetection = this.detectAIPatterns(text);
    const styleAnalysis = this.analyzeWritingStyle(text);

    let confidence = 0;
    let reasons = [...patternDetection.reasons];

    // Pattern-based scoring (0-60 points)
    confidence += Math.min(patternDetection.score * 10, 60);

    // Style-based scoring (0-40 points)
    if (styleAnalysis.entropy > 4.0 && styleAnalysis.entropy < 4.8) confidence += 10;
    if (styleAnalysis.punctuationDensity > 0.05) confidence += 10;
    if (styleAnalysis.wordComplexity > 0.15) confidence += 10;
    if (styleAnalysis.repetitionScore < 0.1) confidence += 10;

    const normalizedConfidence = Math.min(confidence, 100) / 100;

    return {
      isAI: normalizedConfidence >= threshold,
      confidence: normalizedConfidence,
      reasons: reasons,
      analysis: {
        patterns: patternDetection,
        style: styleAnalysis
      }
    };
  }
}

export default new AIDetectionService();