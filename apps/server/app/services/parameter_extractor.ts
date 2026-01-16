/**
 * Parameter Extractor Service
 * Extracts action parameters from user input
 *
 * Phase 2.3：支持 AI 驱动和规则匹配的参数提取
 *
 * Supports:
 * 1. AI-based intelligent parameter extraction
 * 2. Pattern-based rule matching
 * 3. Parameter validation against action schema
 * 4. Type conversion and coercion
 */

import { generateText } from 'ai';
import type { Action, ActionInputSchema } from '../models/types.js';
import type { AIProviderRepository } from '../db/interfaces.js';

/**
 * Extracted parameters with metadata
 */
export interface ExtractedParameters {
  /** Successfully extracted parameters */
  parameters: Record<string, unknown>;
  /** Which extraction method was used */
  method: 'ai' | 'pattern' | 'none';
  /** Any warnings or issues */
  warnings: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Missing required parameters (Phase 2.7) */
  missingRequired: MissingParameter[];
}

/**
 * Information about a missing required parameter (Phase 2.7)
 */
export interface MissingParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: string;
  /** Parameter description for user prompt */
  description?: string;
  /** User-friendly label */
  label?: string;
}

/**
 * Parameter Extractor Service
 */
export class ParameterExtractor {
  constructor(private aiProviderRepository?: AIProviderRepository) {}

  /**
   * Extract parameters from user input
   * @param userText Raw user input text
   * @param action Action definition with schema
   * @returns Extracted parameters with metadata
   */
  async extractParameters(userText: string, action: Action): Promise<ExtractedParameters> {
    // If action has no input schema, return empty parameters
    if (!action.inputSchema) {
      return {
        parameters: {},
        method: 'none',
        warnings: ['Action has no input schema'],
        confidence: 1,
        missingRequired: [],
      };
    }

    // Try AI extraction first if available
    if (this.aiProviderRepository) {
      try {
        const aiResult = await this.extractWithAI(userText, action);
        if (aiResult.confidence > 0.5) {
          return aiResult;
        }
        // If confidence too low, continue to pattern matching
      } catch {
        // AI extraction failed, fall back to pattern matching
      }
    }

    // Fall back to pattern-based extraction
    return this.extractWithPatterns(userText, action);
  }

  /**
   * Extract parameters using AI
   * @private
   */
  private async extractWithAI(userText: string, action: Action): Promise<ExtractedParameters> {
    try {
      const schema = action.inputSchema as ActionInputSchema;
      const parameterDescriptions = schema.parameters
        .map(
          (p) =>
            `- ${p.name} (${p.type})${p.required ? ' [required]' : ''}: ${p.description || ''}`,
        )
        .join('\n');

      const prompt = `Extract parameters from user input for the action: "${action.name}"

User input: "${userText}"

Expected parameters:
${parameterDescriptions}

Respond with a JSON object containing only the extracted parameters. If a parameter cannot be extracted, omit it.
Example response format: {"param1": "value1", "param2": 123}

Respond ONLY with the JSON object, no explanations.`;

      const result = await generateText({
        model: 'gpt-4',
        prompt,
      });

      // Parse AI response
      const extracted = this.parseParameterResponse(result.text);
      const validated = this.validateParameters(extracted, schema);

      if (validated.isValid) {
        return {
          parameters: extracted,
          method: 'ai',
          warnings: [],
          confidence: 0.9,
          missingRequired: validated.missingRequired,
        };
      }

      return {
        parameters: validated.parameters,
        method: 'ai',
        warnings: validated.errors,
        confidence: 0.3,
        missingRequired: validated.missingRequired,
      };
    } catch (error) {
      return {
        parameters: {},
        method: 'ai',
        warnings: [error instanceof Error ? error.message : 'AI extraction failed'],
        confidence: 0,
        missingRequired: [],
      };
    }
  }

  /**
   * Extract parameters using pattern matching
   * @private
   */
  private extractWithPatterns(userText: string, action: Action): ExtractedParameters {
    const schema = action.inputSchema as ActionInputSchema;
    const parameters: Record<string, unknown> = {};
    const warnings: string[] = [];

    // Pattern 1: key=value pairs
    const keyValuePattern = /(\w+)=([^\s]+)/g;
    let match;
    while ((match = keyValuePattern.exec(userText)) !== null) {
      const key = match[1];
      const value = match[2];
      parameters[key] = this.coerceValue(value);
    }

    // Pattern 2: quoted values
    const quotedPattern = /"([^"]*)"/g;
    let quotedIndex = 0;
    while (
      (match = quotedPattern.exec(userText)) !== null &&
      quotedIndex < schema.parameters.length
    ) {
      const paramName = schema.parameters[quotedIndex].name;
      if (!parameters[paramName]) {
        parameters[paramName] = match[1];
      }
      quotedIndex++;
    }

    // Pattern 3: map common parameter names
    const parameterNames = schema.parameters.map((p) => p.name.toLowerCase());
    const words = userText.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length - 1; i++) {
      const word = words[i];
      const nextWord = words[i + 1];

      // Check if word is a parameter name
      const paramIndex = parameterNames.indexOf(word);
      if (paramIndex >= 0) {
        const paramName = schema.parameters[paramIndex].name;
        if (!parameters[paramName]) {
          parameters[paramName] = nextWord;
        }
      }
    }

    // Validate extracted parameters
    const validated = this.validateParameters(parameters, schema);

    return {
      parameters: validated.parameters,
      method: 'pattern',
      warnings: [...warnings, ...validated.errors],
      confidence: Object.keys(parameters).length > 0 ? 0.6 : 0.1,
      missingRequired: validated.missingRequired,
    };
  }

  /**
   * Validate parameters against action schema
   * Phase 2.7: Now tracks missing required parameters for clarification questions
   * @private
   */
  private validateParameters(
    parameters: Record<string, unknown>,
    schema: ActionInputSchema,
  ): {
    isValid: boolean;
    parameters: Record<string, unknown>;
    errors: string[];
    missingRequired: MissingParameter[];
  } {
    const errors: string[] = [];
    const validated: Record<string, unknown> = {};
    const missingRequired: MissingParameter[] = [];

    for (const paramDef of schema.parameters) {
      const value = parameters[paramDef.name];

      // Check required parameters
      if (paramDef.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required parameter missing: ${paramDef.name}`);
        // Phase 2.7: Track missing required parameters for clarification
        missingRequired.push({
          name: paramDef.name,
          type: paramDef.type,
          description: paramDef.description,
          label: paramDef.label,
        });
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        // Type coercion
        const coerced = this.coerceToType(value, paramDef.type);
        if (coerced === null) {
          errors.push(
            `Invalid type for ${paramDef.name}: expected ${paramDef.type}, got ${typeof value}`,
          );
        } else {
          validated[paramDef.name] = coerced;
        }
      } else if (paramDef.default !== undefined) {
        // Use default value
        validated[paramDef.name] = paramDef.default;
      }
    }

    return {
      isValid: errors.length === 0,
      parameters: validated,
      errors,
      missingRequired,
    };
  }

  /**
   * Coerce value to specific type
   * @private
   */
  private coerceToType(value: unknown, type: string): unknown {
    if (type === 'string') {
      return String(value);
    }

    if (type === 'number') {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }

    if (type === 'boolean') {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return ['true', 'yes', '1', 'on'].includes(value.toLowerCase());
      }
      return Boolean(value);
    }

    return value;
  }

  /**
   * Simple value coercion for pattern extraction
   * @private
   */
  private coerceValue(value: string): unknown {
    // Try number
    const num = Number(value);
    if (!isNaN(num) && value !== '') {
      return num;
    }

    // Try boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Default to string
    return value;
  }

  /**
   * Parse parameter response from AI
   * @private
   */
  private parseParameterResponse(response: string): Record<string, unknown> {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[^{}]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Try parsing entire response
      return JSON.parse(response);
    } catch {
      return {};
    }
  }
}

/**
 * Factory function for parameter extractor
 */
export function createParameterExtractor(
  aiProviderRepository?: AIProviderRepository,
): ParameterExtractor {
  return new ParameterExtractor(aiProviderRepository);
}
