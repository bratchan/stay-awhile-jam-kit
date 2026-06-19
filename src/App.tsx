import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { getSafeArea } from './services/environment';

type Scene = 'menu' | 'shop' | 'visit' | 'story' | 'summary' | 'upgrades' | 'collection';
type Species = 'bear' | 'fox' | 'frog' | 'rabbit' | 'moth';
type ArrivalState = 'ready' | 'waiting';
type ServiceKind =
  | 'blackTea'
  | 'greenTea'
  | 'chamomiletea'
  | 'peppermintTea'
  | 'lemon'
  | 'basicCoffee'
  | 'americano'
  | 'latte'
  | 'cappuccino'
  | 'mocha';
type RecipeCategory = 'Tea' | 'Coffee';
type CareAction = 'purr' | 'quiet';
type LedgerTab = 'recipes' | 'training' | 'comfort';

interface StoryChapter {
  title: string;
  text: string;
}

interface Customer {
  id: string;
  name: string;
  species: Species;
  color: string;
  sweater: string;
  seat: string;
  moodStart: number;
  tip: number;
  happinessGain: number;
  patienceMs: number;
  storyTitle: string;
  story: string;
  followUps: readonly StoryChapter[];
}

interface Upgrade {
  id: string;
  name: string;
  kind: 'Furniture' | 'Decor' | 'Comfort';
  cost: number;
  comfort: number;
  happiness: number;
  description: string;
}

interface ServiceItem {
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

interface CooldownUpgrade {
  id: string;
  name: string;
  action: CareAction;
  cost: number;
  reductionMs: number;
  description: string;
}

interface GameState {
  day: number;
  shopHappiness: number;
  teaCups: number;
  reputation: number;
  reputationToday: number;
  stories: string[];
  upgrades: string[];
  recipes: string[];
  customerSlot: number;
  visitsToday: number;
  tipsToday: number;
  storiesToday: number;
  missedToday: number;
  customerVisits: Record<string, number>;
}

interface VisitCare {
  purrs: number;
  quiets: number;
}

interface ArrivalTimer {
  id: number;
  slot: TableSlot;
  dueAt: number;
  timeout: number;
  remainingMs: number | null;
}

interface SessionArrivalTimer {
  id: number;
  slot: TableSlot;
  remainingMs: number;
}

interface SessionSnapshot {
  version: number;
  savedAt: number;
  game: GameState;
  scene: Scene;
  isPaused: boolean;
  mood: number;
  purrBeat: number;
  arrivalState: ArrivalState;
  selectedSlot: TableSlot;
  tableCount: number;
  seatCustomerSlots: Array<number | null>;
  servedSlots: TableSlot[];
  careBySlot: Partial<Record<TableSlot, VisitCare>>;
  patienceRemaining: number;
  dayElapsedMs: number;
  purrCooldownRemainingMs: number;
  quietCooldownRemainingMs: number;
  nextCustomerSlot: number;
  nextArrivalTimerId: number;
  arrivalTimers: SessionArrivalTimer[];
  activeLedgerTab: LedgerTab;
}

interface InitialAppState {
  restoredSession: boolean;
  game: GameState;
  scene: Scene;
  isPaused: boolean;
  mood: number;
  purrBeat: number;
  arrivalState: ArrivalState;
  selectedSlot: TableSlot;
  tableCount: number;
  seatCustomerSlots: Array<number | null>;
  servedSlots: TableSlot[];
  careBySlot: Partial<Record<TableSlot, VisitCare>>;
  patienceRemaining: number;
  dayElapsedMs: number;
  purrCooldownRemainingMs: number;
  quietCooldownRemainingMs: number;
  nextCustomerSlot: number;
  nextArrivalTimerId: number;
  arrivalTimers: SessionArrivalTimer[];
  activeLedgerTab: LedgerTab;
}

interface RuntimeSessionState {
  game: GameState;
  scene: Scene;
  isPaused: boolean;
  mood: number;
  purrBeat: number;
  arrivalState: ArrivalState;
  selectedSlot: TableSlot;
  tableCount: number;
  seatCustomerSlots: Array<number | null>;
  servedSlots: TableSlot[];
  careBySlot: Partial<Record<TableSlot, VisitCare>>;
  patienceRemaining: number;
  dayElapsedMs: number;
  purrReadyAt: number;
  quietReadyAt: number;
  actionNow: number;
  nextCustomerSlot: number;
  nextArrivalTimerId: number;
  activeLedgerTab: LedgerTab;
}

interface ShopRank {
  name: string;
  min: number;
}

const SAVE_KEY = 'tea-shop-cat-save-v1';
const SESSION_KEY = 'tea-shop-cat-session-v1';
const SESSION_VERSION = 1;
const ARRIVAL_DELAY_MS = 2400;
const PATIENCE_TICK_MS = 250;
const SHOP_CLOCK_TICK_MS = 250;
const SHOP_DAY_REAL_MS = 120_000;
const SERVED_PATIENCE_SLOWDOWN = 2;
const TABLE_SLOTS = [0, 1, 2] as const;
const SHOP_DAY_START_HOUR = 8;
const SHOP_DAY_LENGTH_HOURS = 10;
const YEAR_LENGTH_DAYS = 365;
const GOOD_SHOP_SCORE = 70;
const STARTER_RECIPE_ID = 'blackTea';
const BASE_PURR_COOLDOWN_MS = 6_000;
const BASE_QUIET_COOLDOWN_MS = 4_000;
type TableSlot = (typeof TABLE_SLOTS)[number];

const CUSTOMERS = [
  {
    id: 'bramble',
    name: 'Bramble',
    species: 'bear',
    color: '#9a6236',
    sweater: '#6d8544',
    seat: 'Window table',
    moodStart: 38,
    tip: 42,
    happinessGain: 9,
    patienceMs: 24_000,
    storyTitle: 'A Long Journey',
    story:
      'The bear travels far and wide, but there is nothing like a warm cup of tea and a friendly cat.',
    followUps: [
      {
        title: 'The Map Corner',
        text: 'Bramble brings a folded map and marks the tea shop with a tiny star, just in case he forgets where peace lives.',
      },
      {
        title: 'A Postcard Saved',
        text: 'He leaves a postcard from the coast behind the counter, addressed only to the cat who listened.',
      },
    ],
  },
  {
    id: 'moss',
    name: 'Moss',
    species: 'frog',
    color: '#81a65c',
    sweater: '#536a78',
    seat: 'Fern corner',
    moodStart: 32,
    tip: 35,
    happinessGain: 8,
    patienceMs: 16_000,
    storyTitle: 'Rain On The Roof',
    story:
      'Moss says the first spring rain sounds exactly like applause when it lands on the teashop awning.',
    followUps: [
      {
        title: 'The Puddle Song',
        text: 'Moss hums a little song about puddles, then admits he only remembers the chorus when someone pours tea.',
      },
      {
        title: 'Borrowed Umbrella',
        text: 'He returns the shop umbrella with a new ribbon tied to the handle and says it wanted to look cheerful.',
      },
    ],
  },
  {
    id: 'hazel',
    name: 'Hazel',
    species: 'rabbit',
    color: '#b9b0a0',
    sweater: '#d7a44c',
    seat: 'Pastry case',
    moodStart: 44,
    tip: 38,
    happinessGain: 7,
    patienceMs: 12_000,
    storyTitle: 'The Last Scone',
    story:
      'Hazel once saved the final honey scone for a stranger who became her dearest pen pal.',
    followUps: [
      {
        title: 'A Letter Arrives',
        text: 'Hazel reads a new letter at the pastry case and laughs so softly the sugar jar seems to glow.',
      },
      {
        title: 'Jam On The Envelope',
        text: 'She confesses the envelope has strawberry jam on it because some happy news should be a little messy.',
      },
    ],
  },
  {
    id: 'fig',
    name: 'Fig',
    species: 'fox',
    color: '#c8793b',
    sweater: '#3f6272',
    seat: 'Reading nook',
    moodStart: 36,
    tip: 46,
    happinessGain: 10,
    patienceMs: 18_000,
    storyTitle: 'Ink And Cinnamon',
    story:
      'Fig keeps a folded poem in every coat pocket, each one smelling faintly of cinnamon tea.',
    followUps: [
      {
        title: 'The Unsent Poem',
        text: 'Fig almost shows a poem, hides it, then lets the cat sit on the page until the scary part passes.',
      },
      {
        title: 'A Better Ending',
        text: 'He returns with one line changed and says the ending got kinder after yesterday.',
      },
    ],
  },
  {
    id: 'lumen',
    name: 'Lumen',
    species: 'moth',
    color: '#cbbf95',
    sweater: '#8f6d9a',
    seat: 'Lamp glow',
    moodStart: 41,
    tip: 40,
    happinessGain: 8,
    patienceMs: 28_000,
    storyTitle: 'A Little Light',
    story:
      'Lumen visits whenever the lamps are lit early, because some evenings deserve a gentle witness.',
    followUps: [
      {
        title: 'Lamp Hour',
        text: 'Lumen asks to sit near the same lamp again and names the quiet golden hour after the shop cat.',
      },
      {
        title: 'The Window Glow',
        text: 'They notice the window looks brighter when someone is expected, even before the bell rings.',
      },
    ],
  },
] as const satisfies readonly [Customer, ...Customer[]];

const UPGRADES = [
  {
    id: 'cushion',
    name: 'Cozy Cushion',
    kind: 'Furniture',
    cost: 50,
    comfort: 1,
    happiness: 4,
    description: 'Soft seats help shy customers settle in.',
  },
  {
    id: 'cat-bed',
    name: 'Cat Bed',
    kind: 'Furniture',
    cost: 80,
    comfort: 2,
    happiness: 5,
    description: 'A sunny rest spot between visits.',
  },
  {
    id: 'tea-plant',
    name: 'Tea Plant',
    kind: 'Decor',
    cost: 60,
    comfort: 1,
    happiness: 4,
    description: 'Fresh green leaves brighten the counter.',
  },
  {
    id: 'lamp',
    name: 'Hanging Lamp',
    kind: 'Comfort',
    cost: 70,
    comfort: 2,
    happiness: 5,
    description: 'A warmer glow makes purring easier.',
  },
  {
    id: 'window-seat',
    name: 'Window Seat',
    kind: 'Furniture',
    cost: 130,
    comfort: 3,
    happiness: 6,
    description: 'A quiet place for regulars to linger.',
  },
  {
    id: 'hearth',
    name: 'Little Hearth',
    kind: 'Comfort',
    cost: 180,
    comfort: 4,
    happiness: 8,
    description: 'Warmth that turns short visits into generous ones.',
  },
] as const satisfies readonly [Upgrade, ...Upgrade[]];

const SERVICE_ITEMS = [
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

const LEGACY_RECIPE_IDS: Record<string, ServiceKind> = {
  tea: 'blackTea',
  coffee: 'basicCoffee',
  cake: 'chamomiletea',
  scone: 'peppermintTea',
  cocoa: 'lemon',
};

const COOLDOWN_UPGRADES = [
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
    description: 'Shortens the sit quietly cooldown with a more comfortable listening spot.',
  },
  {
    id: 'listening-ritual',
    name: 'Listening Ritual',
    action: 'quiet',
    cost: 175,
    reductionMs: 1_000,
    description: 'A practiced little pause that helps the cat settle in again sooner.',
  },
] as const satisfies readonly [CooldownUpgrade, ...CooldownUpgrade[]];

const SHOP_RANKS = [
  { name: 'New', min: 0 },
  { name: 'Known', min: 25 },
  { name: 'Liked', min: 45 },
  { name: 'Good', min: GOOD_SHOP_SCORE },
  { name: 'Beloved', min: 88 },
] as const satisfies readonly [ShopRank, ...ShopRank[]];

const DEFAULT_GAME: GameState = {
  day: 1,
  shopHappiness: 62,
  teaCups: 90,
  reputation: 0,
  reputationToday: 0,
  stories: [],
  upgrades: [],
  recipes: [STARTER_RECIPE_ID],
  customerSlot: 0,
  visitsToday: 0,
  tipsToday: 0,
  storiesToday: 0,
  missedToday: 0,
  customerVisits: {},
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCustomer(slot: number): Customer {
  const index = ((slot % CUSTOMERS.length) + CUSTOMERS.length) % CUSTOMERS.length;
  return CUSTOMERS[index] ?? CUSTOMERS[0];
}

function getOwnedRecipeIds(recipeIds: string[]): string[] {
  const validIds = new Set<string>(SERVICE_ITEMS.map((recipe) => recipe.id));
  const owned = [STARTER_RECIPE_ID, ...recipeIds]
    .map((id) => (validIds.has(id) ? id : LEGACY_RECIPE_IDS[id]))
    .filter((id): id is ServiceKind => Boolean(id));
  return Array.from(new Set(owned));
}

function getOwnedRecipes(recipeIds: string[]): ServiceItem[] {
  const ownedIds = new Set(getOwnedRecipeIds(recipeIds));
  return SERVICE_ITEMS.filter((recipe) => ownedIds.has(recipe.id));
}

function getService(slot: number, recipeIds: string[]): ServiceItem {
  const recipes = getOwnedRecipes(recipeIds);
  const index = ((slot % recipes.length) + recipes.length) % recipes.length;
  return recipes[index] ?? SERVICE_ITEMS[0];
}

function getTableCount(day: number, slot: number): number {
  const rhythm = (day + slot) % 5;
  if (rhythm === 0) return 3;
  if (rhythm === 2 || rhythm === 4) return 2;
  return 1;
}

function clampTableSlot(slot: number, tableCount: number): TableSlot {
  const maxSlot = Math.max(0, Math.min(tableCount, TABLE_SLOTS.length) - 1);
  return clamp(Math.floor(slot), 0, maxSlot) as TableSlot;
}

function createSeatSlots(startSlot: number, tableCount: number): Array<number | null> {
  return TABLE_SLOTS.map((slot) => (slot < tableCount ? startSlot + slot : null));
}

function chooseOccupiedSlot(seats: Array<number | null>, preferredSlot: TableSlot): TableSlot {
  if (seats[preferredSlot] != null) return preferredSlot;
  return TABLE_SLOTS.find((slot) => seats[slot] != null) ?? preferredSlot;
}

function hasOccupiedSeats(seats: Array<number | null>): boolean {
  return TABLE_SLOTS.some((slot) => seats[slot] != null);
}

function shopDayMinutes(progress: number): number {
  const safeProgress = clamp(progress, 0, 100);
  return SHOP_DAY_START_HOUR * 60 + (safeProgress / 100) * SHOP_DAY_LENGTH_HOURS * 60;
}

function formatShopTime(progress: number): string {
  const totalMinutes = Math.round(shopDayMinutes(progress));
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const displayHour = hour24 % 12 || 12;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${suffix}`;
}

function getOwnedComfort(upgradeIds: string[]): number {
  return upgradeIds.reduce((total, id) => {
    const upgrade = UPGRADES.find((item) => item.id === id);
    return total + (upgrade?.comfort ?? 0);
  }, 0);
}

function getRecipeQuality(recipeIds: string[]): number {
  return getOwnedRecipes(recipeIds).reduce((total, recipe) => total + recipe.quality, 0);
}

function getActionCooldown(upgradeIds: string[], action: CareAction): number {
  const base = action === 'purr' ? BASE_PURR_COOLDOWN_MS : BASE_QUIET_COOLDOWN_MS;
  const reduction = COOLDOWN_UPGRADES.reduce((total, upgrade) => {
    if (upgrade.action !== action || !upgradeIds.includes(upgrade.id)) return total;
    return total + upgrade.reductionMs;
  }, 0);
  return Math.max(1_500, base - reduction);
}

function getShopQuality(game: GameState, totalComfort: number): number {
  const happinessScore = game.shopHappiness * 0.3;
  const recipeScore = Math.min(getRecipeQuality(game.recipes), 28);
  const comfortScore = Math.min(totalComfort * 4, 22);
  const reputationScore = Math.min(game.reputation / 10, 20);
  return Math.round(clamp(happinessScore + recipeScore + comfortScore + reputationScore, 0, 100));
}

function getShopRank(shopQuality: number): ShopRank {
  return [...SHOP_RANKS].reverse().find((rank) => shopQuality >= rank.min) ?? SHOP_RANKS[0];
}

function getYearProgress(day: number): number {
  return clamp(((day - 1) / YEAR_LENGTH_DAYS) * 100, 0, 100);
}

function getDaysRemaining(day: number): number {
  return clamp(YEAR_LENGTH_DAYS - day + 1, 0, YEAR_LENGTH_DAYS);
}

function getVisitCare(careBySlot: Partial<Record<TableSlot, VisitCare>>, slot: TableSlot): VisitCare {
  return careBySlot[slot] ?? { purrs: 0, quiets: 0 };
}

function getReputationGain(service: ServiceItem, served: boolean, care: VisitCare, completedStory: boolean): number {
  const servedGain = served ? 2 + service.reputationBonus : 0;
  const purrGain = served && care.purrs > 0 ? 4 + Math.min(care.purrs, 2) * 2 : 0;
  const quietGain = care.quiets > 0 ? 1 + Math.min(care.quiets, 2) : 0;
  const storyGain = completedStory ? 3 : 0;
  return servedGain + purrGain + quietGain + storyGain;
}

function formatCooldown(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

function getStoryForVisit(customer: Customer, visitNumber: number): StoryChapter {
  if (visitNumber <= 1) {
    return { title: customer.storyTitle, text: customer.story };
  }
  const index = (visitNumber - 2) % customer.followUps.length;
  const chapter = customer.followUps[index] ?? customer.followUps[0] ?? {
    title: `${customer.name}'s Corner`,
    text: `${customer.name} settles in again, and the familiar corner of the shop feels a little more like theirs.`,
  };
  return {
    title: chapter.title,
    text: `${chapter.text} Visit ${visitNumber} adds a little more to ${customer.name}'s story.`,
  };
}

function getCustomerVisitCount(game: GameState, customerId: string): number {
  return game.customerVisits[customerId] ?? (game.stories.includes(customerId) ? 1 : 0);
}

function getStoryChapterCount(game: GameState): number {
  const savedCount = Object.values(game.customerVisits).reduce((total, count) => total + count, 0);
  return Math.max(savedCount, game.stories.length);
}

function numberRecord(value: unknown): Record<string, number> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const count = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
    if (count > 0) output[key] = clamp(count, 1, 999);
  }
  return output;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function numericValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeGame(value: unknown, fallback = DEFAULT_GAME): GameState {
  const parsed = value != null && typeof value === 'object' ? (value as Partial<GameState>) : {};

  return {
    day: clamp(Math.floor(numericValue(parsed.day, fallback.day)), 1, 999),
    shopHappiness: clamp(
      Math.floor(numericValue(parsed.shopHappiness, fallback.shopHappiness)),
      0,
      100,
    ),
    teaCups: clamp(Math.floor(numericValue(parsed.teaCups, fallback.teaCups)), 0, 9999),
    reputation: clamp(Math.floor(numericValue(parsed.reputation, fallback.reputation)), 0, 999_999),
    reputationToday: clamp(
      Math.floor(numericValue(parsed.reputationToday, fallback.reputationToday)),
      0,
      9999,
    ),
    stories: stringList(parsed.stories),
    upgrades: stringList(parsed.upgrades),
    recipes: getOwnedRecipeIds(stringList(parsed.recipes)),
    customerSlot: clamp(
      Math.floor(numericValue(parsed.customerSlot, fallback.customerSlot)),
      0,
      9999,
    ),
    visitsToday: clamp(
      Math.floor(numericValue(parsed.visitsToday, fallback.visitsToday)),
      0,
      9999,
    ),
    tipsToday: clamp(Math.floor(numericValue(parsed.tipsToday, fallback.tipsToday)), 0, 9999),
    storiesToday: clamp(
      Math.floor(numericValue(parsed.storiesToday, fallback.storiesToday)),
      0,
      9999,
    ),
    missedToday: clamp(
      Math.floor(numericValue(parsed.missedToday, fallback.missedToday)),
      0,
      9999,
    ),
    customerVisits: numberRecord(parsed.customerVisits),
  };
}

function loadGame(): GameState {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return DEFAULT_GAME;
    return normalizeGame(JSON.parse(raw));
  } catch {
    return DEFAULT_GAME;
  }
}

function sceneValue(value: unknown, fallback: Scene): Scene {
  if (
    value === 'menu' ||
    value === 'shop' ||
    value === 'visit' ||
    value === 'story' ||
    value === 'summary' ||
    value === 'upgrades' ||
    value === 'collection'
  ) {
    return value;
  }
  return fallback;
}

function arrivalStateValue(value: unknown, fallback: ArrivalState): ArrivalState {
  return value === 'ready' || value === 'waiting' ? value : fallback;
}

function ledgerTabValue(value: unknown, fallback: LedgerTab): LedgerTab {
  return value === 'recipes' || value === 'training' || value === 'comfort' ? value : fallback;
}

function tableSlotValue(value: unknown, fallback: TableSlot): TableSlot {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clampTableSlot(value, TABLE_SLOTS.length);
}

function tableSlotList(value: unknown): TableSlot[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    .map((item) => tableSlotValue(item, 0));
}

function seatSlotList(value: unknown, fallback: Array<number | null>): Array<number | null> {
  if (!Array.isArray(value)) return fallback;
  return TABLE_SLOTS.map((slot) => {
    const item = value[slot];
    if (item === null) return null;
    if (typeof item !== 'number' || !Number.isFinite(item)) return fallback[slot] ?? null;
    return clamp(Math.floor(item), 0, 9999);
  });
}

function visitCareRecord(value: unknown): Partial<Record<TableSlot, VisitCare>> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Partial<Record<TableSlot, VisitCare>> = {};
  for (const slot of TABLE_SLOTS) {
    const raw = (value as Record<string, unknown>)[String(slot)];
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const care = raw as Partial<VisitCare>;
    output[slot] = {
      purrs: clamp(Math.floor(numericValue(care.purrs, 0)), 0, 99),
      quiets: clamp(Math.floor(numericValue(care.quiets, 0)), 0, 99),
    };
  }
  return output;
}

function sessionArrivalTimers(value: unknown): SessionArrivalTimer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<SessionArrivalTimer> => item != null && typeof item === 'object')
    .map((item, index) => ({
      id: clamp(Math.floor(numericValue(item.id, index + 1)), 1, 9999),
      slot: tableSlotValue(item.slot, 0),
      remainingMs: clamp(Math.floor(numericValue(item.remainingMs, ARRIVAL_DELAY_MS)), 0, ARRIVAL_DELAY_MS),
    }));
}

function defaultInitialState(game: GameState): InitialAppState {
  const tableCount = getTableCount(game.day, game.customerSlot);
  const seatCustomerSlots = createSeatSlots(game.customerSlot, tableCount);
  return {
    restoredSession: false,
    game,
    scene: 'menu',
    isPaused: false,
    mood: 40,
    purrBeat: 0,
    arrivalState: 'ready',
    selectedSlot: 0,
    tableCount,
    seatCustomerSlots,
    servedSlots: [],
    careBySlot: {},
    patienceRemaining: getCustomer(game.customerSlot).patienceMs,
    dayElapsedMs: 0,
    purrCooldownRemainingMs: 0,
    quietCooldownRemainingMs: 0,
    nextCustomerSlot: game.customerSlot + tableCount,
    nextArrivalTimerId: 0,
    arrivalTimers: [],
    activeLedgerTab: 'recipes',
  };
}

function loadSession(savedGame: GameState): InitialAppState {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return defaultInitialState(savedGame);

    const parsed = JSON.parse(raw) as Partial<SessionSnapshot>;
    if (parsed.version !== SESSION_VERSION) return defaultInitialState(savedGame);

    const game = normalizeGame(parsed.game, savedGame);
    const tableCount = clamp(Math.floor(numericValue(parsed.tableCount, 1)), 0, TABLE_SLOTS.length);
    const fallbackSeats = createSeatSlots(game.customerSlot, tableCount);
    const seatCustomerSlots = seatSlotList(parsed.seatCustomerSlots, fallbackSeats);
    const hasSeats = hasOccupiedSeats(seatCustomerSlots);
    let scene = sceneValue(parsed.scene, 'menu');
    if ((scene === 'visit' || scene === 'story') && !hasSeats) scene = 'shop';
    if ((scene === 'shop' || scene === 'visit') && numericValue(parsed.dayElapsedMs, 0) >= SHOP_DAY_REAL_MS) {
      scene = 'summary';
    }

    const selectedSlot = tableSlotValue(parsed.selectedSlot, chooseOccupiedSlot(seatCustomerSlots, 0));
    const selectedCustomerSlot = seatCustomerSlots[chooseOccupiedSlot(seatCustomerSlots, selectedSlot)] ?? 0;
    const selectedCustomer = getCustomer(selectedCustomerSlot);

    return {
      restoredSession: true,
      game,
      scene,
      isPaused: Boolean(parsed.isPaused),
      mood: clamp(Math.floor(numericValue(parsed.mood, 40)), 0, 100),
      purrBeat: clamp(Math.floor(numericValue(parsed.purrBeat, 0)), 0, 9999),
      arrivalState: arrivalStateValue(parsed.arrivalState, hasSeats ? 'ready' : 'waiting'),
      selectedSlot,
      tableCount,
      seatCustomerSlots,
      servedSlots: tableSlotList(parsed.servedSlots).filter((slot) => seatCustomerSlots[slot] != null),
      careBySlot: visitCareRecord(parsed.careBySlot),
      patienceRemaining: clamp(
        Math.floor(numericValue(parsed.patienceRemaining, selectedCustomer.patienceMs)),
        0,
        selectedCustomer.patienceMs,
      ),
      dayElapsedMs: clamp(Math.floor(numericValue(parsed.dayElapsedMs, 0)), 0, SHOP_DAY_REAL_MS),
      purrCooldownRemainingMs: clamp(
        Math.floor(numericValue(parsed.purrCooldownRemainingMs, 0)),
        0,
        BASE_PURR_COOLDOWN_MS,
      ),
      quietCooldownRemainingMs: clamp(
        Math.floor(numericValue(parsed.quietCooldownRemainingMs, 0)),
        0,
        BASE_QUIET_COOLDOWN_MS,
      ),
      nextCustomerSlot: clamp(
        Math.floor(numericValue(parsed.nextCustomerSlot, game.customerSlot + tableCount)),
        0,
        9999,
      ),
      nextArrivalTimerId: clamp(Math.floor(numericValue(parsed.nextArrivalTimerId, 0)), 0, 9999),
      arrivalTimers: sessionArrivalTimers(parsed.arrivalTimers),
      activeLedgerTab: ledgerTabValue(parsed.activeLedgerTab, 'recipes'),
    };
  } catch {
    return defaultInitialState(savedGame);
  }
}

function loadInitialAppState(): InitialAppState {
  return loadSession(loadGame());
}

function TeaShopCat() {
  const safeArea = getSafeArea();
  const [initialState] = useState<InitialAppState>(() => loadInitialAppState());
  const [scene, setScene] = useState<Scene>(initialState.scene);
  const [game, setGame] = useState<GameState>(initialState.game);
  const [isPaused, setIsPaused] = useState(initialState.isPaused);
  const [mood, setMood] = useState(initialState.mood);
  const [purrBeat, setPurrBeat] = useState(initialState.purrBeat);
  const [arrivalState, setArrivalState] = useState<ArrivalState>(initialState.arrivalState);
  const [selectedSlot, setSelectedSlot] = useState<TableSlot>(initialState.selectedSlot);
  const [tableCount, setTableCount] = useState(initialState.tableCount);
  const [seatCustomerSlots, setSeatCustomerSlots] = useState<Array<number | null>>(() =>
    initialState.seatCustomerSlots,
  );
  const [servedSlots, setServedSlots] = useState<TableSlot[]>(initialState.servedSlots);
  const [careBySlot, setCareBySlot] = useState<Partial<Record<TableSlot, VisitCare>>>(
    initialState.careBySlot,
  );
  const [patienceRemaining, setPatienceRemaining] = useState(initialState.patienceRemaining);
  const [dayElapsedMs, setDayElapsedMs] = useState(initialState.dayElapsedMs);
  const [actionNow, setActionNow] = useState(() => Date.now());
  const [purrReadyAt, setPurrReadyAt] = useState(() => Date.now() + initialState.purrCooldownRemainingMs);
  const [quietReadyAt, setQuietReadyAt] = useState(() => Date.now() + initialState.quietCooldownRemainingMs);
  const [activeLedgerTab, setActiveLedgerTab] = useState<LedgerTab>(initialState.activeLedgerTab);
  const nextCustomerSlotRef = useRef(initialState.nextCustomerSlot);
  const arrivalTimersRef = useRef<ArrivalTimer[]>(
    initialState.arrivalTimers.map((timer) => ({
      ...timer,
      dueAt: Date.now() + timer.remainingMs,
      timeout: 0,
    })),
  );
  const arrivalTimerIdRef = useRef(initialState.nextArrivalTimerId);
  const isPausedRef = useRef(initialState.isPaused);
  const pauseStartedAtRef = useRef(initialState.isPaused ? Date.now() : 0);
  const sessionStateRef = useRef<RuntimeSessionState | null>(null);
  const skipInitialPatienceResetRef = useRef(initialState.restoredSession);

  const selectedOccupiedSlot = chooseOccupiedSlot(seatCustomerSlots, selectedSlot);
  const selectedCustomerSlot = seatCustomerSlots[selectedOccupiedSlot] ?? nextCustomerSlotRef.current;
  const currentCustomer = getCustomer(selectedCustomerSlot);
  const currentService = getService(selectedCustomerSlot, game.recipes);
  const serviceServed = servedSlots.includes(selectedOccupiedSlot);
  const currentVisitNumber = getCustomerVisitCount(game, currentCustomer.id) + 1;
  const currentStory = getStoryForVisit(currentCustomer, currentVisitNumber);
  const visibleCustomers = useMemo(
    () =>
      TABLE_SLOTS.map((slot) => {
        const customerSlot = slot < tableCount ? (seatCustomerSlots[slot] ?? null) : null;
        return customerSlot === null ? null : getCustomer(customerSlot);
      }),
    [seatCustomerSlots, tableCount],
  );
  const hasSeatedCustomers = hasOccupiedSeats(seatCustomerSlots);

  const ownedUpgradeNames = useMemo(() => new Set(game.upgrades), [game.upgrades]);
  const totalComfort = useMemo(() => getOwnedComfort(game.upgrades), [game.upgrades]);
  const ownedRecipes = useMemo(() => getOwnedRecipes(game.recipes), [game.recipes]);
  const recipeQuality = useMemo(() => getRecipeQuality(game.recipes), [game.recipes]);
  const shopQuality = useMemo(() => getShopQuality(game, totalComfort), [game, totalComfort]);
  const shopRank = useMemo(() => getShopRank(shopQuality), [shopQuality]);
  const yearProgress = getYearProgress(game.day);
  const daysRemaining = getDaysRemaining(game.day);
  const storyChapterCount = getStoryChapterCount(game);
  const patiencePercent = Math.ceil((patienceRemaining / currentCustomer.patienceMs) * 100);
  const clockProgress = clamp((dayElapsedMs / SHOP_DAY_REAL_MS) * 100, 0, 100);
  const shopTimeLabel = formatShopTime(clockProgress);
  const purrCooldownMs = getActionCooldown(game.upgrades, 'purr');
  const quietCooldownMs = getActionCooldown(game.upgrades, 'quiet');
  const purrCooldownRemaining = Math.max(0, purrReadyAt - actionNow);
  const quietCooldownRemaining = Math.max(0, quietReadyAt - actionNow);
  const showTopBar = scene !== 'menu' && scene !== 'summary';

  sessionStateRef.current = {
    game,
    scene,
    isPaused,
    mood,
    purrBeat,
    arrivalState,
    selectedSlot,
    tableCount,
    seatCustomerSlots,
    servedSlots,
    careBySlot,
    patienceRemaining,
    dayElapsedMs,
    purrReadyAt,
    quietReadyAt,
    actionNow,
    nextCustomerSlot: nextCustomerSlotRef.current,
    nextArrivalTimerId: arrivalTimerIdRef.current,
    activeLedgerTab,
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } catch {
      // Local saves are a convenience in browser preview; the game still runs without them.
    }
  }, [game]);

  useEffect(() => {
    persistSessionSnapshot();

    const interval = window.setInterval(() => persistSessionSnapshot(), 1000);
    const persistOnExit = () => persistSessionSnapshot();
    const persistOnHidden = () => {
      if (document.visibilityState === 'hidden') persistSessionSnapshot();
    };

    window.addEventListener('pagehide', persistOnExit);
    window.addEventListener('beforeunload', persistOnExit);
    document.addEventListener('visibilitychange', persistOnHidden);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', persistOnExit);
      window.removeEventListener('beforeunload', persistOnExit);
      document.removeEventListener('visibilitychange', persistOnHidden);
    };
  }, []);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(
    () => () => {
      arrivalTimersRef.current.forEach((timer) => window.clearTimeout(timer.timeout));
      arrivalTimersRef.current = [];
    },
    [],
  );

  useEffect(() => {
    if (arrivalTimersRef.current.length === 0) return;
    const now = Date.now();
    if (isPausedRef.current) {
      pauseArrivalTimers(now);
    } else {
      resumeArrivalTimers(now);
    }
  }, []);

  useEffect(() => {
    const nextSelectedSlot = chooseOccupiedSlot(seatCustomerSlots, selectedSlot);
    if (nextSelectedSlot !== selectedSlot) {
      setSelectedSlot(nextSelectedSlot);
    }

    const nextServedSlots = servedSlots.filter(
      (slot) => slot < tableCount && seatCustomerSlots[slot] != null,
    );
    if (nextServedSlots.length !== servedSlots.length) {
      setServedSlots(nextServedSlots);
    }

    if (arrivalState === 'waiting' && hasSeatedCustomers) {
      setArrivalState('ready');
    }
  }, [arrivalState, hasSeatedCustomers, seatCustomerSlots, selectedSlot, servedSlots, tableCount]);

  useEffect(() => {
    if (isPaused) return undefined;
    if (scene !== 'shop' && scene !== 'visit' && scene !== 'story') return undefined;
    if (dayElapsedMs >= SHOP_DAY_REAL_MS) return undefined;

    const interval = window.setInterval(() => {
      setDayElapsedMs((prev) => clamp(prev + SHOP_CLOCK_TICK_MS, 0, SHOP_DAY_REAL_MS));
    }, SHOP_CLOCK_TICK_MS);

    return () => window.clearInterval(interval);
  }, [dayElapsedMs, isPaused, scene]);

  useEffect(() => {
    if (isPaused) return undefined;
    if (scene !== 'visit') return undefined;

    const interval = window.setInterval(() => setActionNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [isPaused, scene]);

  useEffect(() => {
    if (isPaused) return;
    if (dayElapsedMs < SHOP_DAY_REAL_MS) return;
    if (scene === 'shop' || scene === 'visit') {
      closeShopForDay();
    }
  }, [dayElapsedMs, isPaused, scene]);

  useEffect(() => {
    if (skipInitialPatienceResetRef.current) {
      skipInitialPatienceResetRef.current = false;
      return;
    }

    setPatienceRemaining(currentCustomer.patienceMs);
  }, [currentCustomer.id, currentCustomer.patienceMs, arrivalState]);

  useEffect(() => {
    if (isPaused) return undefined;
    if (arrivalState !== 'ready' || !hasSeatedCustomers) return undefined;
    if (scene !== 'shop' && scene !== 'visit') return undefined;

    const interval = window.setInterval(() => {
      const drain = serviceServed ? PATIENCE_TICK_MS / SERVED_PATIENCE_SLOWDOWN : PATIENCE_TICK_MS;
      setPatienceRemaining((prev) => clamp(prev - drain, 0, currentCustomer.patienceMs));
    }, PATIENCE_TICK_MS);

    return () => window.clearInterval(interval);
  }, [arrivalState, currentCustomer.patienceMs, hasSeatedCustomers, isPaused, scene, serviceServed]);

  useEffect(() => {
    if (isPaused) return;
    if (arrivalState !== 'ready' || !hasSeatedCustomers || patienceRemaining > 0) return;
    if (serviceServed) {
      servedCustomerLeaves();
    } else {
      customerLeaves();
    }
  }, [arrivalState, hasSeatedCustomers, isPaused, patienceRemaining, serviceServed]);

  function startingMood(customer: Customer, service: ServiceItem, served: boolean): number {
    const comfortMoodBoost = Math.min(totalComfort * 2, 18);
    const serviceBoost = served ? service.moodBoost : 0;
    return clamp(customer.moodStart + comfortMoodBoost + serviceBoost, 0, 96);
  }

  function clearArrivalTimers() {
    arrivalTimersRef.current.forEach((timer) => window.clearTimeout(timer.timeout));
    arrivalTimersRef.current = [];
  }

  function createSessionSnapshot(now = Date.now()): SessionSnapshot | null {
    const state = sessionStateRef.current;
    if (!state) return null;

    const timerBase = state.isPaused ? state.actionNow : now;
    return {
      version: SESSION_VERSION,
      savedAt: now,
      game: state.game,
      scene: state.scene,
      isPaused: state.isPaused,
      mood: state.mood,
      purrBeat: state.purrBeat,
      arrivalState: state.arrivalState,
      selectedSlot: state.selectedSlot,
      tableCount: state.tableCount,
      seatCustomerSlots: state.seatCustomerSlots,
      servedSlots: state.servedSlots,
      careBySlot: state.careBySlot,
      patienceRemaining: state.patienceRemaining,
      dayElapsedMs: state.dayElapsedMs,
      purrCooldownRemainingMs: Math.max(0, state.purrReadyAt - timerBase),
      quietCooldownRemainingMs: Math.max(0, state.quietReadyAt - timerBase),
      nextCustomerSlot: state.nextCustomerSlot,
      nextArrivalTimerId: state.nextArrivalTimerId,
      arrivalTimers: arrivalTimersRef.current.map((timer) => ({
        id: timer.id,
        slot: timer.slot,
        remainingMs: Math.max(0, timer.remainingMs ?? timer.dueAt - now),
      })),
      activeLedgerTab: state.activeLedgerTab,
    };
  }

  function persistSessionSnapshot() {
    try {
      const snapshot = createSessionSnapshot();
      if (snapshot) window.localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      // Local session restore is a browser convenience; storage can be unavailable in preview.
    }
  }

  function clearSessionSnapshot() {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Local session restore is a browser convenience; storage can be unavailable in preview.
    }
  }

  function completeSeatArrival(timerId: number) {
    const queuedTimer = arrivalTimersRef.current.find((timer) => timer.id === timerId);
    if (!queuedTimer) return;

    arrivalTimersRef.current = arrivalTimersRef.current.filter((timer) => timer.id !== timerId);

    if (isPausedRef.current) {
      arrivalTimersRef.current.push({
        ...queuedTimer,
        timeout: 0,
        remainingMs: Math.max(0, queuedTimer.dueAt - Date.now()),
      });
      return;
    }

    const arrivingCustomerSlot = nextCustomerSlotRef.current;
    nextCustomerSlotRef.current += 1;

    setSeatCustomerSlots((prev) => {
      if (prev[queuedTimer.slot] != null) return prev;
      const nextSeats = [...prev];
      nextSeats[queuedTimer.slot] = arrivingCustomerSlot;
      setSelectedSlot((currentSlot) => chooseOccupiedSlot(nextSeats, currentSlot));
      return nextSeats;
    });
    setGame((prev) => ({
      ...prev,
      customerSlot: Math.max(prev.customerSlot, nextCustomerSlotRef.current),
    }));
    setArrivalState('ready');
  }

  function pauseArrivalTimers(now: number) {
    arrivalTimersRef.current = arrivalTimersRef.current.map((timer) => {
      window.clearTimeout(timer.timeout);
      return {
        ...timer,
        timeout: 0,
        remainingMs: Math.max(0, timer.dueAt - now),
      };
    });
  }

  function resumeArrivalTimers(now: number) {
    arrivalTimersRef.current = arrivalTimersRef.current.map((timer) => {
      const delayMs = Math.max(0, timer.remainingMs ?? timer.dueAt - now);
      return {
        ...timer,
        dueAt: now + delayMs,
        timeout: window.setTimeout(() => completeSeatArrival(timer.id), delayMs),
        remainingMs: null,
      };
    });
  }

  function prepareSeatsForShop(day: number, startSlot: number): number {
    clearArrivalTimers();
    const nextTableCount = getTableCount(day, startSlot);
    const nextSeats = createSeatSlots(startSlot, nextTableCount);
    const nextCustomerSlot = startSlot + nextTableCount;

    nextCustomerSlotRef.current = nextCustomerSlot;
    setTableCount(nextTableCount);
    setSeatCustomerSlots(nextSeats);
    setSelectedSlot(chooseOccupiedSlot(nextSeats, 0));
    setPatienceRemaining(getCustomer(startSlot).patienceMs);
    setServedSlots([]);
    setCareBySlot({});
    setArrivalState(hasOccupiedSeats(nextSeats) ? 'ready' : 'waiting');

    return nextCustomerSlot;
  }

  function vacateSeat(slot: TableSlot): boolean {
    const nextSeats = [...seatCustomerSlots];
    nextSeats[slot] = null;
    setSeatCustomerSlots(nextSeats);
    setSelectedSlot(chooseOccupiedSlot(nextSeats, slot));
    setServedSlots((prev) => prev.filter((servedSlot) => servedSlot !== slot));
    setCareBySlot((prev) => {
      const nextCare = { ...prev };
      delete nextCare[slot];
      return nextCare;
    });

    const stillOccupied = hasOccupiedSeats(nextSeats);
    setArrivalState(stillOccupied ? 'ready' : 'waiting');
    return stillOccupied;
  }

  function queueSeatArrival(slot: TableSlot) {
    if (dayElapsedMs >= SHOP_DAY_REAL_MS) return;

    const timerId = arrivalTimerIdRef.current + 1;
    const now = Date.now();
    arrivalTimerIdRef.current = timerId;

    arrivalTimersRef.current.push({
      id: timerId,
      slot,
      dueAt: now + ARRIVAL_DELAY_MS,
      timeout: isPausedRef.current
        ? 0
        : window.setTimeout(() => completeSeatArrival(timerId), ARRIVAL_DELAY_MS),
      remainingMs: isPausedRef.current ? ARRIVAL_DELAY_MS : null,
    });
  }

  function pauseGame() {
    if (isPausedRef.current) return;

    const now = Date.now();
    pauseStartedAtRef.current = now;
    isPausedRef.current = true;
    pauseArrivalTimers(now);
    setActionNow(now);
    setIsPaused(true);
  }

  function resumeGame() {
    if (!isPausedRef.current) return;

    const now = Date.now();
    const pausedAt = pauseStartedAtRef.current;
    const pausedMs = Math.max(0, now - pausedAt);
    pauseStartedAtRef.current = 0;
    isPausedRef.current = false;
    resumeArrivalTimers(now);
    setPurrReadyAt((prev) => (prev > pausedAt ? prev + pausedMs : prev));
    setQuietReadyAt((prev) => (prev > pausedAt ? prev + pausedMs : prev));
    setActionNow(now);
    setIsPaused(false);
  }

  function clearPauseState() {
    pauseStartedAtRef.current = 0;
    isPausedRef.current = false;
    setIsPaused(false);
  }

  function closeShopForDay() {
    clearArrivalTimers();
    clearPauseState();
    setSeatCustomerSlots(TABLE_SLOTS.map(() => null));
    setServedSlots([]);
    setCareBySlot({});
    setSelectedSlot(0);
    setArrivalState('ready');
    setMood(40);
    setPurrBeat(0);
    setPurrReadyAt(0);
    setQuietReadyAt(0);
    setScene('summary');
  }

  function finishSeatDeparture(slot: TableSlot) {
    vacateSeat(slot);
    if (dayElapsedMs >= SHOP_DAY_REAL_MS) {
      closeShopForDay();
    } else {
      queueSeatArrival(slot);
      setScene('shop');
    }
  }

  function startDay() {
    clearPauseState();
    const nextCustomerSlot = prepareSeatsForShop(game.day, game.customerSlot);
    setGame((prev) => ({
      ...prev,
      customerSlot: nextCustomerSlot,
      visitsToday: 0,
      tipsToday: 0,
      storiesToday: 0,
      missedToday: 0,
      reputationToday: 0,
      shopHappiness: clamp(prev.shopHappiness, 35, 100),
    }));
    setDayElapsedMs(0);
    setMood(40);
    setPurrBeat(0);
    setPurrReadyAt(0);
    setQuietReadyAt(0);
    setScene('shop');
  }

  function continueDay() {
    clearPauseState();
    if (!hasSeatedCustomers) {
      const nextCustomerSlot = prepareSeatsForShop(game.day, game.customerSlot);
      setGame((prev) => ({ ...prev, customerSlot: nextCustomerSlot }));
      setArrivalState('ready');
    } else if (game.customerSlot < nextCustomerSlotRef.current) {
      setGame((prev) => ({ ...prev, customerSlot: nextCustomerSlotRef.current }));
      setArrivalState('ready');
    } else {
      setArrivalState('ready');
    }
    setMood(40);
    setPurrBeat(0);
    setActionNow(Date.now());
    setSelectedSlot(chooseOccupiedSlot(seatCustomerSlots, selectedSlot));
    setScene('shop');
  }

  function beginVisit(slot = selectedOccupiedSlot) {
    if (isPausedRef.current) return;
    if (arrivalState !== 'ready' || !hasSeatedCustomers) return;
    const nextSlot = clampTableSlot(slot, tableCount);
    const customerSlot = seatCustomerSlots[nextSlot];
    if (customerSlot == null) return;
    const customer = getCustomer(customerSlot);
    const service = getService(customerSlot, game.recipes);
    setSelectedSlot(nextSlot);
    setMood(startingMood(customer, service, servedSlots.includes(nextSlot)));
    setPurrBeat(0);
    setActionNow(Date.now());
    setScene('visit');
  }

  function serveRequest() {
    if (isPausedRef.current) return;
    if (arrivalState !== 'ready' || serviceServed) return;
    setServedSlots((prev) => (prev.includes(selectedOccupiedSlot) ? prev : [...prev, selectedOccupiedSlot]));
    setPatienceRemaining((prev) => Math.max(prev, currentCustomer.patienceMs * 0.65));
    if (scene === 'visit') {
      const nextMood = clamp(mood + currentService.moodBoost, 0, 100);
      setMood(nextMood);
      if (nextMood >= 100) {
        setScene('story');
      }
    }
  }

  function purr() {
    if (isPausedRef.current) return;
    const now = Date.now();
    setActionNow(now);
    if (purrReadyAt > now) return;
    setPurrReadyAt(now + purrCooldownMs);
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      return { ...prev, [selectedOccupiedSlot]: { ...care, purrs: care.purrs + 1 } };
    });
    const catBedBoost = ownedUpgradeNames.has('cat-bed') ? 5 : 0;
    const nextMood = clamp(mood + 18 + catBedBoost, 0, 100);
    setMood(nextMood);
    setPurrBeat((prev) => prev + 1);
    if (nextMood >= 100) {
      setScene('story');
    }
  }

  function sitQuietly() {
    if (isPausedRef.current) return;
    const now = Date.now();
    setActionNow(now);
    if (quietReadyAt > now) return;
    setQuietReadyAt(now + quietCooldownMs);
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      return { ...prev, [selectedOccupiedSlot]: { ...care, quiets: care.quiets + 1 } };
    });
    const nextMood = clamp(mood + 10, 0, 100);
    setMood(nextMood);
    if (nextMood >= 100) {
      setScene('story');
    }
  }

  function collectStory() {
    if (isPausedRef.current) return;
    const alreadyCollected = game.stories.includes(currentCustomer.id);
    const serviceTipBonus = serviceServed ? currentService.tipBonus : 0;
    const serviceHappinessGain = serviceServed ? currentService.happinessGain : 0;
    const comfortTipBonus = totalComfort * 3;
    const departingSlot = selectedOccupiedSlot;
    const care = getVisitCare(careBySlot, departingSlot);
    const reputationGain = getReputationGain(currentService, serviceServed, care, true);

    setGame((prev) => ({
      ...prev,
      stories: alreadyCollected ? prev.stories : [...prev.stories, currentCustomer.id],
      storiesToday: prev.storiesToday + 1,
      visitsToday: clamp(prev.visitsToday + 1, 0, 9999),
      tipsToday: prev.tipsToday + currentCustomer.tip + serviceTipBonus + comfortTipBonus,
      teaCups: prev.teaCups + currentCustomer.tip + serviceTipBonus + comfortTipBonus,
      reputation: prev.reputation + reputationGain,
      reputationToday: prev.reputationToday + reputationGain,
      shopHappiness: clamp(
        prev.shopHappiness + currentCustomer.happinessGain + serviceHappinessGain,
        0,
        100,
      ),
      customerVisits: {
        ...prev.customerVisits,
        [currentCustomer.id]: getCustomerVisitCount(prev, currentCustomer.id) + 1,
      },
    }));

    setMood(40);
    setPurrBeat(0);
    finishSeatDeparture(departingSlot);
  }

  function servedCustomerLeaves() {
    const departingSlot = selectedOccupiedSlot;
    const serviceTipBonus = currentService.tipBonus;
    const serviceHappinessGain = currentService.happinessGain;
    const comfortTipBonus = totalComfort * 3;
    const care = getVisitCare(careBySlot, departingSlot);
    const reputationGain = getReputationGain(currentService, true, care, false);

    setGame((prev) => ({
      ...prev,
      visitsToday: clamp(prev.visitsToday + 1, 0, 9999),
      tipsToday: prev.tipsToday + currentCustomer.tip + serviceTipBonus + comfortTipBonus,
      teaCups: prev.teaCups + currentCustomer.tip + serviceTipBonus + comfortTipBonus,
      reputation: prev.reputation + reputationGain,
      reputationToday: prev.reputationToday + reputationGain,
      shopHappiness: clamp(
        prev.shopHappiness + Math.ceil(currentCustomer.happinessGain / 2) + serviceHappinessGain,
        0,
        100,
      ),
    }));

    setMood(40);
    setPurrBeat(0);
    finishSeatDeparture(departingSlot);
  }

  function customerLeaves() {
    const departingSlot = selectedOccupiedSlot;
    setGame((prev) => ({
      ...prev,
      missedToday: prev.missedToday + 1,
      shopHappiness: clamp(prev.shopHappiness - 3, 0, 100),
    }));
    setMood(40);
    setPurrBeat(0);
    finishSeatDeparture(departingSlot);
  }

  function endDay() {
    clearArrivalTimers();
    clearPauseState();
    setGame((prev) => ({
      ...prev,
      day: prev.day + 1,
      visitsToday: 0,
      tipsToday: 0,
      storiesToday: 0,
      missedToday: 0,
      reputationToday: 0,
      shopHappiness: clamp(prev.shopHappiness - 3, 0, 100),
    }));
    setDayElapsedMs(0);
    setSeatCustomerSlots(TABLE_SLOTS.map(() => null));
    setServedSlots([]);
    setCareBySlot({});
    setArrivalState('ready');
    setSelectedSlot(0);
    setPurrReadyAt(0);
    setQuietReadyAt(0);
    setScene('menu');
  }

  function buyUpgrade(id: string) {
    const upgrade = UPGRADES.find((item) => item.id === id);
    if (!upgrade) return;

    setGame((prev) => {
      if (prev.upgrades.includes(id) || prev.teaCups < upgrade.cost) return prev;
      return {
        ...prev,
        teaCups: prev.teaCups - upgrade.cost,
        upgrades: [...prev.upgrades, id],
        shopHappiness: clamp(prev.shopHappiness + upgrade.happiness, 0, 100),
      };
    });
  }

  function buyRecipe(id: string) {
    const recipe = SERVICE_ITEMS.find((item) => item.id === id);
    if (!recipe || recipe.id === STARTER_RECIPE_ID) return;

    setGame((prev) => {
      const ownedRecipes = getOwnedRecipeIds(prev.recipes);
      if (ownedRecipes.includes(id) || prev.teaCups < recipe.cost) return prev;
      return {
        ...prev,
        teaCups: prev.teaCups - recipe.cost,
        recipes: [...ownedRecipes, id],
        shopHappiness: clamp(prev.shopHappiness + recipe.happinessGain, 0, 100),
      };
    });
  }

  function buyCooldownUpgrade(id: string) {
    const upgrade = COOLDOWN_UPGRADES.find((item) => item.id === id);
    if (!upgrade) return;

    setGame((prev) => {
      if (prev.upgrades.includes(id) || prev.teaCups < upgrade.cost) return prev;
      return {
        ...prev,
        teaCups: prev.teaCups - upgrade.cost,
        upgrades: [...prev.upgrades, id],
      };
    });
  }

  function resetSave() {
    clearArrivalTimers();
    clearPauseState();
    clearSessionSnapshot();
    const resetTableCount = getTableCount(DEFAULT_GAME.day, DEFAULT_GAME.customerSlot);
    const resetSeats = createSeatSlots(DEFAULT_GAME.customerSlot, resetTableCount);
    nextCustomerSlotRef.current = DEFAULT_GAME.customerSlot + resetTableCount;
    setGame(DEFAULT_GAME);
    setTableCount(resetTableCount);
    setSeatCustomerSlots(resetSeats);
    setDayElapsedMs(0);
    setCareBySlot({});
    setMood(40);
    setPurrBeat(0);
    setArrivalState('ready');
    setSelectedSlot(0);
    setServedSlots([]);
    setPurrReadyAt(0);
    setQuietReadyAt(0);
    setActionNow(Date.now());
    setScene('menu');
  }

  return (
    <div
      className="tea-app"
      style={{ paddingTop: safeArea.top, paddingBottom: safeArea.bottom }}
    >
      <div className="landscape-gate" role="dialog" aria-label="Landscape required">
        <div>
          <RotateIcon />
          <h2>Landscape Please</h2>
          <p>Turn your phone sideways to play Tea Shop Cat.</p>
        </div>
      </div>
      <div className="tea-shell">
        {showTopBar ? (
          <TopBar
            game={game}
            shopQuality={shopQuality}
            shopRank={shopRank}
            clockProgress={clockProgress}
            shopTimeLabel={shopTimeLabel}
            yearProgress={yearProgress}
            onMenu={() => setScene('menu')}
            onShop={() => setScene('shop')}
            onStories={() => setScene('collection')}
            onUpgrades={() => setScene('upgrades')}
            onPause={pauseGame}
          />
        ) : null}

        {scene === 'menu' ? (
          <MenuScreen
            game={game}
            onStart={startDay}
            onContinue={continueDay}
            onStories={() => setScene('collection')}
            onUpgrades={() => setScene('upgrades')}
            onReset={resetSave}
          />
        ) : null}

        {scene === 'shop' ? (
          <ShopScreen
            customers={visibleCustomers}
            seatCustomerSlots={seatCustomerSlots}
            recipes={game.recipes}
            currentCustomer={currentCustomer}
            tableCount={tableCount}
            arrivalState={arrivalState}
            selectedSlot={selectedOccupiedSlot}
            activeService={currentService}
            servedSlots={servedSlots}
            patiencePercent={patiencePercent}
            clockProgress={clockProgress}
            onServe={serveRequest}
            onVisit={beginVisit}
            onStories={() => setScene('collection')}
            storyChapterCount={storyChapterCount}
          />
        ) : null}

        {scene === 'visit' ? (
          <VisitScreen
            customer={currentCustomer}
            service={currentService}
            serviceServed={serviceServed}
            patiencePercent={patiencePercent}
            mood={mood}
            purrBeat={purrBeat}
            purrCooldownRemaining={purrCooldownRemaining}
            quietCooldownRemaining={quietCooldownRemaining}
            onServe={serveRequest}
            onPurr={purr}
            onQuiet={sitQuietly}
            onBack={() => setScene('shop')}
          />
        ) : null}

        {scene === 'story' ? (
          <StoryScreen
            customer={currentCustomer}
            story={currentStory}
            onCollect={collectStory}
          />
        ) : null}

        {scene === 'summary' ? (
          <SummaryScreen
            game={game}
            shopQuality={shopQuality}
            shopRank={shopRank}
            daysRemaining={daysRemaining}
            onEndDay={endDay}
          />
        ) : null}

        {scene === 'upgrades' ? (
          <UpgradesScreen
            game={game}
            totalComfort={totalComfort}
            recipeQuality={recipeQuality}
            ownedRecipes={ownedRecipes}
            purrCooldownMs={purrCooldownMs}
            quietCooldownMs={quietCooldownMs}
            activeTab={activeLedgerTab}
            onTabChange={setActiveLedgerTab}
            onBuyUpgrade={buyUpgrade}
            onBuyRecipe={buyRecipe}
            onBuyCooldown={buyCooldownUpgrade}
            onBack={() => setScene('shop')}
          />
        ) : null}

        {scene === 'collection' ? (
          <CollectionScreen game={game} onBack={() => setScene('shop')} />
        ) : null}

        {isPaused ? <PauseOverlay game={game} shopTimeLabel={shopTimeLabel} onResume={resumeGame} /> : null}
      </div>
    </div>
  );
}

interface TopBarProps {
  game: GameState;
  shopQuality: number;
  shopRank: ShopRank;
  clockProgress: number;
  shopTimeLabel: string;
  yearProgress: number;
  onMenu: () => void;
  onShop: () => void;
  onStories: () => void;
  onUpgrades: () => void;
  onPause: () => void;
}

function TopBar({
  game,
  shopQuality,
  shopRank,
  clockProgress,
  shopTimeLabel,
  yearProgress,
  onMenu,
  onShop,
  onStories,
  onUpgrades,
  onPause,
}: TopBarProps) {
  return (
    <header className="top-bar" aria-label="Tea shop status">
      <div className="day-chip day-chip-year">
        <SunIcon />
        <div>
          <span>Day {Math.min(game.day, YEAR_LENGTH_DAYS)}/{YEAR_LENGTH_DAYS}</span>
          <Meter value={yearProgress} label="Year progress" />
        </div>
      </div>
      <div className="happiness-meter">
        <CatHeadIcon />
        <div>
          <div className="meter-label">
            <span>Shop Quality</span>
            <strong>{shopQuality}%</strong>
          </div>
          <Meter value={shopQuality} label="Shop quality" />
        </div>
      </div>
      <div className="day-meter" aria-label="Shop time">
        <span>{shopTimeLabel}</span>
        <Meter value={clockProgress} label="Shop day progress" />
      </div>
      <div className="rank-chip" aria-label={`Shop rank ${shopRank.name}`}>
        <StarIcon />
        <span>{shopRank.name}</span>
      </div>
      <div className="reputation-chip" aria-label={`Reputation ${game.reputation}`}>
        <HeartIcon />
        <strong>{game.reputation}</strong>
      </div>
      <div className="cup-bank">
        <CupIcon />
        <strong>{game.teaCups}</strong>
      </div>
      <nav className="top-actions" aria-label="Game navigation">
        <IconButton label="Shop" onClick={onShop}>
          <ShopIcon />
        </IconButton>
        <IconButton label="Stories" onClick={onStories}>
          <BookIcon />
        </IconButton>
        <IconButton label="Upgrades" onClick={onUpgrades}>
          <LampIcon />
        </IconButton>
        <IconButton label="Menu" onClick={onMenu}>
          <MenuIcon />
        </IconButton>
        <IconButton label="Pause" onClick={onPause}>
          <PauseIcon />
        </IconButton>
      </nav>
    </header>
  );
}

interface PauseOverlayProps {
  game: GameState;
  shopTimeLabel: string;
  onResume: () => void;
}

function PauseOverlay({ game, shopTimeLabel, onResume }: PauseOverlayProps) {
  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Game paused">
      <section className="pause-dialog">
        <PauseIcon />
        <p className="eyebrow">Paused</p>
        <h2>Tea Break</h2>
        <p>Day {Math.min(game.day, YEAR_LENGTH_DAYS)} at {shopTimeLabel}</p>
        <button className="primary-button" type="button" onClick={onResume}>
          <PawIcon />
          Resume
        </button>
      </section>
    </div>
  );
}

interface MenuScreenProps {
  game: GameState;
  onStart: () => void;
  onContinue: () => void;
  onStories: () => void;
  onUpgrades: () => void;
  onReset: () => void;
}

function MenuScreen({ game, onStart, onContinue, onStories, onUpgrades, onReset }: MenuScreenProps) {
  return (
    <main className="menu-screen">
      <section className="storefront" aria-label="Tea Shop Cat storefront">
        <div className="shop-sign">
          <span>Tea Shop</span>
          <strong>Cat</strong>
          <PawIcon />
        </div>
        <div className="store-door">
          <div className="door-window" />
          <span>OPEN</span>
        </div>
        <div className="chalkboard">
          <span>Tea</span>
          <span>Cake</span>
          <span>Cuddles</span>
        </div>
        <div className="menu-cat">
          <CatSprite resting />
        </div>
        <div className="ivy ivy-left" />
        <div className="ivy ivy-right" />
      </section>

      <section className="menu-panel" aria-label="Main menu">
        <div>
          <p className="eyebrow">Cozy visit sim</p>
          <h1>Tea Shop Cat</h1>
          <p className="menu-copy">
            Sit with regulars, purr until the room softens, and keep the stories they leave behind.
          </p>
        </div>
        <div className="menu-buttons">
          <button className="primary-button" type="button" onClick={onStart}>
            <SunIcon />
            Start Day {game.day}
          </button>
          <button className="paper-button" type="button" onClick={onContinue}>
            <ShopIcon />
            Continue
          </button>
          <button className="paper-button" type="button" onClick={onUpgrades}>
            <LampIcon />
            Shop
          </button>
          <button className="paper-button" type="button" onClick={onStories}>
            <BookIcon />
            Stories
          </button>
          <button className="quiet-button" type="button" onClick={onReset}>
            Reset Save
          </button>
        </div>
      </section>
    </main>
  );
}

interface ShopScreenProps {
  customers: Array<Customer | null>;
  seatCustomerSlots: Array<number | null>;
  recipes: string[];
  currentCustomer: Customer;
  tableCount: number;
  arrivalState: ArrivalState;
  selectedSlot: TableSlot;
  activeService: ServiceItem;
  servedSlots: TableSlot[];
  patiencePercent: number;
  clockProgress: number;
  onServe: () => void;
  onVisit: (slot?: TableSlot) => void;
  onStories: () => void;
  storyChapterCount: number;
}

function ShopScreen({
  customers,
  seatCustomerSlots,
  recipes,
  currentCustomer,
  tableCount,
  arrivalState,
  selectedSlot,
  activeService,
  servedSlots,
  patiencePercent,
  clockProgress,
  onServe,
  onVisit,
  onStories,
  storyChapterCount,
}: ShopScreenProps) {
  const canVisitSelectedCustomer = arrivalState === 'ready' && Boolean(customers[selectedSlot]);

  return (
    <main className="shop-screen">
      <section className="shop-stage" aria-label="Tea shop floor">
        <div className="back-wall">
          <div className="window">
            <span />
            <span />
          </div>
          <Shelf className="shelf-left" />
          <Shelf className="shelf-right" />
          <div className="counter">
            <div className="case-light" />
            <div className="pastry-row" />
          </div>
          <div className="plant plant-left" />
          <div className="plant plant-right" />
          <div className="lamp lamp-a" />
          <div className="lamp lamp-b" />
        </div>

        <div className="floor-lines" />
        <WallClock progress={clockProgress} />

        {TABLE_SLOTS.map((slot) => {
          const customer = customers[slot];
          const isOccupied = Boolean(customer) && slot < tableCount;
          const isActive = isOccupied && slot === selectedSlot && arrivalState === 'ready';
          const customerSlot = seatCustomerSlots[slot] ?? null;
          const service =
            slot === selectedSlot || customerSlot === null ? activeService : getService(customerSlot, recipes);
          const seatServed = servedSlots.includes(slot);

          return (
            <div
              className={`customer-seat customer-seat-${slot + 1} ${isActive ? 'active' : ''} ${
                isOccupied ? 'occupied' : 'empty'
              }`}
              key={slot}
            >
              {isOccupied && customer ? (
                <>
                  <button
                    className="customer-visit-button"
                    onClick={() => onVisit(slot)}
                    type="button"
                    aria-label={`Sit with ${customer.name}`}
                  >
                    <AnimalAvatar customer={customer} size="table" />
                  </button>
                  <button
                    className={`service-request ${isActive ? '' : 'muted'}`}
                    disabled={!isActive || seatServed}
                    onClick={onServe}
                    type="button"
                    aria-label={`Serve ${service.label}`}
                    title={`Serve ${service.label}`}
                  >
                    {seatServed ? <CheckIcon /> : <ServiceIcon kind={service.id} />}
                  </button>
                  {isActive && !seatServed ? (
                    <div className="patience-strip" aria-label={`${customer.name} patience`}>
                      <span style={{ width: `${clamp(patiencePercent, 0, 100)}%` }} />
                    </div>
                  ) : null}
                </>
              ) : (
                <span className="empty-chair" aria-hidden="true" />
              )}
              <span className="tea-table">
                {isOccupied && seatServed ? <ServiceIcon kind={service.id} /> : null}
              </span>
            </div>
          );
        })}

        <div className="cat-floor">
          <div className="heart-bubble">
            <HeartIcon />
          </div>
          <CatSprite />
        </div>

        {arrivalState === 'waiting' ? (
          <div className="arrival-card" aria-live="polite">
            <BellIcon />
            <strong>Quiet shop</strong>
            <span>A new customer will come in soon.</span>
          </div>
        ) : null}

        <button
          className="sit-button"
          disabled={!canVisitSelectedCustomer}
          type="button"
          onClick={() => onVisit(selectedSlot)}
        >
          {canVisitSelectedCustomer ? <PawIcon /> : <BellIcon />}
          {canVisitSelectedCustomer ? `Sit with ${currentCustomer.name}` : 'Waiting for customer'}
        </button>

        <button className="story-bag" type="button" onClick={onStories}>
          <BookIcon />
          <span>{storyChapterCount}</span>
        </button>
      </section>
    </main>
  );
}

interface WallClockProps {
  progress: number;
}

function WallClock({ progress }: WallClockProps) {
  const safeProgress = clamp(progress, 0, 100);
  const dayMinutes = shopDayMinutes(safeProgress);
  const hourAngle = ((dayMinutes / 60) % 12) * 30;
  const style = {
    '--clock-progress-angle': `${safeProgress * 3.6}deg`,
    '--clock-hour-angle': `${hourAngle}deg`,
  } as CSSProperties;

  return (
    <div
      className="wall-clock"
      style={style}
      role="img"
      aria-label={`Shop day ${Math.round(safeProgress)}% complete`}
    >
      <span className="clock-hand clock-hand-hour" />
      <span className="clock-pin" />
    </div>
  );
}

interface VisitScreenProps {
  customer: Customer;
  service: ServiceItem;
  serviceServed: boolean;
  patiencePercent: number;
  mood: number;
  purrBeat: number;
  purrCooldownRemaining: number;
  quietCooldownRemaining: number;
  onServe: () => void;
  onPurr: () => void;
  onQuiet: () => void;
  onBack: () => void;
}

function VisitScreen({
  customer,
  service,
  serviceServed,
  patiencePercent,
  mood,
  purrBeat,
  purrCooldownRemaining,
  quietCooldownRemaining,
  onServe,
  onPurr,
  onQuiet,
  onBack,
}: VisitScreenProps) {
  const purrReady = purrCooldownRemaining <= 0;
  const quietReady = quietCooldownRemaining <= 0;

  return (
    <main className="visit-screen">
      <section className="visit-stage" aria-label={`Sitting with ${customer.name}`}>
        <button className="close-button" type="button" onClick={onBack} aria-label="Back to shop">
          <MenuIcon />
        </button>
        <div className="visit-backdrop">
          <Shelf className="visit-shelf" />
          <div className="visit-lamp" />
        </div>
        <div className="visit-table">
          <div className="customer-close">
            <AnimalAvatar customer={customer} size="large" />
            <div className="cup-on-table">
              <CupIcon />
            </div>
          </div>
          <div className="cat-close">
            {purrBeat > 0 ? (
              <div className="purr-words" key={purrBeat}>
                <span>purr</span>
                <span>purr purr</span>
                <span>purr</span>
              </div>
            ) : null}
            <div className="heart-bubble visit-heart">
              <HeartIcon />
            </div>
            <CatSprite />
          </div>
        </div>
        <div className="mood-panel">
          <div className="visit-meta-row">
            <span>{serviceServed ? 'Order served' : 'Waiting on order'}</span>
          </div>
          <div className="meter-label">
            <span>{customer.name}'s Mood</span>
            <strong>{mood}%</strong>
          </div>
          <Meter value={mood} label={`${customer.name} mood`} />
          {!serviceServed ? (
            <div className="patience-panel">
              <span>Patience</span>
              <Meter value={patiencePercent} label={`${customer.name} patience`} />
            </div>
          ) : null}
          <div className="request-row">
            <span>Order</span>
            <button
              className="service-chip"
              disabled={serviceServed}
              onClick={onServe}
              type="button"
              aria-label={`Serve ${service.label}`}
            >
              {serviceServed ? <CheckIcon /> : <ServiceIcon kind={service.id} />}
              {serviceServed ? 'Served' : `Serve ${service.label}`}
            </button>
          </div>
          <div className="visit-actions">
            <button className="primary-button" type="button" onClick={onPurr} disabled={!purrReady}>
              <PawIcon />
              {purrReady ? 'Purr' : `Purr ${formatCooldown(purrCooldownRemaining)}`}
            </button>
            <button className="paper-button" type="button" onClick={onQuiet} disabled={!quietReady}>
              <CupIcon />
              {quietReady ? 'Sit Quietly' : `Quiet ${formatCooldown(quietCooldownRemaining)}`}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

interface StoryScreenProps {
  customer: Customer;
  story: StoryChapter;
  onCollect: () => void;
}

function StoryScreen({ customer, story, onCollect }: StoryScreenProps) {
  return (
    <main className="story-screen">
      <div className="soft-shop-bg" />
      <section className="story-card" aria-label="New story collected">
        <div className="story-title-row">
          <CatHeadIcon />
          <h2>New Story</h2>
          <LeafIcon />
        </div>
        <div className="story-portrait">
          <AnimalAvatar customer={customer} size="portrait" />
        </div>
        <h3>{story.title}</h3>
        <p>{story.text}</p>
        <button className="primary-button" type="button" onClick={onCollect}>
          <BookIcon />
          Add to Collection
        </button>
      </section>
    </main>
  );
}

interface SummaryScreenProps {
  game: GameState;
  shopQuality: number;
  shopRank: ShopRank;
  daysRemaining: number;
  onEndDay: () => void;
}

function SummaryScreen({ game, shopQuality, shopRank, daysRemaining, onEndDay }: SummaryScreenProps) {
  const goalMet = shopQuality >= GOOD_SHOP_SCORE;

  return (
    <main className="summary-screen">
      <section className="summary-card" aria-label="End of day summary">
        <div className="summary-heading">
          <LeafIcon />
          <h2>Day {game.day} Complete</h2>
          <LeafIcon />
        </div>
        <dl className="summary-list">
          <div>
            <dt>
              <StarIcon />
              Shop Rank
            </dt>
            <dd>{shopRank.name} {shopQuality}%</dd>
          </div>
          <div>
            <dt>
              <HeartIcon />
              Reputation
            </dt>
            <dd>+{game.reputationToday}</dd>
          </div>
          <div>
            <dt>
              <CupIcon />
              Tips Earned
            </dt>
            <dd>{game.tipsToday}</dd>
          </div>
          <div>
            <dt>
              <BookIcon />
              Stories Collected
            </dt>
            <dd>{game.storiesToday}</dd>
          </div>
          <div>
            <dt>
              <BellIcon />
              Customers Missed
            </dt>
            <dd>{game.missedToday}</dd>
          </div>
          <div>
            <dt>
              <SunIcon />
              Year Goal
            </dt>
            <dd>{goalMet ? 'Good rank' : `${daysRemaining} days left`}</dd>
          </div>
        </dl>
        <button className="primary-button" type="button" onClick={onEndDay}>
          <SunIcon />
          End Day
        </button>
        <div className="summary-cat">
          <CatSprite resting />
        </div>
      </section>
    </main>
  );
}

interface UpgradesScreenProps {
  game: GameState;
  totalComfort: number;
  recipeQuality: number;
  ownedRecipes: ServiceItem[];
  purrCooldownMs: number;
  quietCooldownMs: number;
  activeTab: LedgerTab;
  onTabChange: (tab: LedgerTab) => void;
  onBuyUpgrade: (id: string) => void;
  onBuyRecipe: (id: string) => void;
  onBuyCooldown: (id: string) => void;
  onBack: () => void;
}

function UpgradesScreen({
  game,
  totalComfort,
  recipeQuality,
  ownedRecipes,
  purrCooldownMs,
  quietCooldownMs,
  activeTab,
  onTabChange,
  onBuyUpgrade,
  onBuyRecipe,
  onBuyCooldown,
  onBack,
}: UpgradesScreenProps) {
  const [activeRecipeCategory, setActiveRecipeCategory] = useState<RecipeCategory>('Coffee');
  const ownedRecipeIds = new Set(ownedRecipes.map((recipe) => recipe.id));
  const recipeCategories = ['Tea', 'Coffee'] as const;
  const visibleRecipes = SERVICE_ITEMS.filter((recipe) => recipe.category === activeRecipeCategory);
  const tabs = [
    { id: 'recipes', label: 'Recipes' },
    { id: 'training', label: 'Training' },
    { id: 'comfort', label: 'Comfort' },
  ] as const satisfies readonly { id: LedgerTab; label: string }[];

  return (
    <main className="upgrades-screen">
      <section className="shop-ledger" aria-label="Shop upgrades">
        <div className="ledger-head">
          <div>
            <p className="eyebrow">Shop</p>
            <h2>Ledger</h2>
          </div>
          <div className="comfort-total">
            <StarIcon />
            <span>Recipes</span>
            <strong>+{recipeQuality}</strong>
          </div>
          <div className="comfort-total">
            <HeartIcon />
            <span>Comfort</span>
            <strong>{totalComfort}</strong>
          </div>
          <div className="cup-bank">
            <CupIcon />
            <strong>{game.teaCups}</strong>
          </div>
        </div>
        <div className="upgrade-tabs" aria-label="Upgrade categories" role="tablist">
          {tabs.map((tab) => (
            <button
              aria-controls={`ledger-${tab.id}`}
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              id={`ledger-tab-${tab.id}`}
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="ledger-sections">
          {activeTab === 'recipes' ? (
          <section
            aria-labelledby="ledger-tab-recipes"
            className="ledger-section"
            id="ledger-recipes"
            role="tabpanel"
          >
            <div className="section-head">
              <h3>Recipe List</h3>
              <span>Quality +{recipeQuality}</span>
            </div>
            <div className="recipe-category-tabs" aria-label="Recipe types" role="tablist">
              {recipeCategories.map((category) => (
                <button
                  aria-selected={activeRecipeCategory === category}
                  className={activeRecipeCategory === category ? 'active' : ''}
                  key={category}
                  onClick={() => setActiveRecipeCategory(category)}
                  role="tab"
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="recipe-group">
              <h4>{activeRecipeCategory}</h4>
              <div className="upgrade-grid">
                {visibleRecipes.map((recipe) => {
                  const owned = ownedRecipeIds.has(recipe.id);
                  const canBuy = game.teaCups >= recipe.cost && !owned;

                  return (
                    <article className={`upgrade-item ${owned ? 'owned' : ''}`} key={recipe.id}>
                      <div className="upgrade-art recipe-art">
                        <ServiceIcon kind={recipe.id} />
                      </div>
                      <div>
                        <span className="upgrade-kind">{recipe.category} Recipe</span>
                        <h3>{recipe.name}</h3>
                        <p>{recipe.description}</p>
                        <span className="comfort-bonus">Quality +{recipe.quality}</span>
                      </div>
                      <button
                        className={owned ? 'owned-button' : 'buy-button'}
                        disabled={!canBuy}
                        onClick={() => onBuyRecipe(recipe.id)}
                        type="button"
                      >
                        {owned ? 'Owned' : `${recipe.cost}`}
                        {!owned ? <CupIcon /> : null}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
          ) : null}

          {activeTab === 'training' ? (
          <section
            aria-labelledby="ledger-tab-training"
            className="ledger-section"
            id="ledger-training"
            role="tabpanel"
          >
            <div className="section-head">
              <h3>Cat Training</h3>
              <span>Purr {formatCooldown(purrCooldownMs)} / Quiet {formatCooldown(quietCooldownMs)}</span>
            </div>
            <div className="upgrade-grid">
              {COOLDOWN_UPGRADES.map((upgrade) => {
                const owned = game.upgrades.includes(upgrade.id);
                const canBuy = game.teaCups >= upgrade.cost && !owned;
                const actionLabel = upgrade.action === 'purr' ? 'Purr' : 'Quiet';

                return (
                  <article className={`upgrade-item ${owned ? 'owned' : ''}`} key={upgrade.id}>
                    <div className="upgrade-art training-art">
                      {upgrade.action === 'purr' ? <PawIcon /> : <CupIcon />}
                    </div>
                    <div>
                      <span className="upgrade-kind">Training</span>
                      <h3>{upgrade.name}</h3>
                      <p>{upgrade.description}</p>
                      <span className="comfort-bonus">{actionLabel} -{formatCooldown(upgrade.reductionMs)}</span>
                    </div>
                    <button
                      className={owned ? 'owned-button' : 'buy-button'}
                      disabled={!canBuy}
                      onClick={() => onBuyCooldown(upgrade.id)}
                      type="button"
                    >
                      {owned ? 'Owned' : `${upgrade.cost}`}
                      {!owned ? <CupIcon /> : null}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
          ) : null}

          {activeTab === 'comfort' ? (
          <section
            aria-labelledby="ledger-tab-comfort"
            className="ledger-section"
            id="ledger-comfort"
            role="tabpanel"
          >
            <div className="section-head">
              <h3>Shop Comfort</h3>
              <span>Comfort {totalComfort}</span>
            </div>
            <div className="upgrade-grid">
              {UPGRADES.map((upgrade) => {
                const owned = game.upgrades.includes(upgrade.id);
                const canBuy = game.teaCups >= upgrade.cost && !owned;

                return (
                  <article className={`upgrade-item ${owned ? 'owned' : ''}`} key={upgrade.id}>
                    <div className="upgrade-art">
                      <UpgradeIcon id={upgrade.id} />
                    </div>
                    <div>
                      <span className="upgrade-kind">{upgrade.kind}</span>
                      <h3>{upgrade.name}</h3>
                      <p>{upgrade.description}</p>
                      <span className="comfort-bonus">Comfort +{upgrade.comfort}</span>
                    </div>
                    <button
                      className={owned ? 'owned-button' : 'buy-button'}
                      disabled={!canBuy}
                      onClick={() => onBuyUpgrade(upgrade.id)}
                      type="button"
                    >
                      {owned ? 'Owned' : `${upgrade.cost}`}
                      {!owned ? <CupIcon /> : null}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
          ) : null}
        </div>
        <button className="paper-button ledger-back" type="button" onClick={onBack}>
          <ShopIcon />
          Back to Shop
        </button>
      </section>
    </main>
  );
}

interface CollectionScreenProps {
  game: GameState;
  onBack: () => void;
}

function CollectionScreen({ game, onBack }: CollectionScreenProps) {
  const collectedStories = CUSTOMERS.filter((customer) => getCustomerVisitCount(game, customer.id) > 0);
  const storyChapterCount = getStoryChapterCount(game);

  return (
    <main className="collection-screen">
      <section className="story-ledger" aria-label="Story collection">
        <div className="ledger-head">
          <div>
            <p className="eyebrow">Collection</p>
            <h2>Stories</h2>
          </div>
          <span className="story-count">{storyChapterCount} chapters</span>
        </div>

        {collectedStories.length === 0 ? (
          <div className="empty-stories">
            <CatSprite resting />
            <p>No stories yet. The first regular is waiting by the window.</p>
          </div>
        ) : (
          <div className="story-grid">
            {collectedStories.map((customer) => (
              <StoryEntry customer={customer} game={game} key={customer.id} />
            ))}
          </div>
        )}

        <button className="paper-button ledger-back" type="button" onClick={onBack}>
          <ShopIcon />
          Back to Shop
        </button>
      </section>
    </main>
  );
}

interface StoryEntryProps {
  customer: Customer;
  game: GameState;
}

function StoryEntry({ customer, game }: StoryEntryProps) {
  const visits = getCustomerVisitCount(game, customer.id);
  const latestStory = getStoryForVisit(customer, visits);

  return (
    <article className="story-entry">
      <AnimalAvatar customer={customer} size="small" />
      <div>
        <div className="story-entry-head">
          <h3>{latestStory.title}</h3>
        </div>
        <p>{latestStory.text}</p>
        <span className="visit-counter">Visits {visits}</span>
      </div>
    </article>
  );
}

interface IconButtonProps {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}

function IconButton({ children, label, onClick }: IconButtonProps) {
  return (
    <button className="icon-button" type="button" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

interface MeterProps {
  label: string;
  value: number;
}

function Meter({ label, value }: MeterProps) {
  const safeValue = clamp(value, 0, 100);

  return (
    <div
      className="meter"
      role="meter"
      aria-label={label}
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

interface AnimalAvatarProps {
  customer: Customer;
  size: 'small' | 'table' | 'large' | 'portrait';
}

function AnimalAvatar({ customer, size }: AnimalAvatarProps) {
  const isRabbit = customer.species === 'rabbit';
  const isFox = customer.species === 'fox';
  const isFrog = customer.species === 'frog';
  const isMoth = customer.species === 'moth';

  return (
    <svg
      className={`animal-avatar animal-avatar-${size}`}
      viewBox="0 0 160 170"
      role="img"
      aria-label={customer.name}
    >
      {isRabbit ? (
        <>
          <ellipse cx="58" cy="35" rx="18" ry="42" fill={customer.color} stroke="#5f3d2a" strokeWidth="4" />
          <ellipse cx="102" cy="35" rx="18" ry="42" fill={customer.color} stroke="#5f3d2a" strokeWidth="4" />
        </>
      ) : null}
      {isFox ? (
        <>
          <path d="M48 68 L24 28 L70 48 Z" fill={customer.color} stroke="#5f3d2a" strokeWidth="4" />
          <path d="M112 68 L136 28 L90 48 Z" fill={customer.color} stroke="#5f3d2a" strokeWidth="4" />
        </>
      ) : null}
      {isMoth ? (
        <>
          <ellipse cx="42" cy="80" rx="26" ry="44" fill="#d8cfaa" opacity="0.8" />
          <ellipse cx="118" cy="80" rx="26" ry="44" fill="#d8cfaa" opacity="0.8" />
        </>
      ) : null}
      <ellipse cx="80" cy="112" rx="52" ry="42" fill={customer.sweater} stroke="#5f3d2a" strokeWidth="4" />
      <circle cx="80" cy="70" r={isFrog ? 48 : 44} fill={customer.color} stroke="#5f3d2a" strokeWidth="4" />
      {customer.species === 'bear' ? (
        <>
          <circle cx="46" cy="40" r="17" fill={customer.color} stroke="#5f3d2a" strokeWidth="4" />
          <circle cx="114" cy="40" r="17" fill={customer.color} stroke="#5f3d2a" strokeWidth="4" />
        </>
      ) : null}
      {isFrog ? (
        <>
          <circle cx="50" cy="33" r="17" fill={customer.color} stroke="#5f3d2a" strokeWidth="4" />
          <circle cx="110" cy="33" r="17" fill={customer.color} stroke="#5f3d2a" strokeWidth="4" />
          <circle cx="50" cy="31" r="6" fill="#2f231b" />
          <circle cx="110" cy="31" r="6" fill="#2f231b" />
        </>
      ) : null}
      {!isFrog ? (
        <>
          <circle cx="62" cy="66" r="5" fill="#2f231b" />
          <circle cx="98" cy="66" r="5" fill="#2f231b" />
        </>
      ) : null}
      <path d="M61 88 Q80 100 99 88" fill="none" stroke="#2f231b" strokeWidth="4" strokeLinecap="round" />
      <path d="M57 119 Q80 132 103 119" fill="none" stroke="#f2d9b0" strokeWidth="7" strokeLinecap="round" />
      <title>{customer.name}</title>
    </svg>
  );
}

interface CatSpriteProps {
  resting?: boolean;
}

function CatSprite({ resting = false }: CatSpriteProps) {
  return (
    <svg className={`cat-sprite ${resting ? 'cat-resting' : ''}`} viewBox="0 0 210 140" role="img" aria-label="Shop cat">
      <ellipse cx="108" cy="95" rx="74" ry="32" fill="#f2dfbf" stroke="#593b2b" strokeWidth="5" />
      <path d="M46 78 Q66 22 110 55 Q148 30 164 82" fill="#f2dfbf" stroke="#593b2b" strokeWidth="5" />
      <path d="M69 54 L58 24 L88 44 Z" fill="#f2dfbf" stroke="#593b2b" strokeWidth="5" />
      <path d="M129 44 L157 20 L148 58 Z" fill="#c8793b" stroke="#593b2b" strokeWidth="5" />
      <path d="M120 57 Q141 45 158 62 Q143 76 122 72 Z" fill="#c8793b" />
      <path d="M70 91 Q94 107 124 91" fill="none" stroke="#593b2b" strokeWidth="5" strokeLinecap="round" />
      <circle cx="82" cy="72" r={resting ? 0 : 4} fill="#2f231b" />
      <circle cx="126" cy="72" r={resting ? 0 : 4} fill="#2f231b" />
      {resting ? (
        <>
          <path d="M76 72 Q84 78 92 72" fill="none" stroke="#2f231b" strokeWidth="4" strokeLinecap="round" />
          <path d="M118 72 Q126 78 134 72" fill="none" stroke="#2f231b" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : null}
      <path d="M104 78 Q106 83 111 78" fill="none" stroke="#2f231b" strokeWidth="4" strokeLinecap="round" />
      <path d="M37 96 Q8 92 18 70 Q30 47 54 69" fill="none" stroke="#593b2b" strokeWidth="10" strokeLinecap="round" />
      <path d="M154 98 Q198 92 190 64 Q183 40 161 61" fill="none" stroke="#c8793b" strokeWidth="12" strokeLinecap="round" />
      <circle cx="50" cy="88" r="12" fill="#c8793b" />
      <title>Shop cat</title>
    </svg>
  );
}

interface ShelfProps {
  className: string;
}

function Shelf({ className }: ShelfProps) {
  return (
    <div className={`shelf ${className}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

interface UpgradeIconProps {
  id: string;
}

function UpgradeIcon({ id }: UpgradeIconProps) {
  if (id === 'cushion') return <CushionIcon />;
  if (id === 'cat-bed') return <BedIcon />;
  if (id === 'window-seat') return <WindowSeatIcon />;
  if (id === 'hearth') return <HearthIcon />;
  if (id === 'tea-plant') return <PlantIcon />;
  return <LampIcon />;
}

interface ServiceIconProps {
  kind: ServiceKind;
}

function ServiceIcon({ kind }: ServiceIconProps) {
  const service = SERVICE_ITEMS.find((item) => item.id === kind) ?? SERVICE_ITEMS[0];

  return (
    <img
      alt=""
      aria-hidden="true"
      className="service-icon-img"
      draggable={false}
      src={service.imageSrc}
    />
  );
}

function CupIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 11h15v8a7 7 0 0 1-14 0v-8Z" fill="#fff3dc" stroke="#7a4c31" strokeWidth="2" />
      <path d="M22 13h3a3 3 0 0 1 0 6h-3" fill="none" stroke="#7a4c31" strokeWidth="2" />
      <path d="M8 25h15" stroke="#7a4c31" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 9c-1-2 2-3 1-5" stroke="#d6805e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M10 22h12c-2-2-2-5-2-8a4 4 0 0 0-8 0c0 3 0 6-2 8Z" fill="#e8c381" stroke="#6b432e" strokeWidth="2" />
      <path d="M13 25h6" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 8h2" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="24" r="2" fill="#6b432e" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="11" fill="#8fa467" stroke="#5d6b45" strokeWidth="2" />
      <path d="M10 16l4 4 8-9" fill="none" stroke="#fff9ed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RotateIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 11a8 8 0 0 1 13-4l2 2" fill="none" stroke="#6b432e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M23 4v6h-6" fill="none" stroke="#6b432e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="13" width="15" height="10" rx="2" fill="#fff3df" stroke="#6b432e" strokeWidth="2" transform="rotate(-8 16.5 18)" />
      <path d="M24 21a8 8 0 0 1-13 4l-2-2" fill="none" stroke="#6b432e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9 28v-6h6" fill="none" stroke="#6b432e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PawIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="11" cy="11" r="4" fill="#9f6845" />
      <circle cx="20" cy="10" r="4" fill="#9f6845" />
      <circle cx="7" cy="19" r="4" fill="#9f6845" />
      <circle cx="24" cy="18" r="4" fill="#9f6845" />
      <path d="M10 24c2-6 10-6 12 0 1 4-13 4-12 0Z" fill="#9f6845" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 7h8c2 0 3 1 3 3v16c0-2-1-3-3-3H6V7Z" fill="#8fa467" stroke="#5d6b45" strokeWidth="2" />
      <path d="M26 7h-8c-2 0-3 1-3 3v16c0-2 1-3 3-3h8V7Z" fill="#e8cf92" stroke="#7a5a30" strokeWidth="2" />
      <path d="M11 12h3M20 12h3M20 17h3" stroke="#7a5a30" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShopIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 14h20v13H6V14Z" fill="#d9b07a" stroke="#6b432e" strokeWidth="2" />
      <path d="M4 14 7 6h18l3 8H4Z" fill="#a86b42" stroke="#6b432e" strokeWidth="2" />
      <path d="M13 27v-8h6v8" fill="#6d8544" stroke="#6b432e" strokeWidth="2" />
      <path d="M9 18h3M21 18h3" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LampIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3v7" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 18c1-5 3-8 7-8s6 3 7 8H9Z" fill="#d7a44c" stroke="#6b432e" strokeWidth="2" />
      <path d="M13 20h6" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="24" r="4" fill="#f4d782" opacity="0.8" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="6" fill="#f4be55" />
      <path d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l4 4M21 21l4 4M25 7l-4 4M11 21l-4 4" stroke="#d89434" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 10h18M7 16h18M7 22h18" stroke="#6b432e" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <rect x="9" y="7" width="5" height="18" rx="2" fill="#7a4c31" />
      <rect x="18" y="7" width="5" height="18" rx="2" fill="#7a4c31" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 27S5 20 5 12a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-11 15-11 15Z" fill="#df7070" stroke="#8b4545" strokeWidth="2" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="m16 4 3.4 7 7.7 1.1-5.6 5.4 1.3 7.6L16 21.5l-6.8 3.6 1.3-7.6-5.6-5.4 7.7-1.1L16 4Z"
        fill="#e8bf63"
        stroke="#7a5a30"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CatHeadIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 14 9 5l6 5 6-5 4 9a10 10 0 1 1-18 0Z" fill="#f2dfbf" stroke="#6b432e" strokeWidth="2" />
      <circle cx="12" cy="17" r="1.6" fill="#2f231b" />
      <circle cx="20" cy="17" r="1.6" fill="#2f231b" />
      <path d="M13 22q3 3 6 0" stroke="#2f231b" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M6 18c8-9 16-7 20-6-2 8-11 12-20 6Z" fill="#8fa467" stroke="#5d6b45" strokeWidth="2" />
      <path d="M8 18c6-1 10-3 15-6" stroke="#5d6b45" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CushionIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <ellipse cx="40" cy="36" rx="30" ry="16" fill="#d97979" stroke="#7a4c31" strokeWidth="4" />
      <path d="M15 35c6-11 44-11 50 0" fill="none" stroke="#e9a0a0" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function BedIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <ellipse cx="40" cy="34" rx="30" ry="18" fill="#9a6236" stroke="#593b2b" strokeWidth="4" />
      <ellipse cx="40" cy="34" rx="18" ry="9" fill="#c58b55" />
      <path d="M31 31h18" stroke="#593b2b" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function PlantIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <path d="M30 35h22l-4 18H34Z" fill="#a86b42" stroke="#6b432e" strokeWidth="4" />
      <path d="M40 36C26 22 23 11 38 15c7 2 7 12 2 21Z" fill="#8fa467" stroke="#5d6b45" strokeWidth="3" />
      <path d="M42 36c3-18 17-25 22-13-3 11-11 15-22 13Z" fill="#6d8544" stroke="#5d6b45" strokeWidth="3" />
    </svg>
  );
}

function WindowSeatIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <path d="M18 10h44v30H18Z" fill="#f6d996" stroke="#6b432e" strokeWidth="4" />
      <path d="M40 10v30M18 25h44" stroke="#6b432e" strokeWidth="3" />
      <path d="M12 42h56v9H12Z" fill="#9a6236" stroke="#6b432e" strokeWidth="4" />
      <path d="M19 43c6-8 36-8 42 0" fill="none" stroke="#d97979" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function HearthIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <path d="M16 24h48v28H16Z" fill="#7a4c31" stroke="#593b2b" strokeWidth="4" />
      <path d="M24 24c2-13 30-13 32 0" fill="#a86b42" stroke="#593b2b" strokeWidth="4" />
      <path d="M40 48c-9-8-1-14 0-21 8 7 11 14 0 21Z" fill="#f2c66e" stroke="#c8793b" strokeWidth="3" />
      <path d="M30 51h20" stroke="#2f231b" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default TeaShopCat;
