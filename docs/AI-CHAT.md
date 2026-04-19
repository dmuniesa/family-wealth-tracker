# AI Chat Widget — Documentation

## Overview

The AI Chat Widget is a floating chat bubble that provides intelligent financial assistance. It can answer questions about finances, execute actions (update balances, create backups, categorize transactions), and capture automatic AI operation logs.

## Architecture

### Components

```
src/components/ai-chat/
  AiChatProvider.tsx    — React Context with state management, /help handler
  AiChatBubble.tsx      — Floating button (bottom-right, purple)
  AiChatPanel.tsx       — Slide-up panel with history/new conversation
  AiChatMessage.tsx     — Message rendering by role (user, AI, action, system)
  AiChatInput.tsx       — Text input + send button (Enter to send)
  aiChatEvents.ts       — Pub/sub event bus for AI operation logs
  index.ts              — Barrel exports
```

### Backend

```
src/lib/
  ai-service.ts         — AIService.chatWithTools() with OpenAI function calling
  ai-actions.ts         — AIActionExecutor for running actions server-side
  chat-service.ts       — ChatService for CRUD on conversations and messages

src/app/api/
  ai/chat/route.ts                  — POST endpoint, orchestrates AI + actions + persistence
  chat/conversations/route.ts       — GET/POST conversations
  chat/conversations/[id]/route.ts  — GET/DELETE/PATCH single conversation
  chat/conversations/[id]/messages/ — GET/POST messages
```

### Database Tables

**`chat_conversations`**
| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| family_id | INTEGER | Foreign key to users |
| user_id | INTEGER | Who started the conversation |
| title | TEXT | Auto-generated from first message |
| type | TEXT | `auto` (operation logs) or `manual` (user chat) |
| status | TEXT | `active` or `closed` |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**`chat_messages`**
| Column | Type | Description |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| conversation_id | INTEGER | FK to chat_conversations (CASCADE) |
| role | TEXT | `user`, `ai-response`, `ai-action`, `ai-operation`, `system` |
| content | TEXT | Message content |
| timestamp | DATETIME | |

## Message Roles

| Role | Color | Description |
|---|---|---|
| `user` | Blue (right) | Messages sent by the user |
| `ai-response` | Purple (left) | AI text responses |
| `ai-action` | Cyan (left, Zap icon) | Actions executed by the AI |
| `ai-operation` | Gray (left, Sparkles) | Automatic operation logs |
| `system` | Amber (center) | System info, errors, /help |

## AI Actions (Function Calling)

The chat uses OpenAI-compatible function calling. When the AI determines an action is needed, it invokes a tool, the backend executes it, and the result is sent back to the AI for a final response.

### Available Actions

| Action | Description | Parameters |
|---|---|---|
| `get_accounts` | List accounts with balances | None |
| `update_balance` | Update an account balance | `account_name`, `amount`, `date?` |
| `get_spending_summary` | Spending by category | `months?` (default 1) |
| `get_dashboard` | Net worth overview | None |
| `create_backup` | Create a DB backup | None |
| `list_backups` | List recent backups | None |
| `categorize_transactions` | AI-categorize uncategorized transactions | None |

### Example Interactions

- "How much money do I have?" → `get_accounts` → AI summarizes
- "Update my mortgage to 145000€" → `update_balance` → AI confirms
- "Create a backup" → `create_backup` → AI confirms with filename
- "What did I spend last month?" → `get_spending_summary` → AI breaks down
- "Categorize my transactions" → `categorize_transactions` → AI reports count

## /help Command

Typing `/help` in the chat shows available commands and actions. This is handled client-side (no API call).

## Configuration

Enable/disable in **Settings > AI Integration** with the "Enable AI Chat" toggle. Requires an API key to be configured.

## Admin Page

Administrators can review all conversations at `/[locale]/chat` (sidebar: "AI Conversations"). Features:
- Filter by type (All / Chats / Operations)
- View full message history per conversation
- Close or delete conversations
- Error indicators for failed operations

## Conversation Lifecycle

1. **Manual conversations**: Auto-continues the last active conversation when the widget opens. User can start new ones with the `+` button.
2. **Auto conversations**: Each AI categorization batch creates a separate `auto` type conversation with operation logs.
3. **Closing**: Conversations can be closed manually from the admin page. Closed conversations remain visible but won't auto-continue.
