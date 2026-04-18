import { getDatabase } from './database';
import type { ChatConversation, ChatMessageDB, ChatMessageRole, ConversationType } from '@/types';

export class ChatService {
  static async createConversation(
    familyId: number,
    userId: number,
    title: string,
    type: ConversationType
  ): Promise<number> {
    const db = await getDatabase();
    const result = await db.run(
      `INSERT INTO chat_conversations (family_id, user_id, title, type) VALUES (?, ?, ?, ?)`,
      [familyId, userId, title, type]
    );
    return result.lastID;
  }

  static async addMessage(
    conversationId: number,
    role: ChatMessageRole,
    content: string
  ): Promise<number> {
    const db = await getDatabase();
    const result = await db.run(
      `INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)`,
      [conversationId, role, content]
    );
    await db.run(
      "UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?",
      [conversationId]
    );
    return result.lastID;
  }

  static async getOrCreateActiveConversation(
    familyId: number,
    userId: number
  ): Promise<{ id: number; isNew: boolean }> {
    const db = await getDatabase();
    const existing = await db.get(
      `SELECT id FROM chat_conversations
       WHERE family_id = ? AND user_id = ? AND status = 'active' AND type = 'manual'
       ORDER BY updated_at DESC LIMIT 1`,
      [familyId, userId]
    ) as any;

    if (existing) {
      return { id: existing.id, isNew: false };
    }

    const result = await db.run(
      `INSERT INTO chat_conversations (family_id, user_id, title, type) VALUES (?, ?, '', 'manual')`,
      [familyId, userId]
    );
    return { id: result.lastID, isNew: true };
  }

  static async getOrCreateAutoConversation(
    familyId: number,
    userId: number,
    title: string
  ): Promise<number> {
    const db = await getDatabase();
    const result = await db.run(
      `INSERT INTO chat_conversations (family_id, user_id, title, type) VALUES (?, ?, ?, 'auto')`,
      [familyId, userId, title]
    );
    return result.lastID;
  }

  static async getConversationsByFamily(
    familyId: number,
    filters?: { type?: ConversationType; status?: string; userId?: number }
  ): Promise<ChatConversation[]> {
    const db = await getDatabase();
    let sql = `
      SELECT c.*,
        u.name as user_name,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) as message_count
      FROM chat_conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.family_id = ?
    `;
    const params: unknown[] = [familyId];

    if (filters?.type) {
      sql += ` AND c.type = ?`;
      params.push(filters.type);
    }
    if (filters?.status) {
      sql += ` AND c.status = ?`;
      params.push(filters.status);
    }
    if (filters?.userId) {
      sql += ` AND c.user_id = ?`;
      params.push(filters.userId);
    }

    sql += ` ORDER BY c.updated_at DESC`;

    return await db.all(sql, params) as ChatConversation[];
  }

  static async getConversationsByUser(
    familyId: number,
    userId: number
  ): Promise<ChatConversation[]> {
    const db = await getDatabase();
    return await db.all(
      `SELECT c.*,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id) as message_count
       FROM chat_conversations c
       WHERE c.family_id = ? AND c.user_id = ?
       ORDER BY c.updated_at DESC`,
      [familyId, userId]
    ) as ChatConversation[];
  }

  static async getConversationById(id: number): Promise<ChatConversation | null> {
    const db = await getDatabase();
    const row = await db.get(
      `SELECT c.*, u.name as user_name
       FROM chat_conversations c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [id]
    );
    return row as ChatConversation | null;
  }

  static async getMessages(conversationId: number): Promise<ChatMessageDB[]> {
    const db = await getDatabase();
    return await db.all(
      `SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp ASC`,
      [conversationId]
    ) as ChatMessageDB[];
  }

  static async closeConversation(id: number): Promise<void> {
    const db = await getDatabase();
    await db.run(
      "UPDATE chat_conversations SET status = 'closed', updated_at = datetime('now') WHERE id = ?",
      [id]
    );
  }

  static async deleteConversation(id: number): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM chat_messages WHERE conversation_id = ?', [id]);
    await db.run('DELETE FROM chat_conversations WHERE id = ?', [id]);
  }

  static async updateConversationTitle(id: number, title: string): Promise<void> {
    const db = await getDatabase();
    await db.run(
      "UPDATE chat_conversations SET title = ?, updated_at = datetime('now') WHERE id = ?",
      [title, id]
    );
  }
}
