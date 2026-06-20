import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from 'react';
import { getSafeArea } from './services/environment';

type Scene = 'menu' | 'shop' | 'visit' | 'story' | 'summary' | 'upgrades' | 'collection' | 'admin';
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
type CareAction = 'purr' | 'quiet' | 'roll' | 'cute';
type LedgerTab = 'recipes' | 'training' | 'comfort';
type Gender = 'female' | 'male';
type TipStyle = 'poor' | 'steady' | 'good' | 'high';
type VisitConversationKind = 'story' | 'kitty';
type AdminDragItem = 'character' | 'table' | 'drink' | 'cat' | 'bubble' | 'order';
type AdminPreviewMode = 'shop' | 'talking' | 'settings';

interface AdminPosition {
  x: number;
  y: number;
}

interface AdminLayout {
  character: AdminPosition;
  table: AdminPosition;
  drink: AdminPosition;
  cat: AdminPosition;
  bubble: AdminPosition;
  order: AdminPosition;
  characterScale: number;
  drinkScale: number;
  catScale: number;
  talking: AdminTalkingLayout;
}

interface AdminTalkingLayout {
  character: AdminPosition;
  cat: AdminPosition;
  bubble: AdminPosition;
  characterScale: number;
  catScale: number;
  imageSrc: string;
  enabledImageSrcs: string[];
}

type AdminLayouts = Record<string, AdminLayout>;

interface CharacterPortraitSettings {
  imageSrc: string;
  scale: number;
  x: number;
  y: number;
}

interface CharacterAdminSettings {
  tipStyle: TipStyle;
  tipBase: number;
  patienceMs: number;
  portrait: CharacterPortraitSettings;
}

type AdminCharacterSettings = Record<string, CharacterAdminSettings>;

interface CharacterPose {
  id: string;
  label: string;
  src: string;
}

interface StoryToast {
  id: number;
  customerName: string;
  title: string;
  chapterNumber: number;
}

interface ActiveStorySession {
  customerId: string;
  kind: VisitConversationKind;
  visitNumber: number;
}

interface KittyChatOption {
  id: 1 | 2;
  label: string;
  reply: string;
}

interface KittyChat {
  question: string;
  options: readonly [KittyChatOption, KittyChatOption];
}

interface StoryChapter {
  title: string;
  text: string;
}

interface CharacterProfile {
  id: string;
  name: string;
  gender: Gender;
  skin: string;
  hair: string;
  outfit: string;
  accent: string;
  tipStyle: TipStyle;
  tipBase: number;
  patienceMs: number;
  imageSrc?: string;
  portraitImageSrc?: string;
  portraitScale?: number;
  portraitX?: number;
  portraitY?: number;
  glasses?: boolean;
  longHair?: boolean;
}

interface Customer {
  id: string;
  name: string;
  members: readonly CharacterProfile[];
  seat: string;
  moodStart: number;
  tip: number;
  happinessGain: number;
  patienceMs: number;
  storyTitle: string;
  story: string;
  followUps: readonly StoryChapter[];
  blockedIfPresent?: readonly string[];
  requiresPresent?: readonly string[];
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
  customerStats: Record<string, CustomerStats>;
}

interface CustomerStats {
  visits: number;
  served: number;
  missed: number;
  earned: number;
}

interface VisitCare {
  purrs: number;
  quiets: number;
  rolls: number;
  cutes: number;
  storyTalks: number;
  kittyAnswer: 0 | 1 | 2;
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
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>;
  serviceQualityBySlot: Partial<Record<TableSlot, number>>;
  careBySlot: Partial<Record<TableSlot, VisitCare>>;
  patienceRemaining: number;
  patienceBySlot: Partial<Record<TableSlot, number>>;
  dayElapsedMs: number;
  purrCooldownRemainingMs: number;
  quietCooldownRemainingMs: number;
  rollCooldownRemainingMs: number;
  cuteCooldownRemainingMs: number;
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
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>;
  serviceQualityBySlot: Partial<Record<TableSlot, number>>;
  careBySlot: Partial<Record<TableSlot, VisitCare>>;
  patienceBySlot: Partial<Record<TableSlot, number>>;
  dayElapsedMs: number;
  purrCooldownRemainingMs: number;
  quietCooldownRemainingMs: number;
  rollCooldownRemainingMs: number;
  cuteCooldownRemainingMs: number;
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
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>;
  serviceQualityBySlot: Partial<Record<TableSlot, number>>;
  careBySlot: Partial<Record<TableSlot, VisitCare>>;
  patienceBySlot: Partial<Record<TableSlot, number>>;
  dayElapsedMs: number;
  purrReadyAt: number;
  quietReadyAt: number;
  rollReadyAt: number;
  cuteReadyAt: number;
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
const BASE_QUIET_COOLDOWN_MS = 2_500;
const BASE_ROLL_COOLDOWN_MS = 7_000;
const BASE_CUTE_COOLDOWN_MS = 8_500;
const LISTEN_MOOD_GAIN = 12;
const LISTEN_PURR_COOLDOWN_MOOD_GAIN = 18;
const ROLL_OVER_MOOD_GAIN = 10;
const BE_CUTE_MOOD_GAIN = 8;
const MISS_REPUTATION_LOSS = 5;
const ADMIN_PASSWORD = '123';
const ADMIN_LAYOUT_KEY = 'tea-shop-cat-admin-layouts-v1';
const ADMIN_CHARACTER_SETTINGS_KEY = 'tea-shop-cat-admin-character-settings-v1';
type TableSlot = (typeof TABLE_SLOTS)[number];

const DEFAULT_ADMIN_LAYOUT: AdminLayout = {
  character: { x: 30, y: 58 },
  table: { x: 30, y: 76 },
  drink: { x: 30, y: 73 },
  cat: { x: 50, y: 82 },
  bubble: { x: 24, y: 24 },
  order: { x: 43, y: 43 },
  characterScale: 100,
  drinkScale: 100,
  catScale: 100,
  talking: {
    character: { x: 47, y: 54 },
    cat: { x: 73, y: 70 },
    bubble: { x: 27, y: 18 },
    characterScale: 100,
    catScale: 82,
    imageSrc: '',
    enabledImageSrcs: [],
  },
};

const TIP_STYLE_LABELS: Record<TipStyle, string> = {
  poor: 'Poor tipper',
  steady: 'Steady tipper',
  good: 'Tips well',
  high: 'High tipper',
};

const TIP_STYLE_MULTIPLIERS: Record<TipStyle, number> = {
  poor: 0.72,
  steady: 1,
  good: 1.22,
  high: 1.48,
};

const MEMBER_CONFLICTS: readonly (readonly [string, string])[] = [
  ['shadow', 'alfrin'],
  ['liam', 'shadow'],
  ['liam', 'alaric'],
  ['nia', 'eli'],
  ['nia', 'liam'],
];

const CHARACTER_PROFILES = {
  shadow: {
    id: 'shadow',
    name: 'Shadow',
    gender: 'female',
    skin: '#8f5646',
    hair: '#401529',
    outfit: '#7a54a3',
    accent: '#d66b72',
    tipStyle: 'good',
    tipBase: 35,
    patienceMs: 20_000,
    longHair: true,
  },
  matthew: {
    id: 'matthew',
    name: 'Matthew',
    gender: 'male',
    skin: '#d7a476',
    hair: '#6a3c21',
    outfit: '#f0c58d',
    accent: '#4d7c8f',
    tipStyle: 'high',
    tipBase: 42,
    patienceMs: 24_000,
    glasses: true,
  },
  liam: {
    id: 'liam',
    name: 'Liam',
    gender: 'male',
    skin: '#c98f6f',
    hair: '#2f2520',
    outfit: '#5f7758',
    accent: '#d3a34f',
    tipStyle: 'steady',
    tipBase: 31,
    patienceMs: 15_000,
  },
  alfrin: {
    id: 'alfrin',
    name: 'Alfrin',
    gender: 'male',
    skin: '#b77758',
    hair: '#151515',
    outfit: '#3f6272',
    accent: '#d9b56f',
    tipStyle: 'poor',
    tipBase: 28,
    patienceMs: 13_000,
  },
  alaric: {
    id: 'alaric',
    name: 'Alaric',
    gender: 'male',
    skin: '#c89b72',
    hair: '#7d4a2b',
    outfit: '#7b3f46',
    accent: '#d6a04e',
    tipStyle: 'good',
    tipBase: 38,
    patienceMs: 18_000,
  },
  eli: {
    id: 'eli',
    name: 'Eli',
    gender: 'female',
    skin: '#9f654f',
    hair: '#251c1c',
    outfit: '#4f6f8f',
    accent: '#d9c072',
    tipStyle: 'steady',
    tipBase: 33,
    patienceMs: 19_000,
    longHair: true,
  },
  miles: {
    id: 'miles',
    name: 'Miles',
    gender: 'female',
    skin: '#d3a07f',
    hair: '#b85f42',
    outfit: '#8c5f3d',
    accent: '#7f984d',
    tipStyle: 'high',
    tipBase: 44,
    patienceMs: 27_000,
    longHair: true,
  },
  nia: {
    id: 'nia',
    name: 'Nia',
    gender: 'female',
    skin: '#70483b',
    hair: '#1f1a22',
    outfit: '#8f6d9a',
    accent: '#e3b54f',
    tipStyle: 'good',
    tipBase: 36,
    patienceMs: 17_000,
    longHair: true,
  },
  gene: {
    id: 'gene',
    name: 'Gene',
    gender: 'male',
    skin: '#b9825d',
    hair: '#554033',
    outfit: '#536a78',
    accent: '#e0ba70',
    tipStyle: 'poor',
    tipBase: 25,
    patienceMs: 16_000,
    glasses: true,
  },
  quou: {
    id: 'quou',
    name: 'Quou',
    gender: 'female',
    skin: '#c1866a',
    hair: '#101820',
    outfit: '#6d8544',
    accent: '#cc6f57',
    tipStyle: 'steady',
    tipBase: 34,
    patienceMs: 22_000,
    longHair: true,
  },
} as const satisfies Record<string, CharacterProfile>;

type CharacterId = keyof typeof CHARACTER_PROFILES;
const ADMIN_CHARACTER_IDS = Object.keys(CHARACTER_PROFILES) as CharacterId[];

const CHARACTER_TALKING_POSES = {
  shadow: [
    {
      id: 'shadow-tablet-focus',
      label: 'Tablet focus',
      src: '/characters/shadow/ShadowTest_01.png',
    },
    {
      id: 'shadow-tablet-calm',
      label: 'Tablet calm',
      src: '/characters/shadow/ShadowTest_02.png',
    },
    {
      id: 'shadow-tablet-soft',
      label: 'Tablet soft',
      src: '/characters/shadow/ShadowTest_03.png',
    },
    {
      id: 'shadow-tablet-talking',
      label: 'Talking',
      src: '/characters/shadow/ShadowTest_04.png',
    },
  ],
} as const satisfies Partial<Record<CharacterId, readonly CharacterPose[]>>;

function getCharacterTalkingPoses(characterId: CharacterId): readonly CharacterPose[] {
  const poseMap = CHARACTER_TALKING_POSES as Partial<Record<CharacterId, readonly CharacterPose[]>>;
  return poseMap[characterId] ?? [];
}

function getDefaultTalkingImageSrc(characterId?: CharacterId): string {
  return characterId ? (getCharacterTalkingPoses(characterId)[0]?.src ?? '') : '';
}

function getDefaultPortraitSettings(characterId: CharacterId): CharacterPortraitSettings {
  const imageSrc = getDefaultTalkingImageSrc(characterId);
  return {
    imageSrc,
    scale: imageSrc ? 130 : 100,
    x: 50,
    y: 36,
  };
}

function getDefaultAdminLayout(characterId?: CharacterId): AdminLayout {
  const imageSrc = getDefaultTalkingImageSrc(characterId);
  return {
    ...DEFAULT_ADMIN_LAYOUT,
    character: { ...DEFAULT_ADMIN_LAYOUT.character },
    table: { ...DEFAULT_ADMIN_LAYOUT.table },
    drink: { ...DEFAULT_ADMIN_LAYOUT.drink },
    cat: { ...DEFAULT_ADMIN_LAYOUT.cat },
    bubble: { ...DEFAULT_ADMIN_LAYOUT.bubble },
    order: { ...DEFAULT_ADMIN_LAYOUT.order },
    characterScale: DEFAULT_ADMIN_LAYOUT.characterScale,
    drinkScale: DEFAULT_ADMIN_LAYOUT.drinkScale,
    catScale: DEFAULT_ADMIN_LAYOUT.catScale,
    talking: {
      ...DEFAULT_ADMIN_LAYOUT.talking,
      character: { ...DEFAULT_ADMIN_LAYOUT.talking.character },
      cat: { ...DEFAULT_ADMIN_LAYOUT.talking.cat },
      bubble: { ...DEFAULT_ADMIN_LAYOUT.talking.bubble },
      imageSrc,
      enabledImageSrcs: imageSrc ? [imageSrc] : [],
    },
  };
}

function normalizeAdminPosition(value: unknown, fallback: AdminPosition): AdminPosition {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminPosition>) : {};
  return {
    x: clamp(Math.floor(numericValue(parsed.x, fallback.x)), 0, 100),
    y: clamp(Math.floor(numericValue(parsed.y, fallback.y)), 0, 100),
  };
}

function normalizeAdminTalkingLayout(
  value: unknown,
  characterId?: CharacterId,
): AdminTalkingLayout {
  const fallback = getDefaultAdminLayout(characterId).talking;
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminTalkingLayout>) : {};
  const poseSrcs = characterId ? getCharacterTalkingPoses(characterId).map((pose) => pose.src) : [];
  const rawImageSrc = typeof parsed.imageSrc === 'string' ? parsed.imageSrc : fallback.imageSrc;
  const imageSrc =
    rawImageSrc && (poseSrcs.length === 0 || poseSrcs.includes(rawImageSrc))
      ? rawImageSrc
      : fallback.imageSrc;
  const rawEnabled = Array.isArray(parsed.enabledImageSrcs) ? parsed.enabledImageSrcs : [];
  const enabledImageSrcs = rawEnabled.filter(
    (src): src is string =>
      typeof src === 'string' && (poseSrcs.length === 0 || poseSrcs.includes(src)),
  );
  const safeEnabledImageSrcs = Array.from(
    new Set(enabledImageSrcs.length > 0 ? enabledImageSrcs : imageSrc ? [imageSrc] : []),
  );

  return {
    character: normalizeAdminPosition(parsed.character, fallback.character),
    cat: normalizeAdminPosition(parsed.cat, fallback.cat),
    bubble: normalizeAdminPosition(parsed.bubble, fallback.bubble),
    characterScale: clamp(
      Math.floor(numericValue(parsed.characterScale, fallback.characterScale)),
      45,
      250,
    ),
    catScale: clamp(Math.floor(numericValue(parsed.catScale, fallback.catScale)), 35, 250),
    imageSrc,
    enabledImageSrcs: safeEnabledImageSrcs,
  };
}

function normalizeAdminLayout(value: unknown, characterId?: CharacterId): AdminLayout {
  const fallback = getDefaultAdminLayout(characterId);
  const parsed = value != null && typeof value === 'object' ? (value as Partial<AdminLayout>) : {};
  return {
    character: normalizeAdminPosition(parsed.character, fallback.character),
    table: normalizeAdminPosition(parsed.table, fallback.table),
    drink: normalizeAdminPosition(parsed.drink, fallback.drink),
    cat: normalizeAdminPosition(parsed.cat, fallback.cat),
    bubble: normalizeAdminPosition(parsed.bubble, fallback.bubble),
    order: normalizeAdminPosition(parsed.order, fallback.order),
    characterScale: clamp(
      Math.floor(numericValue(parsed.characterScale, fallback.characterScale)),
      45,
      250,
    ),
    drinkScale: clamp(Math.floor(numericValue(parsed.drinkScale, fallback.drinkScale)), 45, 250),
    catScale: clamp(Math.floor(numericValue(parsed.catScale, fallback.catScale)), 45, 250),
    talking: normalizeAdminTalkingLayout(parsed.talking, characterId),
  };
}

function loadAdminLayouts(): AdminLayouts {
  try {
    const raw = window.localStorage.getItem(ADMIN_LAYOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const source =
      parsed != null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    return ADMIN_CHARACTER_IDS.reduce<AdminLayouts>((layouts, characterId) => {
      layouts[characterId] = normalizeAdminLayout(source[characterId], characterId);
      return layouts;
    }, {});
  } catch {
    return {};
  }
}

function saveAdminLayouts(layouts: AdminLayouts) {
  try {
    window.localStorage.setItem(ADMIN_LAYOUT_KEY, JSON.stringify(layouts));
  } catch {
    // Admin staging layouts are local-only; the editor still works without storage.
  }
}

function defaultCharacterAdminSettings(profile: CharacterProfile): CharacterAdminSettings {
  const characterId = isCharacterId(profile.id) ? profile.id : 'shadow';
  return {
    tipStyle: profile.tipStyle,
    tipBase: profile.tipBase,
    patienceMs: profile.patienceMs,
    portrait: getDefaultPortraitSettings(characterId),
  };
}

function tipStyleValue(value: unknown, fallback: TipStyle): TipStyle {
  return value === 'poor' || value === 'steady' || value === 'good' || value === 'high'
    ? value
    : fallback;
}

function normalizeCharacterPortraitSettings(
  characterId: CharacterId,
  value: unknown,
): CharacterPortraitSettings {
  const fallback = getDefaultPortraitSettings(characterId);
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<CharacterPortraitSettings>) : {};
  const poseSrcs = getCharacterTalkingPoses(characterId).map((pose) => pose.src);
  const rawImageSrc = typeof parsed.imageSrc === 'string' ? parsed.imageSrc : fallback.imageSrc;
  const imageSrc =
    rawImageSrc && (poseSrcs.length === 0 || poseSrcs.includes(rawImageSrc))
      ? rawImageSrc
      : fallback.imageSrc;

  return {
    imageSrc,
    scale: clamp(Math.floor(numericValue(parsed.scale, fallback.scale)), 50, 250),
    x: clamp(Math.floor(numericValue(parsed.x, fallback.x)), 0, 100),
    y: clamp(Math.floor(numericValue(parsed.y, fallback.y)), 0, 100),
  };
}

function normalizeCharacterAdminSettings(
  characterId: CharacterId,
  value: unknown,
): CharacterAdminSettings {
  const profile = CHARACTER_PROFILES[characterId];
  const fallback = defaultCharacterAdminSettings(profile);
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<CharacterAdminSettings>) : {};

  return {
    tipStyle: tipStyleValue(parsed.tipStyle, fallback.tipStyle),
    tipBase: clamp(Math.floor(numericValue(parsed.tipBase, fallback.tipBase)), 0, 999),
    patienceMs: clamp(
      Math.floor(numericValue(parsed.patienceMs, fallback.patienceMs)),
      5_000,
      120_000,
    ),
    portrait: normalizeCharacterPortraitSettings(characterId, parsed.portrait),
  };
}

function normalizeAdminCharacterSettings(value: unknown): AdminCharacterSettings {
  const source =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return ADMIN_CHARACTER_IDS.reduce<AdminCharacterSettings>((settings, characterId) => {
    settings[characterId] = normalizeCharacterAdminSettings(characterId, source[characterId]);
    return settings;
  }, {});
}

function loadAdminCharacterSettings(): AdminCharacterSettings {
  try {
    const raw = window.localStorage.getItem(ADMIN_CHARACTER_SETTINGS_KEY);
    return normalizeAdminCharacterSettings(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeAdminCharacterSettings({});
  }
}

function saveAdminCharacterSettings(settings: AdminCharacterSettings) {
  try {
    window.localStorage.setItem(ADMIN_CHARACTER_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Character tuning is local-only; defaults are still available without storage.
  }
}

let activeAdminCharacterSettings = loadAdminCharacterSettings();

function setActiveAdminCharacterSettings(settings: AdminCharacterSettings) {
  activeAdminCharacterSettings = normalizeAdminCharacterSettings(settings);
}

function applyAdminSettingsToProfile(
  profile: CharacterProfile,
  settings = activeAdminCharacterSettings,
): CharacterProfile {
  const characterSettings = settings[profile.id] ?? defaultCharacterAdminSettings(profile);

  return {
    ...profile,
    tipStyle: characterSettings.tipStyle,
    tipBase: characterSettings.tipBase,
    patienceMs: characterSettings.patienceMs,
    portraitImageSrc: characterSettings.portrait.imageSrc || undefined,
    portraitScale: characterSettings.portrait.scale,
    portraitX: characterSettings.portrait.x,
    portraitY: characterSettings.portrait.y,
  };
}

function getEditableCharacterProfile(
  characterId: CharacterId,
  settings = activeAdminCharacterSettings,
): CharacterProfile {
  return applyAdminSettingsToProfile(CHARACTER_PROFILES[characterId], settings);
}

function applyAdminSettingsToCustomer(customer: Customer): Customer {
  const members = customer.members.map((member) => applyAdminSettingsToProfile(member));
  return {
    ...customer,
    name: characterNames(members),
    members,
    tip: baseTipForMembers(members),
    patienceMs: patienceForMembers(members),
  };
}

function isCharacterId(value: string): value is CharacterId {
  return Object.prototype.hasOwnProperty.call(CHARACTER_PROFILES, value);
}

function getCustomerAdminLayout(customer: Customer, layouts: AdminLayouts): AdminLayout {
  const characterId = customer.members[0]?.id;
  return characterId && isCharacterId(characterId)
    ? normalizeAdminLayout(layouts[characterId], characterId)
    : getDefaultAdminLayout();
}

function getCustomerPrimaryCharacterId(customer: Customer): CharacterId | null {
  const characterId = customer.members[0]?.id;
  return characterId && isCharacterId(characterId) ? characterId : null;
}

function getCustomerStoreImageSrc(customer: Customer, layout: AdminLayout): string {
  const characterId = getCustomerPrimaryCharacterId(customer);
  if (!characterId) return '';
  return layout.talking.imageSrc || getDefaultTalkingImageSrc(characterId);
}

function characterPreviewCustomer(profile: CharacterProfile): Customer {
  return {
    id: profile.id,
    name: profile.name,
    members: [profile],
    seat: 'Admin preview',
    moodStart: 40,
    tip: Math.round(profile.tipBase * TIP_STYLE_MULTIPLIERS[profile.tipStyle]),
    happinessGain: 8,
    patienceMs: profile.patienceMs,
    storyTitle: `${profile.name}'s Notes`,
    story: `${profile.name}'s settings are open.`,
    followUps: [],
  };
}

interface CustomerSeed {
  id: string;
  name?: string;
  memberIds: readonly CharacterId[];
  seat: string;
  moodStart?: number;
  tip?: number;
  happinessGain?: number;
  patienceMs?: number;
  storyTitle: string;
  story: string;
  followUps: readonly StoryChapter[];
  blockedIfPresent?: readonly CharacterId[];
  requiresPresent?: readonly CharacterId[];
}

function characterList(memberIds: readonly CharacterId[]): CharacterProfile[] {
  return memberIds.map((id) => CHARACTER_PROFILES[id]);
}

function characterNames(members: readonly CharacterProfile[]): string {
  return members.map((member) => member.name).join(' & ');
}

function baseTipForMembers(members: readonly CharacterProfile[]): number {
  return Math.round(
    members.reduce(
      (total, member) => total + member.tipBase * TIP_STYLE_MULTIPLIERS[member.tipStyle],
      0,
    ),
  );
}

function patienceForMembers(members: readonly CharacterProfile[]): number {
  const total = members.reduce((sum, member) => sum + member.patienceMs, 0);
  const average = total / members.length;
  return Math.round(average + (members.length > 1 ? 4_000 : 0));
}

function makeCustomer(seed: CustomerSeed): Customer {
  const members = characterList(seed.memberIds);
  return {
    id: seed.id,
    name: seed.name ?? characterNames(members),
    members,
    seat: seed.seat,
    moodStart: seed.moodStart ?? Math.max(30, 46 - members.length * 4),
    tip: seed.tip ?? baseTipForMembers(members),
    happinessGain: seed.happinessGain ?? (members.length > 1 ? 12 : 8),
    patienceMs: seed.patienceMs ?? patienceForMembers(members),
    storyTitle: seed.storyTitle,
    story: seed.story,
    followUps: seed.followUps,
    blockedIfPresent: seed.blockedIfPresent,
    requiresPresent: seed.requiresPresent,
  };
}

const CUSTOMERS = [
  makeCustomer({
    id: 'shadow',
    memberIds: ['shadow'],
    seat: 'Back booth',
    moodStart: 39,
    storyTitle: 'Quiet Corners',
    story:
      'Shadow asks for the seat where the window reflection hides her from the busiest part of the room.',
    blockedIfPresent: ['alfrin'],
    followUps: [
      {
        title: 'The Unsent Call',
        text: 'She keeps checking her phone, then admits some people are easier to miss than to answer.',
      },
      {
        title: 'A Softer Exit',
        text: 'Shadow leaves through the front door today instead of slipping out before anyone can wave.',
      },
    ],
  }),
  makeCustomer({
    id: 'matthew',
    memberIds: ['matthew'],
    seat: 'Window table',
    moodStart: 43,
    storyTitle: 'A Careful Smile',
    story:
      'Matthew studies the menu like a puzzle and relaxes only after he spots a familiar red scarf across the room.',
    requiresPresent: ['shadow'],
    followUps: [
      {
        title: 'The Second Cup',
        text: 'He orders a second drink he says is definitely not an apology, then asks if the cat believes him.',
      },
      {
        title: 'A Better Joke',
        text: 'Matthew practices a joke under his breath until it stops sounding like a shield.',
      },
    ],
  }),
  makeCustomer({
    id: 'liam',
    memberIds: ['liam'],
    seat: 'Center table',
    moodStart: 35,
    storyTitle: 'Late Again',
    story: 'Liam arrives already apologizing, even though no one has accused him of anything yet.',
    blockedIfPresent: ['shadow', 'eli', 'alaric'],
    followUps: [
      {
        title: 'The Borrowed Pen',
        text: 'He borrows a pen to write three reminders, then leaves the pen behind with a fourth reminder attached.',
      },
      {
        title: 'Five Minutes Early',
        text: 'Liam shows up early for once and looks suspiciously proud of the miracle.',
      },
    ],
  }),
  makeCustomer({
    id: 'alfrin',
    memberIds: ['alfrin'],
    seat: 'Counter edge',
    moodStart: 32,
    storyTitle: 'Sharp Sugar',
    story: 'Alfrin asks whether the tea is meant to be comforting or merely pretending.',
    followUps: [
      {
        title: 'A Better Question',
        text: 'He returns with one less complaint and one very specific compliment about the cup.',
      },
      {
        title: 'No Witnesses',
        text: 'Alfrin smiles at the cat, then immediately checks if anyone saw.',
      },
    ],
  }),
  makeCustomer({
    id: 'alaric',
    memberIds: ['alaric'],
    seat: 'Reading nook',
    moodStart: 40,
    storyTitle: 'The Old Song',
    story:
      'Alaric taps the table in a rhythm he says belonged to a song his family never wrote down.',
    followUps: [
      {
        title: 'Half Remembered',
        text: 'He hums the missing middle of the song and laughs when the cat yawns on the final note.',
      },
      {
        title: 'Written Down',
        text: 'Alaric leaves a napkin covered in music notes and says the shop can keep the tune safe.',
      },
    ],
  }),
  makeCustomer({
    id: 'eli',
    memberIds: ['eli'],
    seat: 'Lamp table',
    moodStart: 42,
    storyTitle: 'Blue Thread',
    story:
      'Eli winds blue thread around one finger while deciding how much of the day to say out loud.',
    followUps: [
      {
        title: 'A Small Repair',
        text: 'She fixes a loose sleeve button without thinking and says taking care of small things counts.',
      },
      {
        title: 'The Good Needle',
        text: 'Eli brings the needle she trusts most and lets the cat bat at the thread after the hard part is done.',
      },
    ],
  }),
  makeCustomer({
    id: 'miles',
    memberIds: ['miles'],
    seat: 'Pastry case',
    moodStart: 45,
    storyTitle: 'Lucky Shoes',
    story: 'Miles claims her lucky shoes only work if she orders something warm before noon.',
    followUps: [
      {
        title: 'A Good Bet',
        text: 'She wins a tiny bet with herself and spends the prize on an extra cookie for the counter.',
      },
      {
        title: 'No Luck Needed',
        text: 'Miles admits the shoes are not lucky, exactly, but they remind her to walk in like she belongs.',
      },
    ],
  }),
  makeCustomer({
    id: 'nia',
    memberIds: ['nia'],
    seat: 'Fern corner',
    moodStart: 37,
    storyTitle: 'No Crowds',
    story: 'Nia waits for the quietest table and thanks the cat for not asking why.',
    blockedIfPresent: ['eli', 'liam'],
    followUps: [
      {
        title: 'The Wide Door',
        text: 'She says some rooms feel easier to enter when she already knows where the exits are.',
      },
      {
        title: 'A Chosen Chair',
        text: 'Nia picks the same chair again, then decides maybe a favorite place can start small.',
      },
    ],
  }),
  makeCustomer({
    id: 'gene',
    memberIds: ['gene'],
    seat: 'Small table',
    moodStart: 34,
    storyTitle: 'Exact Change',
    story:
      'Gene counts coins twice, then admits the habit started during a year when every little thing mattered.',
    followUps: [
      {
        title: 'A Bigger Tip',
        text: 'He leaves one extra coin today and says he is practicing not bracing for the worst.',
      },
      {
        title: 'Enough',
        text: 'Gene stops counting halfway through and decides the cat looks trustworthy with money.',
      },
    ],
  }),
  makeCustomer({
    id: 'quou',
    memberIds: ['quou'],
    seat: 'Plant table',
    moodStart: 41,
    storyTitle: 'A Name Repeated',
    story:
      'Quou spells her name slowly, then smiles when the cat blinks like it understood perfectly.',
    followUps: [
      {
        title: 'Misprinted Cup',
        text: 'She saves a receipt with her name spelled wrong because the mistake looks almost charming today.',
      },
      {
        title: 'Said Right',
        text: 'Quou hears her name called correctly and sits a little taller before picking up her drink.',
      },
    ],
  }),
  makeCustomer({
    id: 'liam-eli',
    memberIds: ['liam', 'eli'],
    seat: 'Center table',
    moodStart: 36,
    storyTitle: 'Two Apologies',
    story:
      'Liam apologizes for being late while Eli apologizes for assuming he would be, and both pretend this is normal.',
    blockedIfPresent: ['shadow', 'alaric'],
    followUps: [
      {
        title: 'One List',
        text: 'They combine two separate lists into one plan and somehow both look relieved.',
      },
      {
        title: 'Shared Thread',
        text: 'Eli ties blue thread around Liam’s pen so he stops losing it before the first reminder.',
      },
    ],
  }),
  makeCustomer({
    id: 'matthew-shadow',
    memberIds: ['matthew', 'shadow'],
    seat: 'Window table',
    moodStart: 38,
    storyTitle: 'Across The Table',
    story:
      'Matthew and Shadow sit with a full table between them until the first cup makes the silence less sharp.',
    blockedIfPresent: ['alfrin'],
    followUps: [
      {
        title: 'Almost Laughing',
        text: 'Matthew tries a joke, Shadow tries not to laugh, and the cat ruins both attempts by looking smug.',
      },
      {
        title: 'Same Side',
        text: 'They choose chairs on the same side of the table today and pretend it happened by accident.',
      },
    ],
  }),
  makeCustomer({
    id: 'alaric-eli',
    memberIds: ['alaric', 'eli'],
    seat: 'Reading nook',
    moodStart: 40,
    storyTitle: 'Old Song, Blue Thread',
    story:
      'Alaric taps an old rhythm while Eli marks time with thread, and together they find the missing beat.',
    followUps: [
      {
        title: 'Kept Tempo',
        text: 'Eli keeps the rhythm steady while Alaric writes down the part he always forgot.',
      },
      {
        title: 'A New Verse',
        text: 'They add a new verse about warm cups, patient cats, and the bravery of staying for one more song.',
      },
    ],
  }),
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
  customerStats: {},
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCustomer(slot: number): Customer {
  const index = ((slot % CUSTOMERS.length) + CUSTOMERS.length) % CUSTOMERS.length;
  return applyAdminSettingsToCustomer(CUSTOMERS[index] ?? CUSTOMERS[0]);
}

function createCustomerToken(arrivalIndex: number, customerIndex: number): number {
  return Math.max(0, Math.floor(arrivalIndex)) * CUSTOMERS.length + customerIndex;
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

function getService(slot: number, recipeIds: string[], orderIndex = 0): ServiceItem {
  const recipes = getOwnedRecipes(recipeIds);
  const index = (((slot + orderIndex) % recipes.length) + recipes.length) % recipes.length;
  return recipes[index] ?? SERVICE_ITEMS[0];
}

function getServicesForCustomer(
  slot: number,
  recipeIds: string[],
  customer: Customer,
): ServiceItem[] {
  return customer.members.map((_, orderIndex) => getService(slot, recipeIds, orderIndex));
}

function getServedOrderIndexes(
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>,
  slot: TableSlot,
): number[] {
  return Array.from(new Set(servedOrdersBySlot[slot] ?? []))
    .filter((index) => Number.isInteger(index) && index >= 0)
    .sort((a, b) => a - b);
}

function isOrderServed(
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>,
  slot: TableSlot,
  orderIndex: number,
): boolean {
  return getServedOrderIndexes(servedOrdersBySlot, slot).includes(orderIndex);
}

function isTableFullyServed(
  customer: Customer,
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>,
  slot: TableSlot,
): boolean {
  const servedOrders = getServedOrderIndexes(servedOrdersBySlot, slot);
  return customer.members.every((_, orderIndex) => servedOrders.includes(orderIndex));
}

function isTablePartiallyServed(
  customer: Customer,
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>,
  slot: TableSlot,
): boolean {
  const servedOrders = getServedOrderIndexes(servedOrdersBySlot, slot);
  return servedOrders.length > 0 && !isTableFullyServed(customer, servedOrdersBySlot, slot);
}

function fullyServedSlots(
  seats: Array<number | null>,
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>,
): TableSlot[] {
  return TABLE_SLOTS.filter((slot) => {
    const customerSlot = seats[slot];
    return (
      customerSlot != null &&
      isTableFullyServed(getCustomer(customerSlot), servedOrdersBySlot, slot)
    );
  });
}

function normalizeServedOrdersBySlot(
  value: unknown,
  seats: Array<number | null>,
  legacyServedSlots: TableSlot[],
): Partial<Record<TableSlot, number[]>> {
  const source =
    value != null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const output: Partial<Record<TableSlot, number[]>> = {};

  for (const slot of TABLE_SLOTS) {
    const customerSlot = seats[slot];
    if (customerSlot == null) continue;

    const customer = getCustomer(customerSlot);
    const orderCount = customer.members.length;
    const raw = source[String(slot)];
    const indexes = Array.isArray(raw)
      ? raw
          .filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
          .map((item) => Math.floor(item))
          .filter((item) => item >= 0 && item < orderCount)
      : legacyServedSlots.includes(slot)
        ? customer.members.map((_, orderIndex) => orderIndex)
        : [];

    if (indexes.length > 0) output[slot] = Array.from(new Set(indexes)).sort((a, b) => a - b);
  }

  return output;
}

function normalizeServiceQualityBySlot(
  value: unknown,
  seats: Array<number | null>,
): Partial<Record<TableSlot, number>> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const output: Partial<Record<TableSlot, number>> = {};

  for (const slot of TABLE_SLOTS) {
    if (seats[slot] == null) continue;
    const raw = source[String(slot)];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      output[slot] = clamp(Math.round(raw), 0, 100);
    }
  }

  return output;
}

function getPartyMemberIds(customer: Customer): string[] {
  return customer.members.map((member) => member.id);
}

function getPresentMemberIds(seats: Array<number | null>): Set<string> {
  const present = new Set<string>();
  for (const slot of TABLE_SLOTS) {
    const customerSlot = seats[slot];
    if (customerSlot == null) continue;
    for (const memberId of getPartyMemberIds(getCustomer(customerSlot))) {
      present.add(memberId);
    }
  }
  return present;
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

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function stringSeed(value: string): number {
  let seed = 0;
  for (let index = 0; index < value.length; index += 1) {
    seed = (seed * 31 + value.charCodeAt(index)) % 100_000;
  }
  return seed;
}

function normalizeCustomerStats(stats: CustomerStats): CustomerStats {
  return {
    visits: clamp(Math.floor(numericValue(stats.visits, 0)), 0, 9999),
    served: clamp(Math.floor(numericValue(stats.served, 0)), 0, 9999),
    missed: clamp(Math.floor(numericValue(stats.missed, 0)), 0, 9999),
    earned: clamp(Math.floor(numericValue(stats.earned, 0)), 0, 999_999),
  };
}

function emptyCustomerStats(): CustomerStats {
  return { visits: 0, served: 0, missed: 0, earned: 0 };
}

function getCustomerStats(game: GameState, customerId: string): CustomerStats {
  const stats = normalizeCustomerStats(game.customerStats[customerId] ?? emptyCustomerStats());
  const legacyStoryVisits =
    game.customerVisits[customerId] ?? (game.stories.includes(customerId) ? 1 : 0);
  return {
    ...stats,
    visits: Math.max(stats.visits, legacyStoryVisits, stats.served + stats.missed),
  };
}

function getCustomerReturnWeight(game: GameState, customer: Customer): number {
  const stats = getCustomerStats(game, customer.id);
  const storyCount = getCustomerVisitCount(game, customer.id);
  const missRatePenalty = stats.visits > 0 ? (stats.missed / stats.visits) * 0.16 : 0;
  const missedPenalty = Math.min(stats.missed * 0.14, 0.55);
  const recovery = Math.min(stats.served * 0.025 + storyCount * 0.035, 0.18);
  return clamp(1 - missedPenalty - missRatePenalty + recovery, 0.3, 1);
}

function getCustomerReturnChance(game: GameState, customer: Customer): number {
  return Math.round(getCustomerReturnWeight(game, customer) * 100);
}

function chooseCustomerIndexForArrival(
  arrivalIndex: number,
  game: GameState,
  usedIndices: Set<number>,
  presentMemberIds: Set<string>,
): number {
  const weights = CUSTOMERS.map((customer, index) => {
    if (usedIndices.has(index) && usedIndices.size < CUSTOMERS.length) return 0;
    if (!canCustomerArrive(customer, presentMemberIds)) return 0;
    return getCustomerReturnWeight(game, customer);
  });
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  if (totalWeight <= 0) {
    return CUSTOMERS.findIndex(
      (customer, index) => !usedIndices.has(index) && canCustomerArrive(customer, presentMemberIds),
    );
  }

  let roll = seededRandom((arrivalIndex + 1) * 31 + usedIndices.size * 17) * totalWeight;
  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) return index;
  }
  return weights.findIndex((weight) => weight > 0);
}

function canCustomerArrive(customer: Customer, presentMemberIds: Set<string>): boolean {
  const candidateMemberIds = new Set(getPartyMemberIds(customer));
  if (customer.members.some((member) => presentMemberIds.has(member.id))) return false;
  if (customer.requiresPresent?.some((memberId) => !presentMemberIds.has(memberId))) return false;
  if (customer.blockedIfPresent?.some((memberId) => presentMemberIds.has(memberId))) return false;
  if (
    MEMBER_CONFLICTS.some(
      ([first, second]) =>
        (candidateMemberIds.has(first) && presentMemberIds.has(second)) ||
        (candidateMemberIds.has(second) && presentMemberIds.has(first)),
    )
  ) {
    return false;
  }
  return true;
}

function removeDuplicateSeatCustomers(seats: Array<number | null>): Array<number | null> {
  const presentMemberIds = new Set<string>();

  return TABLE_SLOTS.map((slot) => {
    const customerSlot = seats[slot] ?? null;
    if (customerSlot == null) return null;

    const customer = getCustomer(customerSlot);
    const memberIds = getPartyMemberIds(customer);
    if (memberIds.some((memberId) => presentMemberIds.has(memberId))) return null;

    for (const memberId of memberIds) {
      presentMemberIds.add(memberId);
    }

    return customerSlot;
  });
}

function seatListsMatch(first: Array<number | null>, second: Array<number | null>): boolean {
  return TABLE_SLOTS.every((slot) => (first[slot] ?? null) === (second[slot] ?? null));
}

function createSeatSlots(
  startSlot: number,
  tableCount: number,
  game: GameState,
): Array<number | null> {
  const usedIndices = new Set<number>();
  const presentMemberIds = new Set<string>();
  return TABLE_SLOTS.map((slot) => {
    if (slot >= tableCount) return null;
    const customerIndex = chooseCustomerIndexForArrival(
      startSlot + slot,
      game,
      usedIndices,
      presentMemberIds,
    );
    if (customerIndex < 0) return null;
    const safeCustomerIndex = customerIndex;
    usedIndices.add(safeCustomerIndex);
    for (const memberId of getPartyMemberIds(CUSTOMERS[safeCustomerIndex] ?? CUSTOMERS[0])) {
      presentMemberIds.add(memberId);
    }
    return createCustomerToken(startSlot + slot, safeCustomerIndex);
  }).map((customerSlot, index) => (index < tableCount ? customerSlot : null));
}

function chooseOccupiedSlot(seats: Array<number | null>, preferredSlot: TableSlot): TableSlot {
  if (seats[preferredSlot] != null) return preferredSlot;
  return TABLE_SLOTS.find((slot) => seats[slot] != null) ?? preferredSlot;
}

function hasOccupiedSeats(seats: Array<number | null>): boolean {
  return TABLE_SLOTS.some((slot) => seats[slot] != null);
}

function createPatienceBySlot(seats: Array<number | null>): Partial<Record<TableSlot, number>> {
  const output: Partial<Record<TableSlot, number>> = {};
  for (const slot of TABLE_SLOTS) {
    const customerSlot = seats[slot];
    if (customerSlot == null) continue;
    output[slot] = getCustomer(customerSlot).patienceMs;
  }
  return output;
}

function getSeatPatience(
  patienceBySlot: Partial<Record<TableSlot, number>>,
  seats: Array<number | null>,
  slot: TableSlot,
): number {
  const customerSlot = seats[slot];
  if (customerSlot == null) return 0;
  const maxPatience = getCustomer(customerSlot).patienceMs;
  const raw = patienceBySlot[slot];
  const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : maxPatience;
  return clamp(Math.floor(value), 0, maxPatience);
}

function getSeatPatiencePercent(
  patienceBySlot: Partial<Record<TableSlot, number>>,
  seats: Array<number | null>,
  slot: TableSlot,
): number {
  const customerSlot = seats[slot];
  if (customerSlot == null) return 0;
  const maxPatience = getCustomer(customerSlot).patienceMs;
  return Math.ceil((getSeatPatience(patienceBySlot, seats, slot) / maxPatience) * 100);
}

function normalizePatienceBySlot(
  value: unknown,
  seats: Array<number | null>,
  selectedSlot: TableSlot,
  legacyPatience: unknown,
): Partial<Record<TableSlot, number>> {
  const source =
    value != null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const output: Partial<Record<TableSlot, number>> = {};

  for (const slot of TABLE_SLOTS) {
    const customerSlot = seats[slot];
    if (customerSlot == null) continue;

    const maxPatience = getCustomer(customerSlot).patienceMs;
    const raw = source[String(slot)];
    const fallback = slot === selectedSlot ? legacyPatience : maxPatience;
    const value =
      typeof raw === 'number' && Number.isFinite(raw)
        ? raw
        : typeof fallback === 'number' && Number.isFinite(fallback)
          ? fallback
          : maxPatience;

    output[slot] = clamp(Math.floor(value), 0, maxPatience);
  }

  return output;
}

function getPatiencePercentsBySlot(
  patienceBySlot: Partial<Record<TableSlot, number>>,
  seats: Array<number | null>,
): Partial<Record<TableSlot, number>> {
  const output: Partial<Record<TableSlot, number>> = {};
  for (const slot of TABLE_SLOTS) {
    if (seats[slot] != null) {
      output[slot] = getSeatPatiencePercent(patienceBySlot, seats, slot);
    }
  }
  return output;
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
  const base =
    action === 'purr'
      ? BASE_PURR_COOLDOWN_MS
      : action === 'quiet'
        ? BASE_QUIET_COOLDOWN_MS
        : action === 'roll'
          ? BASE_ROLL_COOLDOWN_MS
          : BASE_CUTE_COOLDOWN_MS;
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
  const missedPenalty = Math.min(game.missedToday * 6, 45);
  const badReputationPenalty =
    game.reputationToday < 0 ? Math.min(Math.abs(game.reputationToday) * 0.8, 35) : 0;
  const noServicePenalty = game.visitsToday === 0 && game.missedToday > 0 ? 18 : 0;
  const quality =
    happinessScore +
    recipeScore +
    comfortScore +
    reputationScore -
    missedPenalty -
    badReputationPenalty -
    noServicePenalty;
  return Math.round(clamp(quality, 0, 100));
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

function getVisitCare(
  careBySlot: Partial<Record<TableSlot, VisitCare>>,
  slot: TableSlot,
): VisitCare {
  const care = careBySlot[slot];
  const rawKittyAnswer = care?.kittyAnswer ?? 0;
  const kittyAnswer = rawKittyAnswer === 1 || rawKittyAnswer === 2 ? rawKittyAnswer : 0;
  return {
    purrs: care?.purrs ?? 0,
    quiets: care?.quiets ?? 0,
    rolls: care?.rolls ?? 0,
    cutes: care?.cutes ?? 0,
    storyTalks: care?.storyTalks ?? 0,
    kittyAnswer,
  };
}

function getReputationGain(
  service: ServiceItem,
  served: boolean,
  care: VisitCare,
  completedStory: boolean,
): number {
  const servedGain = served ? 2 + service.reputationBonus : 0;
  const purrGain = served && care.purrs > 0 ? 4 + Math.min(care.purrs, 2) * 2 : 0;
  const quietGain = care.quiets > 0 ? 2 + Math.min(care.quiets, 3) : 0;
  const cuteGain = served && care.cutes + care.rolls > 0 ? 2 : 0;
  const storyGain = completedStory ? 3 : 0;
  return servedGain + purrGain + quietGain + cuteGain + storyGain;
}

function getTimelinessMultiplier(serviceQualityPercent: number): number {
  if (serviceQualityPercent >= 75) return 1.35;
  if (serviceQualityPercent >= 50) return 1.18;
  if (serviceQualityPercent >= 25) return 1;
  return 0.65;
}

function getCustomerTip(customer: Customer, serviceQualityPercent: number): number {
  return Math.max(0, Math.round(customer.tip * getTimelinessMultiplier(serviceQualityPercent)));
}

function getServiceTotals(services: readonly ServiceItem[]): {
  happinessGain: number;
  reputationBonus: number;
  tipBonus: number;
} {
  return services.reduce(
    (totals, service) => ({
      happinessGain: totals.happinessGain + service.happinessGain,
      reputationBonus: totals.reputationBonus + service.reputationBonus,
      tipBonus: totals.tipBonus + service.tipBonus,
    }),
    { happinessGain: 0, reputationBonus: 0, tipBonus: 0 },
  );
}

function getCustomerTipStyleLabel(customer: Customer): string {
  const labels = Array.from(
    new Set(customer.members.map((member) => TIP_STYLE_LABELS[member.tipStyle])),
  );
  return labels.length === 1 ? (labels[0] ?? 'Steady tipper') : 'Mixed tippers';
}

function formatCooldown(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

function getStoryArc(customer: Customer): StoryChapter[] {
  return [{ title: customer.storyTitle, text: customer.story }, ...customer.followUps].slice(0, 5);
}

function getStoryArcLength(customer: Customer): number {
  return getStoryArc(customer).length;
}

function getStoryForVisit(customer: Customer, visitNumber: number): StoryChapter {
  const arc = getStoryArc(customer);
  const fallback = arc[0] ?? {
    title: `${customer.name}'s Corner`,
    text: `${customer.name} settles in again, and the familiar corner of the shop feels a little more like theirs.`,
  };
  const safeVisitNumber = Math.max(1, Math.floor(visitNumber));
  const index = clamp(safeVisitNumber - 1, 0, arc.length - 1);
  return arc[index] ?? fallback;
}

function getCustomerVisitCount(game: GameState, customerId: string): number {
  const savedCount = game.customerVisits[customerId] ?? (game.stories.includes(customerId) ? 1 : 0);
  const safeCount = Number.isFinite(savedCount) ? Math.floor(savedCount) : 0;
  const customer = CUSTOMERS.find((item) => item.id === customerId);
  if (!customer) return clamp(safeCount, 0, 999);
  return clamp(safeCount, 0, getStoryArcLength(customer));
}

function getCollectedStoryChapters(customer: Customer, game: GameState): StoryChapter[] {
  return getStoryArc(customer).slice(0, getCustomerVisitCount(game, customer.id));
}

function getStoryTalkLines(story: StoryChapter): string[] {
  const sentences =
    story.text
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map((sentence) => sentence.trim())
      .filter(Boolean) ?? [];

  if (sentences.length >= 2) return sentences.slice(0, 4);

  const words = story.text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [story.title];
  if (words.length <= 8) return [story.text];

  const lineCount = clamp(Math.ceil(words.length / 9), 2, 4);
  const wordsPerLine = Math.ceil(words.length / lineCount);

  return Array.from({ length: lineCount }, (_, index) =>
    words.slice(index * wordsPerLine, (index + 1) * wordsPerLine).join(' '),
  ).filter(Boolean);
}

function getStoryClosingLine(customer: Customer): string {
  switch (customer.id) {
    case 'shadow':
      return 'Thanks for listening. I did not expect the quiet to feel this safe.';
    case 'matthew':
      return "I can't believe I just told a cat all that, but I'm glad I did.";
    case 'liam':
      return 'Thanks for not rushing me. I know I do enough of that myself.';
    case 'alfrin':
      return 'Do not make a big thing of it, but that helped.';
    case 'alaric':
      return 'Thank you for keeping time with me.';
    case 'eli':
      return 'Thank you for listening. Somehow it feels easier to carry now.';
    case 'miles':
      return 'That felt lucky. Or maybe I just needed to say it.';
    case 'nia':
      return 'Thanks for letting the room stay quiet around that.';
    case 'gene':
      return 'Thank you. I feel like I can stop counting for a minute.';
    case 'quou':
      return 'Thanks for hearing me right.';
    case 'matthew-shadow':
      return 'Neither of us can believe we just told a cat, but apparently we did.';
    case 'liam-eli':
      return 'Thanks for listening to both versions. They finally match a little.';
    case 'alaric-eli':
      return 'You heard the soft part and stayed. That means more than I expected.';
    default:
      return 'Thanks for listening. I feel a little lighter now.';
  }
}

const DEFAULT_KITTY_CHAT: KittyChat = {
  question: 'How are you, kitty?',
  options: [
    {
      id: 1,
      label: 'Meow',
      reply: 'That sounds like a brave little yes. I am glad you are here.',
    },
    {
      id: 2,
      label: 'Meow?',
      reply: 'Same, honestly. Some days ask more questions than they answer.',
    },
  ],
};

const KITTY_CHATS: readonly KittyChat[] = [
  DEFAULT_KITTY_CHAT,
  {
    question: 'How are you, kitty?',
    options: [
      {
        id: 1,
        label: 'Meow!',
        reply: 'Oh, excellent mood. I knew this table had good energy.',
      },
      {
        id: 2,
        label: 'Meow...',
        reply: 'A long day, then. I will make the quiet part softer.',
      },
    ],
  },
  {
    question: 'How are you, kitty?',
    options: [
      {
        id: 1,
        label: 'Meow',
        reply: 'That is a perfectly reasonable answer from a professional listener.',
      },
      {
        id: 2,
        label: 'Mrrp',
        reply: 'I respect the nuance. There is clearly a whole thesis in that sound.',
      },
    ],
  },
];

function getKittyChat(customer: Customer, day: number, visitNumber: number): KittyChat {
  const seed = stringSeed(customer.id) + day * 41 + visitNumber * 19;
  const index = Math.floor(seededRandom(seed) * KITTY_CHATS.length);
  return KITTY_CHATS[index] ?? DEFAULT_KITTY_CHAT;
}

function chooseVisitConversationKind(
  customer: Customer,
  game: GameState,
  visitNumber: number,
  slot: TableSlot,
): VisitConversationKind {
  if (visitNumber > getStoryArcLength(customer)) return 'kitty';
  if (visitNumber === 1) return 'story';
  const seed =
    stringSeed(customer.id) + game.day * 59 + game.customerSlot * 7 + visitNumber * 31 + slot * 13;
  return seededRandom(seed) < 0.34 ? 'kitty' : 'story';
}

function getStoryChapterCount(game: GameState): number {
  return CUSTOMERS.reduce((total, customer) => total + getCustomerVisitCount(game, customer.id), 0);
}

function hasCustomerLogEntry(game: GameState, customer: Customer): boolean {
  const stats = getCustomerStats(game, customer.id);
  return (
    stats.visits > 0 ||
    stats.served > 0 ||
    stats.missed > 0 ||
    getCustomerVisitCount(game, customer.id) > 0
  );
}

function getCustomerLogCount(game: GameState): number {
  return CUSTOMERS.filter((customer) => hasCustomerLogEntry(game, customer)).length;
}

function getPartyLabel(customer: Customer): string {
  return customer.members.length > 1 ? `Party of ${customer.members.length}` : 'Solo guest';
}

function updateCustomerStats(
  game: GameState,
  customerId: string,
  updater: (stats: CustomerStats) => CustomerStats,
): Record<string, CustomerStats> {
  const nextStats = normalizeCustomerStats(updater(getCustomerStats(game, customerId)));
  return {
    ...game.customerStats,
    [customerId]: nextStats,
  };
}

function recordCustomerArrivals(game: GameState, customerIds: string[]): GameState {
  return customerIds.reduce(
    (nextGame, customerId) => ({
      ...nextGame,
      customerStats: updateCustomerStats(nextGame, customerId, (stats) => ({
        ...stats,
        visits: stats.visits + 1,
      })),
    }),
    game,
  );
}

function formatSignedNumber(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
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

function customerStatsRecord(
  value: unknown,
  customerVisits: Record<string, number>,
  stories: string[],
): Record<string, CustomerStats> {
  const output: Record<string, CustomerStats> = {};

  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, raw] of Object.entries(value)) {
      if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const stats = raw as Partial<CustomerStats>;
      const normalized = normalizeCustomerStats({
        visits: numericValue(stats.visits, 0),
        served: numericValue(stats.served, 0),
        missed: numericValue(stats.missed, 0),
        earned: numericValue(stats.earned, 0),
      });
      if (
        normalized.visits > 0 ||
        normalized.served > 0 ||
        normalized.missed > 0 ||
        normalized.earned > 0
      ) {
        output[key] = normalized;
      }
    }
  }

  for (const customer of CUSTOMERS) {
    const legacyVisits = customerVisits[customer.id] ?? (stories.includes(customer.id) ? 1 : 0);
    if (legacyVisits <= 0) continue;
    const stats = output[customer.id] ?? emptyCustomerStats();
    output[customer.id] = normalizeCustomerStats({
      ...stats,
      visits: Math.max(stats.visits, legacyVisits),
    });
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
  const stories = stringList(parsed.stories);
  const customerVisits = numberRecord(parsed.customerVisits);

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
      -9999,
      9999,
    ),
    stories,
    upgrades: stringList(parsed.upgrades),
    recipes: getOwnedRecipeIds(stringList(parsed.recipes)),
    customerSlot: clamp(
      Math.floor(numericValue(parsed.customerSlot, fallback.customerSlot)),
      0,
      9999,
    ),
    visitsToday: clamp(Math.floor(numericValue(parsed.visitsToday, fallback.visitsToday)), 0, 9999),
    tipsToday: clamp(Math.floor(numericValue(parsed.tipsToday, fallback.tipsToday)), 0, 9999),
    storiesToday: clamp(
      Math.floor(numericValue(parsed.storiesToday, fallback.storiesToday)),
      0,
      9999,
    ),
    missedToday: clamp(Math.floor(numericValue(parsed.missedToday, fallback.missedToday)), 0, 9999),
    customerVisits,
    customerStats: customerStatsRecord(parsed.customerStats, customerVisits, stories),
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
      rolls: clamp(Math.floor(numericValue(care.rolls, 0)), 0, 99),
      cutes: clamp(Math.floor(numericValue(care.cutes, 0)), 0, 99),
      storyTalks: clamp(Math.floor(numericValue(care.storyTalks, 0)), 0, 99),
      kittyAnswer: clamp(Math.floor(numericValue(care.kittyAnswer, 0)), 0, 2) as 0 | 1 | 2,
    };
  }
  return output;
}

function sessionArrivalTimers(value: unknown): SessionArrivalTimer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Partial<SessionArrivalTimer> => item != null && typeof item === 'object',
    )
    .map((item, index) => ({
      id: clamp(Math.floor(numericValue(item.id, index + 1)), 1, 9999),
      slot: tableSlotValue(item.slot, 0),
      remainingMs: clamp(
        Math.floor(numericValue(item.remainingMs, ARRIVAL_DELAY_MS)),
        0,
        ARRIVAL_DELAY_MS,
      ),
    }));
}

function defaultInitialState(game: GameState): InitialAppState {
  const tableCount = getTableCount(game.day, game.customerSlot);
  const seatCustomerSlots = createSeatSlots(game.customerSlot, tableCount, game);
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
    servedOrdersBySlot: {},
    serviceQualityBySlot: {},
    careBySlot: {},
    patienceBySlot: createPatienceBySlot(seatCustomerSlots),
    dayElapsedMs: 0,
    purrCooldownRemainingMs: 0,
    quietCooldownRemainingMs: 0,
    rollCooldownRemainingMs: 0,
    cuteCooldownRemainingMs: 0,
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
    const fallbackSeats = createSeatSlots(game.customerSlot, tableCount, game);
    const seatCustomerSlots = removeDuplicateSeatCustomers(
      seatSlotList(parsed.seatCustomerSlots, fallbackSeats),
    );
    const hasSeats = hasOccupiedSeats(seatCustomerSlots);
    let scene = sceneValue(parsed.scene, 'menu');
    if ((scene === 'visit' || scene === 'story') && !hasSeats) scene = 'shop';
    if (scene === 'shop' && numericValue(parsed.dayElapsedMs, 0) >= SHOP_DAY_REAL_MS) {
      scene = 'summary';
    }

    const selectedSlot = tableSlotValue(
      parsed.selectedSlot,
      chooseOccupiedSlot(seatCustomerSlots, 0),
    );
    const selectedOccupiedSlot = chooseOccupiedSlot(seatCustomerSlots, selectedSlot);
    const legacyServedSlots = tableSlotList(parsed.servedSlots).filter(
      (slot) => seatCustomerSlots[slot] != null,
    );
    const servedOrdersBySlot = normalizeServedOrdersBySlot(
      parsed.servedOrdersBySlot,
      seatCustomerSlots,
      legacyServedSlots,
    );

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
      servedSlots: fullyServedSlots(seatCustomerSlots, servedOrdersBySlot),
      servedOrdersBySlot,
      serviceQualityBySlot: normalizeServiceQualityBySlot(
        parsed.serviceQualityBySlot,
        seatCustomerSlots,
      ),
      careBySlot: visitCareRecord(parsed.careBySlot),
      patienceBySlot: normalizePatienceBySlot(
        parsed.patienceBySlot,
        seatCustomerSlots,
        selectedOccupiedSlot,
        parsed.patienceRemaining,
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
      rollCooldownRemainingMs: clamp(
        Math.floor(numericValue(parsed.rollCooldownRemainingMs, 0)),
        0,
        BASE_ROLL_COOLDOWN_MS,
      ),
      cuteCooldownRemainingMs: clamp(
        Math.floor(numericValue(parsed.cuteCooldownRemainingMs, 0)),
        0,
        BASE_CUTE_COOLDOWN_MS,
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
  const [seatCustomerSlots, setSeatCustomerSlots] = useState<Array<number | null>>(
    () => initialState.seatCustomerSlots,
  );
  const [servedSlots, setServedSlots] = useState<TableSlot[]>(initialState.servedSlots);
  const [servedOrdersBySlot, setServedOrdersBySlot] = useState<
    Partial<Record<TableSlot, number[]>>
  >(initialState.servedOrdersBySlot);
  const [serviceQualityBySlot, setServiceQualityBySlot] = useState<
    Partial<Record<TableSlot, number>>
  >(initialState.serviceQualityBySlot);
  const [careBySlot, setCareBySlot] = useState<Partial<Record<TableSlot, VisitCare>>>(
    initialState.careBySlot,
  );
  const [patienceBySlot, setPatienceBySlot] = useState<Partial<Record<TableSlot, number>>>(
    initialState.patienceBySlot,
  );
  const [dayElapsedMs, setDayElapsedMs] = useState(initialState.dayElapsedMs);
  const [actionNow, setActionNow] = useState(() => Date.now());
  const [purrReadyAt, setPurrReadyAt] = useState(
    () => Date.now() + initialState.purrCooldownRemainingMs,
  );
  const [quietReadyAt, setQuietReadyAt] = useState(
    () => Date.now() + initialState.quietCooldownRemainingMs,
  );
  const [rollReadyAt, setRollReadyAt] = useState(
    () => Date.now() + initialState.rollCooldownRemainingMs,
  );
  const [cuteReadyAt, setCuteReadyAt] = useState(
    () => Date.now() + initialState.cuteCooldownRemainingMs,
  );
  const [activeLedgerTab, setActiveLedgerTab] = useState<LedgerTab>(initialState.activeLedgerTab);
  const [adminGateOpen, setAdminGateOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [selectedAdminCharacterId, setSelectedAdminCharacterId] = useState<CharacterId>('shadow');
  const [adminLayouts, setAdminLayouts] = useState<AdminLayouts>(() => loadAdminLayouts());
  const [adminCharacterSettings, setAdminCharacterSettings] = useState<AdminCharacterSettings>(
    () => activeAdminCharacterSettings,
  );
  const [adminSaveMessage, setAdminSaveMessage] = useState('');
  const [storyToast, setStoryToast] = useState<StoryToast | null>(null);
  const [activeStoryBySlot, setActiveStoryBySlot] = useState<
    Partial<Record<TableSlot, ActiveStorySession>>
  >({});
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
  const autoCollectedStoryKeyRef = useRef('');
  const storyToastTimerRef = useRef<number | null>(null);

  const selectedOccupiedSlot = chooseOccupiedSlot(seatCustomerSlots, selectedSlot);
  const selectedCustomerSlot =
    seatCustomerSlots[selectedOccupiedSlot] ?? nextCustomerSlotRef.current;
  const currentCustomer = getCustomer(selectedCustomerSlot);
  const currentServices = getServicesForCustomer(
    selectedCustomerSlot,
    game.recipes,
    currentCustomer,
  );
  const currentService = currentServices[0] ?? getService(selectedCustomerSlot, game.recipes);
  const currentServedOrders = getServedOrderIndexes(servedOrdersBySlot, selectedOccupiedSlot);
  const serviceServed = isTableFullyServed(
    currentCustomer,
    servedOrdersBySlot,
    selectedOccupiedSlot,
  );
  const activeStorySession = activeStoryBySlot[selectedOccupiedSlot];
  const activeStoryMatchesCustomer = activeStorySession?.customerId === currentCustomer.id;
  const currentConversationKind = activeStoryMatchesCustomer ? activeStorySession.kind : 'story';
  const currentVisitNumber = activeStoryMatchesCustomer
    ? activeStorySession.visitNumber
    : getCustomerVisitCount(game, currentCustomer.id) + 1;
  const currentStory = getStoryForVisit(currentCustomer, currentVisitNumber);
  const currentStoryArcLength = getStoryArcLength(currentCustomer);
  const currentStoryChapterNumber = clamp(currentVisitNumber, 1, currentStoryArcLength);
  const currentCare = getVisitCare(careBySlot, selectedOccupiedSlot);
  const currentStoryLines = getStoryTalkLines(currentStory);
  const currentStoryLineCount = currentStoryLines.length;
  const currentStoryAlreadyCollected =
    getCustomerVisitCount(game, currentCustomer.id) >= currentVisitNumber;
  const currentStoryAvailable =
    currentConversationKind === 'story' &&
    currentVisitNumber <= currentStoryArcLength &&
    !currentStoryAlreadyCollected;
  const currentStoryInConversation =
    currentConversationKind === 'story' &&
    scene === 'visit' &&
    activeStoryMatchesCustomer &&
    currentStoryAlreadyCollected;
  const currentStoryReady =
    serviceServed &&
    currentConversationKind === 'story' &&
    (currentStoryAvailable || currentStoryInConversation);
  const currentStoryTalks = currentStoryReady
    ? clamp(currentCare.storyTalks, 0, Math.max(0, currentStoryLineCount - 1))
    : 0;
  const currentStoryProgress = currentStoryReady
    ? clamp(currentStoryTalks + 1, 1, currentStoryLineCount)
    : 0;
  const currentStoryComplete = currentStoryReady && currentStoryProgress >= currentStoryLineCount;
  const currentStoryLine = currentStoryReady
    ? (currentStoryLines[currentStoryProgress - 1] ?? '')
    : '';
  const currentStoryClosingLine = getStoryClosingLine(currentCustomer);
  const currentKittyChat = getKittyChat(currentCustomer, game.day, currentVisitNumber);
  const currentKittyAnswer = clamp(currentCare.kittyAnswer, 0, 2) as 0 | 1 | 2;
  const currentKittyReply =
    currentKittyAnswer > 0 ? (currentKittyChat.options[currentKittyAnswer - 1]?.reply ?? '') : '';
  const currentKittyChatReady = serviceServed && currentConversationKind === 'kitty';
  const visibleCustomers = useMemo(
    () =>
      TABLE_SLOTS.map((slot) => {
        const customerSlot = slot < tableCount ? (seatCustomerSlots[slot] ?? null) : null;
        return customerSlot === null ? null : getCustomer(customerSlot);
      }),
    [adminCharacterSettings, seatCustomerSlots, tableCount],
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
  const customerLogCount = getCustomerLogCount(game);
  const patiencePercent = getSeatPatiencePercent(
    patienceBySlot,
    seatCustomerSlots,
    selectedOccupiedSlot,
  );
  const patiencePercents = useMemo(
    () => getPatiencePercentsBySlot(patienceBySlot, seatCustomerSlots),
    [patienceBySlot, seatCustomerSlots],
  );
  const shopDayEnded = dayElapsedMs >= SHOP_DAY_REAL_MS;
  const clockProgress = clamp((dayElapsedMs / SHOP_DAY_REAL_MS) * 100, 0, 100);
  const shopTimeLabel = formatShopTime(clockProgress);
  const purrCooldownMs = getActionCooldown(game.upgrades, 'purr');
  const quietCooldownMs = getActionCooldown(game.upgrades, 'quiet');
  const rollCooldownMs = getActionCooldown(game.upgrades, 'roll');
  const cuteCooldownMs = getActionCooldown(game.upgrades, 'cute');
  const purrCooldownRemaining = Math.max(0, purrReadyAt - actionNow);
  const quietCooldownRemaining = Math.max(0, quietReadyAt - actionNow);
  const rollCooldownRemaining = Math.max(0, rollReadyAt - actionNow);
  const cuteCooldownRemaining = Math.max(0, cuteReadyAt - actionNow);
  const listenMoodGain =
    purrCooldownRemaining > 0 ? LISTEN_PURR_COOLDOWN_MOOD_GAIN : LISTEN_MOOD_GAIN;
  const fullMoodCareUnlocked = serviceServed && mood >= 100;
  const showTopBar = scene !== 'menu' && scene !== 'summary' && scene !== 'admin';

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
    servedOrdersBySlot,
    serviceQualityBySlot,
    careBySlot,
    patienceBySlot,
    dayElapsedMs,
    purrReadyAt,
    quietReadyAt,
    rollReadyAt,
    cuteReadyAt,
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
      if (storyToastTimerRef.current != null) window.clearTimeout(storyToastTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (scene !== 'visit') return;
    if (isPaused) return;
    if (!currentStoryComplete) return;
    if (!currentStoryAvailable) return;
    const storyKey = `${selectedOccupiedSlot}:${currentCustomer.id}:${currentVisitNumber}`;
    if (autoCollectedStoryKeyRef.current === storyKey) return;

    autoCollectedStoryKeyRef.current = storyKey;
    collectStory();
  }, [
    currentCustomer.id,
    currentStoryAvailable,
    currentStoryComplete,
    currentVisitNumber,
    isPaused,
    scene,
    selectedOccupiedSlot,
  ]);

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
    const sanitizedSeats = removeDuplicateSeatCustomers(seatCustomerSlots);
    if (!seatListsMatch(seatCustomerSlots, sanitizedSeats)) {
      const nextSelectedSlot = chooseOccupiedSlot(sanitizedSeats, selectedSlot);
      setSeatCustomerSlots(sanitizedSeats);
      setSelectedSlot(nextSelectedSlot);
      setServedOrdersBySlot((prev) => normalizeServedOrdersBySlot(prev, sanitizedSeats, []));
      setServiceQualityBySlot((prev) => normalizeServiceQualityBySlot(prev, sanitizedSeats));
      setCareBySlot((prev) => {
        const nextCare = { ...prev };
        for (const slot of TABLE_SLOTS) {
          if (sanitizedSeats[slot] == null) delete nextCare[slot];
        }
        return nextCare;
      });
      setActiveStoryBySlot((prev) => {
        const nextStories = { ...prev };
        for (const slot of TABLE_SLOTS) {
          if (sanitizedSeats[slot] == null) delete nextStories[slot];
        }
        return nextStories;
      });
      setPatienceBySlot((prev) =>
        normalizePatienceBySlot(prev, sanitizedSeats, nextSelectedSlot, undefined),
      );
      setArrivalState(hasOccupiedSeats(sanitizedSeats) ? 'ready' : 'waiting');
      return;
    }

    const nextSelectedSlot = chooseOccupiedSlot(seatCustomerSlots, selectedSlot);
    if (nextSelectedSlot !== selectedSlot) {
      setSelectedSlot(nextSelectedSlot);
    }

    const nextServedSlots = fullyServedSlots(seatCustomerSlots, servedOrdersBySlot);
    if (nextServedSlots.join(',') !== servedSlots.join(',')) {
      setServedSlots(nextServedSlots);
    }

    if (arrivalState === 'waiting' && hasSeatedCustomers) {
      setArrivalState('ready');
    }
  }, [
    arrivalState,
    hasSeatedCustomers,
    seatCustomerSlots,
    selectedSlot,
    servedOrdersBySlot,
    servedSlots,
  ]);

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
    if (!shopDayEnded) return;
    if (scene === 'shop') {
      closeShopForDay();
    } else if (scene === 'visit') {
      clearArrivalTimers();
    }
  }, [isPaused, scene, shopDayEnded]);

  useEffect(() => {
    if (skipInitialPatienceResetRef.current) {
      skipInitialPatienceResetRef.current = false;
      return;
    }

    setPatienceBySlot((prev) =>
      normalizePatienceBySlot(prev, seatCustomerSlots, selectedOccupiedSlot, undefined),
    );
  }, [seatCustomerSlots, selectedOccupiedSlot]);

  useEffect(() => {
    if (isPaused) return undefined;
    if (arrivalState !== 'ready' || !hasSeatedCustomers) return undefined;
    if (scene !== 'shop' && scene !== 'visit') return undefined;
    if (scene === 'visit' && shopDayEnded) return undefined;

    const interval = window.setInterval(() => {
      setPatienceBySlot((prev) => {
        const nextPatience = { ...prev };

        for (const slot of TABLE_SLOTS) {
          const customerSlot = seatCustomerSlots[slot];
          if (customerSlot == null) continue;

          const customer = getCustomer(customerSlot);
          const drain = isTableFullyServed(customer, servedOrdersBySlot, slot)
            ? PATIENCE_TICK_MS / SERVED_PATIENCE_SLOWDOWN
            : PATIENCE_TICK_MS;
          nextPatience[slot] = clamp(
            getSeatPatience(prev, seatCustomerSlots, slot) - drain,
            0,
            customer.patienceMs,
          );
        }

        return nextPatience;
      });
    }, PATIENCE_TICK_MS);

    return () => window.clearInterval(interval);
  }, [
    arrivalState,
    hasSeatedCustomers,
    isPaused,
    scene,
    seatCustomerSlots,
    servedOrdersBySlot,
    shopDayEnded,
  ]);

  useEffect(() => {
    if (isPaused) return;
    if (arrivalState !== 'ready' || !hasSeatedCustomers) return;
    if (scene === 'visit' && shopDayEnded) return;

    const expiredSlot = TABLE_SLOTS.find(
      (slot) =>
        seatCustomerSlots[slot] != null &&
        getSeatPatience(patienceBySlot, seatCustomerSlots, slot) <= 0,
    );
    if (expiredSlot == null) return;

    const expiredCustomerSlot = seatCustomerSlots[expiredSlot];
    if (expiredCustomerSlot == null) return;
    const expiredCustomer = getCustomer(expiredCustomerSlot);
    if (isTableFullyServed(expiredCustomer, servedOrdersBySlot, expiredSlot)) {
      servedCustomerLeaves(expiredSlot);
    } else {
      customerLeaves(expiredSlot);
    }
  }, [
    arrivalState,
    hasSeatedCustomers,
    isPaused,
    patienceBySlot,
    scene,
    seatCustomerSlots,
    servedOrdersBySlot,
    shopDayEnded,
  ]);

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
      servedOrdersBySlot: state.servedOrdersBySlot,
      serviceQualityBySlot: state.serviceQualityBySlot,
      careBySlot: state.careBySlot,
      patienceRemaining: getSeatPatience(
        state.patienceBySlot,
        state.seatCustomerSlots,
        state.selectedSlot,
      ),
      patienceBySlot: state.patienceBySlot,
      dayElapsedMs: state.dayElapsedMs,
      purrCooldownRemainingMs: Math.max(0, state.purrReadyAt - timerBase),
      quietCooldownRemainingMs: Math.max(0, state.quietReadyAt - timerBase),
      rollCooldownRemainingMs: Math.max(0, state.rollReadyAt - timerBase),
      cuteCooldownRemainingMs: Math.max(0, state.cuteReadyAt - timerBase),
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

    if ((sessionStateRef.current?.dayElapsedMs ?? dayElapsedMs) >= SHOP_DAY_REAL_MS) return;

    const arrivalIndex = nextCustomerSlotRef.current;
    const sourceGame = sessionStateRef.current?.game ?? game;
    const currentSeats = removeDuplicateSeatCustomers(
      sessionStateRef.current?.seatCustomerSlots ?? seatCustomerSlots,
    );
    const presentMemberIds = getPresentMemberIds(currentSeats);
    const arrivingCustomerIndex = chooseCustomerIndexForArrival(
      arrivalIndex,
      sourceGame,
      new Set(),
      presentMemberIds,
    );
    if (arrivingCustomerIndex < 0) {
      setArrivalState(hasOccupiedSeats(currentSeats) ? 'ready' : 'waiting');
      return;
    }

    const arrivingCustomerSlot = createCustomerToken(arrivalIndex, arrivingCustomerIndex);
    const arrivingCustomer = getCustomer(arrivingCustomerSlot);
    nextCustomerSlotRef.current += 1;

    setSeatCustomerSlots((prev) => {
      if (prev[queuedTimer.slot] != null) return prev;
      const nextSeats = [...prev];
      nextSeats[queuedTimer.slot] = arrivingCustomerSlot;
      setSelectedSlot((currentSlot) => chooseOccupiedSlot(nextSeats, currentSlot));
      return nextSeats;
    });
    setPatienceBySlot((prev) => ({
      ...prev,
      [queuedTimer.slot]: arrivingCustomer.patienceMs,
    }));
    setGame((prev) => ({
      ...prev,
      customerSlot: Math.max(prev.customerSlot, nextCustomerSlotRef.current),
      customerStats: updateCustomerStats(prev, arrivingCustomer.id, (stats) => ({
        ...stats,
        visits: stats.visits + 1,
      })),
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
    if ((sessionStateRef.current?.dayElapsedMs ?? dayElapsedMs) >= SHOP_DAY_REAL_MS) {
      clearArrivalTimers();
      return;
    }

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

  function prepareSeatsForShop(
    day: number,
    startSlot: number,
    sourceGame: GameState,
  ): { nextCustomerSlot: number; arrivedCustomerIds: string[] } {
    clearArrivalTimers();
    const nextTableCount = getTableCount(day, startSlot);
    const nextSeats = createSeatSlots(startSlot, nextTableCount, sourceGame);
    const nextCustomerSlot = startSlot + nextTableCount;
    const arrivedCustomerIds = nextSeats
      .filter((customerSlot): customerSlot is number => customerSlot != null)
      .map((customerSlot) => getCustomer(customerSlot).id);

    nextCustomerSlotRef.current = nextCustomerSlot;
    setTableCount(nextTableCount);
    setSeatCustomerSlots(nextSeats);
    setSelectedSlot(chooseOccupiedSlot(nextSeats, 0));
    setPatienceBySlot(createPatienceBySlot(nextSeats));
    setServedSlots([]);
    setServedOrdersBySlot({});
    setServiceQualityBySlot({});
    setCareBySlot({});
    setActiveStoryBySlot({});
    setArrivalState(hasOccupiedSeats(nextSeats) ? 'ready' : 'waiting');

    return { nextCustomerSlot, arrivedCustomerIds };
  }

  function vacateSeat(slot: TableSlot): boolean {
    const nextSeats = [...seatCustomerSlots];
    nextSeats[slot] = null;
    setSeatCustomerSlots(nextSeats);
    const preferredSlot = nextSeats[selectedSlot] != null ? selectedSlot : slot;
    setSelectedSlot(chooseOccupiedSlot(nextSeats, preferredSlot));
    setServedSlots((prev) => prev.filter((servedSlot) => servedSlot !== slot));
    setServedOrdersBySlot((prev) => {
      const nextOrders = { ...prev };
      delete nextOrders[slot];
      return nextOrders;
    });
    setServiceQualityBySlot((prev) => {
      const nextQuality = { ...prev };
      delete nextQuality[slot];
      return nextQuality;
    });
    setCareBySlot((prev) => {
      const nextCare = { ...prev };
      delete nextCare[slot];
      return nextCare;
    });
    setActiveStoryBySlot((prev) => {
      const nextStories = { ...prev };
      delete nextStories[slot];
      return nextStories;
    });
    setPatienceBySlot((prev) => {
      const nextPatience = { ...prev };
      delete nextPatience[slot];
      return nextPatience;
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

  function forceSpawnCustomer(customerId: string) {
    if (isPausedRef.current) return;
    const customerIndex = CUSTOMERS.findIndex((customer) => customer.id === customerId);
    if (customerIndex < 0) return;

    const existingSlot = TABLE_SLOTS.find((slot) => {
      const customerSlot = seatCustomerSlots[slot];
      return customerSlot != null && getCustomer(customerSlot).id === customerId;
    });
    if (existingSlot != null) {
      setSelectedSlot(existingSlot);
      setArrivalState('ready');
      return;
    }

    const targetSlot =
      TABLE_SLOTS.find((slot) => slot < tableCount && seatCustomerSlots[slot] == null) ??
      TABLE_SLOTS.find((slot) => seatCustomerSlots[slot] == null) ??
      selectedOccupiedSlot;
    const arrivalIndex = nextCustomerSlotRef.current;
    const forcedCustomerSlot = createCustomerToken(arrivalIndex, customerIndex);
    const forcedCustomer = getCustomer(forcedCustomerSlot);
    const forcedMemberIds = new Set(getPartyMemberIds(forcedCustomer));
    const nextTableCount = Math.max(tableCount, targetSlot + 1);
    nextCustomerSlotRef.current += 1;

    arrivalTimersRef.current = arrivalTimersRef.current.filter((timer) => {
      if (timer.slot !== targetSlot) return true;
      window.clearTimeout(timer.timeout);
      return false;
    });

    setTableCount(nextTableCount);
    setSeatCustomerSlots((prev) => {
      const nextSeats = prev.map((customerSlot) => {
        if (customerSlot == null) return null;
        const existingCustomer = getCustomer(customerSlot);
        return getPartyMemberIds(existingCustomer).some((memberId) => forcedMemberIds.has(memberId))
          ? null
          : customerSlot;
      });
      nextSeats[targetSlot] = forcedCustomerSlot;
      return nextSeats;
    });
    setSelectedSlot(targetSlot);
    setServedSlots((prev) => prev.filter((slot) => slot !== targetSlot));
    setServedOrdersBySlot((prev) => {
      const nextOrders = { ...prev };
      delete nextOrders[targetSlot];
      return nextOrders;
    });
    setServiceQualityBySlot((prev) => {
      const nextQuality = { ...prev };
      delete nextQuality[targetSlot];
      return nextQuality;
    });
    setCareBySlot((prev) => {
      const nextCare = { ...prev };
      delete nextCare[targetSlot];
      return nextCare;
    });
    setActiveStoryBySlot((prev) => {
      const nextStories = { ...prev };
      delete nextStories[targetSlot];
      return nextStories;
    });
    setPatienceBySlot((prev) => ({
      ...prev,
      [targetSlot]: forcedCustomer.patienceMs,
    }));
    setGame((prev) => ({
      ...prev,
      customerSlot: Math.max(prev.customerSlot, nextCustomerSlotRef.current),
      customerStats: updateCustomerStats(prev, forcedCustomer.id, (stats) => ({
        ...stats,
        visits: stats.visits + 1,
      })),
    }));
    setArrivalState('ready');
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
    setRollReadyAt((prev) => (prev > pausedAt ? prev + pausedMs : prev));
    setCuteReadyAt((prev) => (prev > pausedAt ? prev + pausedMs : prev));
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
    setServedOrdersBySlot({});
    setServiceQualityBySlot({});
    setCareBySlot({});
    setActiveStoryBySlot({});
    setSelectedSlot(0);
    setArrivalState('ready');
    setPatienceBySlot({});
    setMood(40);
    setPurrBeat(0);
    setPurrReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
    setScene('summary');
  }

  function finishSeatDeparture(slot: TableSlot) {
    const keepCurrentVisitOpen = scene === 'visit' && slot !== selectedOccupiedSlot;
    vacateSeat(slot);

    if (keepCurrentVisitOpen) {
      if (dayElapsedMs < SHOP_DAY_REAL_MS) queueSeatArrival(slot);
      return;
    }

    if (dayElapsedMs >= SHOP_DAY_REAL_MS) {
      closeShopForDay();
    } else {
      queueSeatArrival(slot);
      setScene('shop');
    }
  }

  function startDay() {
    clearPauseState();
    const seatPlan = prepareSeatsForShop(game.day, game.customerSlot, game);
    setGame((prev) =>
      recordCustomerArrivals(
        {
          ...prev,
          customerSlot: seatPlan.nextCustomerSlot,
          visitsToday: 0,
          tipsToday: 0,
          storiesToday: 0,
          missedToday: 0,
          reputationToday: 0,
          shopHappiness: clamp(prev.shopHappiness, 35, 100),
        },
        seatPlan.arrivedCustomerIds,
      ),
    );
    setDayElapsedMs(0);
    setMood(40);
    setPurrBeat(0);
    setPurrReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
    setScene('shop');
  }

  function continueDay() {
    clearPauseState();
    if (!hasSeatedCustomers) {
      const seatPlan = prepareSeatsForShop(game.day, game.customerSlot, game);
      setGame((prev) =>
        recordCustomerArrivals(
          { ...prev, customerSlot: seatPlan.nextCustomerSlot },
          seatPlan.arrivedCustomerIds,
        ),
      );
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
    setActiveStoryBySlot((prev) => {
      const existingStory = prev[nextSlot];
      if (existingStory?.customerId === customer.id) return prev;
      const visitNumber = getCustomerVisitCount(game, customer.id) + 1;
      return {
        ...prev,
        [nextSlot]: {
          customerId: customer.id,
          kind: chooseVisitConversationKind(customer, game, visitNumber, nextSlot),
          visitNumber,
        },
      };
    });
    setMood(
      startingMood(customer, service, isTableFullyServed(customer, servedOrdersBySlot, nextSlot)),
    );
    setPurrBeat(0);
    setActionNow(Date.now());
    setScene('visit');
  }

  function serveRequest(slot = selectedOccupiedSlot, orderIndex = 0) {
    if (isPausedRef.current) return;
    if (arrivalState !== 'ready') return;
    const nextSlot = clampTableSlot(slot, tableCount);
    const customerSlot = seatCustomerSlots[nextSlot];
    if (customerSlot == null) return;
    const targetCustomer = getCustomer(customerSlot);
    const targetOrderIndex = clamp(Math.floor(orderIndex), 0, targetCustomer.members.length - 1);
    if (isOrderServed(servedOrdersBySlot, nextSlot, targetOrderIndex)) return;
    const targetService = getService(customerSlot, game.recipes, targetOrderIndex);
    const nextServedOrders = Array.from(
      new Set([...getServedOrderIndexes(servedOrdersBySlot, nextSlot), targetOrderIndex]),
    ).sort((a, b) => a - b);
    const fullyServed = targetCustomer.members.every((_, index) =>
      nextServedOrders.includes(index),
    );
    const serviceQuality = getSeatPatiencePercent(patienceBySlot, seatCustomerSlots, nextSlot);

    setSelectedSlot(nextSlot);
    setServedOrdersBySlot((prev) => ({
      ...prev,
      [nextSlot]: nextServedOrders,
    }));
    if (fullyServed) {
      setServedSlots((prev) => (prev.includes(nextSlot) ? prev : [...prev, nextSlot]));
      setServiceQualityBySlot((prev) => ({
        ...prev,
        [nextSlot]: serviceQuality,
      }));
    }
    setPatienceBySlot((prev) => ({
      ...prev,
      [nextSlot]: Math.max(
        getSeatPatience(prev, seatCustomerSlots, nextSlot),
        targetCustomer.patienceMs * 0.65,
      ),
    }));
    if (scene === 'visit') {
      const nextMood = clamp(mood + targetService.moodBoost, 0, 100);
      setMood(nextMood);
    }
  }

  function advanceStoryTalks(care: VisitCare): number {
    if (!currentStoryReady || currentStoryComplete) return care.storyTalks;
    return clamp(care.storyTalks + 1, 0, Math.max(0, currentStoryLineCount - 1));
  }

  function purr() {
    if (isPausedRef.current) return;
    const now = Date.now();
    setActionNow(now);
    if (purrReadyAt > now) return;
    setPurrReadyAt(now + purrCooldownMs);
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      const storyTalks = advanceStoryTalks(care);
      return {
        ...prev,
        [selectedOccupiedSlot]: { ...care, purrs: care.purrs + 1, storyTalks },
      };
    });
    const catBedBoost = ownedUpgradeNames.has('cat-bed') ? 5 : 0;
    const nextMood = clamp(mood + 18 + catBedBoost, 0, 100);
    setMood(nextMood);
    setPurrBeat((prev) => prev + 1);
  }

  function sitQuietly() {
    if (isPausedRef.current) return;
    const now = Date.now();
    setActionNow(now);
    if (quietReadyAt > now) return;
    setQuietReadyAt(now + quietCooldownMs);
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      const storyTalks = advanceStoryTalks(care);
      return {
        ...prev,
        [selectedOccupiedSlot]: { ...care, quiets: care.quiets + 1, storyTalks },
      };
    });
    const purrCoolingDown = purrReadyAt > now;
    const nextMood = clamp(
      mood + (purrCoolingDown ? LISTEN_PURR_COOLDOWN_MOOD_GAIN : LISTEN_MOOD_GAIN),
      0,
      100,
    );
    setMood(nextMood);
  }

  function rollOver() {
    if (isPausedRef.current || !fullMoodCareUnlocked) return;
    const now = Date.now();
    setActionNow(now);
    if (rollReadyAt > now) return;
    setRollReadyAt(now + rollCooldownMs);
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      const storyTalks = advanceStoryTalks(care);
      return {
        ...prev,
        [selectedOccupiedSlot]: { ...care, rolls: care.rolls + 1, storyTalks },
      };
    });
    setMood((prev) => clamp(prev + ROLL_OVER_MOOD_GAIN, 0, 100));
    setPurrBeat((prev) => prev + 1);
  }

  function beCute() {
    if (isPausedRef.current || !fullMoodCareUnlocked) return;
    const now = Date.now();
    setActionNow(now);
    if (cuteReadyAt > now) return;
    setCuteReadyAt(now + cuteCooldownMs);
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      const storyTalks = advanceStoryTalks(care);
      return {
        ...prev,
        [selectedOccupiedSlot]: { ...care, cutes: care.cutes + 1, storyTalks },
      };
    });
    setMood((prev) => clamp(prev + BE_CUTE_MOOD_GAIN, 0, 100));
    setPurrBeat((prev) => prev + 1);
  }

  function answerKittyChat(answer: 1 | 2) {
    if (isPausedRef.current) return;
    if (!currentKittyChatReady || currentKittyAnswer > 0) return;
    setActionNow(Date.now());
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      if (care.kittyAnswer > 0) return prev;
      return {
        ...prev,
        [selectedOccupiedSlot]: { ...care, kittyAnswer: answer },
      };
    });
    setMood((prev) => clamp(prev + 6, 0, 100));
  }

  function showStoryAddedToast(story: StoryChapter, customer: Customer, chapterNumber: number) {
    if (storyToastTimerRef.current != null) window.clearTimeout(storyToastTimerRef.current);
    setStoryToast({
      id: Date.now(),
      customerName: customer.name,
      title: story.title,
      chapterNumber,
    });
    storyToastTimerRef.current = window.setTimeout(() => {
      setStoryToast(null);
      storyToastTimerRef.current = null;
    }, 3400);
  }

  function collectStory() {
    if (isPausedRef.current) return;
    if (!currentStoryComplete) return;
    const collectedCount = getCustomerVisitCount(game, currentCustomer.id);
    const nextCollectedCount = Math.min(collectedCount + 1, getStoryArcLength(currentCustomer));
    const gainedChapter = nextCollectedCount > collectedCount;

    if (gainedChapter) {
      showStoryAddedToast(currentStory, currentCustomer, nextCollectedCount);
    }

    setGame((prev) => {
      const previousCollectedCount = getCustomerVisitCount(prev, currentCustomer.id);
      const nextStoryCount = Math.min(
        previousCollectedCount + 1,
        getStoryArcLength(currentCustomer),
      );
      const gainedStoryChapter = nextStoryCount > previousCollectedCount;
      const hasLegacyStory = prev.stories.includes(currentCustomer.id);

      return {
        ...prev,
        stories: hasLegacyStory ? prev.stories : [...prev.stories, currentCustomer.id],
        storiesToday: gainedStoryChapter ? prev.storiesToday + 1 : prev.storiesToday,
        customerVisits: {
          ...prev.customerVisits,
          [currentCustomer.id]: nextStoryCount,
        },
      };
    });
  }

  function leaveVisit() {
    if (shopDayEnded) {
      if (serviceServed) {
        servedCustomerLeaves();
      } else {
        customerLeaves();
      }
      return;
    }

    setScene('shop');
  }

  function servedCustomerLeaves(slot = selectedOccupiedSlot) {
    const departingSlot = clampTableSlot(slot, tableCount);
    const departingCustomerSlot = seatCustomerSlots[departingSlot];
    if (departingCustomerSlot == null) return;

    const affectsCurrentVisit = scene !== 'visit' || departingSlot === selectedOccupiedSlot;
    const departingCustomer = getCustomer(departingCustomerSlot);
    const departingServices = getServicesForCustomer(
      departingCustomerSlot,
      game.recipes,
      departingCustomer,
    );
    const serviceTotals = getServiceTotals(departingServices);
    const departingService =
      departingServices[0] ?? getService(departingCustomerSlot, game.recipes);
    const customerTip = getCustomerTip(departingCustomer, serviceQualityBySlot[departingSlot] ?? 0);
    const serviceTipBonus = serviceTotals.tipBonus;
    const serviceHappinessGain = serviceTotals.happinessGain;
    const comfortTipBonus = totalComfort * 3;
    const earnedTotal = customerTip + serviceTipBonus + comfortTipBonus;
    const care = getVisitCare(careBySlot, departingSlot);
    const reputationGain = getReputationGain(departingService, true, care, false);

    setGame((prev) => ({
      ...prev,
      visitsToday: clamp(prev.visitsToday + 1, 0, 9999),
      tipsToday: prev.tipsToday + earnedTotal,
      teaCups: prev.teaCups + earnedTotal,
      reputation: prev.reputation + reputationGain,
      reputationToday: prev.reputationToday + reputationGain,
      customerStats: updateCustomerStats(prev, departingCustomer.id, (stats) => ({
        ...stats,
        served: stats.served + 1,
        earned: stats.earned + earnedTotal,
      })),
      shopHappiness: clamp(
        prev.shopHappiness + Math.ceil(departingCustomer.happinessGain / 2) + serviceHappinessGain,
        0,
        100,
      ),
    }));

    if (affectsCurrentVisit) {
      setMood(40);
      setPurrBeat(0);
    }
    finishSeatDeparture(departingSlot);
  }

  function customerLeaves(slot = selectedOccupiedSlot) {
    const departingSlot = clampTableSlot(slot, tableCount);
    const departingCustomerSlot = seatCustomerSlots[departingSlot];
    if (departingCustomerSlot == null) return;

    const affectsCurrentVisit = scene !== 'visit' || departingSlot === selectedOccupiedSlot;
    const departingCustomer = getCustomer(departingCustomerSlot);
    const partialService = isTablePartiallyServed(
      departingCustomer,
      servedOrdersBySlot,
      departingSlot,
    );
    const reputationLoss = partialService
      ? Math.ceil(MISS_REPUTATION_LOSS / 2)
      : MISS_REPUTATION_LOSS;
    setGame((prev) => ({
      ...prev,
      missedToday: prev.missedToday + 1,
      reputation: clamp(prev.reputation - reputationLoss, 0, 999_999),
      reputationToday: prev.reputationToday - reputationLoss,
      customerStats: updateCustomerStats(prev, departingCustomer.id, (stats) => ({
        ...stats,
        missed: stats.missed + 1,
      })),
      shopHappiness: clamp(prev.shopHappiness - 3, 0, 100),
    }));
    if (affectsCurrentVisit) {
      setMood(40);
      setPurrBeat(0);
    }
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
    setServedOrdersBySlot({});
    setServiceQualityBySlot({});
    setCareBySlot({});
    setActiveStoryBySlot({});
    setPatienceBySlot({});
    setArrivalState('ready');
    setSelectedSlot(0);
    setPurrReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
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
    const resetSeats = createSeatSlots(DEFAULT_GAME.customerSlot, resetTableCount, DEFAULT_GAME);
    nextCustomerSlotRef.current = DEFAULT_GAME.customerSlot + resetTableCount;
    setGame(DEFAULT_GAME);
    setTableCount(resetTableCount);
    setSeatCustomerSlots(resetSeats);
    setDayElapsedMs(0);
    setCareBySlot({});
    setActiveStoryBySlot({});
    setPatienceBySlot(createPatienceBySlot(resetSeats));
    setMood(40);
    setPurrBeat(0);
    setArrivalState('ready');
    setSelectedSlot(0);
    setServedSlots([]);
    setServedOrdersBySlot({});
    setServiceQualityBySlot({});
    setPurrReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
    setActionNow(Date.now());
    setScene('menu');
  }

  function openAdminGate() {
    setAdminPassword('');
    setAdminError('');
    setAdminGateOpen(true);
  }

  function closeAdminGate() {
    setAdminGateOpen(false);
    setAdminPassword('');
    setAdminError('');
  }

  function submitAdminPassword() {
    if (adminPassword.trim() === ADMIN_PASSWORD) {
      closeAdminGate();
      setScene('admin');
      return;
    }

    setAdminError('Wrong password');
  }

  function updateAdminLayout(
    characterId: CharacterId,
    item: AdminDragItem,
    position: AdminPosition,
  ) {
    setAdminLayouts((prev) => ({
      ...prev,
      [characterId]: {
        ...normalizeAdminLayout(prev[characterId], characterId),
        [item]: {
          x: clamp(position.x, 0, 100),
          y: clamp(position.y, 0, 100),
        },
      },
    }));
    setAdminSaveMessage('');
  }

  function resetAdminLayout(characterId: CharacterId) {
    setAdminLayouts((prev) => ({
      ...prev,
      [characterId]: {
        ...normalizeAdminLayout(prev[characterId], characterId),
        ...getDefaultAdminLayout(characterId),
        talking: normalizeAdminLayout(prev[characterId], characterId).talking,
      },
    }));
    setAdminSaveMessage('');
  }

  function updateAdminCatScale(characterId: CharacterId, scale: number) {
    setAdminLayouts((prev) => ({
      ...prev,
      [characterId]: {
        ...normalizeAdminLayout(prev[characterId], characterId),
        catScale: clamp(Math.floor(scale), 45, 250),
      },
    }));
    setAdminSaveMessage('');
  }

  function updateAdminCharacterScale(characterId: CharacterId, scale: number) {
    setAdminLayouts((prev) => ({
      ...prev,
      [characterId]: {
        ...normalizeAdminLayout(prev[characterId], characterId),
        characterScale: clamp(Math.floor(scale), 45, 250),
      },
    }));
    setAdminSaveMessage('');
  }

  function updateAdminDrinkScale(characterId: CharacterId, scale: number) {
    setAdminLayouts((prev) => ({
      ...prev,
      [characterId]: {
        ...normalizeAdminLayout(prev[characterId], characterId),
        drinkScale: clamp(Math.floor(scale), 45, 250),
      },
    }));
    setAdminSaveMessage('');
  }

  function updateAdminTalkingLayout(
    characterId: CharacterId,
    item: 'character' | 'cat' | 'bubble',
    position: AdminPosition,
  ) {
    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: {
            ...currentLayout.talking,
            [item]: {
              x: clamp(position.x, 0, 100),
              y: clamp(position.y, 0, 100),
            },
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function resetAdminTalkingLayout(characterId: CharacterId) {
    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: getDefaultAdminLayout(characterId).talking,
        },
      };
    });
    setAdminSaveMessage('');
  }

  function updateAdminTalkingScale(
    characterId: CharacterId,
    scaleKind: 'characterScale' | 'catScale',
    scale: number,
  ) {
    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: {
            ...currentLayout.talking,
            [scaleKind]: clamp(Math.floor(scale), scaleKind === 'catScale' ? 35 : 45, 250),
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function updateAdminTalkingImage(characterId: CharacterId, imageSrc: string) {
    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: {
            ...currentLayout.talking,
            imageSrc,
            enabledImageSrcs: Array.from(
              new Set([...currentLayout.talking.enabledImageSrcs, imageSrc]),
            ),
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function toggleAdminTalkingImage(characterId: CharacterId, imageSrc: string) {
    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      const enabled = currentLayout.talking.enabledImageSrcs;
      const isEnabled = enabled.includes(imageSrc);
      const nextEnabled =
        isEnabled && enabled.length > 1
          ? enabled.filter((src) => src !== imageSrc)
          : Array.from(new Set([...enabled, imageSrc]));
      const nextImageSrc = nextEnabled.includes(currentLayout.talking.imageSrc)
        ? currentLayout.talking.imageSrc
        : (nextEnabled[0] ?? imageSrc);

      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: {
            ...currentLayout.talking,
            imageSrc: nextImageSrc,
            enabledImageSrcs: nextEnabled,
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function updateAdminCharacterSettings(
    characterId: CharacterId,
    settings: CharacterAdminSettings,
  ) {
    setAdminCharacterSettings((prev) => ({
      ...prev,
      [characterId]: normalizeCharacterAdminSettings(characterId, settings),
    }));
    setAdminSaveMessage('');
  }

  function saveAdminEdits() {
    const normalizedLayouts = ADMIN_CHARACTER_IDS.reduce<AdminLayouts>((layouts, characterId) => {
      layouts[characterId] = normalizeAdminLayout(adminLayouts[characterId], characterId);
      return layouts;
    }, {});
    const normalizedSettings = normalizeAdminCharacterSettings(adminCharacterSettings);

    saveAdminLayouts(normalizedLayouts);
    saveAdminCharacterSettings(normalizedSettings);
    setActiveAdminCharacterSettings(normalizedSettings);
    setAdminLayouts(normalizedLayouts);
    setAdminCharacterSettings(normalizedSettings);
    setPatienceBySlot((prev) =>
      normalizePatienceBySlot(prev, seatCustomerSlots, selectedOccupiedSlot, undefined),
    );
    setAdminSaveMessage('Saved');
  }

  return (
    <div className="tea-app" style={{ paddingTop: safeArea.top, paddingBottom: safeArea.bottom }}>
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
            onAdmin={openAdminGate}
            onReset={resetSave}
          />
        ) : null}

        {scene === 'shop' ? (
          <ShopScreen
            adminLayouts={adminLayouts}
            customers={visibleCustomers}
            seatCustomerSlots={seatCustomerSlots}
            recipes={game.recipes}
            tableCount={tableCount}
            arrivalState={arrivalState}
            selectedSlot={selectedOccupiedSlot}
            activeService={currentService}
            servedSlots={servedSlots}
            servedOrdersBySlot={servedOrdersBySlot}
            patiencePercents={patiencePercents}
            clockProgress={clockProgress}
            onServe={serveRequest}
            onVisit={beginVisit}
            onStories={() => setScene('collection')}
            customerLogCount={customerLogCount}
            forceSpawnCustomers={CUSTOMERS}
            onForceSpawn={forceSpawnCustomer}
          />
        ) : null}

        {scene === 'visit' ? (
          <VisitScreen
            customer={currentCustomer}
            services={currentServices}
            servedOrderIndexes={currentServedOrders}
            serviceServed={serviceServed}
            patiencePercent={patiencePercent}
            mood={mood}
            purrBeat={purrBeat}
            purrCooldownRemaining={purrCooldownRemaining}
            quietCooldownRemaining={quietCooldownRemaining}
            rollCooldownRemaining={rollCooldownRemaining}
            cuteCooldownRemaining={cuteCooldownRemaining}
            fullMoodCareUnlocked={fullMoodCareUnlocked}
            storyReady={currentStoryReady}
            storyComplete={currentStoryComplete}
            storyProgress={currentStoryProgress}
            storyLineCount={currentStoryLineCount}
            nextStoryTitle={currentStory.title}
            storyLine={currentStoryLine}
            storyClosingLine={currentStoryClosingLine}
            kittyChatReady={currentKittyChatReady}
            kittyQuestion={currentKittyChat.question}
            kittyOptions={currentKittyChat.options}
            kittyAnswer={currentKittyAnswer}
            kittyReply={currentKittyReply}
            listenMoodGain={listenMoodGain}
            layout={getCustomerAdminLayout(currentCustomer, adminLayouts)}
            onServe={serveRequest}
            onPurr={purr}
            onQuiet={sitQuietly}
            onRollOver={rollOver}
            onBeCute={beCute}
            onKittyAnswer={answerKittyChat}
            onBack={leaveVisit}
            shopDayEnded={shopDayEnded}
          />
        ) : null}

        {scene === 'story' ? (
          <StoryScreen
            customer={currentCustomer}
            story={currentStory}
            chapterNumber={currentStoryChapterNumber}
            chapterTotal={currentStoryArcLength}
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

        {scene === 'admin' ? (
          <AdminScreen
            characterSettings={adminCharacterSettings}
            layouts={adminLayouts}
            saveMessage={adminSaveMessage}
            selectedCharacterId={selectedAdminCharacterId}
            onBack={() => setScene('menu')}
            onCatScaleChange={updateAdminCatScale}
            onCharacterScaleChange={updateAdminCharacterScale}
            onCharacterSettingsChange={updateAdminCharacterSettings}
            onDrinkScaleChange={updateAdminDrinkScale}
            onLayoutChange={updateAdminLayout}
            onResetLayout={resetAdminLayout}
            onResetTalkingLayout={resetAdminTalkingLayout}
            onSave={saveAdminEdits}
            onSelectCharacter={(characterId) => {
              setSelectedAdminCharacterId(characterId);
              setAdminSaveMessage('');
            }}
            onTalkingImageChange={updateAdminTalkingImage}
            onTalkingImageToggle={toggleAdminTalkingImage}
            onTalkingLayoutChange={updateAdminTalkingLayout}
            onTalkingScaleChange={updateAdminTalkingScale}
          />
        ) : null}

        {adminGateOpen ? (
          <AdminPasswordDialog
            error={adminError}
            password={adminPassword}
            onCancel={closeAdminGate}
            onChange={(value) => {
              setAdminPassword(value);
              setAdminError('');
            }}
            onSubmit={submitAdminPassword}
          />
        ) : null}

        {storyToast ? <StoryAddedToast toast={storyToast} /> : null}

        {isPaused ? (
          <PauseOverlay game={game} shopTimeLabel={shopTimeLabel} onResume={resumeGame} />
        ) : null}
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
          <span>
            Day {Math.min(game.day, YEAR_LENGTH_DAYS)}/{YEAR_LENGTH_DAYS}
          </span>
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
        <IconButton label="Guest Log" onClick={onStories}>
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
        <p>
          Day {Math.min(game.day, YEAR_LENGTH_DAYS)} at {shopTimeLabel}
        </p>
        <button className="primary-button" type="button" onClick={onResume}>
          <PawIcon />
          Resume
        </button>
      </section>
    </div>
  );
}

interface StoryAddedToastProps {
  toast: StoryToast;
}

function StoryAddedToast({ toast }: StoryAddedToastProps) {
  return (
    <div className="story-toast" role="status" aria-live="polite" key={toast.id}>
      <BookIcon />
      <div>
        <strong>New story added</strong>
        <span>
          {toast.customerName}: {toast.title}
        </span>
        <small>Chapter {toast.chapterNumber}</small>
      </div>
    </div>
  );
}

interface MenuScreenProps {
  game: GameState;
  onStart: () => void;
  onContinue: () => void;
  onStories: () => void;
  onUpgrades: () => void;
  onAdmin: () => void;
  onReset: () => void;
}

function MenuScreen({
  game,
  onStart,
  onContinue,
  onStories,
  onUpgrades,
  onAdmin,
  onReset,
}: MenuScreenProps) {
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
            Guest Log
          </button>
          <button className="paper-button" type="button" onClick={onAdmin}>
            <GearIcon />
            Admin
          </button>
          <button className="quiet-button" type="button" onClick={onReset}>
            Reset Save
          </button>
        </div>
      </section>
    </main>
  );
}

interface AdminPasswordDialogProps {
  error: string;
  password: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

function AdminPasswordDialog({
  error,
  password,
  onCancel,
  onChange,
  onSubmit,
}: AdminPasswordDialogProps) {
  return (
    <div
      className="admin-password-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Admin password"
    >
      <form
        className="admin-password-dialog"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <GearIcon />
        <h2>Admin Mode</h2>
        <label htmlFor="admin-password">Password</label>
        <input
          autoFocus
          id="admin-password"
          inputMode="numeric"
          type="password"
          value={password}
          onChange={(event) => onChange(event.target.value)}
        />
        {error ? <p className="admin-error">{error}</p> : null}
        <div className="admin-password-actions">
          <button className="paper-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Open
          </button>
        </div>
      </form>
    </div>
  );
}

interface AdminScreenProps {
  characterSettings: AdminCharacterSettings;
  layouts: AdminLayouts;
  saveMessage: string;
  selectedCharacterId: CharacterId;
  onBack: () => void;
  onCatScaleChange: (characterId: CharacterId, scale: number) => void;
  onCharacterScaleChange: (characterId: CharacterId, scale: number) => void;
  onCharacterSettingsChange: (characterId: CharacterId, settings: CharacterAdminSettings) => void;
  onDrinkScaleChange: (characterId: CharacterId, scale: number) => void;
  onLayoutChange: (characterId: CharacterId, item: AdminDragItem, position: AdminPosition) => void;
  onResetLayout: (characterId: CharacterId) => void;
  onResetTalkingLayout: (characterId: CharacterId) => void;
  onSave: () => void;
  onSelectCharacter: (characterId: CharacterId) => void;
  onTalkingImageChange: (characterId: CharacterId, imageSrc: string) => void;
  onTalkingImageToggle: (characterId: CharacterId, imageSrc: string) => void;
  onTalkingLayoutChange: (
    characterId: CharacterId,
    item: 'character' | 'cat' | 'bubble',
    position: AdminPosition,
  ) => void;
  onTalkingScaleChange: (
    characterId: CharacterId,
    scaleKind: 'characterScale' | 'catScale',
    scale: number,
  ) => void;
}

function AdminScreen({
  characterSettings,
  layouts,
  saveMessage,
  selectedCharacterId,
  onBack,
  onCatScaleChange,
  onCharacterScaleChange,
  onCharacterSettingsChange,
  onDrinkScaleChange,
  onLayoutChange,
  onResetLayout,
  onResetTalkingLayout,
  onSave,
  onSelectCharacter,
  onTalkingImageChange,
  onTalkingImageToggle,
  onTalkingLayoutChange,
  onTalkingScaleChange,
}: AdminScreenProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [dragItem, setDragItem] = useState<AdminDragItem | null>(null);
  const [previewMode, setPreviewMode] = useState<AdminPreviewMode>('shop');
  const selectedCharacter = getEditableCharacterProfile(selectedCharacterId, characterSettings);
  const selectedSettings = normalizeCharacterAdminSettings(
    selectedCharacterId,
    characterSettings[selectedCharacterId] ?? defaultCharacterAdminSettings(selectedCharacter),
  );
  const selectedLayout = normalizeAdminLayout(layouts[selectedCharacterId], selectedCharacterId);
  const selectedTalkingLayout = selectedLayout.talking;
  const talkingPoses = getCharacterTalkingPoses(selectedCharacterId);
  const activeTalkingImage =
    selectedTalkingLayout.imageSrc || getDefaultTalkingImageSrc(selectedCharacterId);
  const selectedPortrait = selectedSettings.portrait;
  const patienceSeconds = Math.round(selectedSettings.patienceMs / 1000);
  const resetButtonLabel = previewMode === 'talking' ? 'Reset Talking' : 'Reset Store';

  function dragStyle(item: AdminDragItem): CSSProperties {
    const position = selectedLayout[item] ?? DEFAULT_ADMIN_LAYOUT[item];
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
    };
  }

  function catDragStyle(): CSSProperties {
    return {
      ...dragStyle('cat'),
      '--cat-scale': selectedLayout.catScale / 100,
    } as CSSProperties;
  }

  function storeCharacterStyle(): CSSProperties {
    return {
      ...dragStyle('character'),
      '--store-character-scale': selectedLayout.characterScale / 100,
    } as CSSProperties;
  }

  function drinkDragStyle(): CSSProperties {
    return {
      ...dragStyle('drink'),
      '--drink-scale': selectedLayout.drinkScale / 100,
    } as CSSProperties;
  }

  function talkingDragStyle(item: 'character' | 'cat' | 'bubble'): CSSProperties {
    const position = selectedTalkingLayout[item] ?? DEFAULT_ADMIN_LAYOUT.talking[item];
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
    };
  }

  function talkingCharacterStyle(): CSSProperties {
    return {
      ...talkingDragStyle('character'),
      '--talking-character-scale': selectedTalkingLayout.characterScale / 100,
    } as CSSProperties;
  }

  function talkingCatStyle(): CSSProperties {
    return {
      ...talkingDragStyle('cat'),
      '--cat-scale': selectedTalkingLayout.catScale / 100,
    } as CSSProperties;
  }

  function portraitPreviewStyle(): CSSProperties {
    return {
      objectPosition: `${selectedPortrait.x}% ${selectedPortrait.y}%`,
      transform: `scale(${selectedPortrait.scale / 100})`,
      transformOrigin: `${selectedPortrait.x}% ${selectedPortrait.y}%`,
    };
  }

  function updateSettings(patch: Partial<CharacterAdminSettings>) {
    onCharacterSettingsChange(selectedCharacterId, {
      ...selectedSettings,
      ...patch,
    });
  }

  function updatePortrait(patch: Partial<CharacterPortraitSettings>) {
    updateSettings({
      portrait: {
        ...selectedPortrait,
        ...patch,
      },
    });
  }

  function getStagePosition(
    event: ReactPointerEvent<HTMLDivElement>,
    item: AdminDragItem,
  ): AdminPosition | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const minY = item === 'bubble' ? 2 : 6;

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, minY, 94),
    };
  }

  function beginDrag(item: AdminDragItem, event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragItem(item);
    const position = getStagePosition(event, item);
    if (!position) return;
    if (
      previewMode === 'talking' &&
      (item === 'character' || item === 'cat' || item === 'bubble')
    ) {
      onTalkingLayoutChange(selectedCharacterId, item, position);
      return;
    }
    onLayoutChange(selectedCharacterId, item, position);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragItem) return;
    const position = getStagePosition(event, dragItem);
    if (!position) return;
    if (
      previewMode === 'talking' &&
      (dragItem === 'character' || dragItem === 'cat' || dragItem === 'bubble')
    ) {
      onTalkingLayoutChange(selectedCharacterId, dragItem, position);
      return;
    }
    onLayoutChange(selectedCharacterId, dragItem, position);
  }

  function stopDrag() {
    setDragItem(null);
  }

  return (
    <main className="admin-screen">
      <section className="admin-workbench" aria-label="Admin character layout editor">
        <header className="admin-toolbar">
          <div>
            <p className="eyebrow">Admin mode</p>
            <h1>{selectedCharacter.name}</h1>
          </div>
          <div className="admin-toolbar-actions">
            {saveMessage ? <span className="admin-save-message">{saveMessage}</span> : null}
            <button className="primary-button" type="button" onClick={onSave}>
              <CheckIcon />
              Save
            </button>
            {previewMode !== 'settings' ? (
              <button
                className="paper-button"
                type="button"
                onClick={() =>
                  previewMode === 'talking'
                    ? onResetTalkingLayout(selectedCharacterId)
                    : onResetLayout(selectedCharacterId)
                }
              >
                {resetButtonLabel}
              </button>
            ) : null}
            <button className="paper-button" type="button" onClick={onBack}>
              Back
            </button>
          </div>
        </header>
        <div className="admin-view-tabs" aria-label="Admin preview mode" role="tablist">
          <button
            aria-selected={previewMode === 'shop'}
            className={previewMode === 'shop' ? 'active' : ''}
            onClick={() => setPreviewMode('shop')}
            role="tab"
            type="button"
          >
            Store View
          </button>
          <button
            aria-selected={previewMode === 'talking'}
            className={previewMode === 'talking' ? 'active' : ''}
            onClick={() => setPreviewMode('talking')}
            role="tab"
            type="button"
          >
            Talking View
          </button>
          <button
            aria-selected={previewMode === 'settings'}
            className={previewMode === 'settings' ? 'active' : ''}
            onClick={() => setPreviewMode('settings')}
            role="tab"
            type="button"
          >
            Character Settings
          </button>
        </div>

        <div
          className={`admin-stage ${
            previewMode === 'talking'
              ? 'admin-visit-stage admin-talking-stage'
              : previewMode === 'settings'
                ? 'admin-settings-stage'
                : 'admin-shop-stage'
          }`}
          ref={stageRef}
          onPointerCancel={stopDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
        >
          {previewMode === 'shop' ? (
            <>
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
              <div
                aria-label="Move table"
                className="admin-draggable admin-table-prop admin-store-table"
                role="button"
                tabIndex={0}
                style={dragStyle('table')}
                onPointerDown={(event) => beginDrag('table', event)}
              />

              <div
                aria-label={`Move ${selectedCharacter.name}`}
                className="admin-draggable admin-store-character-prop"
                role="button"
                tabIndex={0}
                style={storeCharacterStyle()}
                onPointerDown={(event) => beginDrag('character', event)}
              >
                {activeTalkingImage ? (
                  <img alt="" draggable={false} src={activeTalkingImage} />
                ) : selectedCharacter.imageSrc ? (
                  <img
                    alt=""
                    className="character-image"
                    draggable={false}
                    src={selectedCharacter.imageSrc}
                  />
                ) : (
                  <CharacterBust member={selectedCharacter} index={0} total={1} />
                )}
              </div>

              <div
                aria-label="Move drink"
                className="admin-draggable admin-drink-prop"
                role="button"
                tabIndex={0}
                style={drinkDragStyle()}
                onPointerDown={(event) => beginDrag('drink', event)}
              >
                <ServiceIcon kind="blackTea" />
              </div>
              <div
                aria-label="Move order marker"
                className="admin-draggable admin-order-prop service-request"
                role="button"
                tabIndex={0}
                style={dragStyle('order')}
                onPointerDown={(event) => beginDrag('order', event)}
              >
                <ServiceIcon kind="blackTea" />
                <span>{selectedCharacter.name}</span>
              </div>
            </>
          ) : previewMode === 'talking' ? (
            <>
              <div className="visit-backdrop">
                <Shelf className="visit-shelf" />
                <div className="visit-lamp" />
              </div>
              <div
                aria-label={`Move ${selectedCharacter.name} talking image`}
                className="admin-draggable admin-talking-character-prop"
                role="button"
                tabIndex={0}
                style={talkingCharacterStyle()}
                onPointerDown={(event) => beginDrag('character', event)}
              >
                {activeTalkingImage ? (
                  <img alt="" draggable={false} src={activeTalkingImage} />
                ) : (
                  <CharacterBust member={selectedCharacter} index={0} total={1} />
                )}
              </div>
            </>
          ) : (
            <div className="admin-settings-preview">
              <div className="admin-portrait-preview-frame">
                {selectedPortrait.imageSrc ? (
                  <img
                    alt=""
                    draggable={false}
                    src={selectedPortrait.imageSrc}
                    style={portraitPreviewStyle()}
                  />
                ) : (
                  <AnimalAvatar
                    customer={characterPreviewCustomer(selectedCharacter)}
                    size="portrait"
                  />
                )}
              </div>
              <div>
                <p className="eyebrow">Character Settings</p>
                <h2>{selectedCharacter.name}</h2>
                <span>{TIP_STYLE_LABELS[selectedSettings.tipStyle]}</span>
              </div>
            </div>
          )}

          {previewMode === 'talking' ? (
            <div
              aria-label="Move word bubble"
              className="admin-draggable admin-bubble-prop customer-story-bubble"
              role="button"
              tabIndex={0}
              style={talkingDragStyle('bubble')}
              onPointerDown={(event) => beginDrag('bubble', event)}
            >
              <div className="story-bubble-head">
                <strong>{selectedCharacter.name}'s Story</strong>
                <span className="story-bubble-count">Bubble 1/3</span>
              </div>
              <span className="story-bubble-line">
                I cannot believe I just told a cat that much.
              </span>
            </div>
          ) : null}

          {previewMode !== 'settings' ? (
            <div
              aria-label="Move cat"
              className="admin-draggable admin-cat-prop"
              role="button"
              tabIndex={0}
              style={previewMode === 'talking' ? talkingCatStyle() : catDragStyle()}
              onPointerDown={(event) => beginDrag('cat', event)}
            >
              <div className="heart-bubble visit-heart">
                <HeartIcon />
              </div>
              <CatSprite resting />
            </div>
          ) : null}

          {previewMode === 'talking' ? (
            <div className="mood-panel admin-preview-panel">
              <div className="visit-meta-row">
                <span>Waiting on order</span>
                <button className="leave-customer-button" type="button">
                  <ShopIcon />
                  Leave Customer
                </button>
              </div>
              <div className="meter-label">
                <span>{selectedCharacter.name}'s Mood</span>
                <strong>37%</strong>
              </div>
              <Meter value={37} label={`${selectedCharacter.name} preview mood`} />
              <div className="patience-panel">
                <span>Patience</span>
                <Meter value={68} label={`${selectedCharacter.name} preview patience`} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="admin-gallery" aria-label="Character gallery">
        <h2>Gallery</h2>
        <div className="admin-gallery-list">
          {ADMIN_CHARACTER_IDS.map((characterId) => {
            const character = getEditableCharacterProfile(characterId, characterSettings);
            return (
              <button
                className={`admin-gallery-card ${
                  selectedCharacterId === characterId ? 'active' : ''
                }`}
                key={characterId}
                type="button"
                onClick={() => onSelectCharacter(characterId)}
              >
                <span className="admin-gallery-avatar" aria-hidden="true">
                  <AnimalAvatar customer={characterPreviewCustomer(character)} size="small" />
                </span>
                <span>
                  <strong>{character.name}</strong>
                  <small>{TIP_STYLE_LABELS[character.tipStyle]}</small>
                </span>
              </button>
            );
          })}
        </div>
        <section className="admin-edit-card" aria-label={`${selectedCharacter.name} settings`}>
          {previewMode === 'shop' ? (
            <>
              <h3>Store Options</h3>
              <label>
                <span>Store image</span>
                <input
                  min={45}
                  max={250}
                  type="range"
                  value={selectedLayout.characterScale}
                  onInput={(event) =>
                    onCharacterScaleChange(selectedCharacterId, Number(event.currentTarget.value))
                  }
                  onChange={(event) =>
                    onCharacterScaleChange(selectedCharacterId, Number(event.target.value))
                  }
                />
                <small>{selectedLayout.characterScale}%</small>
              </label>
              <label>
                <span>Store cat</span>
                <input
                  min={45}
                  max={250}
                  type="range"
                  value={selectedLayout.catScale}
                  onInput={(event) =>
                    onCatScaleChange(selectedCharacterId, Number(event.currentTarget.value))
                  }
                  onChange={(event) =>
                    onCatScaleChange(selectedCharacterId, Number(event.target.value))
                  }
                />
                <small>{selectedLayout.catScale}%</small>
              </label>
              <label>
                <span>Store drink</span>
                <input
                  min={45}
                  max={250}
                  type="range"
                  value={selectedLayout.drinkScale}
                  onInput={(event) =>
                    onDrinkScaleChange(selectedCharacterId, Number(event.currentTarget.value))
                  }
                  onChange={(event) =>
                    onDrinkScaleChange(selectedCharacterId, Number(event.target.value))
                  }
                />
                <small>{selectedLayout.drinkScale}%</small>
              </label>
            </>
          ) : null}

          {previewMode === 'talking' ? (
            <>
              <h3>Talking Options</h3>
              <label>
                <span>Talking scale</span>
                <input
                  min={45}
                  max={250}
                  type="range"
                  value={selectedTalkingLayout.characterScale}
                  onInput={(event) =>
                    onTalkingScaleChange(
                      selectedCharacterId,
                      'characterScale',
                      Number(event.currentTarget.value),
                    )
                  }
                  onChange={(event) =>
                    onTalkingScaleChange(
                      selectedCharacterId,
                      'characterScale',
                      Number(event.target.value),
                    )
                  }
                />
                <small>{selectedTalkingLayout.characterScale}%</small>
              </label>
              <label>
                <span>Talk cat</span>
                <input
                  min={35}
                  max={250}
                  type="range"
                  value={selectedTalkingLayout.catScale}
                  onInput={(event) =>
                    onTalkingScaleChange(
                      selectedCharacterId,
                      'catScale',
                      Number(event.currentTarget.value),
                    )
                  }
                  onChange={(event) =>
                    onTalkingScaleChange(
                      selectedCharacterId,
                      'catScale',
                      Number(event.target.value),
                    )
                  }
                />
                <small>{selectedTalkingLayout.catScale}%</small>
              </label>
              <div className="admin-pose-editor">
                <span>Talking poses</span>
                {talkingPoses.length > 0 ? (
                  <div className="admin-pose-grid">
                    {talkingPoses.map((pose) => {
                      const enabled = selectedTalkingLayout.enabledImageSrcs.includes(pose.src);
                      const active = activeTalkingImage === pose.src;

                      return (
                        <div className={`admin-pose-card ${active ? 'active' : ''}`} key={pose.id}>
                          <button
                            type="button"
                            onClick={() => onTalkingImageChange(selectedCharacterId, pose.src)}
                          >
                            <img alt="" draggable={false} src={pose.src} />
                            <strong>{pose.label}</strong>
                          </button>
                          <label>
                            <input
                              checked={enabled}
                              type="checkbox"
                              onChange={() => onTalkingImageToggle(selectedCharacterId, pose.src)}
                            />
                            <span>Use</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <small>No talking images yet.</small>
                )}
              </div>
            </>
          ) : null}

          {previewMode === 'settings' ? (
            <>
              <h3>Character Settings</h3>
              <div className="admin-portrait-editor">
                <span>Character picture</span>
                {talkingPoses.length > 0 ? (
                  <div className="admin-portrait-grid">
                    {talkingPoses.map((pose) => {
                      const active = selectedPortrait.imageSrc === pose.src;

                      return (
                        <button
                          className={active ? 'active' : ''}
                          key={pose.id}
                          type="button"
                          onClick={() => updatePortrait({ imageSrc: pose.src })}
                        >
                          <img alt="" draggable={false} src={pose.src} />
                          <strong>{pose.label}</strong>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <small>No character pictures yet.</small>
                )}
              </div>
              {selectedPortrait.imageSrc ? (
                <>
                  <label>
                    <span>Portrait zoom</span>
                    <input
                      min={50}
                      max={250}
                      type="range"
                      value={selectedPortrait.scale}
                      onInput={(event) =>
                        updatePortrait({ scale: Number(event.currentTarget.value) })
                      }
                      onChange={(event) => updatePortrait({ scale: Number(event.target.value) })}
                    />
                    <small>{selectedPortrait.scale}%</small>
                  </label>
                  <label>
                    <span>View X</span>
                    <input
                      min={0}
                      max={100}
                      type="range"
                      value={selectedPortrait.x}
                      onInput={(event) => updatePortrait({ x: Number(event.currentTarget.value) })}
                      onChange={(event) => updatePortrait({ x: Number(event.target.value) })}
                    />
                    <small>{selectedPortrait.x}%</small>
                  </label>
                  <label>
                    <span>View Y</span>
                    <input
                      min={0}
                      max={100}
                      type="range"
                      value={selectedPortrait.y}
                      onInput={(event) => updatePortrait({ y: Number(event.currentTarget.value) })}
                      onChange={(event) => updatePortrait({ y: Number(event.target.value) })}
                    />
                    <small>{selectedPortrait.y}%</small>
                  </label>
                </>
              ) : null}
              <label>
                <span>Tip style</span>
                <select
                  value={selectedSettings.tipStyle}
                  onChange={(event) =>
                    updateSettings({
                      tipStyle: tipStyleValue(event.target.value, selectedSettings.tipStyle),
                    })
                  }
                >
                  {(['poor', 'steady', 'good', 'high'] as const).map((style) => (
                    <option key={style} value={style}>
                      {TIP_STYLE_LABELS[style]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Base tip</span>
                <input
                  min={0}
                  max={999}
                  type="number"
                  value={selectedSettings.tipBase}
                  onChange={(event) => updateSettings({ tipBase: Number(event.target.value) })}
                />
              </label>
              <label>
                <span>Patience</span>
                <input
                  min={5}
                  max={120}
                  type="number"
                  value={patienceSeconds}
                  onChange={(event) =>
                    updateSettings({ patienceMs: Math.round(Number(event.target.value) * 1000) })
                  }
                />
                <small>seconds</small>
              </label>
            </>
          ) : null}
        </section>
      </aside>
    </main>
  );
}

interface ShopScreenProps {
  adminLayouts: AdminLayouts;
  customers: Array<Customer | null>;
  forceSpawnCustomers: readonly Customer[];
  seatCustomerSlots: Array<number | null>;
  recipes: string[];
  tableCount: number;
  arrivalState: ArrivalState;
  selectedSlot: TableSlot;
  activeService: ServiceItem;
  servedSlots: TableSlot[];
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>;
  patiencePercents: Partial<Record<TableSlot, number>>;
  clockProgress: number;
  onServe: (slot?: TableSlot, orderIndex?: number) => void;
  onVisit: (slot?: TableSlot) => void;
  onForceSpawn: (customerId: string) => void;
  onStories: () => void;
  customerLogCount: number;
}

function ShopScreen({
  adminLayouts,
  customers,
  forceSpawnCustomers,
  seatCustomerSlots,
  recipes,
  tableCount,
  arrivalState,
  selectedSlot,
  activeService,
  servedSlots,
  servedOrdersBySlot,
  patiencePercents,
  clockProgress,
  onServe,
  onVisit,
  onForceSpawn,
  onStories,
  customerLogCount,
}: ShopScreenProps) {
  function livePositionStyle(position: AdminPosition, scale = 1): CSSProperties {
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
      transform: `translate(-50%, -50%)${scale === 1 ? '' : ` scale(${scale})`}`,
    };
  }

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
            slot === selectedSlot || customerSlot === null
              ? activeService
              : getService(customerSlot, recipes);
          const services =
            customerSlot == null || !customer
              ? [service]
              : getServicesForCustomer(customerSlot, recipes, customer);
          const seatServed = customer
            ? isTableFullyServed(customer, servedOrdersBySlot, slot)
            : servedSlots.includes(slot);
          const seatPatiencePercent = patiencePercents[slot] ?? 100;
          const adminLayout = customer ? getCustomerAdminLayout(customer, adminLayouts) : null;
          const storeImageSrc =
            customer && adminLayout ? getCustomerStoreImageSrc(customer, adminLayout) : '';

          if (isOccupied && customer && adminLayout && storeImageSrc) {
            const patienceStyle = livePositionStyle({
              x: adminLayout.order.x,
              y: clamp(adminLayout.order.y - 7, 3, 92),
            });

            return (
              <div
                className={`live-store-layout live-store-layout-${slot + 1} ${
                  isActive ? 'active' : ''
                }`}
                key={slot}
              >
                <span
                  className="tea-table live-store-table"
                  style={livePositionStyle(adminLayout.table)}
                >
                  {seatServed ? <ServiceIcon kind={service.id} /> : null}
                </span>
                <button
                  className="live-store-character"
                  onClick={() => onVisit(slot)}
                  type="button"
                  aria-label={`Sit with ${customer.name}`}
                  style={livePositionStyle(adminLayout.character, adminLayout.characterScale / 100)}
                >
                  <img alt="" draggable={false} src={storeImageSrc} />
                </button>
                <div
                  className="service-request-stack live-store-orders"
                  style={livePositionStyle(adminLayout.order)}
                >
                  {services.map((tableService, orderIndex) => {
                    const orderServed = isOrderServed(servedOrdersBySlot, slot, orderIndex);
                    const member = customer.members[orderIndex];
                    const labelName = member?.name ?? customer.name;

                    return (
                      <button
                        className="service-request"
                        disabled={arrivalState !== 'ready' || orderServed}
                        onClick={() => onServe(slot, orderIndex)}
                        type="button"
                        aria-label={`Serve ${tableService.label} to ${labelName}`}
                        title={`Serve ${tableService.label} to ${labelName}`}
                        key={`${customer.id}-${orderIndex}`}
                      >
                        {orderServed ? <CheckIcon /> : <ServiceIcon kind={tableService.id} />}
                        <span>{orderServed ? 'Served' : labelName}</span>
                      </button>
                    );
                  })}
                </div>
                <div
                  className={`patience-strip live-store-patience ${seatServed ? 'served' : ''}`}
                  aria-label={`${customer.name} patience`}
                  title={`${customer.name} patience`}
                  style={patienceStyle}
                >
                  <span style={{ width: `${clamp(seatPatiencePercent, 0, 100)}%` }} />
                </div>
                {seatServed ? (
                  <span
                    className="live-store-drink"
                    style={livePositionStyle(adminLayout.drink, adminLayout.drinkScale / 100)}
                  >
                    <ServiceIcon kind={service.id} />
                  </span>
                ) : null}
              </div>
            );
          }

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
                  <div className="service-request-stack">
                    {services.map((tableService, orderIndex) => {
                      const orderServed = isOrderServed(servedOrdersBySlot, slot, orderIndex);
                      const member = customer.members[orderIndex];
                      const labelName = member?.name ?? customer.name;

                      return (
                        <button
                          className="service-request"
                          disabled={arrivalState !== 'ready' || orderServed}
                          onClick={() => onServe(slot, orderIndex)}
                          type="button"
                          aria-label={`Serve ${tableService.label} to ${labelName}`}
                          title={`Serve ${tableService.label} to ${labelName}`}
                          key={`${customer.id}-${orderIndex}`}
                        >
                          {orderServed ? <CheckIcon /> : <ServiceIcon kind={tableService.id} />}
                          <span>{orderServed ? 'Served' : labelName}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className={`patience-strip ${seatServed ? 'served' : ''}`}
                    aria-label={`${customer.name} patience`}
                    title={`${customer.name} patience`}
                  >
                    <span style={{ width: `${clamp(seatPatiencePercent, 0, 100)}%` }} />
                  </div>
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
          className="story-bag"
          type="button"
          onClick={onStories}
          aria-label={`Guest log, ${customerLogCount} parties met`}
        >
          <BookIcon />
          <span>{customerLogCount}</span>
        </button>
      </section>
      <aside className="force-spawn-panel" aria-label="Force spawn guests">
        <span>Force Spawn</span>
        <div>
          {forceSpawnCustomers.map((customer) => (
            <button key={customer.id} type="button" onClick={() => onForceSpawn(customer.id)}>
              {customer.name}
            </button>
          ))}
        </div>
      </aside>
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
  services: ServiceItem[];
  servedOrderIndexes: number[];
  serviceServed: boolean;
  patiencePercent: number;
  mood: number;
  purrBeat: number;
  purrCooldownRemaining: number;
  quietCooldownRemaining: number;
  rollCooldownRemaining: number;
  cuteCooldownRemaining: number;
  fullMoodCareUnlocked: boolean;
  storyReady: boolean;
  storyComplete: boolean;
  storyProgress: number;
  storyLineCount: number;
  nextStoryTitle: string;
  storyLine: string;
  storyClosingLine: string;
  kittyChatReady: boolean;
  kittyQuestion: string;
  kittyOptions: readonly [KittyChatOption, KittyChatOption];
  kittyAnswer: 0 | 1 | 2;
  kittyReply: string;
  listenMoodGain: number;
  layout: AdminLayout;
  onServe: (slot?: TableSlot, orderIndex?: number) => void;
  onPurr: () => void;
  onQuiet: () => void;
  onRollOver: () => void;
  onBeCute: () => void;
  onKittyAnswer: (answer: 1 | 2) => void;
  onBack: () => void;
  shopDayEnded: boolean;
}

function VisitScreen({
  customer,
  services,
  servedOrderIndexes,
  serviceServed,
  patiencePercent,
  mood,
  purrBeat,
  purrCooldownRemaining,
  quietCooldownRemaining,
  rollCooldownRemaining,
  cuteCooldownRemaining,
  fullMoodCareUnlocked,
  storyReady,
  storyComplete,
  storyProgress,
  storyLineCount,
  nextStoryTitle,
  storyLine,
  storyClosingLine,
  kittyChatReady,
  kittyQuestion,
  kittyOptions,
  kittyAnswer,
  kittyReply,
  listenMoodGain,
  layout,
  onServe,
  onPurr,
  onQuiet,
  onRollOver,
  onBeCute,
  onKittyAnswer,
  onBack,
  shopDayEnded,
}: VisitScreenProps) {
  const purrReady = purrCooldownRemaining <= 0;
  const quietReady = quietCooldownRemaining <= 0;
  const rollReady = fullMoodCareUnlocked && rollCooldownRemaining <= 0;
  const cuteReady = fullMoodCareUnlocked && cuteCooldownRemaining <= 0;
  const listenLabel = quietReady
    ? `Listen +${listenMoodGain}`
    : `Listen ${formatCooldown(quietCooldownRemaining)}`;
  const storyBubbleText =
    storyLine.length > 112 ? `${storyLine.slice(0, 109).trim()}...` : storyLine;
  const kittyBubbleSource = kittyAnswer > 0 ? kittyReply : kittyQuestion;
  const kittyBubbleText =
    kittyBubbleSource.length > 112
      ? `${kittyBubbleSource.slice(0, 109).trim()}...`
      : kittyBubbleSource;
  const storyProgressLabel = `${storyProgress}/${storyLineCount}`;
  const storyBubbleDots = Array.from({ length: storyLineCount }, (_, index) => index + 1);
  const rollLabel = rollReady ? 'Roll Over' : `Roll Over ${formatCooldown(rollCooldownRemaining)}`;
  const cuteLabel = cuteReady ? 'Be Cute' : `Be Cute ${formatCooldown(cuteCooldownRemaining)}`;
  const visitStatusLabel = shopDayEnded
    ? 'After hours'
    : serviceServed
      ? 'Order served'
      : 'Waiting on order';
  const leaveLabel = shopDayEnded ? 'Finish Visit' : 'Leave Customer';
  const hasMultipleOrders = customer.members.length > 1;
  const visitLayout = normalizeAdminLayout(layout);
  const primaryCharacterId = getCustomerPrimaryCharacterId(customer);
  const talkingImageSrc = primaryCharacterId
    ? visitLayout.talking.imageSrc || getDefaultTalkingImageSrc(primaryCharacterId)
    : '';
  const useTalkingImage = Boolean(talkingImageSrc);

  function visitPositionStyle(item: AdminDragItem, scale = 1): CSSProperties {
    const position = visitLayout[item] ?? DEFAULT_ADMIN_LAYOUT[item];
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
      transform: `translate(-50%, -50%)${scale === 1 ? '' : ` scale(${scale})`}`,
    };
  }

  function talkingPositionStyle(item: 'character' | 'cat' | 'bubble', scale = 1): CSSProperties {
    const position = visitLayout.talking[item] ?? DEFAULT_ADMIN_LAYOUT.talking[item];
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
      transform: `translate(-50%, -50%)${scale === 1 ? '' : ` scale(${scale})`}`,
    };
  }

  const bubbleStyle = useTalkingImage
    ? talkingPositionStyle('bubble')
    : visitPositionStyle('bubble');
  const catStyle = useTalkingImage
    ? talkingPositionStyle('cat', visitLayout.talking.catScale / 100)
    : visitPositionStyle('cat', visitLayout.catScale / 100);

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
        {kittyChatReady ? (
          <div
            className="customer-story-bubble visit-floating-bubble kitty-chat-bubble"
            style={bubbleStyle}
            aria-live="polite"
          >
            <div className="story-bubble-head">
              <strong>{customer.name}</strong>
              <span className="story-bubble-count">Chat</span>
            </div>
            <span className="story-bubble-line">{kittyBubbleText}</span>
          </div>
        ) : storyReady && storyProgress > 0 ? (
          <div
            className="customer-story-bubble visit-floating-bubble"
            style={bubbleStyle}
            aria-live="polite"
          >
            <div className="story-bubble-head">
              <strong>{nextStoryTitle}</strong>
              <span className="story-bubble-count">Bubble {storyProgressLabel}</span>
            </div>
            <span className="story-bubble-line">{storyBubbleText}</span>
            {storyComplete ? <em className="story-bubble-finish">{storyClosingLine}</em> : null}
          </div>
        ) : null}
        {useTalkingImage ? null : (
          <div className="visit-table" style={visitPositionStyle('table')} />
        )}
        {useTalkingImage ? (
          <div
            className="customer-close customer-close-image"
            style={talkingPositionStyle('character', visitLayout.talking.characterScale / 100)}
          >
            <img alt="" draggable={false} src={talkingImageSrc} />
          </div>
        ) : (
          <div className="customer-close" style={visitPositionStyle('character')}>
            <AnimalAvatar customer={customer} size="large" />
          </div>
        )}
        <div className="cat-close" style={catStyle}>
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
        {useTalkingImage ? null : (
          <div className="cup-on-table" style={visitPositionStyle('drink')}>
            <CupIcon />
          </div>
        )}
        <div className="mood-panel">
          <div className="visit-meta-row">
            <span>{visitStatusLabel}</span>
            <button
              className="leave-customer-button"
              type="button"
              onClick={onBack}
              aria-label={
                shopDayEnded
                  ? `Finish ${customer.name}'s visit and end the day`
                  : `Leave ${customer.name} and return to shop`
              }
            >
              <ShopIcon />
              {leaveLabel}
            </button>
          </div>
          <div className="meter-label">
            <span>{customer.name}'s Mood</span>
            <strong>{mood}%</strong>
          </div>
          <Meter value={mood} label={`${customer.name} mood`} />
          {storyReady ? (
            <div className={`story-prompt ${storyComplete ? 'story-prompt-complete' : ''}`}>
              <BookIcon />
              <span>{nextStoryTitle}</span>
              <div className="story-bubble-dots" aria-label={`${storyProgressLabel} story bubbles`}>
                {storyBubbleDots.map((dot) => (
                  <span
                    className={dot <= storyProgress ? 'story-bubble-dot-filled' : ''}
                    key={dot}
                  />
                ))}
              </div>
              {storyComplete ? <strong className="story-added-inline">Added</strong> : null}
            </div>
          ) : null}
          {kittyChatReady ? (
            <div className={`kitty-chat-prompt ${kittyAnswer > 0 ? 'kitty-chat-answered' : ''}`}>
              <CatHeadIcon />
              <span>{kittyAnswer > 0 ? kittyReply : kittyQuestion}</span>
              <div className="kitty-chat-actions">
                {kittyOptions.map((option) => (
                  <button
                    className={kittyAnswer === option.id ? 'selected' : ''}
                    disabled={kittyAnswer > 0}
                    key={option.id}
                    onClick={() => onKittyAnswer(option.id)}
                    type="button"
                  >
                    {kittyAnswer === option.id ? <CheckIcon /> : null}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {!serviceServed ? (
            <div className="patience-panel">
              <span>Patience</span>
              <Meter value={patiencePercent} label={`${customer.name} patience`} />
            </div>
          ) : null}
          <div className="request-row">
            <span>Order</span>
            <div className={`visit-order-list ${hasMultipleOrders ? 'multi' : ''}`}>
              {services.map((tableService, orderIndex) => {
                const orderServed = servedOrderIndexes.includes(orderIndex);
                const member = customer.members[orderIndex];
                const labelName = member?.name ?? customer.name;
                const orderName = hasMultipleOrders
                  ? `${labelName}: ${tableService.label}`
                  : tableService.label;

                return (
                  <button
                    className="service-chip"
                    disabled={orderServed}
                    onClick={() => onServe(undefined, orderIndex)}
                    type="button"
                    aria-label={`Serve ${tableService.label} to ${labelName}`}
                    key={`${customer.id}-visit-order-${orderIndex}`}
                  >
                    {orderServed ? <CheckIcon /> : <ServiceIcon kind={tableService.id} />}
                    <span className="service-chip-copy">
                      <strong>{orderServed ? 'Served' : 'Serve'}</strong>
                      <small>{orderServed ? labelName : orderName}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="visit-actions">
            <button className="primary-button" type="button" onClick={onPurr} disabled={!purrReady}>
              <PawIcon />
              {purrReady ? 'Purr' : `Purr ${formatCooldown(purrCooldownRemaining)}`}
            </button>
            <button className="paper-button" type="button" onClick={onQuiet} disabled={!quietReady}>
              <CupIcon />
              {listenLabel}
            </button>
          </div>
          {fullMoodCareUnlocked ? (
            <div className="visit-bonus-actions">
              <button
                className="paper-button"
                type="button"
                onClick={onRollOver}
                disabled={!rollReady}
              >
                <PawIcon />
                {rollLabel}
              </button>
              <button
                className="paper-button"
                type="button"
                onClick={onBeCute}
                disabled={!cuteReady}
              >
                <StarIcon />
                {cuteLabel}
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

interface StoryScreenProps {
  customer: Customer;
  story: StoryChapter;
  chapterNumber: number;
  chapterTotal: number;
  onCollect: () => void;
}

function StoryScreen({
  customer,
  story,
  chapterNumber,
  chapterTotal,
  onCollect,
}: StoryScreenProps) {
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
        <span className="chapter-marker">
          Chapter {chapterNumber} of {chapterTotal}
        </span>
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

function SummaryScreen({
  game,
  shopQuality,
  shopRank,
  daysRemaining,
  onEndDay,
}: SummaryScreenProps) {
  const goalMet = shopQuality >= GOOD_SHOP_SCORE;
  const rankUnderPressure = game.missedToday > 0 || game.reputationToday < 0;

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
            <dd className={rankUnderPressure ? 'summary-bad-value' : undefined}>
              {shopRank.name} {shopQuality}%
            </dd>
          </div>
          <div>
            <dt>
              <HeartIcon />
              Reputation
            </dt>
            <dd className={game.reputationToday < 0 ? 'summary-bad-value' : undefined}>
              {formatSignedNumber(game.reputationToday)}
            </dd>
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
            <dd className={game.missedToday > 0 ? 'summary-bad-value' : undefined}>
              {game.missedToday}
            </dd>
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
              className="ledger-section recipe-ledger-section"
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
                <span>
                  Purr {formatCooldown(purrCooldownMs)} / Listen {formatCooldown(quietCooldownMs)}
                </span>
              </div>
              <div className="upgrade-grid">
                {COOLDOWN_UPGRADES.map((upgrade) => {
                  const owned = game.upgrades.includes(upgrade.id);
                  const canBuy = game.teaCups >= upgrade.cost && !owned;
                  const actionLabel = upgrade.action === 'purr' ? 'Purr' : 'Listen';

                  return (
                    <article className={`upgrade-item ${owned ? 'owned' : ''}`} key={upgrade.id}>
                      <div className="upgrade-art training-art">
                        {upgrade.action === 'purr' ? <PawIcon /> : <CupIcon />}
                      </div>
                      <div>
                        <span className="upgrade-kind">Training</span>
                        <h3>{upgrade.name}</h3>
                        <p>{upgrade.description}</p>
                        <span className="comfort-bonus">
                          {actionLabel} -{formatCooldown(upgrade.reductionMs)}
                        </span>
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
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const loggedCustomers = CUSTOMERS.filter((customer) => hasCustomerLogEntry(game, customer)).map(
    (customer) => applyAdminSettingsToCustomer(customer),
  );
  const selectedCustomer =
    loggedCustomers.find((customer) => customer.id === selectedLogId) ?? null;
  const storyChapterCount = getStoryChapterCount(game);
  const loggedGuestCount = new Set(
    loggedCustomers.flatMap((customer) => customer.members.map((member) => member.id)),
  ).size;
  const totalVisits = loggedCustomers.reduce(
    (total, customer) => total + getCustomerStats(game, customer.id).visits,
    0,
  );
  const totalMissed = loggedCustomers.reduce(
    (total, customer) => total + getCustomerStats(game, customer.id).missed,
    0,
  );
  const totalEarned = loggedCustomers.reduce(
    (total, customer) => total + getCustomerStats(game, customer.id).earned,
    0,
  );

  return (
    <main className="collection-screen">
      <section className="story-ledger" aria-label="Guest log">
        <div className="ledger-head">
          <div>
            <p className="eyebrow">Shop Notes</p>
            <h2>{selectedCustomer ? selectedCustomer.name : 'Guest Log'}</h2>
          </div>
          {selectedCustomer ? (
            <button
              className="paper-button log-back-button"
              type="button"
              onClick={() => setSelectedLogId(null)}
            >
              <BookIcon />
              Guest List
            </button>
          ) : (
            <div className="log-totals">
              <span>{loggedCustomers.length} parties</span>
              <span>{loggedGuestCount} guests</span>
              <span>{totalVisits} visits</span>
              <span>{totalEarned} earned</span>
              <span>{storyChapterCount} chapters</span>
              <span>{totalMissed} missed</span>
            </div>
          )}
        </div>

        {loggedCustomers.length === 0 ? (
          <div className="empty-stories">
            <CatSprite resting />
            <p>No guests logged yet. The first regular is waiting by the window.</p>
          </div>
        ) : selectedCustomer ? (
          <div className="story-detail-view">
            <StoryEntry customer={selectedCustomer} game={game} />
          </div>
        ) : (
          <div className="guest-log-grid">
            {loggedCustomers.map((customer) => (
              <GuestLogCard
                customer={customer}
                key={customer.id}
                onSelect={() => setSelectedLogId(customer.id)}
              />
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

interface GuestLogCardProps {
  customer: Customer;
  onSelect: () => void;
}

function GuestLogCard({ customer, onSelect }: GuestLogCardProps) {
  return (
    <button
      className="guest-log-card"
      type="button"
      onClick={onSelect}
      aria-label={`Open ${customer.name}'s log`}
    >
      <AnimalAvatar customer={customer} size="small" />
      <strong>{customer.name}</strong>
    </button>
  );
}

interface StoryEntryProps {
  customer: Customer;
  game: GameState;
}

function StoryEntry({ customer, game }: StoryEntryProps) {
  const chapters = getCollectedStoryChapters(customer, game);
  const chapterTotal = getStoryArcLength(customer);
  const stats = getCustomerStats(game, customer.id);
  const returnChance = getCustomerReturnChance(game, customer);
  const partyLabel = getPartyLabel(customer);

  return (
    <article className="story-entry">
      <AnimalAvatar customer={customer} size="small" />
      <div>
        <div className="story-entry-head">
          <h3>{customer.name}</h3>
          <div className="story-entry-chips">
            <span>{partyLabel}</span>
            <span>
              {chapters.length}/{chapterTotal}
            </span>
          </div>
        </div>
        <div className="customer-log-stats">
          <span>{partyLabel}</span>
          <span className="earned">Earned {stats.earned}</span>
          <span>{getCustomerTipStyleLabel(customer)}</span>
          <span>Visits {stats.visits}</span>
          <span>Served {stats.served}</span>
          <span className={stats.missed > 0 ? 'missed' : ''}>Missed {stats.missed}</span>
          <span>Return {returnChance}%</span>
        </div>
        {chapters.length > 0 ? (
          <div className="story-chapter-list">
            {chapters.map((chapter, index) => (
              <div className="story-chapter-row" key={`${customer.id}-${chapter.title}`}>
                <span className="chapter-index">{index + 1}</span>
                <div>
                  <strong>{chapter.title}</strong>
                  <p>{chapter.text}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="story-empty-note">No story pieces yet.</p>
        )}
        <span className="visit-counter">
          Chapters {chapters.length}/{chapterTotal}
        </span>
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
    <button
      className="icon-button"
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
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
  return (
    <div
      className={`animal-avatar animal-avatar-${size} character-party character-party-${customer.members.length}`}
      role="img"
      aria-label={customer.name}
    >
      {customer.members.map((member, index) =>
        member.portraitImageSrc || member.imageSrc ? (
          <img
            alt=""
            className={`character-image ${
              member.portraitImageSrc ? 'character-portrait-image' : ''
            }`}
            key={member.id}
            draggable={false}
            src={member.portraitImageSrc || member.imageSrc || ''}
            style={
              {
                '--bust-offset': `${customer.members.length === 1 ? 0 : index === 0 ? -18 : 18}%`,
                '--bust-tilt': `${customer.members.length === 1 ? 0 : index === 0 ? -4 : 4}deg`,
                '--portrait-scale': (member.portraitScale ?? 100) / 100,
                '--portrait-x': `${member.portraitX ?? 50}%`,
                '--portrait-y': `${member.portraitY ?? 50}%`,
              } as CSSProperties
            }
          />
        ) : (
          <CharacterBust
            key={member.id}
            member={member}
            index={index}
            total={customer.members.length}
          />
        ),
      )}
    </div>
  );
}

interface CharacterBustProps {
  member: CharacterProfile;
  index: number;
  total: number;
}

function CharacterBust({ member, index, total }: CharacterBustProps) {
  const offset = total === 1 ? 0 : index === 0 ? -18 : 18;
  const tilt = total === 1 ? 0 : index === 0 ? -4 : 4;
  const isFemale = member.gender === 'female';

  return (
    <svg
      className="character-bust"
      viewBox="0 0 120 150"
      aria-hidden="true"
      style={
        {
          '--bust-offset': `${offset}%`,
          '--bust-tilt': `${tilt}deg`,
        } as CSSProperties
      }
    >
      <ellipse cx="60" cy="136" rx="38" ry="8" fill="rgba(55, 31, 20, 0.2)" />
      <path
        d="M26 134c3-32 16-48 34-48s31 16 34 48H26Z"
        fill={member.outfit}
        stroke="#5a3827"
        strokeWidth="4"
      />
      <path d="M42 93h36l-6 18H48l-6-18Z" fill={member.skin} stroke="#5a3827" strokeWidth="3" />
      {member.longHair ? (
        <path
          d="M28 72c0-31 15-50 34-50 20 0 34 18 34 50 0 28-8 48-18 58H42C33 118 28 99 28 72Z"
          fill={member.hair}
          opacity="0.94"
        />
      ) : null}
      <circle cx="60" cy="62" r="32" fill={member.skin} stroke="#5a3827" strokeWidth="4" />
      <path
        d={
          member.longHair
            ? 'M29 57c4-27 20-43 38-39 16 3 24 18 24 38-16-10-38-11-62 1Z'
            : 'M31 55c3-23 16-36 34-35 16 1 26 15 26 34-19-9-36-8-60 1Z'
        }
        fill={member.hair}
        stroke="#5a3827"
        strokeWidth="3"
      />
      {isFemale ? (
        <path
          d="M36 76c6 13 14 20 24 20s19-7 25-20"
          fill="none"
          stroke={member.accent}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.55"
        />
      ) : null}
      <circle cx="48" cy="64" r="3.8" fill="#2f231b" />
      <circle cx="72" cy="64" r="3.8" fill="#2f231b" />
      {member.glasses ? (
        <g fill="none" stroke="#2f231b" strokeWidth="2.6">
          <circle cx="48" cy="64" r="8" />
          <circle cx="72" cy="64" r="8" />
          <path d="M56 64h8" />
        </g>
      ) : null}
      <path
        d="M49 80q11 9 23 0"
        fill="none"
        stroke="#2f231b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M39 111h42" stroke={member.accent} strokeWidth="7" strokeLinecap="round" />
      <title>{member.name}</title>
    </svg>
  );
}

interface CatSpriteProps {
  resting?: boolean;
}

function CatSprite({ resting = false }: CatSpriteProps) {
  return (
    <svg
      className={`cat-sprite ${resting ? 'cat-resting' : ''}`}
      viewBox="0 0 210 140"
      role="img"
      aria-label="Shop cat"
    >
      <ellipse cx="108" cy="95" rx="74" ry="32" fill="#f2dfbf" stroke="#593b2b" strokeWidth="5" />
      <path
        d="M46 78 Q66 22 110 55 Q148 30 164 82"
        fill="#f2dfbf"
        stroke="#593b2b"
        strokeWidth="5"
      />
      <path d="M69 54 L58 24 L88 44 Z" fill="#f2dfbf" stroke="#593b2b" strokeWidth="5" />
      <path d="M129 44 L157 20 L148 58 Z" fill="#c8793b" stroke="#593b2b" strokeWidth="5" />
      <path d="M120 57 Q141 45 158 62 Q143 76 122 72 Z" fill="#c8793b" />
      <path
        d="M70 91 Q94 107 124 91"
        fill="none"
        stroke="#593b2b"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="82" cy="72" r={resting ? 0 : 4} fill="#2f231b" />
      <circle cx="126" cy="72" r={resting ? 0 : 4} fill="#2f231b" />
      {resting ? (
        <>
          <path
            d="M76 72 Q84 78 92 72"
            fill="none"
            stroke="#2f231b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M118 72 Q126 78 134 72"
            fill="none"
            stroke="#2f231b"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      ) : null}
      <path
        d="M104 78 Q106 83 111 78"
        fill="none"
        stroke="#2f231b"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M37 96 Q8 92 18 70 Q30 47 54 69"
        fill="none"
        stroke="#593b2b"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M154 98 Q198 92 190 64 Q183 40 161 61"
        fill="none"
        stroke="#c8793b"
        strokeWidth="12"
        strokeLinecap="round"
      />
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
      <path
        d="M10 22h12c-2-2-2-5-2-8a4 4 0 0 0-8 0c0 3 0 6-2 8Z"
        fill="#e8c381"
        stroke="#6b432e"
        strokeWidth="2"
      />
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
      <path
        d="M10 16l4 4 8-9"
        fill="none"
        stroke="#fff9ed"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RotateIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M8 11a8 8 0 0 1 13-4l2 2"
        fill="none"
        stroke="#6b432e"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M23 4v6h-6"
        fill="none"
        stroke="#6b432e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="9"
        y="13"
        width="15"
        height="10"
        rx="2"
        fill="#fff3df"
        stroke="#6b432e"
        strokeWidth="2"
        transform="rotate(-8 16.5 18)"
      />
      <path
        d="M24 21a8 8 0 0 1-13 4l-2-2"
        fill="none"
        stroke="#6b432e"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M9 28v-6h6"
        fill="none"
        stroke="#6b432e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <path
        d="M6 7h8c2 0 3 1 3 3v16c0-2-1-3-3-3H6V7Z"
        fill="#8fa467"
        stroke="#5d6b45"
        strokeWidth="2"
      />
      <path
        d="M26 7h-8c-2 0-3 1-3 3v16c0-2 1-3 3-3h8V7Z"
        fill="#e8cf92"
        stroke="#7a5a30"
        strokeWidth="2"
      />
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
      <path
        d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l4 4M21 21l4 4M25 7l-4 4M11 21l-4 4"
        stroke="#d89434"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 5v4M16 23v4M7 16H3M29 16h-4M9.6 9.6 6.8 6.8M25.2 25.2l-2.8-2.8M22.4 9.6l2.8-2.8M6.8 25.2l2.8-2.8"
        fill="none"
        stroke="#6b432e"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
      <circle cx="16" cy="16" r="8" fill="#fff3df" stroke="#6b432e" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="3" fill="#8fa467" stroke="#5d6b45" strokeWidth="2" />
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
      <path
        d="M16 27S5 20 5 12a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-11 15-11 15Z"
        fill="#df7070"
        stroke="#8b4545"
        strokeWidth="2"
      />
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
      <path
        d="M7 14 9 5l6 5 6-5 4 9a10 10 0 1 1-18 0Z"
        fill="#f2dfbf"
        stroke="#6b432e"
        strokeWidth="2"
      />
      <circle cx="12" cy="17" r="1.6" fill="#2f231b" />
      <circle cx="20" cy="17" r="1.6" fill="#2f231b" />
      <path d="M13 22q3 3 6 0" stroke="#2f231b" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M6 18c8-9 16-7 20-6-2 8-11 12-20 6Z"
        fill="#8fa467"
        stroke="#5d6b45"
        strokeWidth="2"
      />
      <path d="M8 18c6-1 10-3 15-6" stroke="#5d6b45" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CushionIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <ellipse cx="40" cy="36" rx="30" ry="16" fill="#d97979" stroke="#7a4c31" strokeWidth="4" />
      <path
        d="M15 35c6-11 44-11 50 0"
        fill="none"
        stroke="#e9a0a0"
        strokeWidth="4"
        strokeLinecap="round"
      />
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
      <path
        d="M40 36C26 22 23 11 38 15c7 2 7 12 2 21Z"
        fill="#8fa467"
        stroke="#5d6b45"
        strokeWidth="3"
      />
      <path
        d="M42 36c3-18 17-25 22-13-3 11-11 15-22 13Z"
        fill="#6d8544"
        stroke="#5d6b45"
        strokeWidth="3"
      />
    </svg>
  );
}

function WindowSeatIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <path d="M18 10h44v30H18Z" fill="#f6d996" stroke="#6b432e" strokeWidth="4" />
      <path d="M40 10v30M18 25h44" stroke="#6b432e" strokeWidth="3" />
      <path d="M12 42h56v9H12Z" fill="#9a6236" stroke="#6b432e" strokeWidth="4" />
      <path
        d="M19 43c6-8 36-8 42 0"
        fill="none"
        stroke="#d97979"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HearthIcon() {
  return (
    <svg viewBox="0 0 80 60" aria-hidden="true">
      <path d="M16 24h48v28H16Z" fill="#7a4c31" stroke="#593b2b" strokeWidth="4" />
      <path d="M24 24c2-13 30-13 32 0" fill="#a86b42" stroke="#593b2b" strokeWidth="4" />
      <path
        d="M40 48c-9-8-1-14 0-21 8 7 11 14 0 21Z"
        fill="#f2c66e"
        stroke="#c8793b"
        strokeWidth="3"
      />
      <path d="M30 51h20" stroke="#2f231b" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default TeaShopCat;
