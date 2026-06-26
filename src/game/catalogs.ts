export type ServiceKind = string;
export type RecipeCategory = 'Tea' | 'Coffee';
export type CareAction = 'purr' | 'quiet' | 'roll' | 'cute';

export interface Upgrade {
  id: string;
  name: string;
  kind: 'Furniture' | 'Decor' | 'Comfort';
  cost: number;
  comfort: number;
  happiness: number;
  description: string;
  iconSrc?: string;
  effect?: string;
  unlocksTable?: number;
  enabled?: boolean;
}

export type AdminStoreUpgrade = Upgrade;

export interface ServiceItem {
  id: ServiceKind;
  label: string;
  name: string;
  category: RecipeCategory;
  imageSrc: string;
  cost: number;
  quality: number;
  moodBoost: number;
  tipBonus: number;
  happinessGain: number;
  reputationBonus: number;
  description: string;
}

export type AdminRecipe = ServiceItem & {
  enabled?: boolean;
};

export interface CooldownUpgrade {
  id: string;
  name: string;
  action: CareAction;
  cost: number;
  reductionMs: number;
  description: string;
}

export type AdminTrainingUpgrade = CooldownUpgrade & {
  iconSrc?: string;
  effect?: string;
  enabled?: boolean;
};

export const STARTER_RECIPE_ID = 'blackTea';
export const SECOND_TABLE_UPGRADE_ID = 'second-table-spot';
export const THIRD_TABLE_UPGRADE_ID = 'third-table-spot';

function clampCatalogValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function numericCatalogValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function careActionLabel(action: CareAction): string {
  switch (action) {
    case 'quiet':
      return 'Listen';
    case 'roll':
      return 'Roll';
    case 'cute':
      return 'Be Cute';
    case 'purr':
    default:
      return 'Purr';
  }
}

export function formatCooldown(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${seconds}s`;
}

export const UPGRADES = [
  {
    id: SECOND_TABLE_UPGRADE_ID,
    name: 'Second Table Spot',
    kind: 'Furniture',
    cost: 120,
    comfort: 0,
    happiness: 2,
    description: 'Opens a second customer spot for busier shop days.',
    effect: 'Adds another customer spot.',
    unlocksTable: 2,
    iconSrc: '',
    enabled: true,
  },
  {
    id: THIRD_TABLE_UPGRADE_ID,
    name: 'Third Table Spot',
    kind: 'Furniture',
    cost: 260,
    comfort: 0,
    happiness: 3,
    description: 'Opens the third customer spot when the shop is ready for a full room.',
    effect: 'Adds another customer spot.',
    unlocksTable: 3,
    iconSrc: '',
    enabled: true,
  },
  {
    id: 'cushion',
    name: 'Cozy Cushion',
    kind: 'Furniture',
    cost: 50,
    comfort: 1,
    happiness: 4,
    description: 'Soft seats help shy customers settle in.',
    effect: 'Comfort +1',
    iconSrc: '',
    enabled: true,
  },
  {
    id: 'cat-bed',
    name: 'Cat Bed',
    kind: 'Furniture',
    cost: 80,
    comfort: 2,
    happiness: 5,
    description: 'A sunny rest spot between visits.',
    effect: 'Comfort +2',
    iconSrc: '',
    enabled: true,
  },
  {
    id: 'tea-plant',
    name: 'Tea Plant',
    kind: 'Decor',
    cost: 60,
    comfort: 1,
    happiness: 4,
    description: 'Fresh green leaves brighten the counter.',
    effect: 'Comfort +1',
    iconSrc: '',
    enabled: true,
  },
  {
    id: 'lamp',
    name: 'Hanging Lamp',
    kind: 'Comfort',
    cost: 70,
    comfort: 2,
    happiness: 5,
    description: 'A warmer glow makes purring easier.',
    effect: 'Comfort +2',
    iconSrc: '',
    enabled: true,
  },
  {
    id: 'window-seat',
    name: 'Window Seat',
    kind: 'Furniture',
    cost: 130,
    comfort: 3,
    happiness: 6,
    description: 'A quiet place for regulars to linger.',
    effect: 'Comfort +3',
    iconSrc: '',
    enabled: true,
  },
  {
    id: 'hearth',
    name: 'Little Hearth',
    kind: 'Comfort',
    cost: 180,
    comfort: 4,
    happiness: 8,
    description: 'Warmth that turns short visits into generous ones.',
    effect: 'Comfort +4',
    iconSrc: '',
    enabled: true,
  },
] as const satisfies readonly [Upgrade, ...Upgrade[]];

export const DEFAULT_STORE_UPGRADES: AdminStoreUpgrade[] = UPGRADES.map((upgrade) => ({
  ...upgrade,
}));

export function upgradeKindValue(value: unknown, fallback: Upgrade['kind']): Upgrade['kind'] {
  return value === 'Furniture' || value === 'Decor' || value === 'Comfort' ? value : fallback;
}

export function normalizeAdminStoreUpgrade(
  value: unknown,
  fallback: AdminStoreUpgrade,
): AdminStoreUpgrade {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminStoreUpgrade>) : {};
  const rawId = typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id.trim() : fallback.id;
  const id =
    rawId
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback.id;
  const hasUnlocksTable = Object.prototype.hasOwnProperty.call(parsed, 'unlocksTable');
  const rawUnlocksTable = hasUnlocksTable ? parsed.unlocksTable : fallback.unlocksTable;
  const unlocksTable = Math.floor(
    numericCatalogValue(rawUnlocksTable, hasUnlocksTable ? 0 : fallback.unlocksTable ?? 0),
  );
  return {
    id,
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallback.name,
    kind: upgradeKindValue(parsed.kind, fallback.kind),
    cost: clampCatalogValue(Math.floor(numericCatalogValue(parsed.cost, fallback.cost)), 0, 999_999),
    comfort: clampCatalogValue(
      Math.floor(numericCatalogValue(parsed.comfort, fallback.comfort)),
      0,
      999,
    ),
    happiness: clampCatalogValue(
      Math.floor(numericCatalogValue(parsed.happiness, fallback.happiness)),
      0,
      100,
    ),
    description:
      typeof parsed.description === 'string' ? parsed.description : fallback.description,
    iconSrc: typeof parsed.iconSrc === 'string' ? parsed.iconSrc : fallback.iconSrc,
    effect:
      typeof parsed.effect === 'string'
        ? parsed.effect
        : fallback.effect || (fallback.unlocksTable ? 'Adds another customer spot.' : ''),
    unlocksTable: unlocksTable > 1 ? clampCatalogValue(unlocksTable, 2, 3) : undefined,
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : fallback.enabled ?? true,
  };
}

export function normalizeAdminStoreUpgrades(value: unknown): AdminStoreUpgrade[] {
  if (!Array.isArray(value)) return DEFAULT_STORE_UPGRADES.map((upgrade) => ({ ...upgrade }));
  const defaultById = new Map(DEFAULT_STORE_UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
  const seen = new Set<string>();
  const normalized = value
    .map((upgrade, index) => {
      const rawId =
        upgrade != null && typeof upgrade === 'object'
          ? (upgrade as Partial<AdminStoreUpgrade>).id
          : '';
      const fallback =
        typeof rawId === 'string' && defaultById.has(rawId)
          ? (defaultById.get(rawId) as AdminStoreUpgrade)
          : {
              id: `custom-upgrade-${index + 1}`,
              name: `New Upgrade ${index + 1}`,
              kind: 'Comfort' as const,
              cost: 100,
              comfort: 1,
              happiness: 1,
              description: 'Describe what this adds to the shop.',
              effect: 'Comfort +1',
              iconSrc: '',
              enabled: true,
            };
      return normalizeAdminStoreUpgrade(upgrade, fallback);
    })
    .filter((upgrade) => {
      if (!upgrade.id || seen.has(upgrade.id)) return false;
      seen.add(upgrade.id);
      return true;
    });

  return normalized;
}

export const SERVICE_ITEMS = [
  {
    id: 'blackTea',
    label: 'black tea',
    name: 'Black Tea',
    category: 'Tea',
    imageSrc: '/items/blackTea.png',
    cost: 0,
    quality: 4,
    moodBoost: 14,
    tipBonus: 8,
    happinessGain: 2,
    reputationBonus: 1,
    description: 'A dependable, full-bodied cup. Every good shop starts with a steady pour.',
  },
  {
    id: 'greenTea',
    label: 'green tea',
    name: 'Green Tea',
    category: 'Tea',
    imageSrc: '/items/greenTea.png',
    cost: 85,
    quality: 8,
    moodBoost: 12,
    tipBonus: 10,
    happinessGain: 1,
    reputationBonus: 2,
    description: 'A bright, gentle tea for guests who want the room to feel a little lighter.',
  },
  {
    id: 'chamomiletea',
    label: 'chamomile tea',
    name: 'Chamomile Tea',
    category: 'Tea',
    imageSrc: '/items/chamomiletea.png',
    cost: 120,
    quality: 10,
    moodBoost: 16,
    tipBonus: 12,
    happinessGain: 2,
    reputationBonus: 3,
    description: 'Soft flowers in a warm cup, perfect for customers who need a quiet minute.',
  },
  {
    id: 'peppermintTea',
    label: 'peppermint tea',
    name: 'Peppermint Tea',
    category: 'Tea',
    imageSrc: '/items/peppermintTea.png',
    cost: 165,
    quality: 13,
    moodBoost: 18,
    tipBonus: 15,
    happinessGain: 3,
    reputationBonus: 4,
    description: 'Fresh mint leaves make the whole table feel awake and cared for.',
  },
  {
    id: 'lemon',
    label: 'lemon tea',
    name: 'Lemon Tea',
    category: 'Tea',
    imageSrc: '/items/lemon.png',
    cost: 230,
    quality: 17,
    moodBoost: 20,
    tipBonus: 18,
    happinessGain: 4,
    reputationBonus: 5,
    description: 'A golden citrus recipe that makes the shop feel known for something special.',
  },
  {
    id: 'basicCoffee',
    label: 'basic coffee',
    name: 'Basic Coffee',
    category: 'Coffee',
    imageSrc: '/items/basicCoffee.png',
    cost: 95,
    quality: 7,
    moodBoost: 11,
    tipBonus: 9,
    happinessGain: 1,
    reputationBonus: 2,
    description: 'A clean, simple cup for guests who like their comfort direct.',
  },
  {
    id: 'americano',
    label: 'americano',
    name: 'Americano',
    category: 'Coffee',
    imageSrc: '/items/americano.png',
    cost: 135,
    quality: 11,
    moodBoost: 13,
    tipBonus: 12,
    happinessGain: 2,
    reputationBonus: 3,
    description: 'Smooth and steady, with enough depth to make the afternoon feel longer.',
  },
  {
    id: 'latte',
    label: 'latte',
    name: 'Latte',
    category: 'Coffee',
    imageSrc: '/items/latte.png',
    cost: 185,
    quality: 14,
    moodBoost: 17,
    tipBonus: 15,
    happinessGain: 3,
    reputationBonus: 4,
    description: 'A creamy heart in the cup, made for customers who notice little kindnesses.',
  },
  {
    id: 'cappuccino',
    label: 'cappuccino',
    name: 'Cappuccino',
    category: 'Coffee',
    imageSrc: '/items/cappuccino.png',
    cost: 225,
    quality: 16,
    moodBoost: 19,
    tipBonus: 17,
    happinessGain: 3,
    reputationBonus: 5,
    description: 'Foamy, warm, and just fancy enough to feel like a treat.',
  },
  {
    id: 'mocha',
    label: 'mocha',
    name: 'Mocha',
    category: 'Coffee',
    imageSrc: '/items/mocha.png',
    cost: 280,
    quality: 20,
    moodBoost: 22,
    tipBonus: 21,
    happinessGain: 4,
    reputationBonus: 6,
    description: 'Chocolatey comfort with a flourish, the kind of recipe people remember.',
  },
] as const satisfies readonly [ServiceItem, ...ServiceItem[]];

export const LEGACY_RECIPE_IDS: Record<string, ServiceKind> = {
  tea: 'blackTea',
  coffee: 'basicCoffee',
  cake: 'chamomiletea',
  scone: 'peppermintTea',
  cocoa: 'lemon',
};

export const COOLDOWN_UPGRADES = [
  {
    id: 'purr-practice',
    name: 'Purr Practice',
    action: 'purr',
    cost: 110,
    reductionMs: 1_500,
    description: 'Shortens the purr cooldown so the cat can reassure guests more often.',
  },
  {
    id: 'soft-rumble',
    name: 'Soft Rumble',
    action: 'purr',
    cost: 210,
    reductionMs: 1_500,
    description: 'A steadier purr rhythm for busier shop days.',
  },
  {
    id: 'quiet-cushion',
    name: 'Quiet Cushion',
    action: 'quiet',
    cost: 95,
    reductionMs: 1_000,
    description: 'Shortens the listen cooldown with a more comfortable listening spot.',
  },
  {
    id: 'listening-ritual',
    name: 'Listening Ritual',
    action: 'quiet',
    cost: 175,
    reductionMs: 1_000,
    description: 'A practiced little pause that helps the cat listen again sooner.',
  },
  {
    id: 'cozy-flop',
    name: 'Cozy Flop',
    action: 'roll',
    cost: 160,
    reductionMs: 1_500,
    description: 'Shortens the roll over cooldown for guests who warm up to silly trust.',
  },
  {
    id: 'bright-whiskers',
    name: 'Bright Whiskers',
    action: 'cute',
    cost: 190,
    reductionMs: 1_500,
    description: 'Shortens the be cute cooldown for guests who need a little charm.',
  },
] as const satisfies readonly [CooldownUpgrade, ...CooldownUpgrade[]];

export const DEFAULT_ADMIN_RECIPES: AdminRecipe[] = SERVICE_ITEMS.map((recipe) => ({
  ...recipe,
  enabled: true,
}));

export const DEFAULT_ADMIN_TRAINING_UPGRADES: AdminTrainingUpgrade[] = COOLDOWN_UPGRADES.map(
  (upgrade) => ({
    ...upgrade,
    iconSrc: '',
    effect: `${careActionLabel(upgrade.action)} -${formatCooldown(upgrade.reductionMs)}`,
    enabled: true,
  }),
);

export function recipeCategoryValue(value: unknown, fallback: RecipeCategory): RecipeCategory {
  return value === 'Tea' || value === 'Coffee' ? value : fallback;
}

export function careActionValue(value: unknown, fallback: CareAction): CareAction {
  return value === 'purr' || value === 'quiet' || value === 'roll' || value === 'cute'
    ? value
    : fallback;
}

export function normalizeAdminRecipe(value: unknown, fallback: AdminRecipe): AdminRecipe {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminRecipe>) : {};
  const rawId = typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id.trim() : fallback.id;
  const id =
    rawId
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback.id;
  const name =
    typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallback.name;
  return {
    id,
    label:
      typeof parsed.label === 'string' && parsed.label.trim()
        ? parsed.label.trim()
        : name.toLowerCase(),
    name,
    category: recipeCategoryValue(parsed.category, fallback.category),
    imageSrc: typeof parsed.imageSrc === 'string' ? parsed.imageSrc : fallback.imageSrc,
    cost: clampCatalogValue(Math.floor(numericCatalogValue(parsed.cost, fallback.cost)), 0, 999_999),
    quality: clampCatalogValue(
      Math.floor(numericCatalogValue(parsed.quality, fallback.quality)),
      0,
      999,
    ),
    moodBoost: clampCatalogValue(
      Math.floor(numericCatalogValue(parsed.moodBoost, fallback.moodBoost)),
      0,
      999,
    ),
    tipBonus: clampCatalogValue(
      Math.floor(numericCatalogValue(parsed.tipBonus, fallback.tipBonus)),
      0,
      999,
    ),
    happinessGain: clampCatalogValue(
      Math.floor(numericCatalogValue(parsed.happinessGain, fallback.happinessGain)),
      0,
      100,
    ),
    reputationBonus: clampCatalogValue(
      Math.floor(numericCatalogValue(parsed.reputationBonus, fallback.reputationBonus)),
      0,
      999,
    ),
    description:
      typeof parsed.description === 'string' ? parsed.description : fallback.description,
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : fallback.enabled ?? true,
  };
}

export function normalizeAdminRecipes(value: unknown): AdminRecipe[] {
  if (!Array.isArray(value)) return DEFAULT_ADMIN_RECIPES.map((recipe) => ({ ...recipe }));
  const defaultById = new Map(DEFAULT_ADMIN_RECIPES.map((recipe) => [recipe.id, recipe]));
  const seen = new Set<string>();
  return value
    .map((recipe, index) => {
      const rawId =
        recipe != null && typeof recipe === 'object' ? (recipe as Partial<AdminRecipe>).id : '';
      const fallback =
        typeof rawId === 'string' && defaultById.has(rawId)
          ? (defaultById.get(rawId) as AdminRecipe)
          : {
              id: `custom-recipe-${index + 1}`,
              label: `custom recipe ${index + 1}`,
              name: `New Recipe ${index + 1}`,
              category: 'Tea' as const,
              imageSrc: '/items/blackTea.png',
              cost: 100,
              quality: 5,
              moodBoost: 10,
              tipBonus: 5,
              happinessGain: 1,
              reputationBonus: 1,
              description: 'Describe this recipe.',
              enabled: true,
            };
      return normalizeAdminRecipe(recipe, fallback);
    })
    .filter((recipe) => {
      if (!recipe.id || seen.has(recipe.id)) return false;
      seen.add(recipe.id);
      return true;
    });
}

export function normalizeAdminTrainingUpgrade(
  value: unknown,
  fallback: AdminTrainingUpgrade,
): AdminTrainingUpgrade {
  const parsed =
    value != null && typeof value === 'object'
      ? (value as Partial<AdminTrainingUpgrade>)
      : {};
  const rawId = typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id.trim() : fallback.id;
  const id =
    rawId
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback.id;
  const action = careActionValue(parsed.action, fallback.action);
  const reductionMs = clampCatalogValue(
    Math.floor(numericCatalogValue(parsed.reductionMs, fallback.reductionMs)),
    0,
    60_000,
  );
  return {
    id,
    name:
      typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallback.name,
    action,
    cost: clampCatalogValue(Math.floor(numericCatalogValue(parsed.cost, fallback.cost)), 0, 999_999),
    reductionMs,
    description:
      typeof parsed.description === 'string' ? parsed.description : fallback.description,
    iconSrc: typeof parsed.iconSrc === 'string' ? parsed.iconSrc : fallback.iconSrc,
    effect:
      typeof parsed.effect === 'string'
        ? parsed.effect
        : `${careActionLabel(action)} -${formatCooldown(reductionMs)}`,
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : fallback.enabled ?? true,
  };
}

export function normalizeAdminTrainingUpgrades(value: unknown): AdminTrainingUpgrade[] {
  if (!Array.isArray(value)) {
    return DEFAULT_ADMIN_TRAINING_UPGRADES.map((upgrade) => ({ ...upgrade }));
  }
  const defaultById = new Map(DEFAULT_ADMIN_TRAINING_UPGRADES.map((upgrade) => [upgrade.id, upgrade]));
  const seen = new Set<string>();
  return value
    .map((upgrade, index) => {
      const rawId =
        upgrade != null && typeof upgrade === 'object'
          ? (upgrade as Partial<AdminTrainingUpgrade>).id
          : '';
      const fallback =
        typeof rawId === 'string' && defaultById.has(rawId)
          ? (defaultById.get(rawId) as AdminTrainingUpgrade)
          : {
              id: `custom-training-${index + 1}`,
              name: `New Training ${index + 1}`,
              action: 'purr' as const,
              cost: 100,
              reductionMs: 1_000,
              description: 'Describe what this training improves.',
              iconSrc: '',
              effect: 'Purr -1s',
              enabled: true,
            };
      return normalizeAdminTrainingUpgrade(upgrade, fallback);
    })
    .filter((upgrade) => {
      if (!upgrade.id || seen.has(upgrade.id)) return false;
      seen.add(upgrade.id);
      return true;
    });
}
