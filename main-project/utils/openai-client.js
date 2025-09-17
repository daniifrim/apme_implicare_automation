/**
 * APME OpenAI API Client
 * Handles AI-powered field mapping and text analysis with caching and rate limiting
 */

class OpenAIClient {
  
  /**
   * Make OpenAI API call for field mapping
   * @param {Array} availableFields - List of available field names
   * @param {string} targetFieldKey - Target field key to match
   * @returns {string|null} - Best matching field name or null
   */
  static async findFieldMapping(availableFields, targetFieldKey) {
    console.log(`🤖 Using AI to map field: ${targetFieldKey}`);
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(availableFields, targetFieldKey);
      const cachedResult = this.getCachedMapping(cacheKey);
      
      if (cachedResult) {
        console.log(`💾 Using cached AI mapping: ${targetFieldKey} → "${cachedResult}"`);
        return cachedResult;
      }

      // Rate limiting
      await this.enforceRateLimit();

      // Prepare the prompt
      const prompt = this.buildFieldMappingPrompt(availableFields, targetFieldKey);
      
      // Make API call
      const result = await this.callOpenAI(prompt);
      
      // Process and cache result
      const mappedField = this.processFieldMappingResult(result, availableFields);
      
      if (mappedField && mappedField !== 'NO_MATCH') {
        this.cacheMapping(cacheKey, mappedField);
        console.log(`🎯 AI mapped: ${targetFieldKey} → "${mappedField}"`);
        return mappedField;
      }
      
      console.log(`❌ AI could not map field: ${targetFieldKey}`);
      return null;
      
    } catch (error) {
      console.error(`❌ AI field mapping failed for ${targetFieldKey}:`, error);
      return null;
    }
  }

  /**
   * Build the field mapping prompt for OpenAI
   */
  static buildFieldMappingPrompt(availableFields, targetFieldKey) {
    const basePrompt = getSetting('OPENAI.FIELD_MAPPING_PROMPT');
    
    const prompt = `${basePrompt}

Available field names:
${availableFields.map((field, index) => `${index + 1}. "${field}"`).join('\n')}

Target field key: ${targetFieldKey}

Best matching field name:`;

    return prompt;
  }

  /**
   * Make the actual OpenAI API call
   */
  static async callOpenAI(prompt) {
    const apiKey = getSetting('OPENAI.API_KEY');
    const model = getSetting('OPENAI.MODEL');
    const maxTokens = getSetting('OPENAI.MAX_TOKENS');
    const temperature = getSetting('OPENAI.TEMPERATURE');
    const baseUrl = getSetting('OPENAI.BASE_URL');

    const payload = {
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    };

    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };

    console.log(`🚀 Making OpenAI API call with model: ${model}`);
    
    const response = UrlFetchApp.fetch(`${baseUrl}/chat/completions`, options);
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`OpenAI API error: ${response.getResponseCode()} - ${response.getContentText()}`);
    }

    const data = JSON.parse(response.getContentText());
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI API');
    }

    return data.choices[0].message.content.trim();
  }

  /**
   * Process the AI response and validate it
   */
  static processFieldMappingResult(result, availableFields) {
    // Clean the result
    const cleanResult = result.replace(/['"]/g, '').trim();
    
    // Check for explicit NO_MATCH
    if (cleanResult === 'NO_MATCH') {
      return null;
    }

    // Verify the result is actually in our available fields
    const exactMatch = availableFields.find(field => field === cleanResult);
    if (exactMatch) {
      return exactMatch;
    }

    // Try fuzzy matching on the result
    const fuzzyMatch = availableFields.find(field => 
      field.toLowerCase().includes(cleanResult.toLowerCase()) ||
      cleanResult.toLowerCase().includes(field.toLowerCase())
    );
    
    if (fuzzyMatch) {
      console.log(`🔍 AI result fuzzy matched: "${cleanResult}" → "${fuzzyMatch}"`);
      return fuzzyMatch;
    }

    console.warn(`⚠️ AI returned invalid field name: "${cleanResult}"`);
    return null;
  }

  /**
   * Generate cache key for field mapping
   */
  static generateCacheKey(availableFields, targetFieldKey) {
    const fieldsHash = this.simpleHash(availableFields.sort().join('|'));
    return `${targetFieldKey}_${fieldsHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  static simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached mapping result
   */
  static getCachedMapping(cacheKey) {
    const cacheEnabled = getSetting('OPENAI.CACHE_ENABLED', true);
    if (!cacheEnabled) return null;

    try {
      const cache = getSetting('FIELD_MAPPING.AI_CACHE', {});
      const cachedEntry = cache[cacheKey];
      
      if (!cachedEntry) return null;

      // Check if cache entry is expired
      const ttlHours = getSetting('OPENAI.CACHE_TTL_HOURS', 24);
      const now = new Date().getTime();
      const cacheAge = now - cachedEntry.timestamp;
      const maxAge = ttlHours * 60 * 60 * 1000; // Convert to milliseconds

      if (cacheAge > maxAge) {
        // Cache expired, remove it
        delete cache[cacheKey];
        return null;
      }

      return cachedEntry.result;
      
    } catch (error) {
      console.warn('⚠️ Cache read error:', error);
      return null;
    }
  }

  /**
   * Cache mapping result
   */
  static cacheMapping(cacheKey, result) {
    const cacheEnabled = getSetting('OPENAI.CACHE_ENABLED', true);
    if (!cacheEnabled) return;

    try {
      if (!SETTINGS.FIELD_MAPPING.AI_CACHE) {
        SETTINGS.FIELD_MAPPING.AI_CACHE = {};
      }

      SETTINGS.FIELD_MAPPING.AI_CACHE[cacheKey] = {
        result: result,
        timestamp: new Date().getTime()
      };

      console.log(`💾 Cached AI mapping: ${cacheKey}`);
      
    } catch (error) {
      console.warn('⚠️ Cache write error:', error);
    }
  }

  /**
   * Enforce rate limiting to avoid hitting API limits
   */
  static async enforceRateLimit() {
    const rateLimitMs = getSetting('OPENAI.RATE_LIMIT_MS', 1000);
    
    if (!this._lastApiCall) {
      this._lastApiCall = 0;
    }

    const now = new Date().getTime();
    const timeSinceLastCall = now - this._lastApiCall;

    if (timeSinceLastCall < rateLimitMs) {
      const waitTime = rateLimitMs - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      Utilities.sleep(waitTime);
    }

    this._lastApiCall = new Date().getTime();
  }

  /**
   * Batch field mapping for multiple fields
   * More efficient than individual calls
   */
  static async batchFindFieldMappings(availableFields, targetFieldKeys) {
    console.log(`🤖 Batch AI mapping for ${targetFieldKeys.length} fields`);
    
    try {
      // Filter out already cached mappings
      const uncachedFields = [];
      const results = {};
      
      for (const fieldKey of targetFieldKeys) {
        const cacheKey = this.generateCacheKey(availableFields, fieldKey);
        const cached = this.getCachedMapping(cacheKey);
        
        if (cached) {
          results[fieldKey] = cached;
          console.log(`💾 Batch cached: ${fieldKey} → "${cached}"`);
        } else {
          uncachedFields.push(fieldKey);
        }
      }

      // If all fields are cached, return results
      if (uncachedFields.length === 0) {
        return results;
      }

      // Build batch prompt for uncached fields
      const batchPrompt = this.buildBatchMappingPrompt(availableFields, uncachedFields);
      
      // Rate limiting
      await this.enforceRateLimit();
      
      // Make batch API call
      const batchResult = await this.callOpenAI(batchPrompt);
      
      // Process batch results
      const batchMappings = this.processBatchMappingResult(batchResult, availableFields, uncachedFields);
      
      // Cache and merge results
      for (const fieldKey of uncachedFields) {
        const mapping = batchMappings[fieldKey];
        if (mapping) {
          const cacheKey = this.generateCacheKey(availableFields, fieldKey);
          this.cacheMapping(cacheKey, mapping);
          results[fieldKey] = mapping;
        }
      }

      console.log(`🎯 Batch AI mapping completed: ${Object.keys(results).length}/${targetFieldKeys.length} mapped`);
      return results;
      
    } catch (error) {
      console.error('❌ Batch AI field mapping failed:', error);
      
      // Fallback to individual mappings
      console.log('🔄 Falling back to individual AI mappings...');
      const fallbackResults = {};
      
      for (const fieldKey of targetFieldKeys) {
        try {
          const mapping = await this.findFieldMapping(availableFields, fieldKey);
          if (mapping) {
            fallbackResults[fieldKey] = mapping;
          }
        } catch (individualError) {
          console.warn(`⚠️ Individual mapping failed for ${fieldKey}:`, individualError);
        }
      }
      
      return fallbackResults;
    }
  }

  /**
   * Build batch mapping prompt
   */
  static buildBatchMappingPrompt(availableFields, targetFieldKeys) {
    const basePrompt = getSetting('OPENAI.FIELD_MAPPING_PROMPT');
    
    const prompt = `${basePrompt}

Available field names:
${availableFields.map((field, index) => `${index + 1}. "${field}"`).join('\n')}

Map these target field keys to the best matching available field names:
${targetFieldKeys.map((key, index) => `${index + 1}. ${key}`).join('\n')}

Respond in this exact format:
FIELD_KEY: "matching field name" or "NO_MATCH"

Mappings:`;

    return prompt;
  }

  /**
   * Process batch mapping results
   */
  static processBatchMappingResult(result, availableFields, targetFieldKeys) {
    const mappings = {};
    
    try {
      const lines = result.split('\n').filter(line => line.trim().length > 0);
      
      for (const line of lines) {
        const match = line.match(/^([A-Z_]+):\s*["']?([^"'\n]+)["']?$/);
        if (match) {
          const fieldKey = match[1].trim();
          const mappedField = match[2].trim();
          
          if (targetFieldKeys.includes(fieldKey) && mappedField !== 'NO_MATCH') {
            // Validate the mapped field exists
            const validField = availableFields.find(field => 
              field === mappedField || 
              field.toLowerCase().includes(mappedField.toLowerCase())
            );
            
            if (validField) {
              mappings[fieldKey] = validField;
            }
          }
        }
      }
      
    } catch (error) {
      console.warn('⚠️ Error parsing batch mapping result:', error);
    }
    
    return mappings;
  }

  /**
   * Clear AI cache (for maintenance)
   */
  static clearCache() {
    try {
      SETTINGS.FIELD_MAPPING.AI_CACHE = {};
      console.log('🗑️ AI mapping cache cleared');
    } catch (error) {
      console.warn('⚠️ Error clearing AI cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    try {
      const cache = getSetting('FIELD_MAPPING.AI_CACHE', {});
      const entries = Object.keys(cache).length;
      const ttlHours = getSetting('OPENAI.CACHE_TTL_HOURS', 24);
      
      // Count expired entries
      const now = new Date().getTime();
      const maxAge = ttlHours * 60 * 60 * 1000;
      const expiredEntries = Object.values(cache).filter(entry => 
        (now - entry.timestamp) > maxAge
      ).length;
      
      return {
        totalEntries: entries,
        expiredEntries: expiredEntries,
        activeEntries: entries - expiredEntries,
        cacheHitRate: this._cacheHits ? (this._cacheHits / (this._cacheHits + this._cacheMisses)) : 0
      };
      
    } catch (error) {
      console.warn('⚠️ Error getting cache stats:', error);
      return { error: error.message };
    }
  }
} 