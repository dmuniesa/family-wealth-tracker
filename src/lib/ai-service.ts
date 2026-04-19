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

export interface CategorizationWithLogs {
  categorizations: CategorizationResult[];
  logs: Array<{ type: 'info' | 'success' | 'error'; message: string }>;
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
    aiChatEnabled: boolean;
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
        aiChatEnabled: false,
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
      aiChatEnabled: !!settings.ai_chat_enabled,
    };
  }

  static async saveSettings(familyId: number, data: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    aiChatEnabled?: boolean;
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
      if (data.aiChatEnabled !== undefined) { updates.push('ai_chat_enabled = ?'); params.push(data.aiChatEnabled ? 1 : 0); }

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
  ): Promise<CategorizationWithLogs> {
    const logs: Array<{ type: 'info' | 'success' | 'error'; message: string }> = [];
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

    logs.push({ type: 'info', message: `Categorizing ${transactions.length} transactions with model ${model}` });
    console.log(`[AI] Categorizing ${transactions.length} transactions with model ${model} at ${baseUrl}`);

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

    console.log(`[AI] Request payload (${userMessage.length} chars):`, userMessage);

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
      logs.push({ type: 'error', message: `API error ${response.status}: ${errorText.substring(0, 100)}` });
      console.error(`[AI] API error ${response.status}: ${errorText}`);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('[AI] No content in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No response from AI');
    }

    console.log(`[AI] Response (${content.length} chars):`, content);

    const parsed = JSON.parse(content);
    const count = parsed.categorizations?.length || 0;
    logs.push({ type: 'success', message: `Categorized ${count} transactions` });
    console.log(`[AI] Categorized ${count} transactions`);
    return { categorizations: parsed.categorizations || [], logs };
  }

  /**
   * Send a chat message to the AI with financial context
   */
  static async chat(familyId: number, message: string, context?: string): Promise<string> {
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

    // Build financial context
    let financialContext = '';

    // Get account balances summary
    const accounts = await db.all(
      `SELECT a.name, a.category, a.currency,
        (SELECT b.amount FROM balances b WHERE b.account_id = a.id ORDER BY b.date DESC LIMIT 1) as balance
       FROM accounts a WHERE a.family_id = ?`,
      [familyId]
    ) as any[];

    if (accounts.length > 0) {
      financialContext += '\n\nAccount Balances:\n';
      for (const acc of accounts) {
        financialContext += `- ${acc.name} (${acc.category}): ${acc.balance != null ? acc.balance.toFixed(2) : 'N/A'} ${acc.currency}\n`;
      }
    }

    // Get recent spending by category (current month)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const recentSpending = await db.all(
      `SELECT tc.name, tc.type, SUM(ABS(t.amount)) as total, COUNT(*) as count
       FROM transactions t
       JOIN transaction_categories tc ON t.category_id = tc.id
       WHERE t.family_id = ? AND t.date LIKE ? || '%' AND t.is_transfer = 0
       GROUP BY tc.id ORDER BY total DESC LIMIT 10`,
      [familyId, currentMonth]
    ) as any[];

    if (recentSpending.length > 0) {
      financialContext += `\nSpending by category (${currentMonth}):\n`;
      for (const row of recentSpending) {
        financialContext += `- ${row.name} (${row.type}): ${row.total.toFixed(2)} EUR (${row.count} transactions)\n`;
      }
    }

    // Get total net for current month
    const monthSummary = await db.get(
      `SELECT
        SUM(CASE WHEN amount > 0 AND is_transfer = 0 THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN amount < 0 AND is_transfer = 0 THEN ABS(amount) ELSE 0 END) as expenses
       FROM transactions WHERE family_id = ? AND date LIKE ? || '%'`,
      [familyId, currentMonth]
    ) as any;

    if (monthSummary) {
      financialContext += `\nMonth Summary (${currentMonth}):\n`;
      financialContext += `- Income: ${(monthSummary.income || 0).toFixed(2)} EUR\n`;
      financialContext += `- Expenses: ${(monthSummary.expenses || 0).toFixed(2)} EUR\n`;
      financialContext += `- Net: ${((monthSummary.income || 0) - (monthSummary.expenses || 0)).toFixed(2)} EUR\n`;
    }

    const systemPrompt = `You are a helpful financial assistant for a family wealth tracker application. You have access to the family's financial data and can answer questions about their finances. You respond in the same language the user writes in (Spanish or English). Be concise and helpful.${financialContext}${context ? '\n\nAdditional context:\n' + context : ''}`;

    const chatResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      throw new Error(`AI API error: ${chatResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await chatResponse.json() as any;
    return data.choices?.[0]?.message?.content || 'No response from AI';
  }

  private static readonly toolDefinitions = [
    {
      type: "function" as const,
      function: {
        name: "get_accounts",
        description: "List all bank, investment and debt accounts with their current balances. Use when the user asks about their accounts or how much money they have.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "update_balance",
        description: "Update the balance of an account. Use when the user wants to set a new balance for an account (e.g., update mortgage balance after a payment, set savings balance).",
        parameters: {
          type: "object" as const,
          properties: {
            account_name: { type: "string", description: "Name or partial name of the account to update" },
            amount: { type: "number", description: "New balance amount (positive number)" },
            date: { type: "string", description: "Date for the balance entry in YYYY-MM-DD format. Defaults to today." },
          },
          required: ["account_name", "amount"],
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "get_spending_summary",
        description: "Get a summary of spending and income by category for a time period. Use when the user asks about their spending, expenses, or income breakdown.",
        parameters: {
          type: "object" as const,
          properties: {
            months: { type: "number", description: "Number of months to look back (default: 1)" },
          },
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "get_dashboard",
        description: "Get overall financial dashboard: total banking, investments, debts, and net worth. Use when the user asks for a general overview of their finances.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "create_backup",
        description: "Create a backup copy of the database. Use when the user asks to make a backup or save current data.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "list_backups",
        description: "List the most recent database backups. Use when the user wants to see available backups.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
    },
    {
      type: "function" as const,
      function: {
        name: "categorize_transactions",
        description: "Use AI to categorize uncategorized transactions. Use when the user wants to categorize or classify their transactions automatically.",
        parameters: {
          type: "object" as const,
          properties: {},
        },
      },
    },
  ];

  /**
   * Chat with tool calling — AI can execute actions
   */
  static async chatWithTools(
    familyId: number,
    message: string,
    executeAction: (name: string, params: Record<string, any>) => Promise<{ success: boolean; data: any; message: string }>,
    context?: string,
  ): Promise<{ response: string; actionsExecuted: Array<{ name: string; result: string }> }> {
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

    const systemPrompt = `You are a helpful financial assistant for a family wealth tracker application. You can answer questions AND perform actions using the tools available to you. Respond in the same language the user writes in (Spanish or English). Be concise. When performing actions, confirm what you did briefly.${context ? '\n\n' + context : ''}`;

    const actionsExecuted: Array<{ name: string; result: string }> = [];
    const messages: Array<{ role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    // Call API with tools (max 3 rounds of tool calling)
    for (let round = 0; round < 3; round++) {
      const chatResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          tools: this.toolDefinitions,
          tool_choice: 'auto',
          temperature: 0.3,
        }),
      });

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text();
        throw new Error(`AI API error: ${chatResponse.status} - ${errorText.substring(0, 200)}`);
      }

      const data = await chatResponse.json() as any;
      const choice = data.choices?.[0];
      const assistantMessage = choice?.message;

      if (!assistantMessage) {
        throw new Error('No response from AI');
      }

      // If no tool calls, return the content directly
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        return {
          response: assistantMessage.content || 'No response',
          actionsExecuted,
        };
      }

      // Add assistant message with tool calls to conversation
      messages.push({
        role: 'assistant',
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name;
        let fnParams: Record<string, any> = {};
        try {
          fnParams = JSON.parse(toolCall.function.arguments);
        } catch {
          fnParams = {};
        }

        const result = await executeAction(fnName, fnParams);
        actionsExecuted.push({ name: fnName, result: result.message });

        messages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        } as any);
      }
    }

    // If we exhausted rounds, make one final call without tools
    const finalResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
      }),
    });

    if (!finalResponse.ok) {
      throw new Error('AI API error on final response');
    }

    const finalData = await finalResponse.json() as any;
    return {
      response: finalData.choices?.[0]?.message?.content || 'Action completed',
      actionsExecuted,
    };
  }
}
