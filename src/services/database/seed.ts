import type { Db } from "@/types/domain";
const categories: [string, string, string, string, number][] = [
  ["Food & Dining", "expense", "restaurant", "#F97316", 1],
  ["Groceries", "expense", "cart", "#84CC16", 2],
  ["Transport", "expense", "car", "#3B82F6", 3],
  ["Housing", "expense", "home", "#8B5CF6", 4],
  ["Utilities", "expense", "flash", "#EAB308", 5],
  ["Health", "expense", "heart", "#EF4444", 6],
  ["Shopping", "expense", "bag-handle", "#EC4899", 7],
  ["Entertainment", "expense", "film", "#A855F7", 8],
  ["Travel", "expense", "airplane", "#06B6D4", 9],
  ["Education", "expense", "school", "#6366F1", 10],
  ["Subscriptions", "expense", "repeat", "#14B8A8", 11],
  ["Other", "expense", "ellipsis-horizontal", "#94A3B8", 99],
  ["Salary", "income", "briefcase", "#12B76A", 1],
  ["Freelance", "income", "laptop", "#10B981", 2],
  ["Investments", "income", "trending-up", "#22C55E", 3],
  ["Gifts", "income", "gift", "#F472B6", 4],
  ["Other income", "income", "add-circle", "#64748B", 99],
];
export async function seedDatabase(db: Db) {
  for (const [name, type, icon, color, sort] of categories)
    await db.runAsync(
      "INSERT OR IGNORE INTO categories (name,type,icon,color,is_default,sort_order) VALUES (?,?,?,?,1,?)",
      [name, type, icon, color, sort],
    );
  const settings: [string, string][] = [
    ["onboarding_done", "0"],
    ["currency_code", "USD"],
    ["currency_decimals", "2"],
    ["opening_balance_minor", "0"],
    ["theme_mode", "system"],
    ["week_start", "1"],
    ["haptics_enabled", "1"],
    ["budget_alerts_enabled", "1"],
    ["app_lock_enabled", "0"],
    ["privacy_mode", "0"],
  ];
  for (const [key, value] of settings)
    await db.runAsync("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", [
      key,
      value,
    ]);
}
