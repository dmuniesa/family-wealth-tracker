import { getDatabase } from './database';
import type { TransactionCategory } from '@/types';

interface DefaultCategory {
  name: string;
  type: 'income' | 'expense' | 'both' | 'non_computable';
  icon: string;
  color: string;
  ai_description: string;
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Supermarket',
    type: 'expense',
    icon: 'ShoppingCart',
    color: '#10B981',
    ai_description: 'Supermarket purchases, food stores, grocery deliveries, Mercadona, Consum, Dia, Lidl, Aldi, Carrefour market, Alcampo food section',
  },
  {
    name: 'Restaurants',
    type: 'expense',
    icon: 'UtensilsCrossed',
    color: '#F59E0B',
    ai_description: 'Restaurants, cafes, bars, bakeries, fast food, takeout, Horno paco sanz, pizza, tapas, kebab, barbacoana, telepizza, bon area, tapas y copas, santa eulalia, la cafetera, coffee shops, breakfast out, snacks, casual meals, bizum for meals with friends, cena',
  },
  {
    name: 'Transport',
    type: 'expense',
    icon: 'Car',
    color: '#3B82F6',
    ai_description: 'Gas stations, parking, tolls, public transport, taxi, Uber, car maintenance, train, bus, indigo ayuntamiento parking',
  },
  {
    name: 'Housing',
    type: 'expense',
    icon: 'Home',
    color: '#8B5CF6',
    ai_description: 'Rent, mortgage payments, utilities (electricity, water, gas), community fees, home insurance, repairs',
  },
  {
    name: 'Health',
    type: 'expense',
    icon: 'Heart',
    color: '#EF4444',
    ai_description: 'Pharmacy, doctor visits, hospital, dental, gym membership, health insurance, optics, opticasvi, farmacia',
  },
  {
    name: 'Shopping',
    type: 'expense',
    icon: 'ShoppingBag',
    color: '#EC4899',
    ai_description: 'Clothing, shoes, electronics, Amazon, department stores, Alcampo non-food, El Corte Ingles, general retail, teraxon, aliexpress, alipay',
  },
  {
    name: 'Electronics',
    type: 'expense',
    icon: 'Monitor',
    color: '#6366F1',
    ai_description: 'Electronics stores, technology purchases, computer equipment, mobile phones, gadgets, ozone game, aliexpress electronics, paypal alipay tech',
  },
  {
    name: 'Sports Equipment',
    type: 'expense',
    icon: 'Dumbbell',
    color: '#14B8A6',
    ai_description: 'Sports equipment, sportswear, Decathlon, sporting goods, gym gear, outdoor equipment',
  },
  {
    name: 'Gifts',
    type: 'expense',
    icon: 'Gift',
    color: '#F472B6',
    ai_description: 'Gifts for family and friends, birthday presents, Christmas gifts, wedding gifts, celebracion, regalo, communion',
  },
  {
    name: 'Entertainment',
    type: 'expense',
    icon: 'Gamepad2',
    color: '#7C3AED',
    ai_description: 'Streaming services, cinema, concerts, books, video games, subscriptions, hobbies, recuerdos del pilar',
  },
  {
    name: 'Education',
    type: 'expense',
    icon: 'GraduationCap',
    color: '#0EA5E9',
    ai_description: 'Tuition, courses, books, school supplies, training, university fees, colegio la purisima, colegio santos martires',
  },
  {
    name: 'Insurance',
    type: 'expense',
    icon: 'Shield',
    color: '#F97316',
    ai_description: 'Life insurance, car insurance, home insurance, health insurance, any periodic insurance payment, mapfre, mahonia, onlygal seguros, adeudo insurance, bbva plan estarseguro',
  },
  {
    name: 'Subscriptions',
    type: 'expense',
    icon: 'Repeat',
    color: '#A855F7',
    ai_description: 'Monthly or annual recurring charges: Netflix, Spotify, iCloud, mobile phone plan, gym membership',
  },
  {
    name: 'Bizum',
    type: 'expense',
    icon: 'Send',
    color: '#84CC16',
    ai_description: 'Bizum payments between individuals, sent or received via Bizum, payments to friends',
  },
  {
    name: 'Salary',
    type: 'income',
    icon: 'Banknote',
    color: '#22C55E',
    ai_description: 'Payroll, salary deposits, wage payments, nomina, regular employment income',
  },
  {
    name: 'Transfers In',
    type: 'income',
    icon: 'ArrowDownLeft',
    color: '#06B6D4',
    ai_description: 'Internal transfers received from own accounts, savings movements into this account, Transferencia recibida from own name',
  },
  {
    name: 'Transfers Out',
    type: 'expense',
    icon: 'ArrowUpRight',
    color: '#06B6D4',
    ai_description: 'Internal transfers sent to own accounts, savings movements out of this account, OFF TO SAVE, Move to save, Transferencia enviada to own name',
  },
  {
    name: 'Other Income',
    type: 'income',
    icon: 'Plus',
    color: '#84CC16',
    ai_description: 'Refunds, cashback, interest earned, dividends, gifts received, any income not fitting other categories',
  },
  {
    name: 'Other',
    type: 'both',
    icon: 'HelpCircle',
    color: '#9CA3AF',
    ai_description: 'Anything that does not fit into the above categories, miscellaneous transactions, unknown merchants',
  },
  {
    name: 'No computable',
    type: 'non_computable',
    icon: 'Ban',
    color: '#6B7280',
    ai_description: 'Transactions that should not be counted in spending or income totals, accounting adjustments, unclear movements',
  },
];

export class CategoryService {
  static async getCategoriesByFamily(familyId: number): Promise<TransactionCategory[]> {
    const db = await getDatabase();
    return await db.all(
      'SELECT * FROM transaction_categories WHERE family_id = ? ORDER BY type, name',
      [familyId]
    ) as TransactionCategory[];
  }

  static async getCategoryById(id: number): Promise<TransactionCategory | null> {
    const db = await getDatabase();
    return await db.get(
      'SELECT * FROM transaction_categories WHERE id = ?',
      [id]
    ) as TransactionCategory | null;
  }

  static async createCategory(familyId: number, data: {
    name: string;
    type: 'income' | 'expense' | 'both' | 'non_computable';
    icon?: string;
    color?: string;
    ai_description?: string;
  }): Promise<number> {
    const db = await getDatabase();
    const result = await db.run(
      `INSERT INTO transaction_categories (family_id, name, type, icon, color, ai_description, is_system)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [familyId, data.name, data.type, data.icon || null, data.color || null, data.ai_description || null]
    );
    return result.lastID;
  }

  static async updateCategory(id: number, data: {
    name?: string;
    type?: 'income' | 'expense' | 'both' | 'non_computable';
    icon?: string;
    color?: string;
    ai_description?: string;
  }): Promise<void> {
    const db = await getDatabase();
    const sets: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) { sets.push('name = ?'); params.push(data.name); }
    if (data.type !== undefined) { sets.push('type = ?'); params.push(data.type); }
    if (data.icon !== undefined) { sets.push('icon = ?'); params.push(data.icon); }
    if (data.color !== undefined) { sets.push('color = ?'); params.push(data.color); }
    if (data.ai_description !== undefined) { sets.push('ai_description = ?'); params.push(data.ai_description); }

    if (sets.length === 0) return;

    params.push(id);
    await db.run(
      `UPDATE transaction_categories SET ${sets.join(', ')} WHERE id = ?`,
      params
    );
  }

  static async deleteCategory(id: number): Promise<void> {
    const db = await getDatabase();
    await db.run('DELETE FROM transaction_categories WHERE id = ?', [id]);
  }

  static async seedDefaultCategories(familyId: number): Promise<void> {
    const existing = await this.getCategoriesByFamily(familyId);
    if (existing.length > 0) return; // Already seeded

    const db = await getDatabase();
    for (const cat of DEFAULT_CATEGORIES) {
      await db.run(
        `INSERT INTO transaction_categories (family_id, name, type, icon, color, ai_description, is_system)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [familyId, cat.name, cat.type, cat.icon, cat.color, cat.ai_description]
      );
    }
  }
}
