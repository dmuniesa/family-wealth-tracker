import { getDatabase } from './database';
import { encryptIBAN, decryptIBAN } from './encryption';
import type { Transaction, TransactionCategory } from '@/types';

export interface AISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface CategorizationResult {
  transactionId: number;
  categoryId: number;
  confidence: number;
}

export interface AITestResult {
  success: boolean;
  message: string;
}

export class AIService {
  static async getSettings(familyId: number): Promise<{
    apiKeyMasked: string | null;
    baseUrl: string;
    model: string;
    lastTest: string | null;
  }> {
    const db = await getDatabase();
    const settings = await db.get(
      'SELECT * FROM family_settings WHERE family_id = ?',
      [familyId]
    ) as any;

    if (!settings) {
      return {
        apiKeyMasked: null,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        lastTest: null,
      };
    }

    let apiKeyMasked: string | null = null;
    if (settings.ai_api_key_encrypted) {
      const key = decryptIBAN(settings.ai_api_key_encrypted);
      apiKeyMasked = key.length > 4 ? `***${key.slice(-4)}` : '***';
    }

    return {
      apiKeyMasked,
      baseUrl: settings.ai_base_url || 'https://api.openai.com/v1',
      model: settings.ai_model || 'gpt-4o-mini',
      lastTest: settings.ai_last_test,
    };
  }

  static async saveSettings(familyId: number, data: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }): Promise<void> {
    const db = await getDatabase();

    const existing = await db.get(
      'SELECT id FROM family_settings WHERE family_id = ?',
      [familyId]
    ) as any;

    if (existing) {
      const updates: string[] = [];
      const params: unknown[] = [];

      if (data.apiKey !== undefined) {
        updates.push('ai_api_key_encrypted = ?');
        params.push(data.apiKey ? encryptIBAN(data.apiKey) : null);
      }
      if (data.baseUrl !== undefined) { updates.push('ai_base_url = ?'); params.push(data.baseUrl); }
      if (data.model !== undefined) { updates.push('ai_model = ?'); params.push(data.model); }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(familyId);
        await db.run(
          `UPDATE family_settings SET ${updates.join(', ')} WHERE family_id = ?`,
          params
        );
      }
    } else {
      const encryptedKey = data.apiKey ? encryptIBAN(data.apiKey) : null;
      await db.run(
        `INSERT INTO family_settings (family_id, ai_api_key_encrypted, ai_base_url, ai_model)
         VALUES (?, ?, ?, ?)`,
        [familyId, encryptedKey, data.baseUrl || 'https://api.openai.com/v1', data.model || 'gpt-4o-mini']
      );
    }
  }

  static async testConnection(familyId: number): Promise<AITestResult> {
    const db = await getDatabase();
    const settings = await db.get(
      'SELECT * FROM family_settings WHERE family_id = ?',
      [familyId]
    ) as any;

    if (!settings?.ai_api_key_encrypted) {
      return { success: false, message: 'No API key configured' };
    }

    const apiKey = decryptIBAN(settings.ai_api_key_encrypted);
    const baseUrl = settings.ai_base_url || 'https://api.openai.com/v1';
    const model = settings.ai_model || 'gpt-4o-mini';

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        const lastTest = JSON.stringify({
          success: true,
          message: `Connection successful with model ${model}`,
          testedAt: new Date().toISOString(),
        });
        await db.run(
          "UPDATE family_settings SET ai_last_test = ? WHERE family_id = ?",
          [lastTest, familyId]
        );
        return { success: true, message: `Connection successful with model ${model}` };
      } else {
        const errorData = await response.text();
        const lastTest = JSON.stringify({
          success: false,
          message: `API error: ${response.status} - ${errorData.substring(0, 200)}`,
          testedAt: new Date().toISOString(),
        });
        await db.run(
          "UPDATE family_settings SET ai_last_test = ? WHERE family_id = ?",
          [lastTest, familyId]
        );
        return { success: false, message: `API error: ${response.status}` };
      }
    } catch (error) {
      const lastTest = JSON.stringify({
        success: false,
        message: `Connection failed: ${(error as Error).message}`,
        testedAt: new Date().toISOString(),
      });
      await db.run(
        "UPDATE family_settings SET ai_last_test = ? WHERE family_id = ?",
        [lastTest, familyId]
      );
      return { success: false, message: `Connection failed: ${(error as Error).message}` };
    }
  }

  /**
   * Categorize transactions using AI
   */
  static async categorizeTransactions(
    familyId: number,
    transactions: Transaction[],
    categories: TransactionCategory[]
  ): Promise<CategorizationResult[]> {
    const db = await getDatabase();
    const settings = await db.get(
      'SELECT * FROM family_settings WHERE family_id = ?',
      [familyId]
    ) as any;

    if (!settings?.ai_api_key_encrypted) {
      throw new Error('No API key configured');
    }

    const apiKey = decryptIBAN(settings.ai_api_key_encrypted);
    const baseUrl = settings.ai_base_url || 'https://api.openai.com/v1';
    const model = settings.ai_model || 'gpt-4o-mini';

    // Filter out non_computable categories
    const eligibleCategories = categories.filter(c => c.type !== 'non_computable');

    const systemPrompt = `You are a financial transaction categorizer for a Spanish household. You receive a list of bank transactions and a list of categories. For each transaction, assign the most appropriate category ID and a confidence score from 0 to 1.

Rules:
- Use the transaction's description, detail/counterparty, amount sign, and movement type to determine the category.
- Negative amounts are expenses, positive amounts are income.
- If a transaction looks like an internal transfer between own accounts (e.g., "Transferencia recibida" from the account holder's own name, "OFF TO SAVE", "Move to save"), assign the "Transfers In" or "Transfers Out" category based on the amount sign.
- If you are unsure, use the "Other" category with low confidence.
- Respond ONLY with valid JSON matching the expected schema: { "categorizations": [{ "transactionId": number, "categoryId": number, "confidence": number }] }`;

    const userMessage = JSON.stringify({
      categories: eligibleCategories.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        ai_description: c.ai_description,
      })),
      transactions: transactions.map(t => ({
        id: t.id,
        description: t.description,
        detail: t.detail || '',
        amount: t.amount,
        movementType: t.movement_type || '',
      })),
    });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content);
    return parsed.categorizations || [];
  }
}
