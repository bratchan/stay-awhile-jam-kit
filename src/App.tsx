import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  ChangeEvent,
  DragEvent as ReactDragEvent,
  FormEvent as ReactFormEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { unzipSync, strFromU8 } from 'fflate';
import { getSafeArea, isDev } from './services/environment';
import {
  SAVE_SCHEMA_VERSION,
  clearSave as clearPlatformSave,
  loadSave as loadPlatformSave,
  persistSave as persistPlatformSave,
} from './services/storage';

type Scene =
  | 'start'
  | 'contentWarning'
  | 'setup'
  | 'opening'
  | 'menu'
  | 'shop'
  | 'visit'
  | 'story'
  | 'summary'
  | 'upgrades'
  | 'collection'
  | 'admin';
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
type LedgerTab = 'recipes' | 'training' | 'comfort' | 'store';
type Gender = 'female' | 'male';
type TipStyle = 'poor' | 'steady' | 'good' | 'high';
type VisitConversationKind = 'story' | 'kitty';
type AdminDragItem =
  | 'character'
  | 'table'
  | 'drink'
  | 'cat'
  | 'bubble'
  | 'order'
  | 'patience'
  | 'moodIcon';
type AdminLayoutDragItem = Exclude<AdminDragItem, 'moodIcon'>;
type AdminPreviewMode = 'shop' | 'talking' | 'settings';
type AdminCharacterManagerView = 'list' | 'detail';
type AdminCharacterDetailTab = 'settings' | 'uploads' | 'portrait';
type AdminSidePanelMode =
  | 'inspector'
  | 'characters'
  | 'assets'
  | 'chats'
  | 'chatMenu'
  | 'cat'
  | 'ref'
  | 'opening';
type AdminChatKind = 'story' | 'comment' | 'leave' | 'order' | 'happy';
type AdminChatEditorMode = 'list' | AdminChatKind;
type AdminChatToolMode = 'chats' | 'moodIcons';
type AdminOpeningTab = 'settings' | 'dialogue' | 'preview';
type AdminChatBlockKind = 'bubble' | 'catReply';
type AdminAssetKind = 'store' | 'portrait' | 'static';
type AdminSeatSpotKey = '0' | '1' | '2';
type AdminSeatAnchor = 'marker' | 'emptyTable' | 'drink' | 'order' | 'patience' | 'moodIcon';
type TutorialStep =
  | 'opening'
  | 'patience'
  | 'serve'
  | 'visit'
  | 'meow'
  | 'mood'
  | 'leave'
  | 'firstDayStoryIntro'
  | 'firstDayStoryOrder'
  | 'firstDayStoryLeave'
  | 'clock'
  | 'open'
  | 'done';
type OpeningActor = 'narrator' | 'lila' | 'grace';
type OpeningSide = 'none' | 'left' | 'right';
type CatActionId = 'meow' | 'purr' | 'listen' | 'leave' | 'cute' | 'roll' | 'serve';
type CatPoseKey = 'idle' | CatActionId;

interface AdminPosition {
  x: number;
  y: number;
}

interface AdminSeatSpot {
  marker: AdminPosition;
  emptyTable: AdminPosition;
  drink: AdminPosition;
  order: AdminPosition;
  patience: AdminPosition;
  moodIcon: AdminPosition;
  scale: number;
  drinkScale: number;
}

interface AdminLayout {
  enabled: boolean;
  character: AdminPosition;
  table: AdminPosition;
  drink: AdminPosition;
  cat: AdminPosition;
  bubble: AdminPosition;
  order: AdminPosition;
  patience: AdminPosition;
  characterScale: number;
  drinkScale: number;
  catScale: number;
  talking: AdminTalkingLayout;
}

interface AdminTalkingLayout {
  character: AdminPosition;
  cat: AdminPosition;
  bubble: AdminPosition;
  drink: AdminPosition;
  patience: AdminPosition;
  faceBlocker: AdminFaceBlocker;
  characterScale: number;
  drinkScale: number;
  catScale: number;
  defaultImageSrc: string;
  imageSrc: string;
  enabledImageSrcs: string[];
  hiddenImageSrcs: string[];
}

type AdminLayouts = Record<string, AdminLayout>;
type AdminSeatSpots = Record<AdminSeatSpotKey, AdminSeatSpot>;
type AdminSeatSpotLayouts = Record<string, AdminSeatSpots>;

interface AdminChatEntry {
  id: string;
  kind: AdminChatKind;
  title: string;
  summary: string;
  startImageSrc: string;
  blocks: AdminChatBlock[];
  bubbles: string[];
  catReply: [KittyChatOption, KittyChatOption] | null;
  triggerStoryId: string;
  triggerDelayDays: number;
  moodIconIds: string[];
}

interface AdminChatBlock {
  id: string;
  kind: AdminChatBlockKind;
  text: string;
  imageSrc: string;
  catReply: [KittyChatOption, KittyChatOption] | null;
}

interface AdminRelationshipChatGroup {
  id: string;
  threshold: number;
  entries: AdminChatEntry[];
}

type AdminChats = Record<string, AdminRelationshipChatGroup[]>;

interface AdminMoodIcon {
  id: string;
  name: string;
  src: string;
}

interface AdminChatMenuItem {
  position: AdminPosition;
  imageSrc: string;
  servedImageSrc: string;
  imagePosition: AdminPosition;
  imageScale: number;
  hexScale: number;
  textEnabled: boolean;
  layer: number;
}

interface AdminChatMenuSettings {
  position: AdminPosition;
  scale: number;
  backgroundImageSrc: string;
  backgroundScale: number;
  backgroundLayer: number;
  items: Record<CatActionId, AdminChatMenuItem>;
}

type AdminCatSettings = Record<CatPoseKey, string>;
type AssetPreloadState = {
  loaded: number;
  total: number;
};

interface AdminOpeningBeat {
  id: string;
  actor: OpeningActor;
  speaker: string;
  text: string;
  side: OpeningSide;
  backgroundSrc: string;
  lilaImageId: string;
  graceImageId: string;
  lilaPlacement: AdminOpeningPlacement;
  gracePlacement: AdminOpeningPlacement;
  lilaFlipped: boolean;
  graceFlipped: boolean;
  imageId: string;
}

interface AdminOpeningImage {
  id: string;
  label: string;
  src: string;
}

interface AdminOpeningPlacement {
  x: number;
  y: number;
  scale: number;
}

interface AdminFaceBlocker {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AdminOpeningSettings {
  locationName: string;
  locationDetail: string;
  backgroundSrc: string;
  lilaImageSrc: string;
  graceImageSrc: string;
  lilaImages: AdminOpeningImage[];
  graceImages: AdminOpeningImage[];
  lilaPlacement: AdminOpeningPlacement;
  gracePlacement: AdminOpeningPlacement;
  beats: AdminOpeningBeat[];
}

interface AdminPortableState {
  version: number;
  layouts: AdminLayouts;
  seatSpots: AdminSeatSpotLayouts;
  characterSettings: AdminCharacterSettings;
  chats: AdminChats;
  moodIcons: AdminMoodIcon[];
  chatMenu: AdminChatMenuSettings;
  catSettings: AdminCatSettings;
  openingSettings: AdminOpeningSettings;
}

interface AdminAssetItem {
  id: string;
  kind: AdminAssetKind;
  label: string;
  owner: string;
  detail: string;
  src: string;
  subjectId?: AdminSubjectId;
  characterId?: CharacterId;
}

interface CharacterPortraitSettings {
  imageSrc: string;
  scale: number;
  x: number;
  y: number;
}

interface CharacterAdminSettings {
  enabled: boolean;
  displayName: string;
  tipStyle: TipStyle;
  tipBase: number;
  patienceMs: number;
  afterHoursComment: string;
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
  chatSeed: number;
  forcedEntryId?: string;
}

interface KittyChatOption {
  id: 1 | 2;
  label: string;
  reply: string;
}

interface KittyChat {
  question: string;
  options: readonly [KittyChatOption, KittyChatOption] | null;
  imageSrc?: string;
}

interface StoryChapter {
  id?: string;
  title: string;
  text: string;
  lines?: string[];
  imageSrc?: string;
  lineImageSrcs?: string[];
  moodIconIds?: string[];
  choices?: readonly [KittyChatOption, KittyChatOption];
  replyAfterLineIndex?: number;
  triggerStoryId?: string;
  triggerDelayDays?: number;
  relationshipThreshold?: number;
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
  storyChoices?: readonly [KittyChatOption, KittyChatOption];
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
  setupComplete: boolean;
  cafeName: string;
  catName: string;
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
  storyCollectionDays: Record<string, number>;
  customerStats: Record<string, CustomerStats>;
  metCustomers: string[];
  openingComplete: boolean;
  tutorialStep: TutorialStep;
}

interface CustomerStats {
  visits: number;
  served: number;
  missed: number;
  earned: number;
  bond: number;
}

interface VisitCare {
  purrs: number;
  quiets: number;
  rolls: number;
  cutes: number;
  storyTalks: number;
  kittyAnswer: 0 | 1 | 2;
  happySeen: boolean;
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
  moodBySlot: Partial<Record<TableSlot, number>>;
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
  meowCooldownRemainingMs: number;
  quietCooldownRemainingMs: number;
  rollCooldownRemainingMs: number;
  cuteCooldownRemainingMs: number;
  nextCustomerSlot: number;
  nextArrivalTimerId: number;
  arrivalTimers: SessionArrivalTimer[];
  activeLedgerTab: LedgerTab;
  tutorialLineIndex: number;
  tutorialPatienceExpired: boolean;
  tutorialOpenPopup: boolean;
}

interface InitialAppState {
  restoredSession: boolean;
  game: GameState;
  scene: Scene;
  isPaused: boolean;
  mood: number;
  moodBySlot: Partial<Record<TableSlot, number>>;
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
  meowCooldownRemainingMs: number;
  quietCooldownRemainingMs: number;
  rollCooldownRemainingMs: number;
  cuteCooldownRemainingMs: number;
  nextCustomerSlot: number;
  nextArrivalTimerId: number;
  arrivalTimers: SessionArrivalTimer[];
  activeLedgerTab: LedgerTab;
  tutorialLineIndex: number;
  tutorialPatienceExpired: boolean;
  tutorialOpenPopup: boolean;
}

interface RuntimeSessionState {
  game: GameState;
  scene: Scene;
  isPaused: boolean;
  mood: number;
  moodBySlot: Partial<Record<TableSlot, number>>;
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
  meowReadyAt: number;
  quietReadyAt: number;
  rollReadyAt: number;
  cuteReadyAt: number;
  actionNow: number;
  nextCustomerSlot: number;
  nextArrivalTimerId: number;
  activeLedgerTab: LedgerTab;
  tutorialLineIndex: number;
  tutorialPatienceExpired: boolean;
  tutorialOpenPopup: boolean;
}

interface ShopRank {
  name: string;
  min: number;
}

const SAVE_KEY = 'tea-shop-cat-save-v1';
const SESSION_KEY = 'tea-shop-cat-session-v1';
const SESSION_VERSION = 1;
const ARRIVAL_DELAY_MS = 3600;
const PATIENCE_TICK_MS = 250;
const SHOP_CLOCK_TICK_MS = 250;
const SHOP_DAY_REAL_MS = 120_000;
const SERVED_PATIENCE_SLOWDOWN = 1;
const SERVED_LEAVE_DELAY_MS = 7_000;
const TABLE_SLOTS = [0, 1, 2] as const;
const SHOP_DAY_START_HOUR = 8;
const FIRST_DAY_START_HOUR = 15;
const SHOP_DAY_LENGTH_HOURS = 10;
const FIRST_DAY_START_ELAPSED_MS = Math.round(
  ((FIRST_DAY_START_HOUR - SHOP_DAY_START_HOUR) / SHOP_DAY_LENGTH_HOURS) * SHOP_DAY_REAL_MS,
);
const YEAR_LENGTH_DAYS = 365;
const GOOD_SHOP_SCORE = 70;
const DEFAULT_CAFE_NAME = 'Cat Cafe';
const DEFAULT_CAT_NAME = 'Mr. Kitty';
const STARTER_RECIPE_ID = 'blackTea';
const SECOND_TABLE_UPGRADE_ID = 'second-table-spot';
const THIRD_TABLE_UPGRADE_ID = 'third-table-spot';
const BASE_PURR_COOLDOWN_MS = 6_000;
const BASE_MEOW_COOLDOWN_MS = 2_000;
const BASE_QUIET_COOLDOWN_MS = 2_500;
const BASE_ROLL_COOLDOWN_MS = 7_000;
const BASE_CUTE_COOLDOWN_MS = 8_500;
const LISTEN_MOOD_GAIN = 12;
const LISTEN_PURR_COOLDOWN_MOOD_GAIN = 18;
const MEOW_MOOD_GAIN = 6;
const ROLL_OVER_MOOD_GAIN = 10;
const BE_CUTE_MOOD_GAIN = 8;
const MISS_REPUTATION_LOSS = 5;
const MIN_RELATIONSHIP_SCORE = -100;
const MAX_RELATIONSHIP_SCORE = 100;
const MISSED_RELATIONSHIP_LOSS = 5;
const LIAM_STORY_REPUTATION_REQUIRED = 28;
const DEFAULT_AFTER_HOURS_COMMENT = "Oh, you're closed. I should head out.";
const DEFAULT_ORDER_COMMENT = 'Can i get my order?';
const ADMIN_LAYOUT_KEY = 'tea-shop-cat-admin-layouts-v1';
const ADMIN_SEAT_SPOTS_KEY = 'tea-shop-cat-admin-seat-spots-v1';
const ADMIN_SEAT_SPOT_DEPTH_VERSION = 2;
const ADMIN_CHARACTER_SETTINGS_KEY = 'tea-shop-cat-admin-character-settings-v1';
const ADMIN_CHATS_KEY = 'tea-shop-cat-admin-chats-v1';
const ADMIN_CHATS_SCHEMA_VERSION = 2;
const ADMIN_MOOD_ICONS_KEY = 'tea-shop-cat-admin-mood-icons-v1';
const ADMIN_CHAT_MENU_KEY = 'tea-shop-cat-admin-chat-menu-v1';
const ADMIN_CAT_SETTINGS_KEY = 'tea-shop-cat-admin-cat-settings-v1';
const ADMIN_LARGE_DB_NAME = 'tea-shop-cat-admin-large-db-v1';
const ADMIN_LARGE_DB_VERSION = 1;
const ADMIN_LARGE_STORE_NAME = 'admin-records';
const ADMIN_OPENING_KEY = 'tea-shop-cat-admin-opening-v1';
const ADMIN_OPENING_DB_NAME = 'tea-shop-cat-admin-opening-db-v1';
const ADMIN_OPENING_DB_VERSION = 1;
const ADMIN_OPENING_STORE_NAME = 'opening-settings';
const ADMIN_OPENING_RECORD_KEY = 'settings';
const ADMIN_PORTABLE_STATE_SRC = '/admin-uploads/admin-state.json';
const PUBLIC_ASSET_BASE_URL = new URL(import.meta.env.BASE_URL || './', window.location.href).href;
const ADMIN_PORTABLE_FETCH_TIMEOUT_MS = 5_000;
const PRELOAD_IMAGE_TIMEOUT_MS = 4_000;
const STARTUP_PRELOAD_TIMEOUT_MS = 9_000;
const OPENING_IMAGE_NONE = '__none';
const MUSIC_MUTED_KEY = 'tea-shop-cat-music-muted-v1';
const MUSIC_VOLUME_KEY = 'tea-shop-cat-music-volume-v1';
const DEFAULT_MUSIC_VOLUME = 42;
const BACKGROUND_MUSIC_SRC = '/music/rainy-table-by-the-window.mp3';
const EMPTY_TABLE_IMAGE_SRC = '/admin-uploads/store/smallChair.png';
const UI_ICON_SRC = {
  gear: '/icons/gear.png',
  logBook: '/icons/logBook.png',
  store: '/icons/store.png',
} as const;
const RELATIONSHIP_HEART_SRC = {
  black: '/icons/black_heart.png',
  white: '/icons/white_heart.png',
  purple: '/icons/purple_heart.png',
  blue: '/icons/blue_heart.png',
  green: '/icons/green_heart.png',
  yellow: '/icons/yellow_heart.png',
  orange: '/icons/orange_heart.png',
  pink: '/icons/pink_heart.png',
  red: '/icons/red_heart.png',
} as const;
type TableSlot = (typeof TABLE_SLOTS)[number];

const DEFAULT_OPENING_LILA_PLACEMENT: AdminOpeningPlacement = { x: 22, y: 84, scale: 100 };
const DEFAULT_OPENING_GRACE_PLACEMENT: AdminOpeningPlacement = { x: 78, y: 84, scale: 100 };
const OPENING_CITY_BACKGROUND_SRC = '/admin-uploads/opening/stellar-vanguard-city.png';
const OPENING_CAFE_FRONT_BACKGROUND_SRC = '/admin-uploads/opening/green-door-cafe-front.png';
const LEGACY_OPENING_LOCATION_DETAIL = 'Planet: Caelorin, City';
const OPENING_LOCATION_DETAIL = 'Planet: Caelorin, City: Ganyra';

function resolveAssetSrc(src: unknown): string {
  if (typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (/^(?:data:|blob:|https?:\/\/)/i.test(trimmed)) return trimmed;
  if (!trimmed.startsWith('/')) return trimmed;

  return new URL(trimmed.replace(/^\/+/, ''), PUBLIC_ASSET_BASE_URL).href;
}

function cssAssetUrl(src: unknown): string | undefined {
  const resolved = resolveAssetSrc(src);
  return resolved ? `url("${resolved.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")` : undefined;
}

const DEFAULT_OPENING_BEATS: AdminOpeningBeat[] = [
  {
    id: 'opening-location',
    actor: 'narrator',
    speaker: 'Cat Cafe',
    text: OPENING_LOCATION_DETAIL,
    side: 'none',
    backgroundSrc: OPENING_CITY_BACKGROUND_SRC,
    lilaImageId: OPENING_IMAGE_NONE,
    graceImageId: OPENING_IMAGE_NONE,
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  },
  {
    id: 'opening-lila-place',
    actor: 'lila',
    speaker: 'Lila',
    text: 'We did it! We finally got our own place.',
    side: 'left',
    backgroundSrc: OPENING_CAFE_FRONT_BACKGROUND_SRC,
    lilaImageId: '',
    graceImageId: OPENING_IMAGE_NONE,
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  },
  {
    id: 'opening-grace-owner',
    actor: 'grace',
    speaker: 'Grace',
    text: 'You must be the new owner.',
    side: 'right',
    backgroundSrc: OPENING_CAFE_FRONT_BACKGROUND_SRC,
    lilaImageId: '',
    graceImageId: '',
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  },
  {
    id: 'opening-lila-yah',
    actor: 'lila',
    speaker: 'Lila',
    text: 'Er, yah.',
    side: 'left',
    backgroundSrc: OPENING_CAFE_FRONT_BACKGROUND_SRC,
    lilaImageId: '',
    graceImageId: '',
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  },
  {
    id: 'opening-grace-lease',
    actor: 'grace',
    speaker: 'Grace',
    text: 'I am who you are renting this place from. This is a very popular spot. So you need to make sure you achieve a certain rating or I will not renew your lease.',
    side: 'right',
    backgroundSrc: OPENING_CAFE_FRONT_BACKGROUND_SRC,
    lilaImageId: '',
    graceImageId: '',
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  },
  {
    id: 'opening-lila-wait',
    actor: 'lila',
    speaker: 'Lila',
    text: 'Wait what??',
    side: 'left',
    backgroundSrc: OPENING_CAFE_FRONT_BACKGROUND_SRC,
    lilaImageId: '',
    graceImageId: '',
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  },
  {
    id: 'opening-grace-get-on-it',
    actor: 'grace',
    speaker: 'Grace',
    text: 'Yes. So you better get on it.',
    side: 'right',
    backgroundSrc: OPENING_CAFE_FRONT_BACKGROUND_SRC,
    lilaImageId: '',
    graceImageId: '',
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  },
  {
    id: 'opening-lila-ranking',
    actor: 'lila',
    speaker: 'Lila',
    text: 'You hear that Mr Kitty... We need to get a ranking.',
    side: 'left',
    backgroundSrc: OPENING_CAFE_FRONT_BACKGROUND_SRC,
    lilaImageId: '',
    graceImageId: OPENING_IMAGE_NONE,
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  },
  {
    id: 'opening-lila-customer',
    actor: 'lila',
    speaker: 'Lila',
    text: "Oh a customer! Come on, let's go in.",
    side: 'left',
    backgroundSrc: OPENING_CAFE_FRONT_BACKGROUND_SRC,
    lilaImageId: '',
    graceImageId: OPENING_IMAGE_NONE,
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  },
];

const DEFAULT_OPENING_SETTINGS: AdminOpeningSettings = {
  locationName: 'Cat Cafe',
  locationDetail: OPENING_LOCATION_DETAIL,
  backgroundSrc: '',
  lilaImageSrc: '',
  graceImageSrc: '',
  lilaImages: [],
  graceImages: [],
  lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
  gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
  beats: DEFAULT_OPENING_BEATS,
};

const TUTORIAL_MATTHEW_LINES = [
  'Hey! You must be one of the owners of the new little cafe here.',
  'I was wondering when this place would get bought. I heard getting a place here was a pain.',
] as const;

const TUTORIAL_PATIENCE_MESSAGE =
  "Hey look, this is the customer's patience. You only have so much time to serve them before they leave.";
const TUTORIAL_SERVE_MESSAGE = 'Ok! First we should serve him. So... go click serve.';
const TUTORIAL_PATIENCE_EXPIRED_MESSAGE = 'The meter ran out!! Hurry and serve him!!!';
const TUTORIAL_VISIT_MESSAGE = 'Now sit with him so we can help him feel welcome.';
const TUTORIAL_MOOD_MESSAGE =
  'This is their mood. Use cat actions to make them feel better and keep the conversation going. Actions have cooldowns, so watch their timers before using them again.';
const TUTORIAL_CHAT_PROGRESS_MESSAGE = 'Clicking actions progresses their chat.';
const TUTORIAL_MATTHEW_THANKS = 'Wow i feel alot better! Thanks PLAYER.';
const TUTORIAL_LEAVE_MESSAGE = 'Good job! Now leave the table.';
const TUTORIAL_CLOCK_MESSAGE =
  "We only run the shop so late since it's just the two of us. Pay attention, because we close at 6pm.";
const TUTORIAL_OPEN_MESSAGE = "It's on you PLAYER.";
const TUTORIAL_OPEN_POPUP_MESSAGE = 'The store is official open. Greet customers and serve them.';
const FIRST_DAY_STORY_INTRO_MESSAGE =
  'Oh we have one more customer of the night. Looks like something is bothering him go chat with him.';
const FIRST_DAY_STORY_ORDER_MESSAGE = "Can i snag a drink I know it's late";
const FIRST_DAY_STORY_COLLECTED_MESSAGE =
  'You just collected a Story. Collect stories of characters, they will tell you about their life.';

const DEFAULT_MOOD_ICON_SRC =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 122'><path fill='%23fff7d9' stroke='%23141210' stroke-width='9' stroke-linejoin='round' d='M24 13h112c10 0 18 8 18 18v49c0 10-8 18-18 18H62l-39 18 13-23H24c-10 0-18-8-18-18V31c0-10 8-18 18-18Z'/><path fill='none' stroke='%23141210' stroke-width='8' stroke-linecap='round' d='M51 62c8-20 40 24 57-1M45 47c15-21 52 27 73 2M55 75c21-17 34 12 58-9M68 42c-11 23 15 33 5 48M92 37c-20 20 16 32-4 54'/></svg>";

const DEFAULT_ADMIN_MOOD_ICONS: AdminMoodIcon[] = [
  {
    id: 'scribble-thought',
    name: 'Scribble Thought',
    src: DEFAULT_MOOD_ICON_SRC,
  },
];

const CAT_ACTION_IDS = ['meow', 'purr', 'listen', 'leave', 'cute', 'roll', 'serve'] as const;
const CAT_POSE_KEYS = ['idle', ...CAT_ACTION_IDS] as const;

const CAT_ACTION_LABELS: Record<CatActionId, string> = {
  meow: 'Meow',
  purr: 'Purr',
  listen: 'Listen',
  leave: 'Leave',
  cute: 'Be Cute',
  roll: 'Roll',
  serve: 'Serve',
};

function defaultChatMenuItem(
  x: number,
  y: number,
  layer: number,
  hexScale = 100,
): AdminChatMenuItem {
  return {
    position: { x, y },
    imageSrc: '',
    servedImageSrc: '',
    imagePosition: { x: 50, y: 50 },
    imageScale: 100,
    hexScale,
    textEnabled: true,
    layer,
  };
}

const DEFAULT_CHAT_MENU_SETTINGS: AdminChatMenuSettings = {
  position: { x: 78, y: 50 },
  scale: 100,
  backgroundImageSrc: '',
  backgroundScale: 100,
  backgroundLayer: 0,
  items: {
    meow: defaultChatMenuItem(50, 15, 2),
    purr: defaultChatMenuItem(16, 43, 2),
    listen: defaultChatMenuItem(84, 43, 2),
    leave: defaultChatMenuItem(22, 78, 2),
    cute: defaultChatMenuItem(78, 78, 2),
    roll: defaultChatMenuItem(50, 84, 2),
    serve: defaultChatMenuItem(50, 50, 3, 84),
  },
};

const DEFAULT_CAT_SETTINGS: AdminCatSettings = {
  idle: '',
  meow: '',
  purr: '',
  listen: '',
  leave: '',
  cute: '',
  roll: '',
  serve: '',
};

const LOADING_CAT_POSES: CatPoseKey[] = ['idle', 'meow', 'purr', 'listen', 'cute', 'roll', 'serve'];

function getCatPoseLabel(poseKey: CatPoseKey): string {
  return poseKey === 'idle' ? 'Idle' : CAT_ACTION_LABELS[poseKey];
}

function getCatImageSrc(settings: AdminCatSettings, poseKey: CatPoseKey): string {
  const normalizedSettings = normalizeAdminCatSettings(settings);
  return normalizedSettings[poseKey] || normalizedSettings.idle || '';
}

const DEFAULT_ADMIN_SEAT_SPOTS: AdminSeatSpots = {
  '0': {
    marker: { x: 31, y: 80 },
    emptyTable: { x: 31, y: 83 },
    drink: { x: 39, y: 72 },
    order: { x: 40, y: 55 },
    patience: { x: 31, y: 47 },
    moodIcon: { x: 37, y: 49 },
    scale: 112,
    drinkScale: 112,
  },
  '1': {
    marker: { x: 50, y: 76 },
    emptyTable: { x: 50, y: 82 },
    drink: { x: 58, y: 68 },
    order: { x: 59, y: 51 },
    patience: { x: 50, y: 43 },
    moodIcon: { x: 56, y: 46 },
    scale: 100,
    drinkScale: 100,
  },
  '2': {
    marker: { x: 78, y: 79 },
    emptyTable: { x: 78, y: 83 },
    drink: { x: 86, y: 71 },
    order: { x: 87, y: 54 },
    patience: { x: 78, y: 46 },
    moodIcon: { x: 83, y: 49 },
    scale: 88,
    drinkScale: 88,
  },
};

const DEFAULT_ADMIN_LAYOUT: AdminLayout = {
  enabled: true,
  character: { x: 30, y: 58 },
  table: { x: 30, y: 76 },
  drink: { x: 30, y: 73 },
  cat: { x: 50, y: 82 },
  bubble: { x: 24, y: 24 },
  order: { x: 43, y: 43 },
  patience: { x: 43, y: 47 },
  characterScale: 100,
  drinkScale: 100,
  catScale: 100,
  talking: {
    character: { x: 47, y: 54 },
    cat: { x: 73, y: 70 },
    bubble: { x: 27, y: 18 },
    drink: { x: 39, y: 72 },
    patience: { x: 43, y: 79 },
    faceBlocker: { x: 52, y: 27, width: 18, height: 24 },
    characterScale: 100,
    drinkScale: 100,
    catScale: 82,
    defaultImageSrc: '',
    imageSrc: '',
    enabledImageSrcs: [],
    hiddenImageSrcs: [],
  },
};

const TIP_STYLE_LABELS: Record<TipStyle, string> = {
  poor: 'Poor tipper',
  steady: 'Steady tipper',
  good: 'Tips well',
  high: 'High tipper',
};

const ADMIN_CHAT_KIND_LABELS: Record<AdminChatKind, string> = {
  comment: 'Comment',
  story: 'Story',
  leave: 'Leave',
  order: 'Order',
  happy: 'Happy',
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
  custom_1: {
    id: 'custom_1',
    name: 'New Character 1',
    gender: 'female',
    skin: '#b9825d',
    hair: '#3a2b24',
    outfit: '#5f7758',
    accent: '#e0ba70',
    tipStyle: 'steady',
    tipBase: 30,
    patienceMs: 20_000,
  },
  custom_2: {
    id: 'custom_2',
    name: 'New Character 2',
    gender: 'male',
    skin: '#c98f6f',
    hair: '#251c1c',
    outfit: '#536a78',
    accent: '#d3a34f',
    tipStyle: 'steady',
    tipBase: 30,
    patienceMs: 20_000,
  },
  custom_3: {
    id: 'custom_3',
    name: 'New Character 3',
    gender: 'female',
    skin: '#d3a07f',
    hair: '#7d4a2b',
    outfit: '#7a54a3',
    accent: '#d66b72',
    tipStyle: 'steady',
    tipBase: 30,
    patienceMs: 20_000,
  },
  custom_4: {
    id: 'custom_4',
    name: 'New Character 4',
    gender: 'male',
    skin: '#70483b',
    hair: '#101820',
    outfit: '#3f6272',
    accent: '#d9b56f',
    tipStyle: 'steady',
    tipBase: 30,
    patienceMs: 20_000,
  },
  custom_5: {
    id: 'custom_5',
    name: 'New Character 5',
    gender: 'female',
    skin: '#c1866a',
    hair: '#554033',
    outfit: '#8f6d9a',
    accent: '#cc6f57',
    tipStyle: 'steady',
    tipBase: 30,
    patienceMs: 20_000,
  },
  custom_6: {
    id: 'custom_6',
    name: 'New Character 6',
    gender: 'male',
    skin: '#d7a476',
    hair: '#6a3c21',
    outfit: '#f0c58d',
    accent: '#4d7c8f',
    tipStyle: 'steady',
    tipBase: 30,
    patienceMs: 20_000,
  },
} as const satisfies Record<string, CharacterProfile>;

type CharacterId = keyof typeof CHARACTER_PROFILES;
const ADMIN_CHARACTER_IDS = Object.keys(CHARACTER_PROFILES) as CharacterId[];
const CUSTOM_CHARACTER_IDS = ADMIN_CHARACTER_IDS.filter((id) => id.startsWith('custom_'));
const ADMIN_PARTY_IDS = ['liam-eli', 'matthew-shadow', 'alaric-eli'] as const;
type AdminPartyId = (typeof ADMIN_PARTY_IDS)[number];
type AdminSubjectId = CharacterId | AdminPartyId;
const ADMIN_SUBJECT_IDS = [...ADMIN_CHARACTER_IDS, ...ADMIN_PARTY_IDS] as AdminSubjectId[];
const EMPTY_TABLE_SEAT_SPOTS_ID = '__empty-table';
type AdminSeatSpotOwnerId = AdminSubjectId | typeof EMPTY_TABLE_SEAT_SPOTS_ID;

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
} as const satisfies Partial<Record<AdminSubjectId, readonly CharacterPose[]>>;

function getCharacterTalkingPoses(subjectId: AdminSubjectId): readonly CharacterPose[] {
  const poseMap = CHARACTER_TALKING_POSES as Partial<
    Record<AdminSubjectId, readonly CharacterPose[]>
  >;
  return poseMap[subjectId] ?? [];
}

function getDefaultTalkingImageSrc(subjectId?: AdminSubjectId): string {
  return subjectId ? (getCharacterTalkingPoses(subjectId)[0]?.src ?? '') : '';
}

function getVisibleDefaultTalkingImageSrc(
  subjectId?: AdminSubjectId,
  hiddenImageSrcs: readonly string[] = [],
): string {
  if (!subjectId) return '';
  const hiddenSrcs = new Set(hiddenImageSrcs);
  return getCharacterTalkingPoses(subjectId).find((pose) => !hiddenSrcs.has(pose.src))?.src ?? '';
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

function getDefaultAdminLayout(subjectId?: AdminSubjectId): AdminLayout {
  const imageSrc = getDefaultTalkingImageSrc(subjectId);
  return {
    ...DEFAULT_ADMIN_LAYOUT,
    character: { ...DEFAULT_ADMIN_LAYOUT.character },
    table: { ...DEFAULT_ADMIN_LAYOUT.table },
    drink: { ...DEFAULT_ADMIN_LAYOUT.drink },
    cat: { ...DEFAULT_ADMIN_LAYOUT.cat },
    bubble: { ...DEFAULT_ADMIN_LAYOUT.bubble },
    order: { ...DEFAULT_ADMIN_LAYOUT.order },
    patience: { ...DEFAULT_ADMIN_LAYOUT.patience },
    characterScale: DEFAULT_ADMIN_LAYOUT.characterScale,
    drinkScale: DEFAULT_ADMIN_LAYOUT.drinkScale,
    catScale: DEFAULT_ADMIN_LAYOUT.catScale,
    talking: {
      ...DEFAULT_ADMIN_LAYOUT.talking,
      character: { ...DEFAULT_ADMIN_LAYOUT.talking.character },
      cat: { ...DEFAULT_ADMIN_LAYOUT.talking.cat },
      bubble: { ...DEFAULT_ADMIN_LAYOUT.talking.bubble },
      drink: { ...DEFAULT_ADMIN_LAYOUT.talking.drink },
      patience: { ...DEFAULT_ADMIN_LAYOUT.talking.patience },
      drinkScale: DEFAULT_ADMIN_LAYOUT.talking.drinkScale,
      defaultImageSrc: imageSrc,
      imageSrc,
      enabledImageSrcs: imageSrc ? [imageSrc] : [],
    },
  };
}

function normalizeAdminPosition(
  value: unknown,
  fallback: AdminPosition,
  bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 },
): AdminPosition {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminPosition>) : {};
  return {
    x: clamp(Math.floor(numericValue(parsed.x, fallback.x)), bounds.minX, bounds.maxX),
    y: clamp(Math.floor(numericValue(parsed.y, fallback.y)), bounds.minY, bounds.maxY),
  };
}

function clampAdminStagePosition(position: AdminPosition, item: AdminDragItem): AdminPosition {
  const minY = item === 'bubble' ? 2 : 6;
  if (item === 'character') {
    return {
      x: clamp(position.x, -40, 140),
      y: clamp(position.y, -30, 165),
    };
  }
  return {
    x: clamp(position.x, 4, 96),
    y: clamp(position.y, minY, 94),
  };
}

function seatSpotKey(slot: TableSlot): AdminSeatSpotKey {
  return String(slot) as AdminSeatSpotKey;
}

function normalizeAdminSeatSpot(
  value: unknown,
  fallback: AdminSeatSpot,
  scaleMax = 180,
): AdminSeatSpot {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminSeatSpot>) : {};
  return {
    marker: normalizeAdminPosition(parsed.marker, fallback.marker),
    emptyTable: normalizeAdminPosition(parsed.emptyTable, fallback.emptyTable ?? fallback.marker),
    drink: normalizeAdminPosition(parsed.drink, fallback.drink),
    order: normalizeAdminPosition(parsed.order, fallback.order),
    patience: normalizeAdminPosition(parsed.patience, fallback.patience),
    moodIcon: normalizeAdminPosition(parsed.moodIcon, fallback.moodIcon),
    scale: clamp(Math.floor(numericValue(parsed.scale, fallback.scale)), 55, scaleMax),
    drinkScale: clamp(Math.floor(numericValue(parsed.drinkScale, fallback.drinkScale)), 45, 250),
  };
}

function normalizeAdminSeatSpots(
  value: unknown,
  fallback: AdminSeatSpots = DEFAULT_ADMIN_SEAT_SPOTS,
  useDefaultDepthScales = false,
  scaleMax = 180,
): AdminSeatSpots {
  const source =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const spots = TABLE_SLOTS.reduce<AdminSeatSpots>((output, slot) => {
    const key = seatSpotKey(slot);
    output[key] = normalizeAdminSeatSpot(source[key], fallback[key], scaleMax);
    return output;
  }, {} as AdminSeatSpots);
  const savedScales = TABLE_SLOTS.map((slot) => {
    const valueForSlot = source[seatSpotKey(slot)];
    const parsed =
      valueForSlot != null && typeof valueForSlot === 'object'
        ? (valueForSlot as Partial<AdminSeatSpot>)
        : {};
    return parsed.scale;
  });
  const hasLegacyFlatScales =
    useDefaultDepthScales &&
    savedScales.every((scale) => Math.floor(numericValue(scale, 100)) === 100);

  if (hasLegacyFlatScales) {
    TABLE_SLOTS.forEach((slot) => {
      const key = seatSpotKey(slot);
      spots[key] = {
        ...spots[key],
        scale: fallback[key].scale,
        drinkScale: fallback[key].drinkScale,
      };
    });
  }

  return spots;
}

function hasLegacySeatSpots(source: Record<string, unknown>): boolean {
  return TABLE_SLOTS.some((slot) =>
    Object.prototype.hasOwnProperty.call(source, seatSpotKey(slot)),
  );
}

function normalizeAdminSeatSpotLayouts(value: unknown): AdminSeatSpotLayouts {
  const source =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const hasDepthVersion = source['__spotDepthVersion'] === ADMIN_SEAT_SPOT_DEPTH_VERSION;
  const fallback = hasLegacySeatSpots(source)
    ? normalizeAdminSeatSpots(source, DEFAULT_ADMIN_SEAT_SPOTS, !hasDepthVersion)
    : DEFAULT_ADMIN_SEAT_SPOTS;

  return ADMIN_SUBJECT_IDS.reduce<AdminSeatSpotLayouts>(
    (layouts, subjectId) => {
      layouts[subjectId] = normalizeAdminSeatSpots(source[subjectId], fallback, !hasDepthVersion);
      return layouts;
    },
    {
      [EMPTY_TABLE_SEAT_SPOTS_ID]: normalizeAdminSeatSpots(
        source[EMPTY_TABLE_SEAT_SPOTS_ID],
        fallback,
        !hasDepthVersion,
        300,
      ),
    },
  );
}

function loadAdminSeatSpotLayouts(): AdminSeatSpotLayouts {
  try {
    const raw = window.localStorage.getItem(ADMIN_SEAT_SPOTS_KEY);
    return normalizeAdminSeatSpotLayouts(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeAdminSeatSpotLayouts({});
  }
}

function saveAdminSeatSpotLayouts(layouts: AdminSeatSpotLayouts) {
  try {
    window.localStorage.setItem(
      ADMIN_SEAT_SPOTS_KEY,
      JSON.stringify({
        ...layouts,
        __spotDepthVersion: ADMIN_SEAT_SPOT_DEPTH_VERSION,
      }),
    );
  } catch {
    // Seat spot tuning is local-only; defaults are still available without storage.
  }
}

function getAdminSeatSpots(
  layouts: AdminSeatSpotLayouts,
  subjectId: AdminSubjectId,
): AdminSeatSpots {
  return normalizeAdminSeatSpots(layouts[subjectId]);
}

function getEmptyTableSeatSpots(layouts: AdminSeatSpotLayouts): AdminSeatSpots {
  return normalizeAdminSeatSpots(
    layouts[EMPTY_TABLE_SEAT_SPOTS_ID],
    DEFAULT_ADMIN_SEAT_SPOTS,
    false,
    300,
  );
}

function getAdminSeatSpot(spots: AdminSeatSpots, slot: TableSlot, scaleMax = 180): AdminSeatSpot {
  const key = seatSpotKey(slot);
  return normalizeAdminSeatSpot(spots[key], DEFAULT_ADMIN_SEAT_SPOTS[key], scaleMax);
}

function getCharacterAdminSeatSpot(
  layouts: AdminSeatSpotLayouts,
  subjectId: AdminSubjectId,
  slot: TableSlot,
): AdminSeatSpot {
  return getAdminSeatSpot(getAdminSeatSpots(layouts, subjectId), slot);
}

function normalizeAdminFaceBlocker(value: unknown, fallback: AdminFaceBlocker): AdminFaceBlocker {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminFaceBlocker>) : {};
  return {
    x: clamp(numericValue(parsed.x, fallback.x), -20, 120),
    y: clamp(numericValue(parsed.y, fallback.y), -20, 120),
    width: clamp(numericValue(parsed.width, fallback.width), 6, 48),
    height: clamp(numericValue(parsed.height, fallback.height), 6, 48),
  };
}

function normalizeAdminTalkingLayout(
  value: unknown,
  subjectId?: AdminSubjectId,
): AdminTalkingLayout {
  const fallback = getDefaultAdminLayout(subjectId).talking;
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminTalkingLayout>) : {};
  const poseSrcs = subjectId ? getCharacterTalkingPoses(subjectId).map((pose) => pose.src) : [];
  const rawImageSrc = typeof parsed.imageSrc === 'string' ? parsed.imageSrc : fallback.imageSrc;
  const rawDefaultImageSrc =
    typeof parsed.defaultImageSrc === 'string'
      ? parsed.defaultImageSrc
      : typeof parsed.imageSrc === 'string'
        ? parsed.imageSrc
        : fallback.defaultImageSrc;
  const rawHidden = Array.isArray(parsed.hiddenImageSrcs) ? parsed.hiddenImageSrcs : [];
  const hiddenImageSrcs = Array.from(
    new Set(
      rawHidden.filter(
        (src): src is string =>
          typeof src === 'string' &&
          (poseSrcs.length === 0 || poseSrcs.includes(src) || isCustomImageSrc(src)),
      ),
    ),
  );
  const imageSrc = hiddenImageSrcs.includes(rawImageSrc) ? '' : rawImageSrc || fallback.imageSrc;
  const defaultImageSrc = hiddenImageSrcs.includes(rawDefaultImageSrc)
    ? ''
    : rawDefaultImageSrc || fallback.defaultImageSrc;
  const rawEnabled = Array.isArray(parsed.enabledImageSrcs) ? parsed.enabledImageSrcs : [];
  const enabledImageSrcs = rawEnabled.filter(
    (src): src is string =>
      typeof src === 'string' &&
      (poseSrcs.length === 0 || poseSrcs.includes(src) || isCustomImageSrc(src)),
  );
  const safeEnabledImageSrcs = Array.from(
    new Set(
      [
        ...enabledImageSrcs,
        ...(defaultImageSrc ? [defaultImageSrc] : []),
        ...(imageSrc ? [imageSrc] : []),
      ].filter((src) => !hiddenImageSrcs.includes(src)),
    ),
  );

  return {
    character: normalizeAdminPosition(parsed.character, fallback.character, {
      minX: -40,
      maxX: 140,
      minY: -30,
      maxY: 165,
    }),
    cat: normalizeAdminPosition(parsed.cat, fallback.cat),
    bubble: normalizeAdminPosition(parsed.bubble, fallback.bubble),
    drink: normalizeAdminPosition(parsed.drink, fallback.drink),
    patience: normalizeAdminPosition(parsed.patience, fallback.patience),
    faceBlocker: normalizeAdminFaceBlocker(parsed.faceBlocker, fallback.faceBlocker),
    characterScale: clamp(
      Math.floor(numericValue(parsed.characterScale, fallback.characterScale)),
      45,
      250,
    ),
    drinkScale: clamp(Math.floor(numericValue(parsed.drinkScale, fallback.drinkScale)), 45, 250),
    catScale: clamp(Math.floor(numericValue(parsed.catScale, fallback.catScale)), 35, 250),
    defaultImageSrc,
    imageSrc,
    enabledImageSrcs: safeEnabledImageSrcs,
    hiddenImageSrcs,
  };
}

function normalizeAdminLayout(value: unknown, subjectId?: AdminSubjectId): AdminLayout {
  const fallback = getDefaultAdminLayout(subjectId);
  const parsed = value != null && typeof value === 'object' ? (value as Partial<AdminLayout>) : {};
  return {
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : fallback.enabled,
    character: normalizeAdminPosition(parsed.character, fallback.character),
    table: normalizeAdminPosition(parsed.table, fallback.table),
    drink: normalizeAdminPosition(parsed.drink, fallback.drink),
    cat: normalizeAdminPosition(parsed.cat, fallback.cat),
    bubble: normalizeAdminPosition(parsed.bubble, fallback.bubble),
    order: normalizeAdminPosition(parsed.order, fallback.order),
    patience: normalizeAdminPosition(parsed.patience, fallback.patience),
    characterScale: clamp(
      Math.floor(numericValue(parsed.characterScale, fallback.characterScale)),
      45,
      250,
    ),
    drinkScale: clamp(Math.floor(numericValue(parsed.drinkScale, fallback.drinkScale)), 45, 250),
    catScale: clamp(Math.floor(numericValue(parsed.catScale, fallback.catScale)), 45, 250),
    talking: normalizeAdminTalkingLayout(parsed.talking, subjectId),
  };
}

function normalizeAdminLayouts(value: unknown): AdminLayouts {
  const source =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return ADMIN_SUBJECT_IDS.reduce<AdminLayouts>((layouts, subjectId) => {
    layouts[subjectId] = normalizeAdminLayout(source[subjectId], subjectId);
    return layouts;
  }, {});
}

function loadAdminLayouts(): AdminLayouts {
  try {
    const raw = window.localStorage.getItem(ADMIN_LAYOUT_KEY);
    return normalizeAdminLayouts(raw ? JSON.parse(raw) : {});
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
    enabled: !CUSTOM_CHARACTER_IDS.includes(characterId),
    displayName: profile.name,
    tipStyle: profile.tipStyle,
    tipBase: profile.tipBase,
    patienceMs: profile.patienceMs,
    afterHoursComment: DEFAULT_AFTER_HOURS_COMMENT,
    portrait: getDefaultPortraitSettings(characterId),
  };
}

function tipStyleValue(value: unknown, fallback: TipStyle): TipStyle {
  return value === 'poor' || value === 'steady' || value === 'good' || value === 'high'
    ? value
    : fallback;
}

function isCustomImageSrc(src: string): boolean {
  return (
    src.startsWith('data:image/') ||
    src.startsWith('blob:') ||
    src.startsWith('/') ||
    /^https?:\/\//.test(src)
  );
}

function isAdminUploadImageSrc(src: string): boolean {
  return src.startsWith('/admin-uploads/') && !src.endsWith('/admin-state.json');
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
    rawImageSrc &&
    (poseSrcs.length === 0 || poseSrcs.includes(rawImageSrc) || isCustomImageSrc(rawImageSrc))
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
    enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : fallback.enabled,
    displayName:
      typeof parsed.displayName === 'string' && parsed.displayName.trim()
        ? parsed.displayName.trim()
        : fallback.displayName,
    tipStyle: tipStyleValue(parsed.tipStyle, fallback.tipStyle),
    tipBase: clamp(Math.floor(numericValue(parsed.tipBase, fallback.tipBase)), 0, 999),
    patienceMs: clamp(
      Math.floor(numericValue(parsed.patienceMs, fallback.patienceMs)),
      5_000,
      120_000,
    ),
    afterHoursComment:
      typeof parsed.afterHoursComment === 'string'
        ? parsed.afterHoursComment
        : fallback.afterHoursComment,
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

function adminChatKindValue(value: unknown, fallback: AdminChatKind): AdminChatKind {
  return value === 'story' ||
    value === 'comment' ||
    value === 'leave' ||
    value === 'order' ||
    value === 'happy'
    ? value
    : fallback;
}

function createAdminBubbleBlock(
  text = '',
  id = `bubble-${Date.now()}`,
  imageSrc = '',
): AdminChatBlock {
  return {
    id,
    kind: 'bubble',
    text,
    imageSrc,
    catReply: null,
  };
}

function createAdminCatReplyBlock(
  catReply: [KittyChatOption, KittyChatOption] = defaultAdminCatReply(),
  id = `cat-reply-${Date.now()}`,
): AdminChatBlock {
  return {
    id,
    kind: 'catReply',
    text: '',
    imageSrc: '',
    catReply,
  };
}

function defaultAdminChatEntry(
  subjectId: AdminSubjectId,
  kind: AdminChatKind,
  index: number,
): AdminChatEntry {
  const bubbleText =
    kind === 'story'
      ? ''
      : kind === 'leave'
        ? "Oh, you're closed. I should head out."
        : kind === 'order'
          ? 'I know what I would like today.'
          : kind === 'happy'
            ? 'That helped more than you know.'
            : 'Hello there kitty.';
  return {
    id: `${subjectId}-${kind}-${Date.now()}-${index}`,
    kind,
    title: kind === 'story' ? 'New Story' : `${ADMIN_CHAT_KIND_LABELS[kind]} ${index + 1}`,
    summary: '',
    startImageSrc: '',
    blocks: [createAdminBubbleBlock(bubbleText, `${subjectId}-${kind}-${Date.now()}-${index}-0`)],
    bubbles: [bubbleText],
    catReply: null,
    triggerStoryId: '',
    triggerDelayDays: 0,
    moodIconIds: [],
  };
}

function defaultAdminCatReply(): [KittyChatOption, KittyChatOption] {
  return [
    {
      id: 1,
      label: 'Meow',
      reply: '',
    },
    {
      id: 2,
      label: 'Meow',
      reply: '',
    },
  ];
}

function normalizeAdminCatReply(value: unknown): [KittyChatOption, KittyChatOption] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const defaults = defaultAdminCatReply();
  return [0, 1].map((index) => {
    const parsed =
      value[index] != null && typeof value[index] === 'object'
        ? (value[index] as Partial<KittyChatOption>)
        : {};
    return {
      id: index === 0 ? 1 : 2,
      label: 'Meow',
      reply: typeof parsed.reply === 'string' ? parsed.reply : defaults[index === 0 ? 0 : 1].reply,
    } satisfies KittyChatOption;
  }) as [KittyChatOption, KittyChatOption];
}

function normalizeAdminChatBlock(
  value: unknown,
  fallback: AdminChatBlock,
  entryId: string,
  index: number,
): AdminChatBlock | null {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminChatBlock>) : {};
  const kind: AdminChatBlockKind = parsed.kind === 'catReply' ? 'catReply' : 'bubble';
  if (kind === 'catReply') {
    const catReply = normalizeAdminCatReply(parsed.catReply) ?? fallback.catReply;
    if (!catReply) return null;
    return createAdminCatReplyBlock(
      catReply,
      typeof parsed.id === 'string' && parsed.id ? parsed.id : `${entryId}-cat-reply-${index}`,
    );
  }

  return createAdminBubbleBlock(
    typeof parsed.text === 'string' ? parsed.text : fallback.text,
    typeof parsed.id === 'string' && parsed.id ? parsed.id : `${entryId}-bubble-${index}`,
    typeof parsed.imageSrc === 'string' ? parsed.imageSrc : fallback.imageSrc,
  );
}

function getAdminChatBlocksFromLegacy(
  entryId: string,
  bubbles: string[],
  catReply: [KittyChatOption, KittyChatOption] | null,
): AdminChatBlock[] {
  const bubbleBlocks = (bubbles.length > 0 ? bubbles : ['']).map((bubble, index) =>
    createAdminBubbleBlock(bubble, `${entryId}-bubble-${index}`),
  );
  return catReply
    ? [...bubbleBlocks, createAdminCatReplyBlock(catReply, `${entryId}-cat-reply-0`)]
    : bubbleBlocks;
}

function syncAdminChatEntryBlocks(blocks: AdminChatBlock[]) {
  const safeBlocks = blocks.length > 0 ? blocks : [createAdminBubbleBlock('')];
  const bubbles = safeBlocks.filter((block) => block.kind === 'bubble').map((block) => block.text);
  const firstCatReply =
    safeBlocks.find((block) => block.kind === 'catReply' && block.catReply)?.catReply ?? null;

  return {
    blocks: safeBlocks,
    bubbles,
    catReply: firstCatReply,
  };
}

function normalizeAdminChatEntry(value: unknown, fallback: AdminChatEntry): AdminChatEntry {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminChatEntry>) : {};
  const rawBubbles = Array.isArray(parsed.bubbles) ? parsed.bubbles : fallback.bubbles;
  const bubbles = rawBubbles
    .filter((bubble): bubble is string => typeof bubble === 'string')
    .map((bubble) => bubble.trim());
  const entryId = typeof parsed.id === 'string' && parsed.id ? parsed.id : fallback.id;
  const catReply = normalizeAdminCatReply(parsed.catReply) ?? fallback.catReply;
  const fallbackBlocks =
    fallback.blocks.length > 0
      ? fallback.blocks
      : getAdminChatBlocksFromLegacy(fallback.id, fallback.bubbles, fallback.catReply);
  const fallbackBlock = fallbackBlocks[0] ?? createAdminBubbleBlock('', `${entryId}-bubble-0`);
  const rawBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
  const blocks =
    rawBlocks.length > 0
      ? rawBlocks
          .map((block, index) =>
            normalizeAdminChatBlock(block, fallbackBlocks[index] ?? fallbackBlock, entryId, index),
          )
          .filter((block): block is AdminChatBlock => block != null)
      : getAdminChatBlocksFromLegacy(
          entryId,
          bubbles.length > 0 ? bubbles : fallback.bubbles,
          catReply,
        );
  const synced = syncAdminChatEntryBlocks(blocks);

  return {
    id: entryId,
    kind: adminChatKindValue(parsed.kind, fallback.kind),
    title:
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : fallback.title,
    summary: typeof parsed.summary === 'string' ? parsed.summary : fallback.summary,
    startImageSrc:
      typeof parsed.startImageSrc === 'string' ? parsed.startImageSrc : fallback.startImageSrc,
    blocks: synced.blocks,
    bubbles: synced.bubbles,
    catReply: synced.catReply,
    triggerStoryId:
      typeof parsed.triggerStoryId === 'string' ? parsed.triggerStoryId : fallback.triggerStoryId,
    triggerDelayDays: clamp(
      Math.floor(numericValue(parsed.triggerDelayDays, fallback.triggerDelayDays)),
      0,
      365,
    ),
    moodIconIds: Array.isArray(parsed.moodIconIds)
      ? parsed.moodIconIds.filter((id): id is string => typeof id === 'string')
      : fallback.moodIconIds,
  };
}

function normalizeAdminRelationshipGroup(
  value: unknown,
  fallback: AdminRelationshipChatGroup,
): AdminRelationshipChatGroup {
  const parsed =
    value != null && typeof value === 'object'
      ? (value as Partial<AdminRelationshipChatGroup>)
      : {};
  const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : fallback.entries;
  const entries = rawEntries.map((entry, index) =>
    normalizeAdminChatEntry(
      entry,
      fallback.entries[index] ?? defaultAdminChatEntry('shadow', 'comment', index),
    ),
  );

  return {
    id: typeof parsed.id === 'string' && parsed.id ? parsed.id : fallback.id,
    threshold: clamp(
      Math.floor(numericValue(parsed.threshold, fallback.threshold)),
      0,
      MAX_RELATIONSHIP_SCORE,
    ),
    entries,
  };
}

function migrateAdminChatStoryTriggers(chats: AdminChats): AdminChats {
  const matthewShadowGroups = chats['matthew-shadow'];
  if (!matthewShadowGroups) return chats;

  return {
    ...chats,
    'matthew-shadow': matthewShadowGroups.map((group) => ({
      ...group,
      entries: group.entries.map((entry) =>
        entry.id === 'matthew-shadow-story-0' && !entry.triggerStoryId
          ? { ...entry, triggerStoryId: 'matthew-story-1', triggerDelayDays: 0 }
          : entry,
      ),
    })),
  };
}

function getDefaultAdminChatsForSubject(subjectId: AdminSubjectId): AdminRelationshipChatGroup[] {
  const customer = CUSTOMERS.find((item) => item.id === subjectId);
  const firstStoryTriggerId = subjectId === 'matthew-shadow' ? 'matthew-story-1' : '';
  const storyEntries: AdminChatEntry[] = customer
    ? [
        {
          id: `${subjectId}-story-0`,
          kind: 'story',
          title: customer.storyTitle,
          summary: customer.story,
          startImageSrc: '',
          catReply: customer.storyChoices
            ? [
                { ...customer.storyChoices[0], label: 'Meow' },
                { ...customer.storyChoices[1], label: 'Meow' },
              ]
            : null,
          blocks: customer.storyChoices
            ? [
                createAdminBubbleBlock(customer.story, `${subjectId}-story-0-bubble-0`),
                createAdminCatReplyBlock(
                  [
                    { ...customer.storyChoices[0], label: 'Meow' },
                    { ...customer.storyChoices[1], label: 'Meow' },
                  ],
                  `${subjectId}-story-0-cat-reply-0`,
                ),
              ]
            : [createAdminBubbleBlock(customer.story, `${subjectId}-story-0-bubble-0`)],
          bubbles: [customer.story],
          triggerStoryId: firstStoryTriggerId,
          triggerDelayDays: 0,
          moodIconIds: [],
        },
        ...customer.followUps.map<AdminChatEntry>((story, index) => ({
          id: `${subjectId}-story-${index + 1}`,
          kind: 'story',
          title: story.title,
          summary: story.text,
          startImageSrc: '',
          catReply: story.choices
            ? [
                { ...story.choices[0], label: 'Meow' },
                { ...story.choices[1], label: 'Meow' },
              ]
            : null,
          blocks: story.choices
            ? [
                createAdminBubbleBlock(story.text, `${subjectId}-story-${index + 1}-bubble-0`),
                createAdminCatReplyBlock(
                  [
                    { ...story.choices[0], label: 'Meow' },
                    { ...story.choices[1], label: 'Meow' },
                  ],
                  `${subjectId}-story-${index + 1}-cat-reply-0`,
                ),
              ]
            : [createAdminBubbleBlock(story.text, `${subjectId}-story-${index + 1}-bubble-0`)],
          bubbles: [story.text],
          triggerStoryId: index === 0 ? `${subjectId}-story-0` : `${subjectId}-story-${index}`,
          triggerDelayDays: subjectId === 'matthew' && index === 0 ? 5 : 0,
          moodIconIds: [],
        })),
      ]
    : [];

  return [
    {
      id: `${subjectId}-relationship-0`,
      threshold: 0,
      entries: [
        ...storyEntries,
        {
          id: `${subjectId}-comment-0`,
          kind: 'comment',
          title: 'Comment 1',
          summary: '',
          startImageSrc: '',
          blocks: [createAdminBubbleBlock('Hello there kitty.', `${subjectId}-comment-0-bubble-0`)],
          bubbles: ['Hello there kitty.'],
          catReply: null,
          triggerStoryId: '',
          triggerDelayDays: 0,
          moodIconIds: [],
        },
        {
          id: `${subjectId}-comment-1`,
          kind: 'comment',
          title: 'Comment 2',
          summary: '',
          startImageSrc: '',
          blocks: [
            createAdminBubbleBlock(
              'I hope today is good for you.',
              `${subjectId}-comment-1-bubble-0`,
            ),
          ],
          bubbles: ['I hope today is good for you.'],
          catReply: null,
          triggerStoryId: '',
          triggerDelayDays: 0,
          moodIconIds: [],
        },
      ],
    },
    {
      id: `${subjectId}-relationship-50`,
      threshold: 50,
      entries: [],
    },
  ];
}

function normalizeAdminChats(value: unknown): AdminChats {
  const source =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const sourceVersion = Math.floor(numericValue(source['__chatVersion'], 1));

  const chats = ADMIN_SUBJECT_IDS.reduce<AdminChats>((nextChats, subjectId) => {
    const defaults = getDefaultAdminChatsForSubject(subjectId);
    const fallbackGroup = defaults[0] ?? {
      id: `${subjectId}-relationship-0`,
      threshold: 0,
      entries: [],
    };
    const rawGroups = Array.isArray(source[subjectId]) ? (source[subjectId] as unknown[]) : [];
    nextChats[subjectId] = (rawGroups.length > 0 ? rawGroups : defaults).map((group, index) =>
      normalizeAdminRelationshipGroup(group, defaults[index] ?? fallbackGroup),
    );
    return nextChats;
  }, {});

  return sourceVersion < ADMIN_CHATS_SCHEMA_VERSION ? migrateAdminChatStoryTriggers(chats) : chats;
}

function loadAdminChats(): AdminChats {
  try {
    const raw = window.localStorage.getItem(ADMIN_CHATS_KEY);
    return normalizeAdminChats(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizeAdminChats({});
  }
}

function saveAdminChats(chats: AdminChats) {
  try {
    window.localStorage.setItem(
      ADMIN_CHATS_KEY,
      JSON.stringify({
        ...chats,
        __chatVersion: ADMIN_CHATS_SCHEMA_VERSION,
      }),
    );
  } catch {
    // Chat authoring is local-only for now; defaults keep the editor usable.
  }
}

function createEmptyAdminChats(): AdminChats {
  return ADMIN_SUBJECT_IDS.reduce<AdminChats>((chats, subjectId) => {
    chats[subjectId] = [
      {
        id: `${subjectId}-relationship-0`,
        threshold: 0,
        entries: [],
      },
    ];
    return chats;
  }, {});
}

function normalizeSpreadsheetHeader(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (
    normalized === 'rep' ||
    normalized === 'repneed' ||
    normalized === 'repneeded' ||
    normalized === 'reprequired' ||
    normalized === 'requiredrep' ||
    normalized === 'relationship' ||
    normalized === 'relationshipneed' ||
    normalized === 'relationshipneeded' ||
    normalized === 'relationshiprequired' ||
    normalized === 'requiredrelationship' ||
    normalized === 'bondneeded' ||
    normalized === 'bondrequired' ||
    normalized === 'trustneeded' ||
    normalized === 'trustrequired'
  ) {
    return 'repneeded';
  }
  return normalized;
}

function spreadsheetNumericValue(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSpreadsheetName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function spreadsheetIdPart(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'chat'
  );
}

function spreadsheetEntryId(value: string, fallback: string, usedIds: Set<string>): string {
  const baseId = value.trim().replace(/\s+/g, '_') || fallback;
  let nextId = baseId;
  let suffix = 2;
  while (usedIds.has(nextId)) {
    nextId = `${baseId}_${suffix}`;
    suffix += 1;
  }
  usedIds.add(nextId);
  return nextId;
}

function parseImportedTrigger(value: string): { triggerStoryId: string; triggerDelayDays: number } {
  const trimmed = value.trim();
  if (!trimmed) return { triggerStoryId: '', triggerDelayDays: 0 };

  const delayMatch = trimmed.match(/^(.*?)(?:\s*[+,;|]\s*|\s+)(\d+)\s*d(?:ays?)?$/i);
  if (!delayMatch) return { triggerStoryId: trimmed, triggerDelayDays: 0 };

  return {
    triggerStoryId: (delayMatch[1] ?? '').trim(),
    triggerDelayDays: clamp(Math.floor(spreadsheetNumericValue(delayMatch[2], 0)), 0, 365),
  };
}

function getAdminSubjectIdForSheetName(
  sheetName: string,
  characterSettings: AdminCharacterSettings,
): AdminSubjectId | null {
  const normalizedSheetName = normalizeSpreadsheetName(sheetName);
  return (
    ADMIN_SUBJECT_IDS.find((subjectId) => {
      const customer = getAdminSubjectCustomer(subjectId, characterSettings);
      return (
        normalizeSpreadsheetName(subjectId) === normalizedSheetName ||
        normalizeSpreadsheetName(customer.name) === normalizedSheetName
      );
    }) ?? null
  );
}

function importChatKindValue(value: string): AdminChatKind {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'story') return 'story';
  if (normalized === 'leave') return 'leave';
  if (normalized === 'order') return 'order';
  if (normalized === 'happy') return 'happy';
  return 'comment';
}

function xmlAttribute(
  element: Element,
  namespace: string,
  localName: string,
  prefixedName: string,
): string {
  return (
    element.getAttributeNS(namespace, localName) ??
    element.getAttribute(prefixedName) ??
    element.getAttribute(localName) ??
    ''
  );
}

function odsCellText(cell: Element): string {
  const officeNamespace = 'urn:oasis:names:tc:opendocument:xmlns:office:1.0';
  const paragraphs = Array.from(
    cell.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:text:1.0', 'p'),
  );
  const text = paragraphs
    .map((paragraph) => paragraph.textContent ?? '')
    .filter(Boolean)
    .join('\n')
    .trim();
  if (text) return text;
  return (
    xmlAttribute(cell, officeNamespace, 'value', 'office:value') ||
    xmlAttribute(cell, officeNamespace, 'string-value', 'office:string-value')
  ).trim();
}

function parseOdsTables(contentXml: string): Array<{ name: string; rows: string[][] }> {
  const tableNamespace = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0';
  const document = new DOMParser().parseFromString(contentXml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('Could not read the spreadsheet XML.');

  return Array.from(document.getElementsByTagNameNS(tableNamespace, 'table')).map((table) => {
    const name = xmlAttribute(table, tableNamespace, 'name', 'table:name') || 'Sheet';
    const rows = Array.from(table.getElementsByTagNameNS(tableNamespace, 'table-row')).flatMap(
      (row) => {
        const rowRepeat = Math.max(
          1,
          Math.floor(
            spreadsheetNumericValue(
              xmlAttribute(
                row,
                tableNamespace,
                'number-rows-repeated',
                'table:number-rows-repeated',
              ),
              1,
            ),
          ),
        );
        const values: string[] = [];
        Array.from(row.children).forEach((cell) => {
          if (cell.localName !== 'table-cell') return;
          const columnRepeat = Math.min(
            64,
            Math.max(
              1,
              Math.floor(
                spreadsheetNumericValue(
                  xmlAttribute(
                    cell,
                    tableNamespace,
                    'number-columns-repeated',
                    'table:number-columns-repeated',
                  ),
                  1,
                ),
              ),
            ),
          );
          const value = odsCellText(cell);
          for (let index = 0; index < columnRepeat && values.length < 64; index += 1) {
            values.push(value);
          }
        });
        if (!values.some((value) => value.trim())) return [];
        return Array.from({ length: Math.min(rowRepeat, 1) }, () => values);
      },
    );
    return { name, rows };
  });
}

function createImportedChatEntry(
  id: string,
  kind: AdminChatKind,
  title: string,
  summary: string,
  triggerStoryId: string,
  triggerDelayDays: number,
  textValues: string[],
  rowIndex: number,
): AdminChatEntry | null {
  const blocks = textValues
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value, index) =>
      value.toUpperCase() === 'PLAYERREPLY'
        ? createAdminCatReplyBlock(defaultAdminCatReply(), `${id}-reply-${index}`)
        : createAdminBubbleBlock(value, `${id}-bubble-${index}`),
    );
  const synced = syncAdminChatEntryBlocks(blocks);
  const firstLine = synced.bubbles.find((bubble) => bubble.trim()) ?? '';
  if (synced.blocks.length === 0 || !firstLine) return null;

  const safeTitle =
    title.trim() ||
    (kind === 'story'
      ? `Story ${rowIndex}`
      : kind === 'comment'
        ? firstLine || `Comment ${rowIndex}`
        : kind === 'happy'
          ? firstLine || `Happy ${rowIndex}`
          : `${ADMIN_CHAT_KIND_LABELS[kind]} ${rowIndex}`);
  const safeSummary = summary.trim() || synced.bubbles.join(' ');

  return {
    id,
    kind,
    title: safeTitle,
    summary: safeSummary,
    startImageSrc: '',
    blocks: synced.blocks,
    bubbles: synced.bubbles,
    catReply: synced.catReply,
    triggerStoryId: kind === 'story' ? triggerStoryId : '',
    triggerDelayDays: kind === 'story' && triggerStoryId ? triggerDelayDays : 0,
    moodIconIds: [],
  };
}

function importChatRowsForSubject(
  subjectId: AdminSubjectId,
  rows: string[][],
): AdminRelationshipChatGroup[] {
  const headerIndex = rows.findIndex((row) =>
    row.some((value) => normalizeSpreadsheetHeader(value) === 'type'),
  );
  if (headerIndex < 0) return [];

  const headerRow = rows[headerIndex];
  if (!headerRow) return [];

  const headers = headerRow.map(normalizeSpreadsheetHeader);
  const thresholdIndex = headers.findIndex((header) => header === 'repneeded');
  const idIndex = headers.findIndex((header) => header === 'id' || header === 'chatid');
  const typeIndex = headers.findIndex((header) => header === 'type');
  const titleIndex = headers.findIndex(
    (header) => header === 'storytitle' || header === 'title' || header === 'story',
  );
  const triggerIndex = headers.findIndex(
    (header) => header === 'trigger' || header === 'triggerstory' || header === 'triggerstoryid',
  );
  const summaryIndex = headers.findIndex(
    (header) => header === 'summary' || header === 'description' || header === 'synopsis',
  );
  const textIndexes = headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => header === 'text' || /^text\d+$/.test(header))
    .map(({ index }) => index);

  if (typeIndex < 0) return [];

  const groupsByThreshold = new Map<number, AdminRelationshipChatGroup>();
  const usedIds = new Set<string>();
  const firstFallbackTextIndex =
    Math.max(idIndex, thresholdIndex, typeIndex, titleIndex, triggerIndex, summaryIndex) + 1;
  rows.slice(headerIndex + 1).forEach((row, rowOffset) => {
    const threshold = clamp(
      Math.floor(spreadsheetNumericValue(thresholdIndex >= 0 ? row[thresholdIndex] : 0, 0)),
      0,
      MAX_RELATIONSHIP_SCORE,
    );
    const kind = importChatKindValue(row[typeIndex] ?? '');
    const title = titleIndex >= 0 ? (row[titleIndex] ?? '') : '';
    const fallbackId = `import-${subjectId}-${threshold}-${spreadsheetIdPart(kind)}-${rowOffset + 1}`;
    const id = spreadsheetEntryId(idIndex >= 0 ? (row[idIndex] ?? '') : '', fallbackId, usedIds);
    const summary = summaryIndex >= 0 ? (row[summaryIndex] ?? '') : '';
    const trigger = parseImportedTrigger(triggerIndex >= 0 ? (row[triggerIndex] ?? '') : '');
    const indexedTextValues = textIndexes.map((index) => row[index] ?? '');
    const textValues = indexedTextValues.some((value) => value.trim())
      ? indexedTextValues
      : row.slice(Math.max(firstFallbackTextIndex, 0));
    const entry = createImportedChatEntry(
      id,
      kind,
      title,
      summary,
      trigger.triggerStoryId,
      trigger.triggerDelayDays,
      textValues,
      rowOffset + 1,
    );
    if (!entry) return;

    const group =
      groupsByThreshold.get(threshold) ??
      ({
        id: `${subjectId}-relationship-${threshold}`,
        threshold,
        entries: [],
      } satisfies AdminRelationshipChatGroup);
    group.entries.push(entry);
    groupsByThreshold.set(threshold, group);
  });

  return Array.from(groupsByThreshold.values()).sort((a, b) => a.threshold - b.threshold);
}

async function importChatsFromOdsFile(
  file: File,
  currentChats: AdminChats,
  characterSettings: AdminCharacterSettings,
): Promise<{
  chats: AdminChats;
  importedEntries: number;
  importedSheets: string[];
  skippedSheets: string[];
}> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentXml = unzipSync(bytes)['content.xml'];
  if (!contentXml) throw new Error('This .ods file does not contain content.xml.');

  const nextChats: AdminChats = { ...currentChats };
  const importedSheets: string[] = [];
  const skippedSheets: string[] = [];
  let importedEntries = 0;

  parseOdsTables(strFromU8(contentXml)).forEach((table) => {
    const subjectId = getAdminSubjectIdForSheetName(table.name, characterSettings);
    if (!subjectId) {
      if (table.rows.length > 0) skippedSheets.push(table.name);
      return;
    }

    const groups = importChatRowsForSubject(subjectId, table.rows);
    if (groups.length === 0) {
      skippedSheets.push(table.name);
      return;
    }

    nextChats[subjectId] = groups;
    importedSheets.push(table.name);
    importedEntries += groups.reduce((total, group) => total + group.entries.length, 0);
  });

  return {
    chats: normalizeAdminChats(nextChats),
    importedEntries,
    importedSheets,
    skippedSheets,
  };
}

function normalizeAdminMoodIcon(value: unknown, fallback: AdminMoodIcon): AdminMoodIcon {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminMoodIcon>) : {};
  return {
    id: typeof parsed.id === 'string' && parsed.id ? parsed.id : fallback.id,
    name:
      typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallback.name,
    src: typeof parsed.src === 'string' && parsed.src ? parsed.src : fallback.src,
  };
}

function normalizeAdminMoodIcons(value: unknown): AdminMoodIcon[] {
  const rawIcons = Array.isArray(value) ? value : [];
  const icons = rawIcons
    .map((icon, index) =>
      normalizeAdminMoodIcon(icon, {
        id: `mood-icon-${index}`,
        name: `Mood Icon ${index + 1}`,
        src: DEFAULT_MOOD_ICON_SRC,
      }),
    )
    .filter((icon) => icon.src);

  return icons.length > 0 ? icons : DEFAULT_ADMIN_MOOD_ICONS;
}

function loadAdminMoodIcons(): AdminMoodIcon[] {
  try {
    const raw = window.localStorage.getItem(ADMIN_MOOD_ICONS_KEY);
    return normalizeAdminMoodIcons(raw ? JSON.parse(raw) : DEFAULT_ADMIN_MOOD_ICONS);
  } catch {
    return DEFAULT_ADMIN_MOOD_ICONS;
  }
}

function saveAdminMoodIcons(icons: AdminMoodIcon[]) {
  try {
    window.localStorage.setItem(
      ADMIN_MOOD_ICONS_KEY,
      JSON.stringify(normalizeAdminMoodIcons(icons)),
    );
  } catch {
    // Mood icon tuning is local-only; defaults keep the editor usable.
  }
}

function normalizeAdminChatMenuItem(
  value: unknown,
  fallback: AdminChatMenuItem,
): AdminChatMenuItem {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminChatMenuItem>) : {};
  const imageSrc = typeof parsed.imageSrc === 'string' ? parsed.imageSrc : fallback.imageSrc;
  const textEnabled =
    typeof parsed.textEnabled === 'boolean'
      ? parsed.textEnabled
      : imageSrc
        ? false
        : fallback.textEnabled;
  return {
    position: normalizeAdminPosition(parsed.position, fallback.position),
    imageSrc,
    servedImageSrc:
      typeof parsed.servedImageSrc === 'string' ? parsed.servedImageSrc : fallback.servedImageSrc,
    imagePosition: normalizeAdminPosition(parsed.imagePosition, fallback.imagePosition),
    imageScale: clamp(Math.floor(numericValue(parsed.imageScale, fallback.imageScale)), 35, 260),
    hexScale: clamp(Math.floor(numericValue(parsed.hexScale, fallback.hexScale)), 45, 180),
    textEnabled,
    layer: clamp(Math.floor(numericValue(parsed.layer, fallback.layer)), -10, 20),
  };
}

function normalizeAdminChatMenuSettings(value: unknown): AdminChatMenuSettings {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminChatMenuSettings>) : {};
  const rawItems =
    parsed.items != null && typeof parsed.items === 'object'
      ? (parsed.items as Partial<Record<CatActionId, unknown>>)
      : {};

  return {
    position: normalizeAdminPosition(parsed.position, DEFAULT_CHAT_MENU_SETTINGS.position),
    scale: clamp(Math.floor(numericValue(parsed.scale, DEFAULT_CHAT_MENU_SETTINGS.scale)), 50, 220),
    backgroundImageSrc:
      typeof parsed.backgroundImageSrc === 'string' ? parsed.backgroundImageSrc : '',
    backgroundScale: clamp(
      Math.floor(numericValue(parsed.backgroundScale, DEFAULT_CHAT_MENU_SETTINGS.backgroundScale)),
      20,
      220,
    ),
    backgroundLayer: clamp(
      Math.floor(numericValue(parsed.backgroundLayer, DEFAULT_CHAT_MENU_SETTINGS.backgroundLayer)),
      -10,
      20,
    ),
    items: CAT_ACTION_IDS.reduce<Record<CatActionId, AdminChatMenuItem>>(
      (items, actionId) => {
        items[actionId] = normalizeAdminChatMenuItem(
          rawItems[actionId],
          DEFAULT_CHAT_MENU_SETTINGS.items[actionId],
        );
        return items;
      },
      {} as Record<CatActionId, AdminChatMenuItem>,
    ),
  };
}

function loadAdminChatMenuSettings(): AdminChatMenuSettings {
  try {
    const raw = window.localStorage.getItem(ADMIN_CHAT_MENU_KEY);
    return normalizeAdminChatMenuSettings(raw ? JSON.parse(raw) : DEFAULT_CHAT_MENU_SETTINGS);
  } catch {
    return DEFAULT_CHAT_MENU_SETTINGS;
  }
}

function saveAdminChatMenuSettings(settings: AdminChatMenuSettings) {
  try {
    window.localStorage.setItem(
      ADMIN_CHAT_MENU_KEY,
      JSON.stringify(normalizeAdminChatMenuSettings(settings)),
    );
  } catch {
    // Chat menu art can be too large for localStorage; IndexedDB keeps the larger copy.
  }
}

function normalizeAdminCatSettings(value: unknown): AdminCatSettings {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminCatSettings>) : {};
  return CAT_POSE_KEYS.reduce<AdminCatSettings>(
    (settings, poseKey) => {
      settings[poseKey] = typeof parsed[poseKey] === 'string' ? parsed[poseKey] : '';
      return settings;
    },
    { ...DEFAULT_CAT_SETTINGS },
  );
}

function loadAdminCatSettings(): AdminCatSettings {
  try {
    const raw = window.localStorage.getItem(ADMIN_CAT_SETTINGS_KEY);
    return normalizeAdminCatSettings(raw ? JSON.parse(raw) : DEFAULT_CAT_SETTINGS);
  } catch {
    return DEFAULT_CAT_SETTINGS;
  }
}

function saveAdminCatSettings(settings: AdminCatSettings) {
  try {
    window.localStorage.setItem(
      ADMIN_CAT_SETTINGS_KEY,
      JSON.stringify(normalizeAdminCatSettings(settings)),
    );
  } catch {
    // Cat art can be too large for localStorage; IndexedDB keeps the larger copy.
  }
}

function openAdminLargeDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(ADMIN_LARGE_DB_NAME, ADMIN_LARGE_DB_VERSION);

    request.addEventListener('upgradeneeded', () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ADMIN_LARGE_STORE_NAME)) {
        db.createObjectStore(ADMIN_LARGE_STORE_NAME);
      }
    });

    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => resolve(null));
    request.addEventListener('blocked', () => resolve(null));
  });
}

async function loadAdminLargeRecord<T>(
  key: string,
  normalize: (value: unknown) => T,
): Promise<T | null> {
  const db = await openAdminLargeDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const finish = (value: T | null) => {
      db.close();
      resolve(value);
    };

    try {
      const transaction = db.transaction(ADMIN_LARGE_STORE_NAME, 'readonly');
      const request = transaction.objectStore(ADMIN_LARGE_STORE_NAME).get(key);
      request.addEventListener('success', () => {
        finish(request.result == null ? null : normalize(request.result));
      });
      request.addEventListener('error', () => finish(null));
      transaction.addEventListener('error', () => finish(null));
      transaction.addEventListener('abort', () => finish(null));
    } catch {
      finish(null);
    }
  });
}

async function saveAdminLargeRecord(key: string, value: unknown): Promise<boolean> {
  const db = await openAdminLargeDb();
  if (!db) return false;

  return new Promise((resolve) => {
    const finish = (saved: boolean) => {
      db.close();
      resolve(saved);
    };

    try {
      const transaction = db.transaction(ADMIN_LARGE_STORE_NAME, 'readwrite');
      transaction.objectStore(ADMIN_LARGE_STORE_NAME).put(value, key);
      transaction.addEventListener('complete', () => finish(true));
      transaction.addEventListener('error', () => finish(false));
      transaction.addEventListener('abort', () => finish(false));
    } catch {
      finish(false);
    }
  });
}

function normalizeAdminPortableState(value: unknown): AdminPortableState {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminPortableState>) : {};
  return {
    version: 1,
    layouts: normalizeAdminLayouts(parsed.layouts),
    seatSpots: normalizeAdminSeatSpotLayouts(parsed.seatSpots),
    characterSettings: normalizeAdminCharacterSettings(parsed.characterSettings),
    chats: normalizeAdminChats(parsed.chats),
    moodIcons: normalizeAdminMoodIcons(parsed.moodIcons),
    chatMenu: normalizeAdminChatMenuSettings(parsed.chatMenu),
    catSettings: normalizeAdminCatSettings(parsed.catSettings),
    openingSettings: normalizeOpeningSettings(parsed.openingSettings),
  };
}

async function loadAdminPortableState(): Promise<AdminPortableState | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ADMIN_PORTABLE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${resolveAssetSrc(ADMIN_PORTABLE_STATE_SRC)}?v=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return normalizeAdminPortableState(await response.json());
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function saveAdminPortableState(state: AdminPortableState): Promise<boolean> {
  if (!import.meta.env.DEV) return false;

  try {
    const response = await fetch('/__admin/save-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizeAdminPortableState(state)),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function openingActorValue(value: unknown, fallback: OpeningActor): OpeningActor {
  return value === 'lila' || value === 'grace' || value === 'narrator' ? value : fallback;
}

function openingSideValue(value: unknown, fallback: OpeningSide): OpeningSide {
  return value === 'left' || value === 'right' || value === 'none' ? value : fallback;
}

function openingLocationDetailValue(value: string): string {
  return value.trim() === LEGACY_OPENING_LOCATION_DETAIL ? OPENING_LOCATION_DETAIL : value;
}

function openingSpeakerName(actor: OpeningActor, settings?: AdminOpeningSettings): string {
  if (actor === 'lila') return 'Lila';
  if (actor === 'grace') return 'Grace';
  return settings?.locationName || DEFAULT_OPENING_SETTINGS.locationName;
}

function normalizeOpeningBeat(value: unknown, fallback: AdminOpeningBeat): AdminOpeningBeat {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminOpeningBeat>) : {};
  const actor = openingActorValue(parsed.actor, fallback.actor);
  const legacyImageId = typeof parsed.imageId === 'string' ? parsed.imageId : '';
  const fallbackLilaImageId = fallback.lilaImageId ?? OPENING_IMAGE_NONE;
  const fallbackGraceImageId = fallback.graceImageId ?? OPENING_IMAGE_NONE;
  return {
    id: typeof parsed.id === 'string' && parsed.id ? parsed.id : fallback.id,
    actor,
    speaker:
      typeof parsed.speaker === 'string' && parsed.speaker.trim()
        ? parsed.speaker.trim()
        : fallback.speaker,
    text:
      typeof parsed.text === 'string'
        ? openingLocationDetailValue(parsed.text)
        : openingLocationDetailValue(fallback.text),
    side: openingSideValue(parsed.side, fallback.side),
    backgroundSrc:
      typeof parsed.backgroundSrc === 'string' ? parsed.backgroundSrc : fallback.backgroundSrc,
    lilaImageId:
      typeof parsed.lilaImageId === 'string'
        ? parsed.lilaImageId
        : actor === 'lila' && legacyImageId
          ? legacyImageId
          : fallbackLilaImageId,
    graceImageId:
      typeof parsed.graceImageId === 'string'
        ? parsed.graceImageId
        : actor === 'grace' && legacyImageId
          ? legacyImageId
          : fallbackGraceImageId,
    lilaPlacement: normalizeOpeningPlacement(parsed.lilaPlacement, fallback.lilaPlacement),
    gracePlacement: normalizeOpeningPlacement(parsed.gracePlacement, fallback.gracePlacement),
    lilaFlipped:
      typeof parsed.lilaFlipped === 'boolean' ? parsed.lilaFlipped : fallback.lilaFlipped,
    graceFlipped:
      typeof parsed.graceFlipped === 'boolean' ? parsed.graceFlipped : fallback.graceFlipped,
    imageId: typeof parsed.imageId === 'string' ? parsed.imageId : fallback.imageId,
  };
}

function normalizeOpeningImage(value: unknown, fallback: AdminOpeningImage): AdminOpeningImage {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminOpeningImage>) : {};
  return {
    id: typeof parsed.id === 'string' && parsed.id ? parsed.id : fallback.id,
    label:
      typeof parsed.label === 'string' && parsed.label.trim()
        ? parsed.label.trim()
        : fallback.label,
    src: typeof parsed.src === 'string' ? parsed.src : fallback.src,
  };
}

function normalizeOpeningImages(
  value: unknown,
  legacySrc: unknown,
  actorLabel: 'Lila' | 'Grace',
): AdminOpeningImage[] {
  const rawImages = Array.isArray(value) ? value : [];
  const images = rawImages
    .map((image, index) =>
      normalizeOpeningImage(image, {
        id: `${actorLabel.toLowerCase()}-opening-${index}`,
        label: `${actorLabel} ${index + 1}`,
        src: '',
      }),
    )
    .filter((image) => image.src);

  if (images.length > 0) return images;
  return typeof legacySrc === 'string' && legacySrc
    ? [
        {
          id: `${actorLabel.toLowerCase()}-opening-legacy`,
          label: `${actorLabel} 1`,
          src: legacySrc,
        },
      ]
    : [];
}

function normalizeOpeningPlacement(
  value: unknown,
  fallback: AdminOpeningPlacement,
): AdminOpeningPlacement {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminOpeningPlacement>) : {};
  return {
    x: clamp(numericValue(parsed.x, fallback.x), -60, 160),
    y: clamp(numericValue(parsed.y, fallback.y), -20, 140),
    scale: clamp(Math.floor(numericValue(parsed.scale, fallback.scale)), 40, 500),
  };
}

function normalizeOpeningSettings(value: unknown): AdminOpeningSettings {
  const parsed =
    value != null && typeof value === 'object' ? (value as Partial<AdminOpeningSettings>) : {};
  const rawBeats = Array.isArray(parsed.beats) ? parsed.beats : DEFAULT_OPENING_BEATS;
  const lilaImages = normalizeOpeningImages(parsed.lilaImages, parsed.lilaImageSrc, 'Lila');
  const graceImages = normalizeOpeningImages(parsed.graceImages, parsed.graceImageSrc, 'Grace');
  const fallbackBeat = DEFAULT_OPENING_BEATS[0] ?? {
    id: 'opening-location',
    actor: 'narrator' as const,
    speaker: DEFAULT_CAFE_NAME,
    text: OPENING_LOCATION_DETAIL,
    side: 'none' as const,
    backgroundSrc: '',
    lilaImageId: OPENING_IMAGE_NONE,
    graceImageId: OPENING_IMAGE_NONE,
    lilaPlacement: DEFAULT_OPENING_LILA_PLACEMENT,
    gracePlacement: DEFAULT_OPENING_GRACE_PLACEMENT,
    lilaFlipped: false,
    graceFlipped: false,
    imageId: '',
  };
  const beats = rawBeats.map((beat, index) =>
    normalizeOpeningBeat(beat, DEFAULT_OPENING_BEATS[index] ?? fallbackBeat),
  );

  return {
    locationName:
      typeof parsed.locationName === 'string' && parsed.locationName.trim()
        ? parsed.locationName.trim()
        : DEFAULT_OPENING_SETTINGS.locationName,
    locationDetail:
      typeof parsed.locationDetail === 'string' && parsed.locationDetail.trim()
        ? openingLocationDetailValue(parsed.locationDetail.trim())
        : DEFAULT_OPENING_SETTINGS.locationDetail,
    backgroundSrc: typeof parsed.backgroundSrc === 'string' ? parsed.backgroundSrc : '',
    lilaImageSrc:
      typeof parsed.lilaImageSrc === 'string' && parsed.lilaImageSrc
        ? parsed.lilaImageSrc
        : (lilaImages[0]?.src ?? ''),
    graceImageSrc:
      typeof parsed.graceImageSrc === 'string' && parsed.graceImageSrc
        ? parsed.graceImageSrc
        : (graceImages[0]?.src ?? ''),
    lilaImages,
    graceImages,
    lilaPlacement: normalizeOpeningPlacement(
      parsed.lilaPlacement,
      DEFAULT_OPENING_SETTINGS.lilaPlacement,
    ),
    gracePlacement: normalizeOpeningPlacement(
      parsed.gracePlacement,
      DEFAULT_OPENING_SETTINGS.gracePlacement,
    ),
    beats: beats.length > 0 ? beats : DEFAULT_OPENING_BEATS,
  };
}

function loadOpeningSettings(): AdminOpeningSettings {
  try {
    const raw = window.localStorage.getItem(ADMIN_OPENING_KEY);
    return normalizeOpeningSettings(raw ? JSON.parse(raw) : DEFAULT_OPENING_SETTINGS);
  } catch {
    return DEFAULT_OPENING_SETTINGS;
  }
}

function saveOpeningSettings(settings: AdminOpeningSettings): boolean {
  try {
    window.localStorage.setItem(
      ADMIN_OPENING_KEY,
      JSON.stringify(normalizeOpeningSettings(settings)),
    );
    return true;
  } catch {
    // Opening authoring is local-only; defaults keep the intro playable.
    return false;
  }
}

function openOpeningSettingsDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const request = window.indexedDB.open(ADMIN_OPENING_DB_NAME, ADMIN_OPENING_DB_VERSION);

    request.addEventListener('upgradeneeded', () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ADMIN_OPENING_STORE_NAME)) {
        db.createObjectStore(ADMIN_OPENING_STORE_NAME);
      }
    });

    request.addEventListener('success', () => resolve(request.result));
    request.addEventListener('error', () => resolve(null));
    request.addEventListener('blocked', () => resolve(null));
  });
}

async function loadOpeningSettingsFromIndexedDb(): Promise<AdminOpeningSettings | null> {
  const db = await openOpeningSettingsDb();
  if (!db) return null;

  return new Promise((resolve) => {
    const finish = (settings: AdminOpeningSettings | null) => {
      db.close();
      resolve(settings);
    };

    try {
      const transaction = db.transaction(ADMIN_OPENING_STORE_NAME, 'readonly');
      const request = transaction
        .objectStore(ADMIN_OPENING_STORE_NAME)
        .get(ADMIN_OPENING_RECORD_KEY);

      request.addEventListener('success', () => {
        finish(request.result ? normalizeOpeningSettings(request.result) : null);
      });
      request.addEventListener('error', () => finish(null));
      transaction.addEventListener('error', () => finish(null));
      transaction.addEventListener('abort', () => finish(null));
    } catch {
      finish(null);
    }
  });
}

async function saveOpeningSettingsToIndexedDb(settings: AdminOpeningSettings): Promise<boolean> {
  const db = await openOpeningSettingsDb();
  if (!db) return false;

  return new Promise((resolve) => {
    const finish = (saved: boolean) => {
      db.close();
      resolve(saved);
    };

    try {
      const transaction = db.transaction(ADMIN_OPENING_STORE_NAME, 'readwrite');
      transaction
        .objectStore(ADMIN_OPENING_STORE_NAME)
        .put(normalizeOpeningSettings(settings), ADMIN_OPENING_RECORD_KEY);
      transaction.addEventListener('complete', () => finish(true));
      transaction.addEventListener('error', () => finish(false));
      transaction.addEventListener('abort', () => finish(false));
    } catch {
      finish(false);
    }
  });
}

let activeAdminCharacterSettings = loadAdminCharacterSettings();
let activeAdminLayouts = loadAdminLayouts();
let activeAdminChats: AdminChats = {} as AdminChats;

function setActiveAdminCharacterSettings(settings: AdminCharacterSettings) {
  activeAdminCharacterSettings = normalizeAdminCharacterSettings(settings);
}

function setActiveAdminLayouts(layouts: AdminLayouts) {
  activeAdminLayouts = normalizeAdminLayouts(layouts);
}

function setActiveAdminChats(chats: AdminChats) {
  activeAdminChats = normalizeAdminChats(chats);
}

function applyAdminSettingsToProfile(
  profile: CharacterProfile,
  settings = activeAdminCharacterSettings,
): CharacterProfile {
  const characterSettings = settings[profile.id] ?? defaultCharacterAdminSettings(profile);

  return {
    ...profile,
    name: characterSettings.displayName || profile.name,
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

function isCharacterEnabled(characterId: string, settings = activeAdminCharacterSettings): boolean {
  if (!isCharacterId(characterId)) return true;
  return normalizeCharacterAdminSettings(characterId, settings[characterId]).enabled;
}

function isAdminSubjectEnabled(
  subjectId: AdminSubjectId,
  settings = activeAdminCharacterSettings,
  layouts = activeAdminLayouts,
): boolean {
  if (isAdminPartyId(subjectId)) {
    return normalizeAdminLayout(layouts[subjectId], subjectId).enabled;
  }
  return isCharacterEnabled(subjectId, settings);
}

function isCustomerEnabled(
  customer: Customer,
  settings = activeAdminCharacterSettings,
  layouts = activeAdminLayouts,
): boolean {
  const subjectId = getCustomerAdminSubjectId(customer);
  if (subjectId && !isAdminSubjectEnabled(subjectId, settings, layouts)) return false;
  return customer.members.every((member) => isCharacterEnabled(member.id, settings));
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

function isAdminPartyId(value: string): value is AdminPartyId {
  return (ADMIN_PARTY_IDS as readonly string[]).includes(value);
}

function isAdminSubjectId(value: string): value is AdminSubjectId {
  return isCharacterId(value) || isAdminPartyId(value);
}

function getCustomerAdminLayout(customer: Customer, layouts: AdminLayouts): AdminLayout {
  const subjectId = getCustomerAdminSubjectId(customer);
  return subjectId ? normalizeAdminLayout(layouts[subjectId], subjectId) : getDefaultAdminLayout();
}

function getCustomerAdminSubjectId(customer: Customer): AdminSubjectId | null {
  if (isAdminSubjectId(customer.id)) return customer.id;
  return getCustomerPrimaryCharacterId(customer);
}

function getCustomerPrimaryCharacterId(customer: Customer): CharacterId | null {
  const characterId = customer.members[0]?.id;
  return characterId && isCharacterId(characterId) ? characterId : null;
}

function getCustomerAfterHoursComment(customer: Customer, game: GameState): string {
  const subjectId = getCustomerAdminSubjectId(customer);
  if (!subjectId) return DEFAULT_AFTER_HOURS_COMMENT;

  const relationshipScore = getCustomerRelationshipScore(game, customer);
  const groups = activeAdminChats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId);
  const leaveEntry = groups
    .filter((group) => relationshipScore >= group.threshold)
    .sort((a, b) => b.threshold - a.threshold)
    .flatMap((group) => group.entries)
    .find((entry) => entry.kind === 'leave');
  if (!leaveEntry) return DEFAULT_AFTER_HOURS_COMMENT;

  return getAdminChatStoryLines(leaveEntry)[0] || leaveEntry.title || DEFAULT_AFTER_HOURS_COMMENT;
}

function getCustomerOrderComment(
  customer: Customer,
  game: GameState,
  visitNumber: number,
  chatSeed: number,
): string {
  const subjectId = getCustomerAdminSubjectId(customer);
  if (!subjectId) return DEFAULT_ORDER_COMMENT;

  const relationshipScore = getCustomerRelationshipScore(game, customer);
  const groups = activeAdminChats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId);
  const orderEntries = groups
    .filter((group) => relationshipScore >= group.threshold)
    .sort((a, b) => b.threshold - a.threshold)
    .flatMap((group) => group.entries.filter((entry) => entry.kind === 'order'));

  if (orderEntries.length === 0) return DEFAULT_ORDER_COMMENT;

  const seed = stringSeed(customer.id) + game.day * 61 + visitNumber * 23 + chatSeed;
  const entry =
    orderEntries[Math.floor(seededRandom(seed) * orderEntries.length)] ?? orderEntries[0];
  if (!entry) return DEFAULT_ORDER_COMMENT;

  const lines = getAdminChatStoryLines(entry);
  return lines.join(' ') || entry.title || DEFAULT_ORDER_COMMENT;
}

function getCustomerStoreImageSrc(customer: Customer, layout: AdminLayout): string {
  const subjectId = getCustomerAdminSubjectId(customer);
  const characterId = getCustomerPrimaryCharacterId(customer);
  const hiddenImageSrcs = layout.talking.hiddenImageSrcs;
  return (
    layout.talking.defaultImageSrc ||
    getVisibleDefaultTalkingImageSrc(subjectId ?? undefined, hiddenImageSrcs) ||
    getVisibleDefaultTalkingImageSrc(characterId ?? undefined, hiddenImageSrcs)
  );
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
  choices?: readonly [KittyChatOption, KittyChatOption];
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
  return Math.round(average + 3_000 + (members.length > 1 ? 4_000 : 0));
}

function defaultReturnStories(customerName: string): readonly StoryChapter[] {
  return [
    {
      title: 'A Familiar Cup',
      text: `${customerName} returns to the same table and seems pleased that the room remembers them.`,
    },
    {
      title: 'A Little Easier',
      text: `${customerName} talks a little longer today, trusting the quiet between sips.`,
    },
    {
      title: 'Their Place',
      text: `${customerName} starts calling the cafe their usual spot, almost like they have been practicing the words.`,
    },
  ];
}

function makeCustomer(seed: CustomerSeed): Customer {
  const members = characterList(seed.memberIds);
  const name = seed.name ?? characterNames(members);
  return {
    id: seed.id,
    name,
    members,
    seat: seed.seat,
    moodStart: seed.moodStart ?? Math.max(30, 46 - members.length * 4),
    tip: seed.tip ?? baseTipForMembers(members),
    happinessGain: seed.happinessGain ?? (members.length > 1 ? 12 : 8),
    patienceMs: seed.patienceMs ?? patienceForMembers(members),
    storyTitle: seed.storyTitle,
    story: seed.story,
    storyChoices: seed.choices,
    followUps: seed.followUps.length > 0 ? seed.followUps : defaultReturnStories(name),
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
    storyTitle: 'Her Birthday',
    story:
      "Hey there, cat. I'm having a problem. Can't decide what I should do for my wife. Her birthday is this week and I don't know if I should go big or not. What do you think?",
    choices: [
      {
        id: 1,
        label: 'Meow',
        reply: 'A big meow, huh? Maybe she should get one ridiculous, memorable thing.',
      },
      {
        id: 2,
        label: 'Meow',
        reply: 'A softer meow. Maybe thoughtful matters more than expensive.',
      },
    ],
    followUps: [
      {
        title: 'Birthday Report',
        text: 'Five days later, Matthew comes in glowing and admits the birthday went better than he feared. He says the gift worked because it felt like he was actually listening.',
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
    id: 'custom_1',
    memberIds: ['custom_1'],
    seat: 'Custom table',
    moodStart: 40,
    storyTitle: 'First Visit',
    story: 'A new regular settles into the cafe and lets the cat keep them company.',
    followUps: [],
  }),
  makeCustomer({
    id: 'custom_2',
    memberIds: ['custom_2'],
    seat: 'Custom table',
    moodStart: 40,
    storyTitle: 'First Visit',
    story: 'A new regular settles into the cafe and lets the cat keep them company.',
    followUps: [],
  }),
  makeCustomer({
    id: 'custom_3',
    memberIds: ['custom_3'],
    seat: 'Custom table',
    moodStart: 40,
    storyTitle: 'First Visit',
    story: 'A new regular settles into the cafe and lets the cat keep them company.',
    followUps: [],
  }),
  makeCustomer({
    id: 'custom_4',
    memberIds: ['custom_4'],
    seat: 'Custom table',
    moodStart: 40,
    storyTitle: 'First Visit',
    story: 'A new regular settles into the cafe and lets the cat keep them company.',
    followUps: [],
  }),
  makeCustomer({
    id: 'custom_5',
    memberIds: ['custom_5'],
    seat: 'Custom table',
    moodStart: 40,
    storyTitle: 'First Visit',
    story: 'A new regular settles into the cafe and lets the cat keep them company.',
    followUps: [],
  }),
  makeCustomer({
    id: 'custom_6',
    memberIds: ['custom_6'],
    seat: 'Custom table',
    moodStart: 40,
    storyTitle: 'First Visit',
    story: 'A new regular settles into the cafe and lets the cat keep them company.',
    followUps: [],
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

activeAdminChats = loadAdminChats();

function getAdminSubjectCustomer(
  subjectId: AdminSubjectId,
  settings = activeAdminCharacterSettings,
): Customer {
  const partyCustomer = CUSTOMERS.find((customer) => customer.id === subjectId);
  if (partyCustomer) {
    const members = partyCustomer.members.map((member) =>
      applyAdminSettingsToProfile(member, settings),
    );
    return {
      ...partyCustomer,
      name: characterNames(members),
      members,
      tip: baseTipForMembers(members),
      patienceMs: patienceForMembers(members),
    };
  }

  return characterPreviewCustomer(
    getEditableCharacterProfile(isCharacterId(subjectId) ? subjectId : 'shadow', settings),
  );
}

function getPlayableCustomerForAdminSubject(subjectId: AdminSubjectId): Customer | null {
  return (
    CUSTOMERS.find((customer) => customer.id === subjectId) ??
    CUSTOMERS.find((customer) => customer.members.some((member) => member.id === subjectId)) ??
    null
  );
}

const UPGRADES = [
  {
    id: SECOND_TABLE_UPGRADE_ID,
    name: 'Second Table Spot',
    kind: 'Furniture',
    cost: 120,
    comfort: 0,
    happiness: 2,
    description: 'Opens a second customer spot for busier shop days.',
  },
  {
    id: THIRD_TABLE_UPGRADE_ID,
    name: 'Third Table Spot',
    kind: 'Furniture',
    cost: 260,
    comfort: 0,
    happiness: 3,
    description: 'Opens the third customer spot when the shop is ready for a full room.',
  },
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

const SHOP_RANKS = [
  { name: 'New', min: 0 },
  { name: 'Known', min: 25 },
  { name: 'Liked', min: 45 },
  { name: 'Good', min: GOOD_SHOP_SCORE },
  { name: 'Beloved', min: 88 },
] as const satisfies readonly [ShopRank, ...ShopRank[]];

const DEFAULT_GAME: GameState = {
  setupComplete: false,
  cafeName: '',
  catName: '',
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
  storyCollectionDays: {},
  customerStats: {},
  metCustomers: [],
  openingComplete: false,
  tutorialStep: 'opening',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadMusicVolume(): number {
  const savedVolume = Number(window.localStorage.getItem(MUSIC_VOLUME_KEY));
  return Number.isFinite(savedVolume)
    ? clamp(Math.round(savedVolume), 0, 100)
    : DEFAULT_MUSIC_VOLUME;
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

function getService(
  slot: number,
  recipeIds: string[],
  orderIndex = 0,
  customer?: Customer,
): ServiceItem {
  const recipes = getOwnedRecipes(recipeIds);
  const recipeKey = recipes.map((recipe) => recipe.id).join('|');
  const memberId = customer?.members[orderIndex]?.id ?? String(orderIndex);
  const seed = customer
    ? stringSeed(`${customer.id}:${memberId}:${orderIndex}:${recipeKey}`)
    : stringSeed(`${slot}:${orderIndex}:${recipeKey}`);
  const index = Math.floor(seededRandom(seed) * recipes.length);
  return recipes[index] ?? SERVICE_ITEMS[0];
}

function getServicesForCustomer(
  slot: number,
  recipeIds: string[],
  customer: Customer,
): ServiceItem[] {
  return customer.members.map((_, orderIndex) => getService(slot, recipeIds, orderIndex, customer));
}

function getVisibleServedService(
  services: readonly ServiceItem[],
  servedOrderIndexes: readonly number[],
): ServiceItem {
  const lastServedIndex = servedOrderIndexes[servedOrderIndexes.length - 1];
  const mostRecentServedIndex = typeof lastServedIndex === 'number' ? lastServedIndex : 0;
  return services[mostRecentServedIndex] ?? services[0] ?? SERVICE_ITEMS[0];
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

function normalizeMoodBySlot(
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

function getCustomerMetIds(customer: Customer): string[] {
  return Array.from(new Set([customer.id, ...getPartyMemberIds(customer)]));
}

function hasMetAllPartyMembers(game: GameState, customer: Customer): boolean {
  if (customer.members.length <= 1) return true;
  return customer.members.every((member) => hasMetCustomer(game, member.id));
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

function getUnlockedTableCount(upgradeIds: string[]): number {
  if (upgradeIds.includes(THIRD_TABLE_UPGRADE_ID)) return 3;
  if (upgradeIds.includes(SECOND_TABLE_UPGRADE_ID)) return 2;
  return 1;
}

function getTableCount(game: GameState): number {
  return getUnlockedTableCount(game.upgrades);
}

function clampTableSlot(slot: number, tableCount: number): TableSlot {
  const maxSlot = Math.max(0, Math.min(tableCount, TABLE_SLOTS.length) - 1);
  return clamp(Math.floor(slot), 0, maxSlot) as TableSlot;
}

function getVisualStoreSlot(slot: TableSlot, tableCount: number): TableSlot {
  return tableCount === 1 && slot === 0 ? 1 : slot;
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
    bond: clamp(
      Math.floor(numericValue(stats.bond, 0)),
      MIN_RELATIONSHIP_SCORE,
      MAX_RELATIONSHIP_SCORE,
    ),
  };
}

function emptyCustomerStats(): CustomerStats {
  return { visits: 0, served: 0, missed: 0, earned: 0, bond: 0 };
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
  const recovery = Math.min(stats.served * 0.025 + storyCount * 0.035 + stats.bond * 0.002, 0.22);
  return clamp(1 - missedPenalty - missRatePenalty + recovery, 0.3, 1);
}

function getCustomerReturnChance(game: GameState, customer: Customer): number {
  return Math.round(getCustomerReturnWeight(game, customer) * 100);
}

const FIRST_DAY_STORY_TUTORIAL_START_SLOT = 1;
const FIRST_DAY_STORY_TUTORIAL_CUSTOMERS = ['nia', 'miles', 'shadow', 'matthew'] as const;
const FIRST_DAY_STORY_TUTORIAL_FINAL_SLOT =
  FIRST_DAY_STORY_TUTORIAL_START_SLOT + FIRST_DAY_STORY_TUTORIAL_CUSTOMERS.length - 1;

function getFirstDayStoryTutorialCustomerId(arrivalIndex: number, game: GameState): string | null {
  if (game.day !== 1 || !game.openingComplete || game.tutorialStep !== 'done') return null;
  const sequenceIndex = arrivalIndex - FIRST_DAY_STORY_TUTORIAL_START_SLOT;
  return FIRST_DAY_STORY_TUTORIAL_CUSTOMERS[sequenceIndex] ?? null;
}

function getCustomerSlotArrivalIndex(customerSlot: number): number {
  return Math.floor(Math.max(0, customerSlot) / CUSTOMERS.length);
}

function isFirstDayStoryTutorialFinalCustomerSlot(customerSlot: number | null): boolean {
  if (customerSlot == null) return false;
  return (
    getCustomerSlotArrivalIndex(customerSlot) === FIRST_DAY_STORY_TUTORIAL_FINAL_SLOT &&
    getCustomer(customerSlot).id === 'matthew'
  );
}

function hasFirstDayStoryTutorialFinalCustomer(seats: Array<number | null>): boolean {
  return seats.some((customerSlot) => isFirstDayStoryTutorialFinalCustomerSlot(customerSlot));
}

function needsFirstDayStoryTutorialFinalCustomer(game: GameState): boolean {
  return (
    game.day === 1 &&
    game.openingComplete &&
    game.tutorialStep === 'done' &&
    getCustomerVisitCount(game, 'matthew') === 0
  );
}

function chooseCustomerIndexForArrival(
  arrivalIndex: number,
  game: GameState,
  usedIndices: Set<number>,
  presentMemberIds: Set<string>,
): number {
  const matthewIndex = CUSTOMERS.findIndex((customer) => customer.id === 'matthew');
  const matthewStats = getCustomerStats(game, 'matthew');
  const matthewIsPresent = presentMemberIds.has('matthew');
  const matthewCanArrive =
    matthewIndex >= 0 &&
    !usedIndices.has(matthewIndex) &&
    !matthewIsPresent &&
    canCustomerArrive(CUSTOMERS[matthewIndex] ?? CUSTOMERS[0], presentMemberIds, game);
  const firstArrivalOfDay = game.visitsToday === 0 && game.missedToday === 0;

  if (
    matthewCanArrive &&
    game.day === 1 &&
    firstArrivalOfDay &&
    matthewStats.visits === 0 &&
    getCustomerVisitCount(game, 'matthew') === 0
  ) {
    return matthewIndex;
  }

  if (
    matthewCanArrive &&
    game.day === 2 &&
    firstArrivalOfDay &&
    matthewStats.missed > 0 &&
    getCustomerVisitCount(game, 'matthew') === 0
  ) {
    return matthewIndex;
  }

  const scriptedCustomerId = getFirstDayStoryTutorialCustomerId(arrivalIndex, game);
  if (scriptedCustomerId) {
    const scriptedIndex = CUSTOMERS.findIndex((customer) => customer.id === scriptedCustomerId);
    const scriptedCustomer = CUSTOMERS[scriptedIndex] ?? null;
    if (
      scriptedIndex >= 0 &&
      scriptedCustomer &&
      !usedIndices.has(scriptedIndex) &&
      canCustomerArrive(scriptedCustomer, presentMemberIds, game)
    ) {
      return scriptedIndex;
    }
  }

  const weights = CUSTOMERS.map((customer, index) => {
    if (usedIndices.has(index) && usedIndices.size < CUSTOMERS.length) return 0;
    if (!canCustomerArrive(customer, presentMemberIds, game)) return 0;
    return getCustomerReturnWeight(game, customer);
  });
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);
  if (totalWeight <= 0) {
    return CUSTOMERS.findIndex(
      (customer, index) =>
        !usedIndices.has(index) && canCustomerArrive(customer, presentMemberIds, game),
    );
  }

  let roll = seededRandom((arrivalIndex + 1) * 31 + usedIndices.size * 17) * totalWeight;
  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) return index;
  }
  return weights.findIndex((weight) => weight > 0);
}

function canCustomerArrive(
  customer: Customer,
  presentMemberIds: Set<string>,
  game: GameState,
): boolean {
  if (!isCustomerEnabled(customer)) return false;
  const candidateMemberIds = new Set(getPartyMemberIds(customer));
  if (!hasMetAllPartyMembers(game, customer)) return false;
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

function getDayStartElapsedMs(game: Pick<GameState, 'day'>): number {
  return game.day === 1 ? clamp(FIRST_DAY_START_ELAPSED_MS, 0, SHOP_DAY_REAL_MS) : 0;
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

function careActionLabel(action: CareAction): string {
  if (action === 'purr') return 'Purr';
  if (action === 'quiet') return 'Listen';
  if (action === 'roll') return 'Roll Over';
  return 'Be Cute';
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
    happySeen: Boolean(care?.happySeen),
  };
}

function getCareBondGain(care: VisitCare): number {
  return (
    Math.min(care.purrs, 1) +
    Math.min(care.quiets, 1) +
    Math.min(care.rolls, 1) +
    Math.min(care.cutes, 1)
  );
}

function getRelationshipChange(
  served: boolean,
  care: VisitCare,
  completedStory: boolean,
  moodDelta: number,
): number {
  if (!served) return -MISSED_RELATIONSHIP_LOSS;

  const careGain = getCareBondGain(care);
  const moodChange = moodDelta >= 18 ? 2 : moodDelta >= 6 ? 1 : moodDelta <= 0 ? -2 : 0;
  const careChange = careGain >= 2 ? 1 : 0;
  const storyChange = completedStory ? 1 : 0;
  return clamp(1 + moodChange + careChange + storyChange, -3, 5);
}

function getCustomerRelationshipScore(game: GameState, customer: Customer): number {
  const stats = getCustomerStats(game, customer.id);
  return clamp(stats.bond, MIN_RELATIONSHIP_SCORE, MAX_RELATIONSHIP_SCORE);
}

function getStoryTrustRequirement(customer: Customer, visitNumber: number): number {
  if (customer.id === 'matthew' && visitNumber === 1) return 0;
  if (customer.id === 'liam') return LIAM_STORY_REPUTATION_REQUIRED;
  if (customer.id === 'shadow' || customer.id === 'nia') return visitNumber === 1 ? 12 : 7;
  if (customer.id === 'gene' || customer.id === 'quou') return visitNumber === 1 ? 9 : 5;
  return visitNumber === 1 ? 6 : 4;
}

function isMatthewFirstStoryExpired(game: GameState): boolean {
  const stats = getCustomerStats(game, 'matthew');
  return getCustomerVisitCount(game, 'matthew') === 0 && stats.missed > 0 && game.day > 2;
}

function canCustomerShareStory(customer: Customer, game: GameState, visitNumber: number): boolean {
  if (game.storiesToday > 0) return false;
  if (visitNumber > getStoryArcLength(customer)) return false;
  const story = getStoryForVisit(customer, visitNumber);
  if (!isStoryTriggerReady(story, game)) return false;

  if (customer.id === 'matthew' && visitNumber === 1) {
    return !isMatthewFirstStoryExpired(game);
  }

  const relationshipRequirement = Math.max(
    getStoryTrustRequirement(customer, visitNumber),
    story.relationshipThreshold ?? 0,
  );

  if (customer.id === 'liam') {
    return (
      game.reputation >= LIAM_STORY_REPUTATION_REQUIRED &&
      getCustomerRelationshipScore(game, customer) >= relationshipRequirement
    );
  }

  return getCustomerRelationshipScore(game, customer) >= relationshipRequirement;
}

function getStoryChance(customer: Customer, game: GameState, visitNumber: number): number {
  if (!canCustomerShareStory(customer, game, visitNumber)) return 0;
  if (customer.id === 'matthew' && visitNumber === 1) return 1;
  const relationship = getCustomerRelationshipScore(game, customer);
  const baseChance = visitNumber === 1 ? 0.58 : 0.42;
  return clamp(baseChance + relationship / 140, 0.25, 0.86);
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
  const rollGain = served && care.rolls > 0 ? Math.min(care.rolls, 2) * 3 : 0;
  const cuteGain = served && care.cutes > 0 ? 2 + Math.min(care.cutes, 2) * 2 : 0;
  const storyGain = completedStory ? 3 : 0;
  return servedGain + purrGain + quietGain + rollGain + cuteGain + storyGain;
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

function getBaseStoryArc(customer: Customer): StoryChapter[] {
  return [
    {
      id: `${customer.id}-story-0`,
      title: customer.storyTitle,
      text: customer.story,
      choices: customer.storyChoices,
      triggerStoryId: customer.id === 'matthew-shadow' ? 'matthew-story-1' : '',
      triggerDelayDays: 0,
    },
    ...customer.followUps.map((story, index) => ({
      ...story,
      id: story.id ?? `${customer.id}-story-${index + 1}`,
      triggerStoryId:
        story.triggerStoryId ??
        (index === 0 ? `${customer.id}-story-0` : `${customer.id}-story-${index}`),
      triggerDelayDays:
        story.triggerDelayDays ?? (customer.id === 'matthew' && index === 0 ? 5 : 0),
    })),
  ].slice(0, 5);
}

function getAdminChatStoryLines(entry: AdminChatEntry): string[] {
  const lines = entry.blocks
    .filter((block) => block.kind === 'bubble')
    .map((block) => block.text.trim())
    .filter(Boolean);
  if (lines.length > 0) return lines;
  if (entry.summary.trim()) return [entry.summary.trim()];
  return [entry.title];
}

function getAdminChatStoryLineImages(entry: AdminChatEntry): string[] {
  return entry.blocks
    .filter((block) => block.kind === 'bubble' && block.text.trim())
    .map((block) => block.imageSrc || '');
}

function getAdminChatReplyAfterLineIndex(entry: AdminChatEntry): number | undefined {
  let bubbleCount = 0;
  for (const block of entry.blocks) {
    if (block.kind === 'catReply') return Math.max(1, bubbleCount);
    if (block.kind === 'bubble' && block.text.trim()) bubbleCount += 1;
  }
  return undefined;
}

function adminChatEntryToStoryChapter(
  entry: AdminChatEntry,
  group: AdminRelationshipChatGroup,
  fallback: StoryChapter,
): StoryChapter {
  const lines = getAdminChatStoryLines(entry);
  const text = lines.join(' ');
  return {
    id: entry.id,
    title: entry.title || fallback.title,
    text: text || entry.summary || fallback.text,
    lines,
    imageSrc: entry.startImageSrc || fallback.imageSrc,
    lineImageSrcs: getAdminChatStoryLineImages(entry),
    moodIconIds: entry.moodIconIds,
    choices: entry.catReply ?? undefined,
    replyAfterLineIndex: entry.catReply ? getAdminChatReplyAfterLineIndex(entry) : undefined,
    triggerStoryId: entry.triggerStoryId || fallback.triggerStoryId || '',
    triggerDelayDays: clamp(
      Math.floor(numericValue(entry.triggerDelayDays, fallback.triggerDelayDays ?? 0)),
      0,
      365,
    ),
    relationshipThreshold: Math.max(0, group.threshold, fallback.relationshipThreshold ?? 0),
  };
}

function getStoryArc(customer: Customer, chats = activeAdminChats): StoryChapter[] {
  const baseArc = getBaseStoryArc(customer);
  const baseFallback: StoryChapter = baseArc[0] ?? {
    id: `${customer.id}-story-0`,
    title: `${customer.name}'s Corner`,
    text: `${customer.name} settles into the shop and lets the quiet do some of the talking.`,
  };
  const subjectId = getCustomerAdminSubjectId(customer);
  const groups = subjectId ? (chats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId)) : [];
  let storyIndex = 0;
  const adminStories = groups.flatMap((group) =>
    group.entries
      .filter((entry) => entry.kind === 'story')
      .map((entry) => {
        const fallback = baseArc[storyIndex] ?? baseFallback;
        storyIndex += 1;
        return adminChatEntryToStoryChapter(entry, group, fallback);
      }),
  );

  return (adminStories.length > 0 ? adminStories : baseArc).slice(0, 5);
}

function getStoryArcLength(customer: Customer, chats = activeAdminChats): number {
  return getStoryArc(customer, chats).length;
}

function getStoryForVisit(
  customer: Customer,
  visitNumber: number,
  chats = activeAdminChats,
): StoryChapter {
  const arc = getStoryArc(customer, chats);
  const fallback: StoryChapter = arc[0] ?? {
    id: `${customer.id}-story-0`,
    title: `${customer.name}'s Corner`,
    text: `${customer.name} settles in again, and the familiar corner of the shop feels a little more like theirs.`,
  };
  const safeVisitNumber = Math.max(1, Math.floor(visitNumber));
  const index = clamp(safeVisitNumber - 1, 0, arc.length - 1);
  return arc[index] ?? fallback;
}

function findAdminChatEntryForCustomer(
  customer: Customer,
  entryId: string,
  chats = activeAdminChats,
): { entry: AdminChatEntry; group: AdminRelationshipChatGroup } | null {
  if (!entryId) return null;
  const subjectId = getCustomerAdminSubjectId(customer);
  if (!subjectId) return null;

  const groups = chats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId);
  for (const group of groups) {
    const entry = group.entries.find((item) => item.id === entryId);
    if (entry) return { entry, group };
  }

  return null;
}

function getForcedStoryChapterForCustomer(
  customer: Customer,
  entryId: string,
  chats = activeAdminChats,
): StoryChapter | null {
  const match = findAdminChatEntryForCustomer(customer, entryId, chats);
  if (!match || match.entry.kind !== 'story') return null;

  return adminChatEntryToStoryChapter(match.entry, match.group, getStoryForVisit(customer, 1));
}

function getStoryChapterId(customer: Customer, visitNumber: number, story: StoryChapter): string {
  return story.id || `${customer.id}-story-${Math.max(0, Math.floor(visitNumber) - 1)}`;
}

function getCustomerVisitCount(game: GameState, customerId: string): number {
  const savedCount = game.customerVisits[customerId] ?? (game.stories.includes(customerId) ? 1 : 0);
  const safeCount = Number.isFinite(savedCount) ? Math.floor(savedCount) : 0;
  const customer = CUSTOMERS.find((item) => item.id === customerId);
  if (!customer) return clamp(safeCount, 0, 999);
  return clamp(safeCount, 0, getStoryArcLength(customer));
}

function parseStoryId(storyId: string): { customerId: string; index: number } | null {
  const match = /^(.+)-story-(\d+)$/.exec(storyId);
  if (!match) return null;
  const index = Number.parseInt(match[2] ?? '', 10);
  if (!Number.isFinite(index)) return null;
  return { customerId: match[1] ?? '', index };
}

function getStoryCollectionDay(game: GameState, storyId: string): number | null {
  const savedDay = game.storyCollectionDays[storyId];
  if (typeof savedDay === 'number' && Number.isFinite(savedDay) && savedDay > 0) {
    return clamp(Math.floor(savedDay), 1, YEAR_LENGTH_DAYS);
  }

  const parsed = parseStoryId(storyId);
  if (!parsed) return null;
  return getCustomerVisitCount(game, parsed.customerId) > parsed.index ? 1 : null;
}

function isStoryTriggerReady(story: StoryChapter, game: GameState): boolean {
  const triggerStoryId = story.triggerStoryId ?? '';
  if (!triggerStoryId) return true;

  const collectedDay = getStoryCollectionDay(game, triggerStoryId);
  if (collectedDay == null) return false;

  const delayDays = clamp(Math.floor(numericValue(story.triggerDelayDays, 0)), 0, 365);
  return game.day - collectedDay >= delayDays;
}

function getCollectedStoryChapters(customer: Customer, game: GameState): StoryChapter[] {
  return getStoryArc(customer).slice(0, getCustomerVisitCount(game, customer.id));
}

function getStoryTalkLines(story: StoryChapter): string[] {
  if (story.lines && story.lines.length > 0) return story.lines;

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

function getStoryTalkImage(story: StoryChapter, lineIndex: number): string {
  return story.lineImageSrcs?.[lineIndex] ?? '';
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

function getAdminCommentChat(
  customer: Customer,
  game: GameState,
  visitNumber: number,
  chatSeed: number,
  forcedEntryId = '',
): KittyChat | null {
  const subjectId = getCustomerAdminSubjectId(customer);
  if (!subjectId) return null;

  const relationshipScore = getCustomerRelationshipScore(game, customer);
  const groups = activeAdminChats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId);
  const forcedEntry = forcedEntryId ? findAdminChatEntryForCustomer(customer, forcedEntryId) : null;
  const comments = forcedEntry
    ? [forcedEntry.entry]
    : groups
        .filter((group) => relationshipScore >= group.threshold)
        .sort((a, b) => b.threshold - a.threshold)
        .flatMap((group) => group.entries.filter((entry) => entry.kind === 'comment'));

  if (comments.length === 0) return null;

  const seed = stringSeed(customer.id) + game.day * 43 + visitNumber * 17 + chatSeed;
  const entry = comments[Math.floor(seededRandom(seed) * comments.length)] ?? comments[0];
  if (!entry) return null;
  const lines = getAdminChatStoryLines(entry);
  const lineImages = getAdminChatStoryLineImages(entry);
  return {
    question: lines.join(' ') || entry.title || 'Hi there...',
    options: entry.catReply,
    imageSrc: lineImages.find(Boolean) || '',
  };
}

function getKittyChat(
  customer: Customer,
  game: GameState,
  visitNumber: number,
  chatSeed = 0,
  forcedEntryId = '',
): KittyChat {
  const adminComment = getAdminCommentChat(customer, game, visitNumber, chatSeed, forcedEntryId);
  if (adminComment) return adminComment;

  if (customer.id === 'liam') {
    return {
      question: '...',
      options: null,
    };
  }

  if (customer.id !== 'matthew' && visitNumber === 1) {
    return {
      question: 'Hi there...',
      options: null,
    };
  }

  const seed = stringSeed(customer.id) + game.day * 41 + visitNumber * 19;
  const index = Math.floor(seededRandom(seed) * KITTY_CHATS.length);
  const fallback = KITTY_CHATS[index] ?? DEFAULT_KITTY_CHAT;
  return {
    question: fallback.question,
    options: null,
  };
}

function chooseVisitConversationKind(
  customer: Customer,
  game: GameState,
  visitNumber: number,
  slot: TableSlot,
): VisitConversationKind {
  if (!canCustomerShareStory(customer, game, visitNumber)) return 'kitty';
  if (customer.id === 'matthew' && visitNumber === 1) return 'story';
  if (customer.id === 'liam' && visitNumber === 1) return 'story';
  const seed =
    stringSeed(customer.id) + game.day * 59 + game.customerSlot * 7 + visitNumber * 31 + slot * 13;
  return seededRandom(seed) < getStoryChance(customer, game, visitNumber) ? 'story' : 'kitty';
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

function hasMetCustomer(game: GameState, customerId: string): boolean {
  const legacyStoryVisits =
    game.customerVisits[customerId] ?? (game.stories.includes(customerId) ? 1 : 0);
  return game.metCustomers.includes(customerId) || legacyStoryVisits > 0;
}

function getCustomerLogCount(game: GameState): number {
  return CUSTOMERS.filter((customer) => hasCustomerLogEntry(game, customer)).length;
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

function getRelationshipHeartSrc(score: number): string {
  if (score < 0) return RELATIONSHIP_HEART_SRC.black;
  if (score <= 0) return RELATIONSHIP_HEART_SRC.white;
  if (score < 15) return RELATIONSHIP_HEART_SRC.purple;
  if (score < 30) return RELATIONSHIP_HEART_SRC.blue;
  if (score < 45) return RELATIONSHIP_HEART_SRC.green;
  if (score < 60) return RELATIONSHIP_HEART_SRC.yellow;
  if (score < 75) return RELATIONSHIP_HEART_SRC.orange;
  if (score < 90) return RELATIONSHIP_HEART_SRC.pink;
  return RELATIONSHIP_HEART_SRC.red;
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

function storyCollectionDaysRecord(value: unknown): Record<string, number> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const day = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
    if (key && day > 0) output[key] = clamp(day, 1, YEAR_LENGTH_DAYS);
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
        bond: numericValue(stats.bond, 0),
      });
      if (
        normalized.visits > 0 ||
        normalized.served > 0 ||
        normalized.missed > 0 ||
        normalized.earned > 0 ||
        normalized.bond !== 0
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

function cleanNameValue(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 40) : fallback;
}

function resolveGameTextVariables(text: string, game: GameState): string {
  const catName = cleanNameValue(game.catName, DEFAULT_CAT_NAME);
  const cafeName = cleanNameValue(game.cafeName, DEFAULT_CAFE_NAME);
  return text
    .replace(/\bPLAYER\b/g, catName)
    .replace(/\bCAFE_NAME\b/g, cafeName)
    .replace(/\bCAFENAME\b/g, cafeName)
    .replace(/\bCAFE\b/g, cafeName);
}

function isLocalAdminMode(): boolean {
  if (isDev()) return true;
  if (import.meta.env.DEV) return true;
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  return localHosts.has(window.location.hostname);
}

function normalizeGame(value: unknown, fallback = DEFAULT_GAME): GameState {
  const parsed = value != null && typeof value === 'object' ? (value as Partial<GameState>) : {};
  const stories = stringList(parsed.stories);
  const customerVisits = numberRecord(parsed.customerVisits);
  const storyCollectionDays = storyCollectionDaysRecord(parsed.storyCollectionDays);
  const openingComplete =
    typeof parsed.openingComplete === 'boolean' ? parsed.openingComplete : fallback.openingComplete;
  const setupComplete =
    typeof parsed.setupComplete === 'boolean' ? parsed.setupComplete : openingComplete;

  return {
    setupComplete,
    cafeName: cleanNameValue(
      parsed.cafeName,
      setupComplete ? cleanNameValue(fallback.cafeName, DEFAULT_CAFE_NAME) : '',
    ),
    catName: cleanNameValue(
      parsed.catName,
      setupComplete ? cleanNameValue(fallback.catName, DEFAULT_CAT_NAME) : '',
    ),
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
    storyCollectionDays:
      Object.keys(storyCollectionDays).length > 0
        ? storyCollectionDays
        : fallback.storyCollectionDays,
    customerStats: customerStatsRecord(parsed.customerStats, customerVisits, stories),
    metCustomers: stringList(parsed.metCustomers),
    openingComplete,
    tutorialStep: openingComplete
      ? tutorialStepValue(parsed.tutorialStep, fallback.tutorialStep)
      : 'opening',
  };
}

function loadGame(): GameState {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return DEFAULT_GAME;
    const parsed = JSON.parse(raw);
    const migrationFallback =
      parsed != null &&
      typeof parsed === 'object' &&
      !Object.prototype.hasOwnProperty.call(parsed, 'openingComplete')
        ? { ...DEFAULT_GAME, openingComplete: true, tutorialStep: 'done' as const }
        : DEFAULT_GAME;
    return normalizeGame(parsed, migrationFallback);
  } catch {
    return DEFAULT_GAME;
  }
}

function gameSaveData(game: GameState): Record<string, unknown> {
  return { game };
}

function gameFromSaveData(
  data: Record<string, unknown>,
  fallback = DEFAULT_GAME,
): GameState | null {
  const rawGame = data['game'];
  if (rawGame != null && typeof rawGame === 'object' && !Array.isArray(rawGame)) {
    return normalizeGame(rawGame, fallback);
  }

  if ('day' in data || 'cafeName' in data || 'customerSlot' in data) {
    return normalizeGame(data, fallback);
  }

  return null;
}

function sceneValue(value: unknown, fallback: Scene): Scene {
  if (
    value === 'start' ||
    value === 'contentWarning' ||
    value === 'setup' ||
    value === 'opening' ||
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

function tutorialStepValue(value: unknown, fallback: TutorialStep): TutorialStep {
  if (value === 'meow') return 'meow';
  return value === 'opening' ||
    value === 'patience' ||
    value === 'serve' ||
    value === 'visit' ||
    value === 'mood' ||
    value === 'leave' ||
    value === 'firstDayStoryIntro' ||
    value === 'firstDayStoryOrder' ||
    value === 'firstDayStoryLeave' ||
    value === 'clock' ||
    value === 'open' ||
    value === 'done'
    ? value
    : fallback;
}

function ledgerTabValue(value: unknown, fallback: LedgerTab): LedgerTab {
  return value === 'recipes' || value === 'training' || value === 'comfort' || value === 'store'
    ? value
    : fallback;
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
      happySeen: Boolean(care.happySeen),
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
  const tableCount = getTableCount(game);
  const seatCustomerSlots = createSeatSlots(game.customerSlot, tableCount, game);
  return {
    restoredSession: false,
    game,
    scene: !game.setupComplete ? 'start' : game.openingComplete ? 'menu' : 'opening',
    isPaused: false,
    mood: 40,
    moodBySlot: {},
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
    dayElapsedMs: getDayStartElapsedMs(game),
    purrCooldownRemainingMs: 0,
    meowCooldownRemainingMs: 0,
    quietCooldownRemainingMs: 0,
    rollCooldownRemainingMs: 0,
    cuteCooldownRemainingMs: 0,
    nextCustomerSlot: game.customerSlot + tableCount,
    nextArrivalTimerId: 0,
    arrivalTimers: [],
    activeLedgerTab: 'recipes',
    tutorialLineIndex: 0,
    tutorialPatienceExpired: false,
    tutorialOpenPopup: false,
  };
}

function loadSession(savedGame: GameState): InitialAppState {
  try {
    if (!savedGame.setupComplete) return defaultInitialState(savedGame);
    if (!savedGame.openingComplete) return defaultInitialState(savedGame);
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return defaultInitialState(savedGame);

    const parsed = JSON.parse(raw) as Partial<SessionSnapshot>;
    if (parsed.version !== SESSION_VERSION) return defaultInitialState(savedGame);

    const game = normalizeGame(parsed.game, savedGame);
    const unlockedTableCount = getTableCount(game);
    const tableCount = clamp(
      Math.floor(numericValue(parsed.tableCount, unlockedTableCount)),
      0,
      unlockedTableCount,
    );
    const fallbackSeats = createSeatSlots(game.customerSlot, tableCount, game);
    const seatCustomerSlots = removeDuplicateSeatCustomers(
      seatSlotList(parsed.seatCustomerSlots, fallbackSeats).map((customerSlot, slot) =>
        slot < tableCount ? customerSlot : null,
      ),
    );
    const savedDayElapsedMs = clamp(
      Math.floor(numericValue(parsed.dayElapsedMs, 0)),
      0,
      SHOP_DAY_REAL_MS,
    );
    const nextCustomerSlot = clamp(
      Math.floor(numericValue(parsed.nextCustomerSlot, game.customerSlot + tableCount)),
      0,
      9999,
    );
    const hasSeats = hasOccupiedSeats(seatCustomerSlots);
    let scene = sceneValue(parsed.scene, 'menu');
    if ((scene === 'visit' || scene === 'story') && !hasSeats) scene = 'shop';
    const shouldHoldShopOpenForStoryTutorial =
      savedDayElapsedMs >= SHOP_DAY_REAL_MS &&
      (hasFirstDayStoryTutorialFinalCustomer(seatCustomerSlots) ||
        needsFirstDayStoryTutorialFinalCustomer(game));
    if (
      scene === 'shop' &&
      savedDayElapsedMs >= SHOP_DAY_REAL_MS &&
      !shouldHoldShopOpenForStoryTutorial
    ) {
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
    const restoredMood = clamp(Math.floor(numericValue(parsed.mood, 40)), 0, 100);
    const moodBySlot = normalizeMoodBySlot(parsed.moodBySlot, seatCustomerSlots);
    if (
      (scene === 'visit' || scene === 'story') &&
      seatCustomerSlots[selectedOccupiedSlot] != null &&
      moodBySlot[selectedOccupiedSlot] == null
    ) {
      moodBySlot[selectedOccupiedSlot] = restoredMood;
    }

    return {
      restoredSession: true,
      game,
      scene,
      isPaused: Boolean(parsed.isPaused),
      mood: restoredMood,
      moodBySlot,
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
      dayElapsedMs: savedDayElapsedMs,
      purrCooldownRemainingMs: clamp(
        Math.floor(numericValue(parsed.purrCooldownRemainingMs, 0)),
        0,
        BASE_PURR_COOLDOWN_MS,
      ),
      meowCooldownRemainingMs: clamp(
        Math.floor(numericValue(parsed.meowCooldownRemainingMs, 0)),
        0,
        BASE_MEOW_COOLDOWN_MS,
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
      nextCustomerSlot,
      nextArrivalTimerId: clamp(Math.floor(numericValue(parsed.nextArrivalTimerId, 0)), 0, 9999),
      arrivalTimers: sessionArrivalTimers(parsed.arrivalTimers),
      activeLedgerTab: ledgerTabValue(parsed.activeLedgerTab, 'recipes'),
      tutorialLineIndex: clamp(Math.floor(numericValue(parsed.tutorialLineIndex, 0)), 0, 99),
      tutorialPatienceExpired: Boolean(parsed.tutorialPatienceExpired),
      tutorialOpenPopup: Boolean(parsed.tutorialOpenPopup),
    };
  } catch {
    return defaultInitialState(savedGame);
  }
}

function loadInitialAppState(): InitialAppState {
  return loadSession(loadGame());
}

function preloadableImageSrc(src: unknown): string {
  if (typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:image/')) return '';
  return resolveAssetSrc(trimmed);
}

function addPreloadImageSource(sources: Set<string>, src: unknown) {
  const imageSrc = preloadableImageSrc(src);
  if (imageSrc) sources.add(imageSrc);
}

function collectPreloadImageSources({
  layouts,
  characterSettings,
  chats,
  moodIcons,
  chatMenu,
  catSettings,
  openingSettings,
}: {
  layouts: AdminLayouts;
  characterSettings: AdminCharacterSettings;
  chats: AdminChats;
  moodIcons: AdminMoodIcon[];
  chatMenu: AdminChatMenuSettings;
  catSettings: AdminCatSettings;
  openingSettings: AdminOpeningSettings;
}): string[] {
  const sources = new Set<string>();

  addPreloadImageSource(sources, EMPTY_TABLE_IMAGE_SRC);
  Object.values(UI_ICON_SRC).forEach((src) => addPreloadImageSource(sources, src));
  Object.values(RELATIONSHIP_HEART_SRC).forEach((src) => addPreloadImageSource(sources, src));
  SERVICE_ITEMS.forEach((service) => addPreloadImageSource(sources, service.imageSrc));

  const normalizedCatSettings = normalizeAdminCatSettings(catSettings);
  Object.values(normalizedCatSettings).forEach((src) => addPreloadImageSource(sources, src));

  addPreloadImageSource(sources, chatMenu.backgroundImageSrc);
  Object.values(chatMenu.items).forEach((item) => {
    addPreloadImageSource(sources, item.imageSrc);
    addPreloadImageSource(sources, item.servedImageSrc);
  });

  moodIcons.forEach((icon) => addPreloadImageSource(sources, icon.src));

  addPreloadImageSource(sources, OPENING_CITY_BACKGROUND_SRC);
  addPreloadImageSource(sources, OPENING_CAFE_FRONT_BACKGROUND_SRC);
  addPreloadImageSource(sources, openingSettings.backgroundSrc);
  addPreloadImageSource(sources, openingSettings.lilaImageSrc);
  addPreloadImageSource(sources, openingSettings.graceImageSrc);
  openingSettings.lilaImages.forEach((image) => addPreloadImageSource(sources, image.src));
  openingSettings.graceImages.forEach((image) => addPreloadImageSource(sources, image.src));
  openingSettings.beats.forEach((beat) => addPreloadImageSource(sources, beat.backgroundSrc));

  ADMIN_CHARACTER_IDS.forEach((characterId) => {
    const baseProfile = CHARACTER_PROFILES[characterId];
    const imageProfile = baseProfile as CharacterProfile;
    addPreloadImageSource(sources, imageProfile.imageSrc);
    addPreloadImageSource(sources, imageProfile.portraitImageSrc);
    const settings = normalizeCharacterAdminSettings(
      characterId,
      characterSettings[characterId] ?? defaultCharacterAdminSettings(baseProfile),
    );
    addPreloadImageSource(sources, settings.portrait.imageSrc);
  });

  ADMIN_SUBJECT_IDS.forEach((subjectId) => {
    const layout = normalizeAdminLayout(layouts[subjectId], subjectId);
    addPreloadImageSource(sources, layout.talking.defaultImageSrc);
    addPreloadImageSource(sources, layout.talking.imageSrc);
    layout.talking.enabledImageSrcs.forEach((src) => addPreloadImageSource(sources, src));

    const customer = getAdminSubjectCustomer(subjectId, characterSettings);
    customer.members.forEach((member) => {
      addPreloadImageSource(sources, member.imageSrc);
      addPreloadImageSource(sources, member.portraitImageSrc);
    });
  });

  Object.values(chats).forEach((groups) => {
    groups.forEach((group) => {
      group.entries.forEach((entry) => {
        addPreloadImageSource(sources, entry.startImageSrc);
        entry.blocks.forEach((block) => addPreloadImageSource(sources, block.imageSrc));
      });
    });
  });

  return Array.from(sources);
}

function preloadImageAsset(src: string, timeoutMs = PRELOAD_IMAGE_TIMEOUT_MS): Promise<void> {
  if (typeof Image === 'undefined') return Promise.resolve();

  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };
    const timeout = window.setTimeout(finish, timeoutMs);
    image.onload = finish;
    image.onerror = finish;
    image.decoding = 'async';
    image.loading = 'eager';
    image.src = src;
  });
}

async function preloadImageAssets(
  sources: string[],
  onProgress: (state: AssetPreloadState) => void,
  maxDurationMs = STARTUP_PRELOAD_TIMEOUT_MS,
) {
  const total = sources.length;
  if (total <= 0) {
    onProgress({ loaded: 1, total: 1 });
    return;
  }

  let loaded = 0;
  let timedOut = false;
  onProgress({ loaded, total });
  const queue = [...sources];
  const workerCount = Math.min(6, queue.length);
  const workers = Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        if (timedOut) return;
        const src = queue.shift();
        if (!src) return;
        await preloadImageAsset(src);
        loaded += 1;
        onProgress({ loaded, total });
      }
    }),
  );

  await Promise.race([
    workers,
    new Promise<void>((resolve) => {
      window.setTimeout(() => {
        timedOut = true;
        resolve();
      }, maxDurationMs);
    }),
  ]);

  if (timedOut) {
    onProgress({ loaded: total, total });
  } else {
    await workers;
  }
}

function TeaShopCat() {
  const safeArea = getSafeArea();
  const [initialState] = useState<InitialAppState>(() => loadInitialAppState());
  const [scene, setScene] = useState<Scene>(initialState.scene);
  const [game, setGame] = useState<GameState>(initialState.game);
  const [isPaused, setIsPaused] = useState(initialState.isPaused);
  const [mood, setMood] = useState(initialState.mood);
  const [moodBySlot, setMoodBySlot] = useState<Partial<Record<TableSlot, number>>>(
    initialState.moodBySlot,
  );
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
  const [meowReadyAt, setMeowReadyAt] = useState(
    () => Date.now() + initialState.meowCooldownRemainingMs,
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
  const [selectedAdminCharacterId, setSelectedAdminCharacterId] =
    useState<AdminSubjectId>('shadow');
  const [adminLayouts, setAdminLayouts] = useState<AdminLayouts>(() => loadAdminLayouts());
  const [adminSeatSpotLayouts, setAdminSeatSpotLayouts] = useState<AdminSeatSpotLayouts>(() =>
    loadAdminSeatSpotLayouts(),
  );
  const [adminCharacterSettings, setAdminCharacterSettings] = useState<AdminCharacterSettings>(
    () => activeAdminCharacterSettings,
  );
  const [adminChats, setAdminChats] = useState<AdminChats>(() => activeAdminChats);
  const [adminMoodIcons, setAdminMoodIcons] = useState<AdminMoodIcon[]>(() => loadAdminMoodIcons());
  const [adminChatMenuSettings, setAdminChatMenuSettings] = useState<AdminChatMenuSettings>(() =>
    loadAdminChatMenuSettings(),
  );
  const [adminCatSettings, setAdminCatSettings] = useState<AdminCatSettings>(() =>
    loadAdminCatSettings(),
  );
  const [adminOpeningSettings, setAdminOpeningSettings] = useState<AdminOpeningSettings>(() =>
    loadOpeningSettings(),
  );
  const [adminSaveMessage, setAdminSaveMessage] = useState('');
  const [catActionPose, setCatActionPose] = useState<CatPoseKey>('idle');
  const [storyToast, setStoryToast] = useState<StoryToast | null>(null);
  const [tutorialLineIndex, setTutorialLineIndex] = useState(initialState.tutorialLineIndex);
  const [tutorialPatienceExpired, setTutorialPatienceExpired] = useState(
    initialState.tutorialPatienceExpired,
  );
  const [tutorialOpenPopup, setTutorialOpenPopup] = useState(initialState.tutorialOpenPopup);
  const [musicMuted, setMusicMuted] = useState(
    () => window.localStorage.getItem(MUSIC_MUTED_KEY) === 'true',
  );
  const [musicVolume, setMusicVolume] = useState(loadMusicVolume);
  const [musicUnlocked, setMusicUnlocked] = useState(false);
  const [saveWarning, setSaveWarning] = useState('');
  const [platformSaveReady, setPlatformSaveReady] = useState(false);
  const [adminAssetsReady, setAdminAssetsReady] = useState(false);
  const [assetPreloadReady, setAssetPreloadReady] = useState(false);
  const [assetPreloadState, setAssetPreloadState] = useState<AssetPreloadState>({
    loaded: 0,
    total: 1,
  });
  const [loadingCatPose, setLoadingCatPose] = useState<CatPoseKey>('idle');
  const [departingSlots, setDepartingSlots] = useState<TableSlot[]>([]);
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
  const forcedFirstDayStoryTutorialRef = useRef(false);
  const storyToastTimerRef = useRef<number | null>(null);
  const openingSaveTimerRef = useRef<number | null>(null);
  const openingSaveVersionRef = useRef(0);
  const adminLargeLoadedRef = useRef(false);
  const assetPreloadStartedRef = useRef(false);
  const adminLargeSaveTimersRef = useRef<Record<string, number>>({});
  const adminPortableSaveTimerRef = useRef<number | null>(null);
  const catActionPoseTimerRef = useRef<number | null>(null);
  const platformSaveTimerRef = useRef<number | null>(null);
  const departingSlotsRef = useRef<Set<TableSlot>>(new Set());
  const departureTimersRef = useRef<number[]>([]);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const adminChatTestSnapshotRef = useRef<{
    game: GameState;
    nextCustomerSlot: number;
    seatCustomerSlots: Array<number | null>;
    selectedSlot: TableSlot;
    arrivalState: ArrivalState;
    servedSlots: TableSlot[];
    servedOrdersBySlot: Partial<Record<TableSlot, number[]>>;
    serviceQualityBySlot: Partial<Record<TableSlot, number>>;
    careBySlot: Partial<Record<TableSlot, VisitCare>>;
    activeStoryBySlot: Partial<Record<TableSlot, ActiveStorySession>>;
    patienceBySlot: Partial<Record<TableSlot, number>>;
    moodBySlot: Partial<Record<TableSlot, number>>;
    mood: number;
  } | null>(null);

  function updateMusicMuted(nextMuted: boolean) {
    setMusicMuted(nextMuted);
    try {
      window.localStorage.setItem(MUSIC_MUTED_KEY, String(nextMuted));
    } catch {
      // Music mute is a local preference; ignore storage failures in preview.
    }
  }

  function updateMusicVolume(nextVolume: number) {
    const safeVolume = clamp(Math.round(nextVolume), 0, 100);
    setMusicVolume(safeVolume);
    try {
      window.localStorage.setItem(MUSIC_VOLUME_KEY, String(safeVolume));
    } catch {
      // Music volume is a local preference; ignore storage failures in preview.
    }
  }

  function scheduleAdminLargeSave(key: string, value: unknown) {
    if (!adminLargeLoadedRef.current) return;
    const existingTimer = adminLargeSaveTimersRef.current[key];
    if (existingTimer != null) {
      window.clearTimeout(existingTimer);
    }
    adminLargeSaveTimersRef.current[key] = window.setTimeout(() => {
      delete adminLargeSaveTimersRef.current[key];
      void saveAdminLargeRecord(key, value);
    }, 160);
  }

  useEffect(() => {
    let cancelled = false;

    void Promise.all([loadOpeningSettingsFromIndexedDb(), loadAdminPortableState()]).then(
      ([indexedSettings, portableState]) => {
        if (cancelled) return;
        const settings = portableState?.openingSettings ?? indexedSettings;
        if (!settings) return;
        const normalizedOpeningSettings = normalizeOpeningSettings(settings);
        setAdminOpeningSettings(normalizedOpeningSettings);
        saveOpeningSettings(normalizedOpeningSettings);
      },
    );

    return () => {
      cancelled = true;
      if (openingSaveTimerRef.current != null) {
        window.clearTimeout(openingSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      loadAdminLargeRecord('layouts', normalizeAdminLayouts),
      loadAdminLargeRecord('seat-spots', normalizeAdminSeatSpotLayouts),
      loadAdminLargeRecord('character-settings', normalizeAdminCharacterSettings),
      loadAdminLargeRecord('chats', normalizeAdminChats),
      loadAdminLargeRecord('mood-icons', normalizeAdminMoodIcons),
      loadAdminLargeRecord('chat-menu', normalizeAdminChatMenuSettings),
      loadAdminLargeRecord('cat-settings', normalizeAdminCatSettings),
      loadAdminPortableState(),
    ]).then(
      ([layouts, seatSpots, settings, chats, moodIcons, chatMenu, catSettings, portable]) => {
        if (cancelled) return;
        const portableState = portable ?? null;
        const nextLayouts = portableState?.layouts ?? layouts;
        const nextSeatSpots = portableState?.seatSpots ?? seatSpots;
        const nextSettings = portableState?.characterSettings ?? settings;
        const nextChats = portableState?.chats ?? chats;
        const nextMoodIcons = portableState?.moodIcons ?? moodIcons;
        const nextChatMenu = portableState?.chatMenu ?? chatMenu;
        const nextCatSettings = portableState?.catSettings ?? catSettings;

        if (nextLayouts) setAdminLayouts(nextLayouts);
        if (nextSeatSpots) setAdminSeatSpotLayouts(nextSeatSpots);
        if (nextSettings) {
          setAdminCharacterSettings(nextSettings);
          setActiveAdminCharacterSettings(nextSettings);
        }
        if (nextChats) {
          setAdminChats(nextChats);
          setActiveAdminChats(nextChats);
        }
        if (nextMoodIcons) setAdminMoodIcons(nextMoodIcons);
        if (nextChatMenu) setAdminChatMenuSettings(nextChatMenu);
        if (nextCatSettings) setAdminCatSettings(nextCatSettings);
        adminLargeLoadedRef.current = true;
        setAdminAssetsReady(true);
      },
      () => {
        if (cancelled) return;
        adminLargeLoadedRef.current = true;
        setAdminAssetsReady(true);
      },
    );

    return () => {
      cancelled = true;
      Object.values(adminLargeSaveTimersRef.current).forEach((timer) => {
        window.clearTimeout(timer);
      });
      if (adminPortableSaveTimerRef.current != null) {
        window.clearTimeout(adminPortableSaveTimerRef.current);
      }
      if (catActionPoseTimerRef.current != null) {
        window.clearTimeout(catActionPoseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const normalizedLayouts = normalizeAdminLayouts(adminLayouts);
    setActiveAdminLayouts(normalizedLayouts);
    if (!adminLargeLoadedRef.current) return;
    saveAdminLayouts(normalizedLayouts);
    scheduleAdminLargeSave('layouts', normalizedLayouts);
  }, [adminLayouts]);

  useEffect(() => {
    const normalizedSeatSpots = normalizeAdminSeatSpotLayouts(adminSeatSpotLayouts);
    if (!adminLargeLoadedRef.current) return;
    saveAdminSeatSpotLayouts(normalizedSeatSpots);
    scheduleAdminLargeSave('seat-spots', normalizedSeatSpots);
  }, [adminSeatSpotLayouts]);

  useEffect(() => {
    const normalizedSettings = normalizeAdminCharacterSettings(adminCharacterSettings);
    if (!adminLargeLoadedRef.current) return;
    saveAdminCharacterSettings(normalizedSettings);
    setActiveAdminCharacterSettings(normalizedSettings);
    scheduleAdminLargeSave('character-settings', normalizedSettings);
  }, [adminCharacterSettings]);

  useEffect(() => {
    const normalizedChats = normalizeAdminChats(adminChats);
    if (!adminLargeLoadedRef.current) return;
    saveAdminChats(normalizedChats);
    setActiveAdminChats(normalizedChats);
    scheduleAdminLargeSave('chats', normalizedChats);
  }, [adminChats]);

  useEffect(() => {
    const normalizedMoodIcons = normalizeAdminMoodIcons(adminMoodIcons);
    if (!adminLargeLoadedRef.current) return;
    saveAdminMoodIcons(normalizedMoodIcons);
    scheduleAdminLargeSave('mood-icons', normalizedMoodIcons);
  }, [adminMoodIcons]);

  useEffect(() => {
    const normalizedChatMenu = normalizeAdminChatMenuSettings(adminChatMenuSettings);
    if (!adminLargeLoadedRef.current) return;
    saveAdminChatMenuSettings(normalizedChatMenu);
    scheduleAdminLargeSave('chat-menu', normalizedChatMenu);
  }, [adminChatMenuSettings]);

  useEffect(() => {
    const normalizedCatSettings = normalizeAdminCatSettings(adminCatSettings);
    if (!adminLargeLoadedRef.current) return;
    saveAdminCatSettings(normalizedCatSettings);
    scheduleAdminLargeSave('cat-settings', normalizedCatSettings);
  }, [adminCatSettings]);

  useEffect(() => {
    if (assetPreloadReady) return undefined;
    let poseIndex = 0;
    setLoadingCatPose(LOADING_CAT_POSES[poseIndex] ?? 'idle');
    const interval = window.setInterval(() => {
      poseIndex = (poseIndex + 1) % LOADING_CAT_POSES.length;
      setLoadingCatPose(LOADING_CAT_POSES[poseIndex] ?? 'idle');
    }, 560);

    return () => window.clearInterval(interval);
  }, [assetPreloadReady]);

  useEffect(() => {
    if (!adminAssetsReady || assetPreloadStartedRef.current) return undefined;
    assetPreloadStartedRef.current = true;
    let cancelled = false;
    const sources = collectPreloadImageSources({
      layouts: adminLayouts,
      characterSettings: adminCharacterSettings,
      chats: adminChats,
      moodIcons: adminMoodIcons,
      chatMenu: adminChatMenuSettings,
      catSettings: adminCatSettings,
      openingSettings: adminOpeningSettings,
    });

    void preloadImageAssets(sources, (state) => {
      if (!cancelled) setAssetPreloadState(state);
    }).then(() => {
      if (!cancelled) setAssetPreloadReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [
    adminAssetsReady,
    adminCatSettings,
    adminCharacterSettings,
    adminChatMenuSettings,
    adminChats,
    adminLayouts,
    adminMoodIcons,
    adminOpeningSettings,
  ]);

  function showCatPose(poseKey: CatPoseKey) {
    setCatActionPose(poseKey);
    if (catActionPoseTimerRef.current != null) {
      window.clearTimeout(catActionPoseTimerRef.current);
    }
    catActionPoseTimerRef.current = null;
  }

  function setMoodForSlot(slot: TableSlot, nextMood: number): number {
    const safeMood = clamp(Math.round(nextMood), 0, 100);
    setMood(safeMood);
    setMoodBySlot((prev) => ({
      ...prev,
      [slot]: safeMood,
    }));
    return safeMood;
  }

  const selectedOccupiedSlot = chooseOccupiedSlot(seatCustomerSlots, selectedSlot);
  const selectedCustomerSlot =
    seatCustomerSlots[selectedOccupiedSlot] ?? nextCustomerSlotRef.current;
  const currentCustomer = getCustomer(selectedCustomerSlot);
  const currentServices = getServicesForCustomer(
    selectedCustomerSlot,
    game.recipes,
    currentCustomer,
  );
  const currentService =
    currentServices[0] ?? getService(selectedCustomerSlot, game.recipes, 0, currentCustomer);
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
  const currentChatSeed = activeStoryMatchesCustomer ? activeStorySession.chatSeed : 0;
  const currentForcedEntryId = activeStoryMatchesCustomer
    ? (activeStorySession.forcedEntryId ?? '')
    : '';
  const forcedStory = getForcedStoryChapterForCustomer(currentCustomer, currentForcedEntryId);
  const forcedConversationActive = Boolean(currentForcedEntryId);
  const currentStory = forcedStory ?? getStoryForVisit(currentCustomer, currentVisitNumber);
  const currentStoryArcLength = getStoryArcLength(currentCustomer);
  const currentStoryChapterNumber = clamp(currentVisitNumber, 1, currentStoryArcLength);
  const currentCare = getVisitCare(careBySlot, selectedOccupiedSlot);
  const currentStoryLines = getStoryTalkLines(currentStory);
  const currentStoryLineCount = currentStoryLines.length;
  const currentKittyAnswer = clamp(currentCare.kittyAnswer, 0, 2) as 0 | 1 | 2;
  const currentStoryReplyAfterLine = currentStory.choices
    ? clamp(
        Math.floor(numericValue(currentStory.replyAfterLineIndex, currentStoryLineCount)),
        1,
        currentStoryLineCount,
      )
    : currentStoryLineCount;
  const currentStoryVisibleLineCount =
    currentStory.choices && currentKittyAnswer <= 0
      ? currentStoryReplyAfterLine
      : currentStoryLineCount;
  const currentStoryAlreadyCollected =
    getCustomerVisitCount(game, currentCustomer.id) >= currentVisitNumber;
  const currentFirstDayStoryTutorialActive =
    game.tutorialStep === 'firstDayStoryOrder' &&
    currentCustomer.id === 'matthew' &&
    currentVisitNumber === 1;
  const currentStoryAvailable =
    (game.storiesToday <= 0 || currentFirstDayStoryTutorialActive) &&
    currentConversationKind === 'story' &&
    currentVisitNumber <= currentStoryArcLength &&
    isStoryTriggerReady(currentStory, game) &&
    !currentStoryAlreadyCollected;
  const currentStoryInConversation =
    currentConversationKind === 'story' &&
    scene === 'visit' &&
    activeStoryMatchesCustomer &&
    currentStoryAlreadyCollected;
  const currentStoryReady =
    (serviceServed || forcedConversationActive) &&
    currentConversationKind === 'story' &&
    (currentStoryAvailable || currentStoryInConversation || forcedConversationActive);
  const currentStoryTalks = currentStoryReady
    ? clamp(currentCare.storyTalks, 0, Math.max(0, currentStoryVisibleLineCount - 1))
    : 0;
  const currentStoryProgress = currentStoryReady
    ? clamp(currentStoryTalks + 1, 1, currentStoryVisibleLineCount)
    : 0;
  const currentStoryChoices = currentStory.choices ?? null;
  const currentStoryChoiceReady =
    currentStoryReady &&
    currentStoryChoices != null &&
    currentKittyAnswer <= 0 &&
    currentStoryProgress >= currentStoryReplyAfterLine;
  const currentStoryChoiceReply =
    currentKittyAnswer > 0 ? (currentStoryChoices?.[currentKittyAnswer - 1]?.reply ?? '') : '';
  const currentStoryComplete =
    currentStoryReady &&
    currentStoryProgress >= currentStoryLineCount &&
    (!currentStoryChoices || currentKittyAnswer > 0);
  const currentStoryLine = currentStoryReady
    ? (currentStoryLines[currentStoryProgress - 1] ?? '')
    : '';
  const currentStoryImageSrc = currentStoryReady
    ? getStoryTalkImage(currentStory, currentStoryProgress - 1)
    : '';
  const currentKittyChat = getKittyChat(
    currentCustomer,
    game,
    currentVisitNumber,
    currentChatSeed,
    currentForcedEntryId,
  );
  const currentKittyOptions = currentConversationKind === 'kitty' ? currentKittyChat.options : null;
  const currentKittyReply =
    currentKittyAnswer > 0 && currentKittyOptions
      ? (currentKittyOptions[currentKittyAnswer - 1]?.reply ?? '')
      : '';
  const currentKittyChatReady = !currentStoryReady && !currentStoryChoiceReady;
  const currentOrderComment =
    game.tutorialStep === 'firstDayStoryOrder' && currentCustomer.id === 'matthew'
      ? FIRST_DAY_STORY_ORDER_MESSAGE
      : getCustomerOrderComment(currentCustomer, game, currentVisitNumber, currentChatSeed);
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
  const customerLogCount = getCustomerLogCount(game);
  const patiencePercent = getSeatPatiencePercent(
    patienceBySlot,
    seatCustomerSlots,
    selectedOccupiedSlot,
  );
  const patienceRemaining = getSeatPatience(
    patienceBySlot,
    seatCustomerSlots,
    selectedOccupiedSlot,
  );
  const patiencePercents = useMemo(
    () => getPatiencePercentsBySlot(patienceBySlot, seatCustomerSlots),
    [patienceBySlot, seatCustomerSlots],
  );
  const rawShopDayEnded = dayElapsedMs >= SHOP_DAY_REAL_MS;
  const firstDayStoryTutorialNeeded = needsFirstDayStoryTutorialFinalCustomer(game);
  const firstDayStoryTutorialFinalCustomerWaiting =
    hasFirstDayStoryTutorialFinalCustomer(seatCustomerSlots);
  const holdShopOpenForFirstDayStoryTutorial =
    rawShopDayEnded &&
    ((firstDayStoryTutorialFinalCustomerWaiting && scene !== 'visit') ||
      (firstDayStoryTutorialNeeded && scene === 'shop'));
  const shopDayEnded = rawShopDayEnded && !holdShopOpenForFirstDayStoryTutorial;
  const clockProgress = clamp((dayElapsedMs / SHOP_DAY_REAL_MS) * 100, 0, 100);
  const shopTimeLabel = formatShopTime(clockProgress);
  const purrCooldownMs = getActionCooldown(game.upgrades, 'purr');
  const meowCooldownMs = BASE_MEOW_COOLDOWN_MS;
  const quietCooldownMs = getActionCooldown(game.upgrades, 'quiet');
  const rollCooldownMs = getActionCooldown(game.upgrades, 'roll');
  const cuteCooldownMs = getActionCooldown(game.upgrades, 'cute');
  const purrCooldownRemaining = Math.max(0, purrReadyAt - actionNow);
  const meowCooldownRemaining = Math.max(0, meowReadyAt - actionNow);
  const quietCooldownRemaining = Math.max(0, quietReadyAt - actionNow);
  const rollCooldownRemaining = Math.max(0, rollReadyAt - actionNow);
  const cuteCooldownRemaining = Math.max(0, cuteReadyAt - actionNow);
  const fullMoodCareUnlocked = serviceServed;
  const showTopBar =
    scene !== 'start' &&
    scene !== 'contentWarning' &&
    scene !== 'setup' &&
    scene !== 'opening' &&
    scene !== 'menu' &&
    scene !== 'summary' &&
    scene !== 'admin';
  const adminAvailable = isLocalAdminMode();
  const tutorialStep = game.tutorialStep;
  const tutorialActive = tutorialStep !== 'done';
  function isTutorialProtectedMatthew(customer: Customer): boolean {
    return tutorialActive && tutorialStep !== 'firstDayStoryLeave' && customer.id === 'matthew';
  }

  const tutorialMatthewActive =
    tutorialStep === 'meow' && scene === 'visit' && currentCustomer.id === 'matthew';
  const tutorialMoodActive =
    tutorialStep === 'mood' && scene === 'visit' && currentCustomer.id === 'matthew';
  const tutorialMatthewLine = tutorialMatthewActive
    ? (TUTORIAL_MATTHEW_LINES[clamp(tutorialLineIndex, 0, TUTORIAL_MATTHEW_LINES.length - 1)] ?? '')
    : '';

  sessionStateRef.current = {
    game,
    scene,
    isPaused,
    mood,
    moodBySlot,
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
    meowReadyAt,
    quietReadyAt,
    rollReadyAt,
    cuteReadyAt,
    actionNow,
    nextCustomerSlot: nextCustomerSlotRef.current,
    nextArrivalTimerId: arrivalTimerIdRef.current,
    activeLedgerTab,
    tutorialLineIndex,
    tutorialPatienceExpired,
    tutorialOpenPopup,
  };

  useEffect(() => {
    let cancelled = false;

    void loadPlatformSave()
      .then((save) => {
        if (cancelled) return;
        const savedGame = gameFromSaveData(save.data, game);
        if (savedGame && !initialState.restoredSession) {
          hydrateSavedGame(savedGame);
        }
        setSaveWarning('');
        setPlatformSaveReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setSaveWarning('Cloud save unavailable. Progress is saved on this device.');
        setPlatformSaveReady(true);
        console.warn('Cat Cafe cloud save load failed', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } catch {
      // Local saves are a convenience in browser preview; the game still runs without them.
    }

    if (!platformSaveReady) return undefined;
    if (platformSaveTimerRef.current != null) window.clearTimeout(platformSaveTimerRef.current);

    platformSaveTimerRef.current = window.setTimeout(() => {
      platformSaveTimerRef.current = null;
      void persistPlatformSave({
        version: SAVE_SCHEMA_VERSION,
        savedAt: Date.now(),
        data: gameSaveData(game),
      })
        .then(() => setSaveWarning(''))
        .catch((error) => {
          setSaveWarning('Cloud save unavailable. Progress is saved on this device.');
          console.warn('Cat Cafe cloud save failed', error);
        });
    }, 900);

    return () => {
      if (platformSaveTimerRef.current != null) {
        window.clearTimeout(platformSaveTimerRef.current);
        platformSaveTimerRef.current = null;
      }
    };
  }, [game, platformSaveReady]);

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

  useEffect(() => {
    function unlockMusic() {
      setMusicUnlocked(true);
    }

    window.addEventListener('pointerdown', unlockMusic, { once: true });
    window.addEventListener('keydown', unlockMusic, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockMusic);
      window.removeEventListener('keydown', unlockMusic);
    };
  }, []);

  useEffect(() => {
    const audio = backgroundMusicRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = clamp(musicVolume / 100, 0, 1);
    audio.muted = musicMuted;

    if (musicMuted || !musicUnlocked || musicVolume <= 0) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => {
      // best-effort: browser autoplay rules can require another player gesture.
    });
  }, [musicMuted, musicUnlocked, musicVolume]);

  useEffect(() => {
    if (scene === 'admin' && !adminAvailable) setScene('menu');
  }, [adminAvailable, scene]);

  useEffect(() => {
    setActiveAdminChats(adminChats);
  }, [adminChats]);

  useEffect(
    () => () => {
      arrivalTimersRef.current.forEach((timer) => window.clearTimeout(timer.timeout));
      arrivalTimersRef.current = [];
      departureTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      departureTimersRef.current = [];
      if (storyToastTimerRef.current != null) window.clearTimeout(storyToastTimerRef.current);
      if (platformSaveTimerRef.current != null) window.clearTimeout(platformSaveTimerRef.current);
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
    const sanitizedSeats = removeDuplicateSeatCustomers(seatCustomerSlots);
    if (!seatListsMatch(seatCustomerSlots, sanitizedSeats)) {
      const nextSelectedSlot = chooseOccupiedSlot(sanitizedSeats, selectedSlot);
      setSeatCustomerSlots(sanitizedSeats);
      setSelectedSlot(nextSelectedSlot);
      setServedOrdersBySlot((prev) => normalizeServedOrdersBySlot(prev, sanitizedSeats, []));
      setServiceQualityBySlot((prev) => normalizeServiceQualityBySlot(prev, sanitizedSeats));
      setMoodBySlot((prev) => normalizeMoodBySlot(prev, sanitizedSeats));
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
    if (tutorialActive) return undefined;
    if (tutorialOpenPopup) return undefined;
    if (scene !== 'shop' && scene !== 'visit' && scene !== 'story') return undefined;
    if (dayElapsedMs >= SHOP_DAY_REAL_MS) return undefined;

    const interval = window.setInterval(() => {
      setDayElapsedMs((prev) => clamp(prev + SHOP_CLOCK_TICK_MS, 0, SHOP_DAY_REAL_MS));
    }, SHOP_CLOCK_TICK_MS);

    return () => window.clearInterval(interval);
  }, [dayElapsedMs, isPaused, scene, tutorialActive, tutorialOpenPopup]);

  useEffect(() => {
    if (isPaused) return undefined;
    if (scene !== 'visit') return undefined;

    const interval = window.setInterval(() => setActionNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [isPaused, scene]);

  useEffect(() => {
    if (!tutorialMoodActive) return;
    if (mood < 100) return;
    setGame((prev) => (prev.tutorialStep === 'mood' ? { ...prev, tutorialStep: 'leave' } : prev));
  }, [mood, tutorialMoodActive]);

  useEffect(() => {
    if (!firstDayStoryTutorialNeeded) {
      forcedFirstDayStoryTutorialRef.current = false;
    }
  }, [firstDayStoryTutorialNeeded]);

  useEffect(() => {
    if (isPaused) return;
    if (!rawShopDayEnded) return;
    if (!firstDayStoryTutorialNeeded) return;
    if (firstDayStoryTutorialFinalCustomerWaiting) return;
    if (scene !== 'shop') return;
    seatFirstDayStoryTutorialMatthew();
  }, [
    firstDayStoryTutorialFinalCustomerWaiting,
    firstDayStoryTutorialNeeded,
    isPaused,
    rawShopDayEnded,
    scene,
  ]);

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
    if (tutorialOpenPopup) return undefined;
    if (arrivalState !== 'ready' || !hasSeatedCustomers) return undefined;
    if (scene !== 'shop' && scene !== 'visit') return undefined;
    if (scene === 'visit' && shopDayEnded) return undefined;
    if (
      rawShopDayEnded &&
      (firstDayStoryTutorialNeeded || firstDayStoryTutorialFinalCustomerWaiting) &&
      scene === 'shop'
    ) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setPatienceBySlot((prev) => {
        const nextPatience = { ...prev };

        for (const slot of TABLE_SLOTS) {
          const customerSlot = seatCustomerSlots[slot];
          if (customerSlot == null) continue;

          const customer = getCustomer(customerSlot);
          if (isTutorialProtectedMatthew(customer)) {
            nextPatience[slot] = customer.patienceMs;
            continue;
          }

          const fullyServed = isTableFullyServed(customer, servedOrdersBySlot, slot);
          if (scene === 'visit' && slot === selectedOccupiedSlot && fullyServed) {
            nextPatience[slot] = getSeatPatience(prev, seatCustomerSlots, slot);
            continue;
          }

          const drain = fullyServed
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
    selectedOccupiedSlot,
    seatCustomerSlots,
    servedOrdersBySlot,
    firstDayStoryTutorialNeeded,
    firstDayStoryTutorialFinalCustomerWaiting,
    rawShopDayEnded,
    shopDayEnded,
    tutorialOpenPopup,
  ]);

  useEffect(() => {
    if (isPaused) return;
    if (tutorialOpenPopup) return;
    if (arrivalState !== 'ready' || !hasSeatedCustomers) return;
    if (scene === 'visit' && shopDayEnded) return;
    if (
      rawShopDayEnded &&
      (firstDayStoryTutorialNeeded || firstDayStoryTutorialFinalCustomerWaiting) &&
      scene === 'shop'
    ) {
      return;
    }

    const expiredSlot = TABLE_SLOTS.find(
      (slot) =>
        seatCustomerSlots[slot] != null &&
        getSeatPatience(patienceBySlot, seatCustomerSlots, slot) <= 0,
    );
    if (expiredSlot == null) return;

    const expiredCustomerSlot = seatCustomerSlots[expiredSlot];
    if (expiredCustomerSlot == null) return;
    const expiredCustomer = getCustomer(expiredCustomerSlot);
    const expiredFullyServed = isTableFullyServed(expiredCustomer, servedOrdersBySlot, expiredSlot);
    if (scene === 'visit' && expiredSlot === selectedOccupiedSlot && expiredFullyServed) return;

    if (isTutorialProtectedMatthew(expiredCustomer)) {
      if (!expiredFullyServed && !tutorialPatienceExpired) {
        setTutorialPatienceExpired(true);
      }
      setPatienceBySlot((prev) => ({
        ...prev,
        [expiredSlot]: expiredCustomer.patienceMs,
      }));
      return;
    }

    if (
      tutorialActive &&
      expiredCustomer.id === 'matthew' &&
      !expiredFullyServed &&
      !tutorialPatienceExpired
    ) {
      setTutorialPatienceExpired(true);
      return;
    }

    if (tutorialActive && expiredCustomer.id === 'matthew' && !expiredFullyServed) return;

    if (expiredFullyServed) {
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
    selectedOccupiedSlot,
    seatCustomerSlots,
    servedOrdersBySlot,
    firstDayStoryTutorialNeeded,
    firstDayStoryTutorialFinalCustomerWaiting,
    rawShopDayEnded,
    shopDayEnded,
    tutorialActive,
    tutorialPatienceExpired,
    tutorialOpenPopup,
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

  function clearDepartureTimers() {
    departureTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    departureTimersRef.current = [];
    departingSlotsRef.current.clear();
    setDepartingSlots([]);
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
      moodBySlot: state.moodBySlot,
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
      meowCooldownRemainingMs: Math.max(0, state.meowReadyAt - timerBase),
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
      tutorialLineIndex: state.tutorialLineIndex,
      tutorialPatienceExpired: state.tutorialPatienceExpired,
      tutorialOpenPopup: state.tutorialOpenPopup,
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

  function hydrateSavedGame(nextGame: GameState) {
    clearArrivalTimers();
    clearDepartureTimers();
    clearPauseState();
    clearSessionSnapshot();

    const nextInitialState = defaultInitialState(nextGame);
    nextCustomerSlotRef.current = nextInitialState.nextCustomerSlot;
    arrivalTimerIdRef.current = nextInitialState.nextArrivalTimerId;
    arrivalTimersRef.current = [];
    setGame(nextInitialState.game);
    setScene(nextInitialState.scene);
    setMood(nextInitialState.mood);
    setMoodBySlot(nextInitialState.moodBySlot);
    setPurrBeat(nextInitialState.purrBeat);
    setArrivalState(nextInitialState.arrivalState);
    setSelectedSlot(nextInitialState.selectedSlot);
    setTableCount(nextInitialState.tableCount);
    setSeatCustomerSlots(nextInitialState.seatCustomerSlots);
    setServedSlots(nextInitialState.servedSlots);
    setServedOrdersBySlot(nextInitialState.servedOrdersBySlot);
    setServiceQualityBySlot(nextInitialState.serviceQualityBySlot);
    setCareBySlot(nextInitialState.careBySlot);
    setActiveStoryBySlot({});
    setPatienceBySlot(nextInitialState.patienceBySlot);
    setDayElapsedMs(nextInitialState.dayElapsedMs);
    setPurrReadyAt(0);
    setMeowReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
    setActionNow(Date.now());
    setActiveLedgerTab(nextInitialState.activeLedgerTab);
    setTutorialLineIndex(0);
    setTutorialPatienceExpired(false);
    setTutorialOpenPopup(false);
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

    const arrivalIndex = nextCustomerSlotRef.current;
    const sourceGame = sessionStateRef.current?.game ?? game;
    if ((sessionStateRef.current?.dayElapsedMs ?? dayElapsedMs) >= SHOP_DAY_REAL_MS) {
      return;
    }
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
    setMoodBySlot((prev) => {
      const nextMoods = { ...prev };
      delete nextMoods[queuedTimer.slot];
      return nextMoods;
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
    startSlot: number,
    sourceGame: GameState,
  ): { nextCustomerSlot: number; arrivedCustomerIds: string[] } {
    clearArrivalTimers();
    const nextTableCount = getTableCount(sourceGame);
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
    setMoodBySlot({});
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
    setMoodBySlot((prev) => {
      const nextMoods = { ...prev };
      delete nextMoods[slot];
      return nextMoods;
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
    if (dayElapsedMs >= SHOP_DAY_REAL_MS) {
      return;
    }

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

  function seatFirstDayStoryTutorialMatthew() {
    if (forcedFirstDayStoryTutorialRef.current) return;
    if (!needsFirstDayStoryTutorialFinalCustomer(game)) return;
    const matthewIndex = CUSTOMERS.findIndex((customer) => customer.id === 'matthew');
    if (matthewIndex < 0) return;

    forcedFirstDayStoryTutorialRef.current = true;
    clearArrivalTimers();

    const targetSlot: TableSlot = 0;
    const matthewSlot = createCustomerToken(FIRST_DAY_STORY_TUTORIAL_FINAL_SLOT, matthewIndex);
    const matthewCustomer = getCustomer(matthewSlot);
    const nextSeats = TABLE_SLOTS.map((slot) => (slot === targetSlot ? matthewSlot : null));
    nextCustomerSlotRef.current = Math.max(
      nextCustomerSlotRef.current,
      FIRST_DAY_STORY_TUTORIAL_FINAL_SLOT + 1,
    );

    setTableCount(Math.max(tableCount, 1));
    setSeatCustomerSlots(nextSeats);
    setSelectedSlot(targetSlot);
    setServedSlots([]);
    setServedOrdersBySlot({});
    setServiceQualityBySlot({});
    setCareBySlot({});
    setActiveStoryBySlot({});
    setMoodBySlot({});
    setPatienceBySlot({ [targetSlot]: matthewCustomer.patienceMs });
    setMood(40);
    setPurrBeat(0);
    setPurrReadyAt(0);
    setMeowReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
    setActionNow(Date.now());
    setArrivalState('ready');
    setGame((prev) =>
      recordCustomerArrivals(
        {
          ...prev,
          tutorialStep: 'firstDayStoryIntro',
          customerSlot: Math.max(prev.customerSlot, nextCustomerSlotRef.current),
          metCustomers: Array.from(
            new Set([...prev.metCustomers, ...getCustomerMetIds(matthewCustomer)]),
          ),
        },
        [matthewCustomer.id],
      ),
    );
    setScene('shop');
  }

  function forceSpawnCustomer(customerId: string) {
    if (isPausedRef.current) return;
    const customerIndex = CUSTOMERS.findIndex((customer) => customer.id === customerId);
    if (customerIndex < 0) return;
    if (!isCustomerEnabled(CUSTOMERS[customerIndex] ?? CUSTOMERS[0])) return;

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
      selectedOccupiedSlot;
    const arrivalIndex = nextCustomerSlotRef.current;
    const forcedCustomerSlot = createCustomerToken(arrivalIndex, customerIndex);
    const forcedCustomer = getCustomer(forcedCustomerSlot);
    const forcedMemberIds = new Set(getPartyMemberIds(forcedCustomer));
    const slotsToClear = TABLE_SLOTS.filter((slot) => {
      if (slot === targetSlot) return true;
      const customerSlot = seatCustomerSlots[slot];
      if (customerSlot == null) return false;
      const existingCustomer = getCustomer(customerSlot);
      return getPartyMemberIds(existingCustomer).some((memberId) => forcedMemberIds.has(memberId));
    });
    nextCustomerSlotRef.current += 1;

    arrivalTimersRef.current = arrivalTimersRef.current.filter((timer) => {
      if (timer.slot !== targetSlot) return true;
      window.clearTimeout(timer.timeout);
      return false;
    });

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
    setMoodBySlot((prev) => {
      const nextMoods = { ...prev };
      slotsToClear.forEach((slot) => {
        delete nextMoods[slot];
      });
      return nextMoods;
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

  function testAdminChatEntry(subjectId: AdminSubjectId, entryId: string) {
    const playableCustomer = getPlayableCustomerForAdminSubject(subjectId);
    if (!playableCustomer) return;

    const entryMatch = findAdminChatEntryForCustomer(playableCustomer, entryId, adminChats);
    if (!entryMatch) return;

    setActiveAdminChats(adminChats);

    const customerIndex = CUSTOMERS.findIndex((customer) => customer.id === playableCustomer.id);
    if (customerIndex < 0) return;

    const existingSlot = TABLE_SLOTS.find((slot) => {
      const customerSlot = seatCustomerSlots[slot];
      return customerSlot != null && getCustomer(customerSlot).id === playableCustomer.id;
    });
    const targetSlot =
      existingSlot ??
      TABLE_SLOTS.find((slot) => slot < tableCount && seatCustomerSlots[slot] == null) ??
      selectedOccupiedSlot;
    const existingCustomerSlot = existingSlot != null ? seatCustomerSlots[existingSlot] : null;
    const nextCustomerSlot =
      existingCustomerSlot ?? createCustomerToken(nextCustomerSlotRef.current, customerIndex);
    const testCustomer = getCustomer(nextCustomerSlot);
    const testMemberIds = new Set(getPartyMemberIds(testCustomer));

    adminChatTestSnapshotRef.current = {
      game,
      nextCustomerSlot: nextCustomerSlotRef.current,
      seatCustomerSlots: [...seatCustomerSlots],
      selectedSlot,
      arrivalState,
      servedSlots: [...servedSlots],
      servedOrdersBySlot: { ...servedOrdersBySlot },
      serviceQualityBySlot: { ...serviceQualityBySlot },
      careBySlot: { ...careBySlot },
      activeStoryBySlot: { ...activeStoryBySlot },
      patienceBySlot: { ...patienceBySlot },
      moodBySlot: { ...moodBySlot },
      mood,
    };

    if (existingCustomerSlot == null) {
      nextCustomerSlotRef.current += 1;
    }

    arrivalTimersRef.current = arrivalTimersRef.current.filter((timer) => {
      if (timer.slot !== targetSlot) return true;
      window.clearTimeout(timer.timeout);
      return false;
    });

    setSeatCustomerSlots((prev) => {
      const nextSeats = prev.map((customerSlot) => {
        if (customerSlot == null) return null;
        const existingCustomer = getCustomer(customerSlot);
        return getPartyMemberIds(existingCustomer).some((memberId) => testMemberIds.has(memberId))
          ? null
          : customerSlot;
      });
      nextSeats[targetSlot] = nextCustomerSlot;
      return nextSeats;
    });
    setSelectedSlot(targetSlot);
    setArrivalState('ready');
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
    setCareBySlot((prev) => ({
      ...prev,
      [targetSlot]: getVisitCare({}, targetSlot),
    }));
    setActiveStoryBySlot((prev) => ({
      ...prev,
      [targetSlot]: {
        customerId: testCustomer.id,
        kind: entryMatch.entry.kind === 'story' ? 'story' : 'kitty',
        visitNumber: Math.max(1, getCustomerVisitCount(game, testCustomer.id) + 1),
        chatSeed: Math.floor(Date.now() % 1_000_000),
        forcedEntryId: entryMatch.entry.id,
      },
    }));
    setPatienceBySlot((prev) => ({
      ...prev,
      [targetSlot]: testCustomer.patienceMs,
    }));
    setMoodForSlot(
      targetSlot,
      startingMood(
        testCustomer,
        getService(nextCustomerSlot, game.recipes, 0, testCustomer),
        false,
      ),
    );
    setGame((prev) => ({
      ...prev,
      customerSlot: Math.max(prev.customerSlot, nextCustomerSlotRef.current),
      metCustomers: Array.from(new Set([...prev.metCustomers, ...getCustomerMetIds(testCustomer)])),
    }));
    setScene('visit');
  }

  function finishAdminChatTest() {
    const snapshot = adminChatTestSnapshotRef.current;
    adminChatTestSnapshotRef.current = null;

    if (snapshot) {
      setGame(snapshot.game);
      nextCustomerSlotRef.current = snapshot.nextCustomerSlot;
      setSeatCustomerSlots(snapshot.seatCustomerSlots);
      setSelectedSlot(snapshot.selectedSlot);
      setArrivalState(snapshot.arrivalState);
      setServedSlots(snapshot.servedSlots);
      setServedOrdersBySlot(snapshot.servedOrdersBySlot);
      setServiceQualityBySlot(snapshot.serviceQualityBySlot);
      setCareBySlot(snapshot.careBySlot);
      setActiveStoryBySlot(snapshot.activeStoryBySlot);
      setPatienceBySlot(snapshot.patienceBySlot);
      setMoodBySlot(snapshot.moodBySlot);
      setMood(snapshot.mood);
    } else {
      setActiveStoryBySlot((prev) => {
        const nextStories = { ...prev };
        delete nextStories[selectedOccupiedSlot];
        return nextStories;
      });
    }

    setPurrBeat(0);
    setScene('admin');
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
    setMeowReadyAt((prev) => (prev > pausedAt ? prev + pausedMs : prev));
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
    clearDepartureTimers();
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
    setMoodBySlot({});
    setMood(40);
    setPurrBeat(0);
    setPurrReadyAt(0);
    setMeowReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
    setScene('summary');
  }

  function finishSeatDeparture(slot: TableSlot) {
    if (departingSlotsRef.current.has(slot)) return;
    const keepCurrentVisitOpen = scene === 'visit' && slot !== selectedOccupiedSlot;
    const departingCustomerSlot = seatCustomerSlots[slot] ?? null;
    const departingWasFirstDayStoryTutorialFinalCustomer =
      isFirstDayStoryTutorialFinalCustomerSlot(departingCustomerSlot);
    const canQueueAnotherCustomer = dayElapsedMs < SHOP_DAY_REAL_MS;

    departingSlotsRef.current.add(slot);
    setDepartingSlots(Array.from(departingSlotsRef.current));

    const timer = window.setTimeout(() => {
      departureTimersRef.current = departureTimersRef.current.filter((item) => item !== timer);
      departingSlotsRef.current.delete(slot);
      setDepartingSlots(Array.from(departingSlotsRef.current));

      vacateSeat(slot);

      if (keepCurrentVisitOpen) {
        if (canQueueAnotherCustomer) queueSeatArrival(slot);
        return;
      }

      if (!canQueueAnotherCustomer) {
        if (firstDayStoryTutorialNeeded && !departingWasFirstDayStoryTutorialFinalCustomer) {
          seatFirstDayStoryTutorialMatthew();
        } else {
          closeShopForDay();
        }
      } else {
        queueSeatArrival(slot);
        setScene('shop');
      }
    }, 420);

    departureTimersRef.current.push(timer);
  }

  function startTutorialFromOpening() {
    clearPauseState();
    setTutorialLineIndex(0);
    setTutorialPatienceExpired(false);
    setTutorialOpenPopup(false);
    clearArrivalTimers();
    const matthewIndex = Math.max(
      0,
      CUSTOMERS.findIndex((customer) => customer.id === 'matthew'),
    );
    const tutorialSeats: Array<number | null> = [
      createCustomerToken(game.customerSlot, matthewIndex),
      null,
      null,
    ];
    const tutorialCustomer = getCustomer(tutorialSeats[0] ?? 0);
    nextCustomerSlotRef.current = game.customerSlot + 1;
    const tutorialGame: GameState = {
      ...game,
      openingComplete: true,
      customerSlot: nextCustomerSlotRef.current,
      tutorialStep: 'patience',
    };
    setTableCount(1);
    setSeatCustomerSlots(tutorialSeats);
    setSelectedSlot(0);
    setServedSlots([]);
    setServedOrdersBySlot({});
    setServiceQualityBySlot({});
    setCareBySlot({});
    setActiveStoryBySlot({});
    setMoodBySlot({});
    setPatienceBySlot(createPatienceBySlot(tutorialSeats));
    setArrivalState('ready');
    setGame(recordCustomerArrivals(tutorialGame, [tutorialCustomer.id]));
    setDayElapsedMs(getDayStartElapsedMs(tutorialGame));
    setMood(40);
    setPurrBeat(0);
    setPurrReadyAt(0);
    setMeowReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
    setScene('shop');
  }

  function completeSetup(cafeName: string, catName: string) {
    const nextCafeName = cleanNameValue(cafeName, DEFAULT_CAFE_NAME);
    const nextCatName = cleanNameValue(catName, DEFAULT_CAT_NAME);
    clearSessionSnapshot();
    clearPauseState();
    setGame((prev) => ({
      ...prev,
      setupComplete: true,
      cafeName: nextCafeName,
      catName: nextCatName,
      openingComplete: false,
      tutorialStep: 'opening',
    }));
    setScene('opening');
  }

  function continueDay() {
    clearPauseState();
    if (!hasSeatedCustomers) {
      const seatPlan = prepareSeatsForShop(game.customerSlot, game);
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

  function advanceTutorialMeow() {
    if (!tutorialMatthewActive) return;
    if (tutorialLineIndex < TUTORIAL_MATTHEW_LINES.length - 1) {
      setTutorialLineIndex((prev) => prev + 1);
      return;
    }
    setGame((prev) => ({
      ...prev,
      tutorialStep: 'mood',
    }));
    setTutorialLineIndex(0);
  }

  function finishTutorialAndOpenShop() {
    const finishedGame: GameState = { ...game, tutorialStep: 'done' };
    const seatPlan = prepareSeatsForShop(finishedGame.customerSlot, finishedGame);
    setGame(
      recordCustomerArrivals(
        { ...finishedGame, customerSlot: seatPlan.nextCustomerSlot },
        seatPlan.arrivedCustomerIds,
      ),
    );
    setTutorialLineIndex(0);
    setTutorialPatienceExpired(false);
    setTutorialOpenPopup(true);
    setDayElapsedMs(getDayStartElapsedMs(finishedGame));
    setMood(40);
    setPurrBeat(0);
    setPurrReadyAt(0);
    setMeowReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
    setActionNow(Date.now());
    setScene('shop');
  }

  function advanceShopTutorialStep() {
    if (game.tutorialStep === 'patience') {
      setGame((prev) => ({ ...prev, tutorialStep: 'serve' }));
      return;
    }
    if (game.tutorialStep === 'clock') {
      setGame((prev) => ({ ...prev, tutorialStep: 'open' }));
      return;
    }
    if (game.tutorialStep === 'open') {
      finishTutorialAndOpenShop();
    }
  }

  function beginVisit(slot = selectedOccupiedSlot) {
    if (isPausedRef.current) return;
    if (
      game.tutorialStep === 'patience' ||
      game.tutorialStep === 'serve' ||
      game.tutorialStep === 'clock' ||
      game.tutorialStep === 'open'
    ) {
      return;
    }
    if (arrivalState !== 'ready' || !hasSeatedCustomers) return;
    const nextSlot = clampTableSlot(slot, tableCount);
    const customerSlot = seatCustomerSlots[nextSlot];
    if (customerSlot == null) return;
    const customer = getCustomer(customerSlot);
    const service = getService(customerSlot, game.recipes, 0, customer);
    const metCustomerIds = getCustomerMetIds(customer);
    const enteringFirstDayStoryTutorial =
      game.tutorialStep === 'firstDayStoryIntro' && customer.id === 'matthew';
    setSelectedSlot(nextSlot);
    setGame((prev) => {
      const nextMetCustomers = Array.from(new Set([...prev.metCustomers, ...metCustomerIds]));
      const nextGame =
        nextMetCustomers.length === prev.metCustomers.length
          ? prev
          : { ...prev, metCustomers: nextMetCustomers };
      return enteringFirstDayStoryTutorial
        ? { ...nextGame, tutorialStep: 'firstDayStoryOrder' }
        : nextGame;
    });
    setActiveStoryBySlot((prev) => {
      const existingStory = prev[nextSlot];
      if (existingStory?.customerId === customer.id) return prev;
      const visitNumber = getCustomerVisitCount(game, customer.id) + 1;
      const chatSeed = Math.floor(Date.now() % 1_000_000);
      return {
        ...prev,
        [nextSlot]: {
          customerId: customer.id,
          kind: enteringFirstDayStoryTutorial
            ? 'story'
            : game.tutorialStep === 'visit' && customer.id === 'matthew'
              ? 'kitty'
              : chooseVisitConversationKind(customer, game, visitNumber, nextSlot),
          visitNumber,
          chatSeed,
        },
      };
    });
    setMoodForSlot(
      nextSlot,
      moodBySlot[nextSlot] ??
        startingMood(customer, service, isTableFullyServed(customer, servedOrdersBySlot, nextSlot)),
    );
    setPurrBeat(0);
    setActionNow(Date.now());
    if (game.tutorialStep === 'visit' && customer.id === 'matthew') {
      setTutorialLineIndex(0);
      setGame((prev) => ({ ...prev, tutorialStep: 'meow' }));
    }
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
    const targetService = getService(customerSlot, game.recipes, targetOrderIndex, targetCustomer);
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
      [nextSlot]: isTutorialProtectedMatthew(targetCustomer)
        ? targetCustomer.patienceMs
        : fullyServed
          ? SERVED_LEAVE_DELAY_MS
          : Math.max(
              getSeatPatience(prev, seatCustomerSlots, nextSlot),
              targetCustomer.patienceMs * 0.65,
            ),
    }));
    if (scene === 'visit') {
      const nextMood = clamp(mood + targetService.moodBoost, 0, 100);
      setMoodForSlot(nextSlot, nextMood);
      showCatPose('serve');
    }
    if (game.tutorialStep === 'serve' && targetCustomer.id === 'matthew' && fullyServed) {
      setTutorialPatienceExpired(false);
      setGame((prev) => ({ ...prev, tutorialStep: 'visit' }));
    }
    if (
      game.tutorialStep === 'firstDayStoryOrder' &&
      targetCustomer.id === 'matthew' &&
      fullyServed
    ) {
      setTutorialPatienceExpired(false);
      setGame((prev) => ({ ...prev, tutorialStep: 'done' }));
    }
  }

  function advanceStoryTalks(care: VisitCare): number {
    if (!currentStoryReady || currentStoryComplete) return care.storyTalks;
    return clamp(care.storyTalks + 1, 0, Math.max(0, currentStoryLineCount - 1));
  }

  function collectCompletedStoryForInteraction() {
    if (!currentStoryComplete) return;
    if (!currentStoryAvailable) return;
    collectStory();
  }

  function meow() {
    if (isPausedRef.current || !serviceServed) return;
    const now = Date.now();
    setActionNow(now);
    if (meowReadyAt > now) return;
    setMeowReadyAt(now + meowCooldownMs);
    collectCompletedStoryForInteraction();
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      const storyTalks = advanceStoryTalks(care);
      return {
        ...prev,
        [selectedOccupiedSlot]: { ...care, storyTalks },
      };
    });
    setMoodForSlot(selectedOccupiedSlot, mood + MEOW_MOOD_GAIN);
    showCatPose('meow');
  }

  function purr() {
    if (isPausedRef.current) return;
    const now = Date.now();
    setActionNow(now);
    if (purrReadyAt > now) return;
    setPurrReadyAt(now + purrCooldownMs);
    collectCompletedStoryForInteraction();
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
    setMoodForSlot(selectedOccupiedSlot, nextMood);
    setPurrBeat((prev) => prev + 1);
    showCatPose('purr');
  }

  function sitQuietly() {
    if (isPausedRef.current) return;
    const now = Date.now();
    setActionNow(now);
    if (quietReadyAt > now) return;
    setQuietReadyAt(now + quietCooldownMs);
    collectCompletedStoryForInteraction();
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
    setMoodForSlot(selectedOccupiedSlot, nextMood);
    showCatPose('listen');
  }

  function rollOver() {
    if (isPausedRef.current || !fullMoodCareUnlocked) return;
    const now = Date.now();
    setActionNow(now);
    if (rollReadyAt > now) return;
    setRollReadyAt(now + rollCooldownMs);
    collectCompletedStoryForInteraction();
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      const storyTalks = advanceStoryTalks(care);
      return {
        ...prev,
        [selectedOccupiedSlot]: { ...care, rolls: care.rolls + 1, storyTalks },
      };
    });
    setMoodForSlot(selectedOccupiedSlot, mood + ROLL_OVER_MOOD_GAIN);
    setPurrBeat((prev) => prev + 1);
    showCatPose('roll');
  }

  function beCute() {
    if (isPausedRef.current || !fullMoodCareUnlocked) return;
    const now = Date.now();
    setActionNow(now);
    if (cuteReadyAt > now) return;
    setCuteReadyAt(now + cuteCooldownMs);
    collectCompletedStoryForInteraction();
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      const storyTalks = advanceStoryTalks(care);
      return {
        ...prev,
        [selectedOccupiedSlot]: { ...care, cutes: care.cutes + 1, storyTalks },
      };
    });
    setMoodForSlot(selectedOccupiedSlot, mood + BE_CUTE_MOOD_GAIN);
    setPurrBeat((prev) => prev + 1);
    showCatPose('cute');
  }

  function answerKittyChat(answer: 1 | 2) {
    if (isPausedRef.current) return;
    if ((!currentKittyChatReady && !currentStoryChoiceReady) || currentKittyAnswer > 0) return;
    if (currentKittyChatReady && !currentKittyOptions && !currentStoryChoiceReady) return;
    setActionNow(Date.now());
    setCareBySlot((prev) => {
      const care = getVisitCare(prev, selectedOccupiedSlot);
      if (care.kittyAnswer > 0) return prev;
      const storyTalks = currentStoryChoiceReady
        ? clamp(care.storyTalks + 1, 0, Math.max(0, currentStoryLineCount - 1))
        : care.storyTalks;
      return {
        ...prev,
        [selectedOccupiedSlot]: { ...care, kittyAnswer: answer, storyTalks },
      };
    });
    setMoodForSlot(selectedOccupiedSlot, mood + MEOW_MOOD_GAIN);
    showCatPose('meow');
  }

  function showStoryAddedToast(story: StoryChapter, customer: Customer, chapterNumber: number) {
    if (storyToastTimerRef.current != null) window.clearTimeout(storyToastTimerRef.current);
    setStoryToast({
      id: Date.now(),
      customerName: customer.name,
      title: resolveGameTextVariables(story.title, game),
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
    const collectedFirstDayMatthewStory =
      gainedChapter &&
      game.day === 1 &&
      currentCustomer.id === 'matthew' &&
      currentVisitNumber === 1;

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
      const collectedStoryId = getStoryChapterId(currentCustomer, nextStoryCount, currentStory);

      return {
        ...prev,
        tutorialStep:
          collectedFirstDayMatthewStory && gainedStoryChapter
            ? 'firstDayStoryLeave'
            : prev.tutorialStep,
        stories: hasLegacyStory ? prev.stories : [...prev.stories, currentCustomer.id],
        storiesToday: gainedStoryChapter ? prev.storiesToday + 1 : prev.storiesToday,
        customerVisits: {
          ...prev.customerVisits,
          [currentCustomer.id]: nextStoryCount,
        },
        storyCollectionDays: gainedStoryChapter
          ? {
              ...prev.storyCollectionDays,
              [collectedStoryId]: prev.day,
            }
          : prev.storyCollectionDays,
      };
    });
  }

  function leaveVisit() {
    showCatPose('leave');
    if (forcedConversationActive) {
      finishAdminChatTest();
      return;
    }
    if (currentStoryComplete && currentStoryAvailable) {
      collectStory();
      return;
    }
    if (game.tutorialStep === 'firstDayStoryLeave' && currentCustomer.id === 'matthew') {
      setGame((prev) => ({ ...prev, tutorialStep: 'done' }));
      if (serviceServed) {
        servedCustomerLeaves();
      } else {
        customerLeaves();
      }
      return;
    }
    if (game.tutorialStep === 'leave' && currentCustomer.id === 'matthew') {
      setGame((prev) => ({ ...prev, tutorialStep: 'clock' }));
      setScene('shop');
      return;
    }
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
    if (departingSlotsRef.current.has(departingSlot)) return;
    const departingCustomerSlot = seatCustomerSlots[departingSlot];
    if (departingCustomerSlot == null) return;

    const affectsCurrentVisit = scene !== 'visit' || departingSlot === selectedOccupiedSlot;
    const departingCustomer = getCustomer(departingCustomerSlot);
    if (isTutorialProtectedMatthew(departingCustomer)) {
      setPatienceBySlot((prev) => ({
        ...prev,
        [departingSlot]: departingCustomer.patienceMs,
      }));
      return;
    }

    const departingServices = getServicesForCustomer(
      departingCustomerSlot,
      game.recipes,
      departingCustomer,
    );
    const serviceTotals = getServiceTotals(departingServices);
    const departingService =
      departingServices[0] ?? getService(departingCustomerSlot, game.recipes, 0, departingCustomer);
    const customerTip = getCustomerTip(departingCustomer, serviceQualityBySlot[departingSlot] ?? 0);
    const serviceTipBonus = serviceTotals.tipBonus;
    const serviceHappinessGain = serviceTotals.happinessGain;
    const comfortTipBonus = totalComfort * 3;
    const earnedTotal = customerTip + serviceTipBonus + comfortTipBonus;
    const care = getVisitCare(careBySlot, departingSlot);
    const storySession = activeStoryBySlot[departingSlot];
    const completedStory =
      storySession?.kind === 'story' &&
      storySession.customerId === departingCustomer.id &&
      getCustomerVisitCount(game, departingCustomer.id) >= storySession.visitNumber;
    const reputationGain = getReputationGain(departingService, true, care, completedStory);
    const hasLiveMoodForDepartingCustomer =
      scene === 'visit' && departingSlot === selectedOccupiedSlot;
    const storedDepartingMood = moodBySlot[departingSlot];
    const departingStartingMood = startingMood(departingCustomer, departingService, true);
    const moodDelta = hasLiveMoodForDepartingCustomer
      ? mood - departingStartingMood
      : storedDepartingMood != null
        ? storedDepartingMood - departingStartingMood
        : getCareBondGain(care) > 0
          ? 8
          : 0;
    const relationshipChange = getRelationshipChange(true, care, completedStory, moodDelta);

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
        bond: clamp(
          stats.bond + relationshipChange,
          MIN_RELATIONSHIP_SCORE,
          MAX_RELATIONSHIP_SCORE,
        ),
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
    if (departingSlotsRef.current.has(departingSlot)) return;
    const departingCustomerSlot = seatCustomerSlots[departingSlot];
    if (departingCustomerSlot == null) return;

    const affectsCurrentVisit = scene !== 'visit' || departingSlot === selectedOccupiedSlot;
    const departingCustomer = getCustomer(departingCustomerSlot);
    if (isTutorialProtectedMatthew(departingCustomer)) {
      setPatienceBySlot((prev) => ({
        ...prev,
        [departingSlot]: departingCustomer.patienceMs,
      }));
      return;
    }

    const partialService = isTablePartiallyServed(
      departingCustomer,
      servedOrdersBySlot,
      departingSlot,
    );
    const reputationLoss = partialService
      ? Math.ceil(MISS_REPUTATION_LOSS / 2)
      : MISS_REPUTATION_LOSS;
    const relationshipLoss = partialService
      ? Math.ceil(MISSED_RELATIONSHIP_LOSS / 2)
      : MISSED_RELATIONSHIP_LOSS;
    setGame((prev) => ({
      ...prev,
      missedToday: prev.missedToday + 1,
      reputation: clamp(prev.reputation - reputationLoss, 0, 999_999),
      reputationToday: prev.reputationToday - reputationLoss,
      customerStats: updateCustomerStats(prev, departingCustomer.id, (stats) => ({
        ...stats,
        missed: stats.missed + 1,
        bond: clamp(stats.bond - relationshipLoss, MIN_RELATIONSHIP_SCORE, MAX_RELATIONSHIP_SCORE),
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
    const nextDayGame: GameState = {
      ...game,
      day: game.day + 1,
      visitsToday: 0,
      tipsToday: 0,
      storiesToday: 0,
      missedToday: 0,
      reputationToday: 0,
      shopHappiness: clamp(game.shopHappiness - 3, 0, 100),
    };
    const seatPlan = prepareSeatsForShop(nextDayGame.customerSlot, nextDayGame);
    setGame(
      recordCustomerArrivals(
        { ...nextDayGame, customerSlot: seatPlan.nextCustomerSlot },
        seatPlan.arrivedCustomerIds,
      ),
    );
    setDayElapsedMs(getDayStartElapsedMs(nextDayGame));
    setArrivalState('ready');
    setPurrReadyAt(0);
    setQuietReadyAt(0);
    setRollReadyAt(0);
    setCuteReadyAt(0);
    setActionNow(Date.now());
    setScene('shop');
  }

  function buyUpgrade(id: string) {
    const upgrade = UPGRADES.find((item) => item.id === id);
    if (!upgrade) return;
    if (game.upgrades.includes(id) || game.teaCups < upgrade.cost) return;

    const previousTableCount = getTableCount(game);
    const nextUpgradeIds = [...game.upgrades, id];
    const nextTableCount = getUnlockedTableCount(nextUpgradeIds);

    setGame((prev) => {
      if (prev.upgrades.includes(id) || prev.teaCups < upgrade.cost) return prev;
      return {
        ...prev,
        teaCups: prev.teaCups - upgrade.cost,
        upgrades: [...prev.upgrades, id],
        shopHappiness: clamp(prev.shopHappiness + upgrade.happiness, 0, 100),
      };
    });

    if (nextTableCount > previousTableCount) {
      const newlyOpenedSlots = TABLE_SLOTS.filter(
        (slot) => slot >= previousTableCount && slot < nextTableCount,
      );

      setTableCount(nextTableCount);
      setSeatCustomerSlots((prev) =>
        TABLE_SLOTS.map((slot) => (slot < nextTableCount ? (prev[slot] ?? null) : null)),
      );
      setPatienceBySlot((prev) =>
        normalizePatienceBySlot(prev, seatCustomerSlots, selectedOccupiedSlot, undefined),
      );
      if (dayElapsedMs < SHOP_DAY_REAL_MS) {
        newlyOpenedSlots.forEach((slot) => queueSeatArrival(slot));
        setArrivalState(hasSeatedCustomers ? 'ready' : 'waiting');
      }
    }
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
    clearDepartureTimers();
    clearPauseState();
    clearSessionSnapshot();
    if (platformSaveTimerRef.current != null) {
      window.clearTimeout(platformSaveTimerRef.current);
      platformSaveTimerRef.current = null;
    }
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Local saves are a browser-preview convenience; reset still works without them.
    }
    void clearPlatformSave()
      .then(() => setSaveWarning(''))
      .catch((error) => {
        setSaveWarning('Cloud save unavailable. Progress is saved on this device.');
        console.warn('Cat Cafe cloud save reset failed', error);
      });
    const resetTableCount = getTableCount(DEFAULT_GAME);
    const resetSeats = createSeatSlots(DEFAULT_GAME.customerSlot, resetTableCount, DEFAULT_GAME);
    nextCustomerSlotRef.current = DEFAULT_GAME.customerSlot + resetTableCount;
    setGame(DEFAULT_GAME);
    setTableCount(resetTableCount);
    setSeatCustomerSlots(resetSeats);
    setDayElapsedMs(getDayStartElapsedMs(DEFAULT_GAME));
    setCareBySlot({});
    setActiveStoryBySlot({});
    setMoodBySlot({});
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
    setTutorialLineIndex(0);
    setTutorialPatienceExpired(false);
    setTutorialOpenPopup(false);
    setScene('start');
  }

  function openAdmin() {
    if (!adminAvailable) return;
    setScene('admin');
  }

  function updateAdminLayout(
    characterId: AdminSubjectId,
    item: AdminLayoutDragItem,
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

  function updateAdminSubjectEnabled(subjectId: AdminSubjectId, enabled: boolean) {
    if (!isAdminPartyId(subjectId) && isCharacterId(subjectId)) {
      const currentSettings = normalizeCharacterAdminSettings(
        subjectId,
        adminCharacterSettings[subjectId],
      );
      updateAdminCharacterSettings(subjectId, {
        ...currentSettings,
        enabled,
      });
      return;
    }

    setAdminLayouts((prev) => ({
      ...prev,
      [subjectId]: {
        ...normalizeAdminLayout(prev[subjectId], subjectId),
        enabled,
      },
    }));
    setAdminSaveMessage('');
  }

  function updateAdminSeatSpotAnchor(
    ownerId: AdminSeatSpotOwnerId,
    slot: TableSlot,
    anchor: AdminSeatAnchor,
    position: AdminPosition,
  ) {
    setAdminSeatSpotLayouts((prev) => {
      const key = seatSpotKey(slot);
      const ownerSpots =
        ownerId === EMPTY_TABLE_SEAT_SPOTS_ID
          ? getEmptyTableSeatSpots(prev)
          : getAdminSeatSpots(prev, ownerId);
      const currentSpot = getAdminSeatSpot(
        ownerSpots,
        slot,
        ownerId === EMPTY_TABLE_SEAT_SPOTS_ID ? 300 : 180,
      );
      return {
        ...prev,
        [ownerId]: {
          ...ownerSpots,
          [key]: {
            ...currentSpot,
            [anchor]: {
              x: clamp(position.x, 0, 100),
              y: clamp(position.y, 0, 100),
            },
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function updateAdminSeatSpotScale(ownerId: AdminSeatSpotOwnerId, slot: TableSlot, scale: number) {
    setAdminSeatSpotLayouts((prev) => {
      const key = seatSpotKey(slot);
      const scaleMax = ownerId === EMPTY_TABLE_SEAT_SPOTS_ID ? 300 : 180;
      const ownerSpots =
        ownerId === EMPTY_TABLE_SEAT_SPOTS_ID
          ? getEmptyTableSeatSpots(prev)
          : getAdminSeatSpots(prev, ownerId);
      return {
        ...prev,
        [ownerId]: {
          ...ownerSpots,
          [key]: {
            ...getAdminSeatSpot(
              ownerSpots,
              slot,
              ownerId === EMPTY_TABLE_SEAT_SPOTS_ID ? 300 : 180,
            ),
            scale: clamp(Math.floor(scale), 55, scaleMax),
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function updateAdminSeatSpotDrinkScale(
    characterId: AdminSubjectId,
    slot: TableSlot,
    scale: number,
  ) {
    setAdminSeatSpotLayouts((prev) => {
      const key = seatSpotKey(slot);
      const characterSpots = getAdminSeatSpots(prev, characterId);
      return {
        ...prev,
        [characterId]: {
          ...characterSpots,
          [key]: {
            ...getAdminSeatSpot(characterSpots, slot),
            drinkScale: clamp(Math.floor(scale), 45, 250),
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function resetAdminSeatSpots(ownerId: AdminSeatSpotOwnerId) {
    setAdminSeatSpotLayouts((prev) => ({
      ...prev,
      [ownerId]:
        ownerId === EMPTY_TABLE_SEAT_SPOTS_ID
          ? normalizeAdminSeatSpots({}, DEFAULT_ADMIN_SEAT_SPOTS, false, 300)
          : normalizeAdminSeatSpots({}),
    }));
    setAdminSaveMessage('');
  }

  function resetAdminLayout(characterId: AdminSubjectId) {
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

  function updateAdminCatScale(characterId: AdminSubjectId, scale: number) {
    setAdminLayouts((prev) => ({
      ...prev,
      [characterId]: {
        ...normalizeAdminLayout(prev[characterId], characterId),
        catScale: clamp(Math.floor(scale), 45, 250),
      },
    }));
    setAdminSaveMessage('');
  }

  function updateAdminCharacterScale(characterId: AdminSubjectId, scale: number) {
    setAdminLayouts((prev) => ({
      ...prev,
      [characterId]: {
        ...normalizeAdminLayout(prev[characterId], characterId),
        characterScale: clamp(Math.floor(scale), 45, 250),
      },
    }));
    setAdminSaveMessage('');
  }

  function updateAdminTalkingLayout(
    characterId: AdminSubjectId,
    item: 'character' | 'cat' | 'bubble' | 'drink' | 'patience',
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
              x: item === 'character' ? clamp(position.x, -40, 140) : clamp(position.x, 0, 100),
              y: item === 'character' ? clamp(position.y, -30, 165) : clamp(position.y, 0, 100),
            },
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function updateAdminTalkingFaceBlocker(
    characterId: AdminSubjectId,
    faceBlocker: AdminFaceBlocker,
  ) {
    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: {
            ...currentLayout.talking,
            faceBlocker: normalizeAdminFaceBlocker(
              faceBlocker,
              currentLayout.talking.faceBlocker,
            ),
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function resetAdminTalkingLayout(characterId: AdminSubjectId) {
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
    characterId: AdminSubjectId,
    scaleKind: 'characterScale' | 'catScale' | 'drinkScale',
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

  function updateAdminTalkingImage(characterId: AdminSubjectId, imageSrc: string) {
    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      const cleanImageSrc = imageSrc.trim();
      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: {
            ...currentLayout.talking,
            imageSrc: cleanImageSrc,
            enabledImageSrcs: cleanImageSrc
              ? Array.from(new Set([...currentLayout.talking.enabledImageSrcs, cleanImageSrc]))
              : currentLayout.talking.enabledImageSrcs,
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function updateAdminDefaultTalkingImage(characterId: AdminSubjectId, imageSrc: string) {
    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      const cleanImageSrc = imageSrc.trim();
      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: {
            ...currentLayout.talking,
            defaultImageSrc: cleanImageSrc,
            enabledImageSrcs: cleanImageSrc
              ? Array.from(new Set([...currentLayout.talking.enabledImageSrcs, cleanImageSrc]))
              : currentLayout.talking.enabledImageSrcs,
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function addAdminTalkingImages(characterId: AdminSubjectId, imageSrcs: string[]) {
    const cleanImageSrcs = imageSrcs.map((imageSrc) => imageSrc.trim()).filter(Boolean);
    if (cleanImageSrcs.length === 0) return;
    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: {
            ...currentLayout.talking,
            hiddenImageSrcs: currentLayout.talking.hiddenImageSrcs.filter(
              (src) => !cleanImageSrcs.includes(src),
            ),
            enabledImageSrcs: Array.from(
              new Set([...currentLayout.talking.enabledImageSrcs, ...cleanImageSrcs]),
            ),
          },
        },
      };
    });
    setAdminSaveMessage('');
  }

  function deleteAdminTalkingImage(characterId: AdminSubjectId, imageSrc: string) {
    const cleanImageSrc = imageSrc.trim();
    if (!cleanImageSrc) return;

    setAdminLayouts((prev) => {
      const currentLayout = normalizeAdminLayout(prev[characterId], characterId);
      const currentTalking = currentLayout.talking;
      const hiddenImageSrcs = Array.from(
        new Set([...currentTalking.hiddenImageSrcs, cleanImageSrc]),
      );
      return {
        ...prev,
        [characterId]: {
          ...currentLayout,
          talking: {
            ...currentTalking,
            hiddenImageSrcs,
            defaultImageSrc:
              currentTalking.defaultImageSrc === cleanImageSrc
                ? ''
                : currentTalking.defaultImageSrc,
            imageSrc: currentTalking.imageSrc === cleanImageSrc ? '' : currentTalking.imageSrc,
            enabledImageSrcs: currentTalking.enabledImageSrcs.filter(
              (src) => src !== cleanImageSrc,
            ),
          },
        },
      };
    });

    if (isCharacterId(characterId)) {
      setAdminCharacterSettings((prev) => {
        const currentSettings = normalizeCharacterAdminSettings(characterId, prev[characterId]);
        if (currentSettings.portrait.imageSrc !== cleanImageSrc) return prev;
        return {
          ...prev,
          [characterId]: {
            ...currentSettings,
            portrait: {
              ...currentSettings.portrait,
              imageSrc: '',
            },
          },
        };
      });
    }

    if (import.meta.env.DEV && isAdminUploadImageSrc(cleanImageSrc)) {
      void fetch('/__admin/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: cleanImageSrc }),
      });
    }
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

  function persistAdminOpeningSettings(settings: AdminOpeningSettings) {
    const normalizedOpeningSettings = normalizeOpeningSettings(settings);
    const savedToLocalStorage = saveOpeningSettings(normalizedOpeningSettings);
    const saveVersion = openingSaveVersionRef.current + 1;
    openingSaveVersionRef.current = saveVersion;

    setAdminOpeningSettings(normalizedOpeningSettings);
    setAdminSaveMessage(savedToLocalStorage ? 'Opening saved' : 'Saving opening...');

    if (openingSaveTimerRef.current != null) {
      window.clearTimeout(openingSaveTimerRef.current);
    }

    openingSaveTimerRef.current = window.setTimeout(() => {
      openingSaveTimerRef.current = null;
      void saveOpeningSettingsToIndexedDb(normalizedOpeningSettings).then((savedToIndexedDb) => {
        if (openingSaveVersionRef.current !== saveVersion) return;
        setAdminSaveMessage(
          savedToIndexedDb || savedToLocalStorage ? 'Opening saved' : 'Opening save failed',
        );
      });
    }, 120);
  }

  function saveAdminEdits() {
    const normalizedLayouts = ADMIN_SUBJECT_IDS.reduce<AdminLayouts>((layouts, characterId) => {
      layouts[characterId] = normalizeAdminLayout(adminLayouts[characterId], characterId);
      return layouts;
    }, {});
    const normalizedSeatSpotLayouts = normalizeAdminSeatSpotLayouts(adminSeatSpotLayouts);
    const normalizedSettings = normalizeAdminCharacterSettings(adminCharacterSettings);
    const normalizedChats = normalizeAdminChats(adminChats);
    const normalizedMoodIcons = normalizeAdminMoodIcons(adminMoodIcons);
    const normalizedChatMenu = normalizeAdminChatMenuSettings(adminChatMenuSettings);
    const normalizedCatSettings = normalizeAdminCatSettings(adminCatSettings);
    const normalizedOpeningSettings = normalizeOpeningSettings(adminOpeningSettings);
    const portableState: AdminPortableState = {
      version: 1,
      layouts: normalizedLayouts,
      seatSpots: normalizedSeatSpotLayouts,
      characterSettings: normalizedSettings,
      chats: normalizedChats,
      moodIcons: normalizedMoodIcons,
      chatMenu: normalizedChatMenu,
      catSettings: normalizedCatSettings,
      openingSettings: normalizedOpeningSettings,
    };

    saveAdminLayouts(normalizedLayouts);
    saveAdminSeatSpotLayouts(normalizedSeatSpotLayouts);
    saveAdminCharacterSettings(normalizedSettings);
    saveAdminChats(normalizedChats);
    saveAdminMoodIcons(normalizedMoodIcons);
    saveAdminChatMenuSettings(normalizedChatMenu);
    saveAdminCatSettings(normalizedCatSettings);
    void saveAdminLargeRecord('layouts', normalizedLayouts);
    void saveAdminLargeRecord('seat-spots', normalizedSeatSpotLayouts);
    void saveAdminLargeRecord('character-settings', normalizedSettings);
    void saveAdminLargeRecord('chats', normalizedChats);
    void saveAdminLargeRecord('mood-icons', normalizedMoodIcons);
    void saveAdminLargeRecord('chat-menu', normalizedChatMenu);
    void saveAdminLargeRecord('cat-settings', normalizedCatSettings);
    const openingSavedToLocalStorage = saveOpeningSettings(normalizedOpeningSettings);
    const saveVersion = openingSaveVersionRef.current + 1;
    openingSaveVersionRef.current = saveVersion;
    if (openingSaveTimerRef.current != null) {
      window.clearTimeout(openingSaveTimerRef.current);
      openingSaveTimerRef.current = null;
    }
    void Promise.all([
      saveOpeningSettingsToIndexedDb(normalizedOpeningSettings),
      saveAdminPortableState(portableState),
    ]).then(([openingSavedToIndexedDb, portableSaved]) => {
      if (openingSaveVersionRef.current !== saveVersion) return;
      setAdminSaveMessage(
        portableSaved
          ? 'Saved to repo'
          : openingSavedToIndexedDb || openingSavedToLocalStorage
            ? 'Saved'
            : 'Saved except opening images',
      );
    });
    setActiveAdminCharacterSettings(normalizedSettings);
    setActiveAdminChats(normalizedChats);
    setAdminLayouts(normalizedLayouts);
    setAdminSeatSpotLayouts(normalizedSeatSpotLayouts);
    setAdminCharacterSettings(normalizedSettings);
    setAdminChats(normalizedChats);
    setAdminMoodIcons(normalizedMoodIcons);
    setAdminChatMenuSettings(normalizedChatMenu);
    setAdminCatSettings(normalizedCatSettings);
    setAdminOpeningSettings(normalizedOpeningSettings);
    setPatienceBySlot((prev) =>
      normalizePatienceBySlot(prev, seatCustomerSlots, selectedOccupiedSlot, undefined),
    );
    setAdminSaveMessage(openingSavedToLocalStorage ? 'Saved' : 'Saving opening...');
  }

  const appStyle = {
    paddingTop: safeArea.top,
    paddingBottom: safeArea.bottom,
    '--opening-screen-bg': cssAssetUrl('/cat/opening.png'),
    '--shop-stage-bg': cssAssetUrl('/cat/shop-empty-tall.png'),
    '--summary-screen-bg': cssAssetUrl('/cdn-assets/end-day-background.png'),
  } as CSSProperties;

  if (!assetPreloadReady) {
    return (
      <div className="tea-app" style={appStyle}>
        <div className="landscape-gate" role="dialog" aria-label="Landscape required">
          <div>
            <RotateIcon />
            <h2>Oh no!</h2>
            <p>You can't play like this. Turn your phone sideways.</p>
          </div>
        </div>
        {saveWarning ? (
          <div className="save-warning" role="status" aria-live="polite">
            {saveWarning}
          </div>
        ) : null}
        <LoadingScreen
          adminReady={adminAssetsReady}
          catImageSrc={getCatImageSrc(adminCatSettings, loadingCatPose)}
          poseLabel={getCatPoseLabel(loadingCatPose)}
          state={assetPreloadState}
        />
      </div>
    );
  }

  return (
    <div className="tea-app" style={appStyle}>
      <div className="landscape-gate" role="dialog" aria-label="Landscape required">
        <div>
          <RotateIcon />
          <h2>Oh no!</h2>
          <p>You can't play like this. Turn your phone sideways.</p>
        </div>
      </div>
      {saveWarning ? (
        <div className="save-warning" role="status" aria-live="polite">
          {saveWarning}
        </div>
      ) : null}
      <div className="tea-shell">
        {showTopBar ? (
          <TopBar
            game={game}
            shopQuality={shopQuality}
            clockProgress={clockProgress}
            shopTimeLabel={shopTimeLabel}
            tutorialStep={tutorialStep}
            musicMuted={musicMuted}
            musicVolume={musicVolume}
            onMusicMutedChange={updateMusicMuted}
            onMusicVolumeChange={updateMusicVolume}
            onReset={resetSave}
            onShop={() => setScene('shop')}
            onStories={() => setScene('collection')}
            onUpgrades={() => setScene('upgrades')}
            onMenu={() => setScene('menu')}
            onPause={pauseGame}
          />
        ) : null}

        {scene === 'start' ? <StartGameScreen onStart={() => setScene('contentWarning')} /> : null}

        {scene === 'contentWarning' ? (
          <ContentWarningScreen onContinue={() => setScene('setup')} />
        ) : null}

        {scene === 'setup' ? <SetupScreen onComplete={completeSetup} /> : null}

        {scene === 'opening' ? (
          <OpeningScreen
            settings={adminOpeningSettings}
            game={game}
            musicMuted={musicMuted}
            musicVolume={musicVolume}
            onMusicMutedChange={updateMusicMuted}
            onMusicVolumeChange={updateMusicVolume}
            onReset={resetSave}
            onComplete={startTutorialFromOpening}
          />
        ) : null}

        {scene === 'menu' ? (
          <MenuScreen
            musicMuted={musicMuted}
            musicVolume={musicVolume}
            onContinue={continueDay}
            onStories={() => setScene('collection')}
            onAdmin={openAdmin}
            onReset={resetSave}
            onMusicMutedChange={updateMusicMuted}
            onMusicVolumeChange={updateMusicVolume}
            showAdmin={adminAvailable}
          />
        ) : null}

        {scene === 'shop' ? (
          <ShopScreen
            adminChats={adminChats}
            adminLayouts={adminLayouts}
            adminMoodIcons={adminMoodIcons}
            adminSeatSpotLayouts={adminSeatSpotLayouts}
            customers={visibleCustomers}
            game={game}
            seatCustomerSlots={seatCustomerSlots}
            recipes={game.recipes}
            tableCount={tableCount}
            arrivalState={arrivalState}
            selectedSlot={selectedOccupiedSlot}
            activeService={currentService}
            servedSlots={servedSlots}
            servedOrdersBySlot={servedOrdersBySlot}
            departingSlots={departingSlots}
            patiencePercents={patiencePercents}
            patienceRemainingBySlot={patienceBySlot}
            clockProgress={clockProgress}
            catImageSrc={getCatImageSrc(adminCatSettings, 'idle')}
            onServe={serveRequest}
            onVisit={beginVisit}
            onStories={() => setScene('collection')}
            customerLogCount={customerLogCount}
            forceSpawnCustomers={CUSTOMERS}
            onForceSpawn={forceSpawnCustomer}
            showForceSpawn={adminAvailable && !tutorialActive}
            tutorialCoachSrc={adminOpeningSettings.lilaImageSrc}
            tutorialPatienceExpired={tutorialPatienceExpired}
            tutorialStep={tutorialStep}
            onTutorialNext={advanceShopTutorialStep}
          />
        ) : null}

        {scene === 'visit' ? (
          <VisitScreen
            customer={currentCustomer}
            services={currentServices}
            servedOrderIndexes={currentServedOrders}
            serviceServed={serviceServed}
            patiencePercent={patiencePercent}
            patienceRemaining={patienceRemaining}
            mood={mood}
            purrBeat={purrBeat}
            purrCooldownRemaining={purrCooldownRemaining}
            meowCooldownRemaining={meowCooldownRemaining}
            quietCooldownRemaining={quietCooldownRemaining}
            rollCooldownRemaining={rollCooldownRemaining}
            cuteCooldownRemaining={cuteCooldownRemaining}
            fullMoodCareUnlocked={fullMoodCareUnlocked}
            storyReady={currentStoryReady}
            storyComplete={currentStoryComplete}
            storyProgress={currentStoryProgress}
            storyLineCount={currentStoryLineCount}
            nextStoryTitle={resolveGameTextVariables(currentStory.title, game)}
            storyLine={resolveGameTextVariables(currentStoryLine, game)}
            storyImageSrc={currentStoryImageSrc}
            storyChoices={currentStoryChoices}
            storyChoiceReady={currentStoryChoiceReady}
            storyChoiceAnswer={currentKittyAnswer}
            storyChoiceReply={resolveGameTextVariables(currentStoryChoiceReply, game)}
            kittyChatReady={currentKittyChatReady}
            forceDialogueReady={forcedConversationActive}
            kittyQuestion={resolveGameTextVariables(currentKittyChat.question, game)}
            kittyImageSrc={currentKittyChat.imageSrc ?? ''}
            kittyOptions={currentKittyOptions}
            kittyAnswer={currentKittyAnswer}
            kittyReply={resolveGameTextVariables(currentKittyReply, game)}
            orderLine={resolveGameTextVariables(currentOrderComment, game)}
            layout={getCustomerAdminLayout(currentCustomer, adminLayouts)}
            chatMenuSettings={adminChatMenuSettings}
            catImageSrc={getCatImageSrc(adminCatSettings, catActionPose)}
            afterHoursComment={resolveGameTextVariables(
              getCustomerAfterHoursComment(currentCustomer, game),
              game,
            )}
            tutorialStep={tutorialStep}
            tutorialCoachSrc={adminOpeningSettings.lilaImageSrc}
            tutorialLine={tutorialMatthewLine}
            tutorialLineCount={TUTORIAL_MATTHEW_LINES.length}
            tutorialLineIndex={tutorialLineIndex}
            tutorialThanksLine={resolveGameTextVariables(TUTORIAL_MATTHEW_THANKS, game)}
            onServe={serveRequest}
            onMeow={meow}
            onPurr={purr}
            onQuiet={sitQuietly}
            onRollOver={rollOver}
            onBeCute={beCute}
            onKittyAnswer={answerKittyChat}
            onTutorialMeow={advanceTutorialMeow}
            onBack={leaveVisit}
            shopDayEnded={shopDayEnded}
          />
        ) : null}

        {scene === 'story' ? (
          <StoryScreen
            customer={currentCustomer}
            game={game}
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

        {scene === 'admin' && adminAvailable ? (
          <AdminScreen
            adminChats={adminChats}
            adminCatSettings={adminCatSettings}
            adminChatMenuSettings={adminChatMenuSettings}
            adminMoodIcons={adminMoodIcons}
            openingSettings={adminOpeningSettings}
            characterSettings={adminCharacterSettings}
            layouts={adminLayouts}
            saveMessage={adminSaveMessage}
            seatSpotLayouts={adminSeatSpotLayouts}
            selectedCharacterId={selectedAdminCharacterId}
            onBack={() => setScene('menu')}
            onAdminChatsChange={(chats) => {
              setAdminChats(chats);
              setAdminSaveMessage('');
            }}
            onAdminCatSettingsChange={(settings) => {
              setAdminCatSettings(normalizeAdminCatSettings(settings));
              setAdminSaveMessage('Saved');
            }}
            onAdminChatMenuSettingsChange={(settings) => {
              setAdminChatMenuSettings(normalizeAdminChatMenuSettings(settings));
              setAdminSaveMessage('Saved');
            }}
            onAdminMoodIconsChange={(icons) => {
              setAdminMoodIcons(icons);
              setAdminSaveMessage('');
            }}
            onAdminChatEntryTest={testAdminChatEntry}
            onOpeningSettingsChange={(settings) => {
              persistAdminOpeningSettings(settings);
            }}
            onCatScaleChange={updateAdminCatScale}
            onCharacterScaleChange={updateAdminCharacterScale}
            onCharacterSettingsChange={updateAdminCharacterSettings}
            onLayoutChange={updateAdminLayout}
            onResetLayout={resetAdminLayout}
            onResetSeatSpots={resetAdminSeatSpots}
            onResetTalkingLayout={resetAdminTalkingLayout}
            onSave={saveAdminEdits}
            onSeatSpotAnchorChange={updateAdminSeatSpotAnchor}
            onSeatSpotDrinkScaleChange={updateAdminSeatSpotDrinkScale}
            onSeatSpotScaleChange={updateAdminSeatSpotScale}
            onSelectCharacter={(characterId) => {
              setSelectedAdminCharacterId(characterId);
              setAdminSaveMessage('');
            }}
            onSubjectEnabledChange={updateAdminSubjectEnabled}
            onTalkingDefaultImageChange={updateAdminDefaultTalkingImage}
            onTalkingImageChange={updateAdminTalkingImage}
            onTalkingImageDelete={deleteAdminTalkingImage}
            onTalkingImagesAdd={addAdminTalkingImages}
            onTalkingFaceBlockerChange={updateAdminTalkingFaceBlocker}
            onTalkingLayoutChange={updateAdminTalkingLayout}
            onTalkingScaleChange={updateAdminTalkingScale}
          />
        ) : null}

        {storyToast ? <StoryAddedToast toast={storyToast} /> : null}

        {tutorialOpenPopup ? (
          <TutorialOpenOverlay onClose={() => setTutorialOpenPopup(false)} />
        ) : null}

        {isPaused ? (
          <PauseOverlay game={game} shopTimeLabel={shopTimeLabel} onResume={resumeGame} />
        ) : null}

        <audio
          ref={backgroundMusicRef}
          src={resolveAssetSrc(BACKGROUND_MUSIC_SRC)}
          preload="auto"
        />
      </div>
    </div>
  );
}

interface TopBarProps {
  game: GameState;
  shopQuality: number;
  clockProgress: number;
  shopTimeLabel: string;
  tutorialStep: TutorialStep;
  musicMuted: boolean;
  musicVolume: number;
  onMusicMutedChange: (muted: boolean) => void;
  onMusicVolumeChange: (volume: number) => void;
  onReset: () => void;
  onShop: () => void;
  onStories: () => void;
  onUpgrades: () => void;
  onMenu: () => void;
  onPause: () => void;
}

function TopBar({
  game,
  shopQuality,
  clockProgress,
  shopTimeLabel,
  tutorialStep,
  musicMuted,
  musicVolume,
  onMusicMutedChange,
  onMusicVolumeChange,
  onReset,
  onShop,
  onStories,
  onUpgrades,
  onMenu,
  onPause,
}: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tutorialClockActive = tutorialStep === 'clock';

  return (
    <header className="top-bar" aria-label="Cat cafe status">
      <div
        className={`day-meter ${tutorialClockActive ? 'tutorial-focus' : ''}`}
        aria-label="Cafe time"
      >
        {tutorialClockActive ? <span className="tutorial-time-arrow">Time</span> : null}
        <span>{shopTimeLabel}</span>
        <Meter value={clockProgress} label="Cafe day progress" />
      </div>
      <div className="happiness-meter">
        <CatHeadIcon />
        <div>
          <div className="meter-label">
            <span>Cafe Comfort</span>
            <strong>{shopQuality}%</strong>
          </div>
          <Meter value={shopQuality} label="Cafe comfort" />
        </div>
      </div>
      <div className="cup-bank">
        <CupIcon />
        <strong>{game.teaCups}</strong>
      </div>
      <IconButton className="top-pause-button" label="Pause" onClick={onPause}>
        <PauseIcon />
      </IconButton>
      <nav className="top-actions" aria-label="Game navigation">
        <IconButton label="Shop" onClick={onShop}>
          <UiImageIcon alt="" src={UI_ICON_SRC.store} />
        </IconButton>
        <IconButton label="Guest Log" onClick={onStories}>
          <UiImageIcon alt="" src={UI_ICON_SRC.logBook} />
        </IconButton>
        <IconButton label="Upgrades" onClick={onUpgrades}>
          <ShopIcon />
        </IconButton>
        <div className="settings-anchor">
          <IconButton label="Settings" onClick={() => setSettingsOpen((prev) => !prev)}>
            <UiImageIcon alt="" src={UI_ICON_SRC.gear} />
          </IconButton>
          {settingsOpen ? (
            <SettingsPopup
              musicMuted={musicMuted}
              musicVolume={musicVolume}
              onClose={() => setSettingsOpen(false)}
              onMusicMutedChange={onMusicMutedChange}
              onMusicVolumeChange={onMusicVolumeChange}
              onMenu={onMenu}
              onReset={onReset}
            />
          ) : null}
        </div>
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

interface TutorialOpenOverlayProps {
  onClose: () => void;
}

function TutorialOpenOverlay({ onClose }: TutorialOpenOverlayProps) {
  return (
    <div className="pause-overlay tutorial-open-overlay" role="dialog" aria-modal="true">
      <section className="pause-dialog">
        <CatHeadIcon />
        <p className="eyebrow">Shop Open</p>
        <h2>Ready</h2>
        <p>{TUTORIAL_OPEN_POPUP_MESSAGE}</p>
        <button className="primary-button" type="button" onClick={onClose}>
          Begin
        </button>
      </section>
    </div>
  );
}

interface OpeningScreenProps {
  settings: AdminOpeningSettings;
  game: GameState;
  musicMuted: boolean;
  musicVolume: number;
  onMusicMutedChange: (muted: boolean) => void;
  onMusicVolumeChange: (volume: number) => void;
  onReset: () => void;
  onComplete: () => void;
}

function getOpeningImagesForActor(
  settings: AdminOpeningSettings,
  actor: OpeningActor,
): AdminOpeningImage[] {
  if (actor === 'lila') return settings.lilaImages;
  if (actor === 'grace') return settings.graceImages;
  return [];
}

function getOpeningDefaultImageSrc(settings: AdminOpeningSettings, actor: OpeningActor): string {
  if (actor === 'lila') return settings.lilaImageSrc || settings.lilaImages[0]?.src || '';
  if (actor === 'grace') return settings.graceImageSrc || settings.graceImages[0]?.src || '';
  return '';
}

function getOpeningBeatImageSrc(
  settings: AdminOpeningSettings,
  actor: OpeningActor,
  beat?: AdminOpeningBeat,
): string {
  const imageId =
    actor === 'lila' ? beat?.lilaImageId : actor === 'grace' ? beat?.graceImageId : '';
  if (imageId === OPENING_IMAGE_NONE) return '';
  const actorImages = getOpeningImagesForActor(settings, actor);
  const selectedImage = imageId ? actorImages.find((image) => image.id === imageId) : null;
  return selectedImage?.src ?? getOpeningDefaultImageSrc(settings, actor);
}

function isOpeningActorVisible(
  beat: AdminOpeningBeat | undefined,
  actor: 'lila' | 'grace',
): boolean {
  if (!beat) return false;
  return (actor === 'lila' ? beat.lilaImageId : beat.graceImageId) !== OPENING_IMAGE_NONE;
}

function getOpeningPlacement(
  settings: AdminOpeningSettings,
  actor: OpeningActor,
): AdminOpeningPlacement {
  if (actor === 'grace') return settings.gracePlacement;
  return settings.lilaPlacement;
}

function getOpeningBeatPlacement(
  settings: AdminOpeningSettings,
  actor: 'lila' | 'grace',
  beat?: AdminOpeningBeat | null,
): AdminOpeningPlacement {
  const fallback = getOpeningPlacement(settings, actor);
  return normalizeOpeningPlacement(
    actor === 'lila' ? beat?.lilaPlacement : beat?.gracePlacement,
    fallback,
  );
}

function openingCharacterPlacementStyle(
  placement: AdminOpeningPlacement,
  active: boolean,
  flipped = false,
): CSSProperties {
  return {
    bottom: 'auto',
    left: `${placement.x}%`,
    right: 'auto',
    top: `${placement.y}%`,
    transform: `translate(-50%, -100%) translateY(${active ? -8 : 0}px) scale(${placement.scale / 100}) scale(var(--opening-character-safe-scale, 1)) scaleX(${flipped ? -1 : 1})`,
  };
}

function openingBlockerStyle(blocker: AdminFaceBlocker): CSSProperties {
  return {
    left: `${blocker.x}%`,
    top: `${blocker.y}%`,
    width: `${blocker.width}%`,
    height: `${blocker.height}%`,
  };
}

function isOpeningActorFlipped(
  beat: AdminOpeningBeat | undefined,
  actor: 'lila' | 'grace',
): boolean {
  if (!beat) return false;
  return actor === 'lila' ? beat.lilaFlipped : beat.graceFlipped;
}

function getVisibleOpeningActorImageSrc(
  settings: AdminOpeningSettings,
  actor: OpeningActor,
  beats: AdminOpeningBeat[],
  beatIndex: number,
): string {
  const beat = beats[clamp(beatIndex, 0, beats.length - 1)];
  return getOpeningBeatImageSrc(settings, actor, beat);
}

function getOpeningBeatBackgroundSrc(
  settings: AdminOpeningSettings,
  beat?: AdminOpeningBeat | null,
): string {
  return beat?.backgroundSrc || settings.backgroundSrc;
}

function OpeningScreen({
  settings,
  game,
  musicMuted,
  musicVolume,
  onMusicMutedChange,
  onMusicVolumeChange,
  onReset,
  onComplete,
}: OpeningScreenProps) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const safeSettings = normalizeOpeningSettings(settings);
  const beats = safeSettings.beats;
  const beat = beats[clamp(beatIndex, 0, beats.length - 1)] ?? beats[0];
  const lilaVisible = isOpeningActorVisible(beat, 'lila');
  const graceVisible = isOpeningActorVisible(beat, 'grace');
  const locationName = cleanNameValue(game.cafeName, safeSettings.locationName);
  const locationDetail = resolveGameTextVariables(safeSettings.locationDetail, game);

  function continueOpening() {
    if (beatIndex < beats.length - 1) {
      setBeatIndex((prev) => prev + 1);
      return;
    }
    onComplete();
  }

  return (
    <main className="opening-screen">
      <OpeningStageBackground
        settings={{
          ...safeSettings,
          locationName,
          backgroundSrc: getOpeningBeatBackgroundSrc(safeSettings, beat),
        }}
      />
      <div className="opening-settings-anchor settings-anchor">
        <IconButton label="Settings" onClick={() => setSettingsOpen((prev) => !prev)}>
          <UiImageIcon alt="" src={UI_ICON_SRC.gear} />
        </IconButton>
        {settingsOpen ? (
          <SettingsPopup
            musicMuted={musicMuted}
            musicVolume={musicVolume}
            onClose={() => setSettingsOpen(false)}
            onMusicMutedChange={onMusicMutedChange}
            onMusicVolumeChange={onMusicVolumeChange}
            onReset={onReset}
          />
        ) : null}
      </div>
      <div className="opening-location-card">
        <strong>{locationName}</strong>
        <span>{locationDetail}</span>
      </div>
      <div className="opening-character-layer" aria-hidden="true">
        {lilaVisible ? (
          <OpeningCharacterSprite
            actor="lila"
            imageSrc={getVisibleOpeningActorImageSrc(safeSettings, 'lila', beats, beatIndex)}
            placement={getOpeningBeatPlacement(safeSettings, 'lila', beat)}
            side="left"
            active={beat?.actor === 'lila'}
            flipped={isOpeningActorFlipped(beat, 'lila')}
          />
        ) : null}
        {graceVisible ? (
          <OpeningCharacterSprite
            actor="grace"
            imageSrc={getVisibleOpeningActorImageSrc(safeSettings, 'grace', beats, beatIndex)}
            placement={getOpeningBeatPlacement(safeSettings, 'grace', beat)}
            side="right"
            active={beat?.actor === 'grace'}
            flipped={isOpeningActorFlipped(beat, 'grace')}
          />
        ) : null}
      </div>
      <section className="opening-dialogue" aria-live="polite">
        <div>
          <span>{resolveGameTextVariables(beat?.speaker ?? locationName, game)}</span>
          <small>
            {beatIndex + 1}/{beats.length}
          </small>
        </div>
        <p>{resolveGameTextVariables(beat?.text ?? locationDetail, game)}</p>
        <button className="primary-button" type="button" onClick={continueOpening}>
          Continue
        </button>
      </section>
    </main>
  );
}

interface OpeningStagePreviewProps {
  settings: AdminOpeningSettings;
  editable?: boolean;
  onBeatChange?: (beatId: string, patch: Partial<AdminOpeningBeat>) => void;
}

function OpeningStagePreview({
  settings,
  editable = false,
  onBeatChange,
}: OpeningStagePreviewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragTargetRef = useRef<'lila' | 'grace' | 'blocker' | null>(null);
  const dragOffsetRef = useRef<AdminPosition>({ x: 0, y: 0 });
  const [beatIndex, setBeatIndex] = useState(0);
  const [showBlocker, setShowBlocker] = useState(false);
  const [blocker, setBlocker] = useState<AdminFaceBlocker>({
    x: 50,
    y: 34,
    width: 16,
    height: 18,
  });
  const safeSettings = normalizeOpeningSettings(settings);
  const beats = safeSettings.beats;
  const beat = beats[clamp(beatIndex, 0, beats.length - 1)] ?? beats[0];
  const previousBeat = beatIndex > 0 ? beats[beatIndex - 1] : null;
  const lilaVisible = isOpeningActorVisible(beat, 'lila');
  const graceVisible = isOpeningActorVisible(beat, 'grace');
  const previousLilaVisible = isOpeningActorVisible(previousBeat ?? undefined, 'lila');
  const previousGraceVisible = isOpeningActorVisible(previousBeat ?? undefined, 'grace');
  const [showPreviousOnion, setShowPreviousOnion] = useState(false);
  const currentLilaPlacement = getOpeningBeatPlacement(safeSettings, 'lila', beat);
  const currentGracePlacement = getOpeningBeatPlacement(safeSettings, 'grace', beat);
  const previousLilaPlacement = getOpeningBeatPlacement(safeSettings, 'lila', previousBeat);
  const previousGracePlacement = getOpeningBeatPlacement(safeSettings, 'grace', previousBeat);

  function getPreviewPosition(event: ReactPointerEvent<HTMLElement>): AdminPosition | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, -60, 160),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, -20, 140),
    };
  }

  function updatePlacement(actor: 'lila' | 'grace', patch: Partial<AdminOpeningPlacement>) {
    if (!beat) return;
    const currentPlacement = actor === 'lila' ? currentLilaPlacement : currentGracePlacement;
    const nextPlacement = normalizeOpeningPlacement(
      {
        ...currentPlacement,
        ...patch,
      },
      currentPlacement,
    );
    onBeatChange?.(
      beat.id,
      actor === 'lila' ? { lilaPlacement: nextPlacement } : { gracePlacement: nextPlacement },
    );
  }

  function updateBlocker(patch: Partial<AdminFaceBlocker>) {
    setBlocker((current) => ({
      x: clamp(numericValue(patch.x, current.x), -20, 120),
      y: clamp(numericValue(patch.y, current.y), -20, 120),
      width: clamp(numericValue(patch.width, current.width), 6, 48),
      height: clamp(numericValue(patch.height, current.height), 6, 48),
    }));
  }

  function beginOpeningDrag(actor: 'lila' | 'grace', event: ReactPointerEvent<HTMLElement>) {
    if (!editable) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointerPosition = getPreviewPosition(event);
    if (!pointerPosition) return;
    const currentPlacement = actor === 'lila' ? currentLilaPlacement : currentGracePlacement;
    dragTargetRef.current = actor;
    dragOffsetRef.current = {
      x: pointerPosition.x - currentPlacement.x,
      y: pointerPosition.y - currentPlacement.y,
    };
  }

  function beginBlockerDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!editable) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointerPosition = getPreviewPosition(event);
    if (!pointerPosition) return;
    dragTargetRef.current = 'blocker';
    dragOffsetRef.current = {
      x: pointerPosition.x - blocker.x,
      y: pointerPosition.y - blocker.y,
    };
  }

  function moveOpeningDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const target = dragTargetRef.current;
    if (!target) return;
    const pointerPosition = getPreviewPosition(event);
    if (!pointerPosition) return;
    if (target === 'blocker') {
      updateBlocker({
        x: pointerPosition.x - dragOffsetRef.current.x,
        y: pointerPosition.y - dragOffsetRef.current.y,
      });
      return;
    }
    updatePlacement(target, {
      x: clamp(pointerPosition.x - dragOffsetRef.current.x, -60, 160),
      y: clamp(pointerPosition.y - dragOffsetRef.current.y, -20, 140),
    });
  }

  function stopOpeningDrag() {
    dragTargetRef.current = null;
    dragOffsetRef.current = { x: 0, y: 0 };
  }

  function continuePreview() {
    setBeatIndex((prev) => (prev < beats.length - 1 ? prev + 1 : prev));
  }

  function restartPreview() {
    setBeatIndex(0);
  }

  function toggleCurrentBeatFlip(actor: 'lila' | 'grace') {
    if (!beat) return;
    onBeatChange?.(
      beat.id,
      actor === 'lila' ? { lilaFlipped: !beat.lilaFlipped } : { graceFlipped: !beat.graceFlipped },
    );
  }

  return (
    <div className="admin-opening-preview-tool">
      <div
        className="opening-preview-stage admin-opening-play-stage"
        ref={stageRef}
        onPointerCancel={stopOpeningDrag}
        onPointerMove={moveOpeningDrag}
        onPointerUp={stopOpeningDrag}
      >
        <OpeningStageBackground
          settings={{
            ...safeSettings,
            backgroundSrc: getOpeningBeatBackgroundSrc(safeSettings, beat),
          }}
        />
        {showPreviousOnion && previousBeat && previousLilaVisible ? (
          <div
            className="admin-opening-onion-character"
            style={openingCharacterPlacementStyle(
              previousLilaPlacement,
              previousBeat.actor === 'lila',
              isOpeningActorFlipped(previousBeat, 'lila'),
            )}
          >
            <OpeningCharacterSprite
              actor="lila"
              imageSrc={getOpeningBeatImageSrc(safeSettings, 'lila', previousBeat)}
              placement={previousLilaPlacement}
              side="left"
              active={previousBeat.actor === 'lila'}
              flipped={isOpeningActorFlipped(previousBeat, 'lila')}
              inline={false}
            />
          </div>
        ) : null}
        {showPreviousOnion && previousBeat && previousGraceVisible ? (
          <div
            className="admin-opening-onion-character"
            style={openingCharacterPlacementStyle(
              previousGracePlacement,
              previousBeat.actor === 'grace',
              isOpeningActorFlipped(previousBeat, 'grace'),
            )}
          >
            <OpeningCharacterSprite
              actor="grace"
              imageSrc={getOpeningBeatImageSrc(safeSettings, 'grace', previousBeat)}
              placement={previousGracePlacement}
              side="right"
              active={previousBeat.actor === 'grace'}
              flipped={isOpeningActorFlipped(previousBeat, 'grace')}
              inline={false}
            />
          </div>
        ) : null}
        {lilaVisible ? (
          <button
            aria-label="Move Lila opening position"
            className="admin-opening-character-handle"
            disabled={!editable}
            onPointerDown={(event) => beginOpeningDrag('lila', event)}
            style={openingCharacterPlacementStyle(
              currentLilaPlacement,
              beat?.actor === 'lila',
              isOpeningActorFlipped(beat, 'lila'),
            )}
            type="button"
          >
            <OpeningCharacterSprite
              actor="lila"
              imageSrc={getVisibleOpeningActorImageSrc(safeSettings, 'lila', beats, beatIndex)}
              placement={currentLilaPlacement}
              side="left"
              active={beat?.actor === 'lila'}
              flipped={isOpeningActorFlipped(beat, 'lila')}
              inline={false}
            />
          </button>
        ) : null}
        {graceVisible ? (
          <button
            aria-label="Move Grace opening position"
            className="admin-opening-character-handle"
            disabled={!editable}
            onPointerDown={(event) => beginOpeningDrag('grace', event)}
            style={openingCharacterPlacementStyle(
              currentGracePlacement,
              beat?.actor === 'grace',
              isOpeningActorFlipped(beat, 'grace'),
            )}
            type="button"
          >
            <OpeningCharacterSprite
              actor="grace"
              imageSrc={getVisibleOpeningActorImageSrc(safeSettings, 'grace', beats, beatIndex)}
              placement={currentGracePlacement}
              side="right"
              active={beat?.actor === 'grace'}
              flipped={isOpeningActorFlipped(beat, 'grace')}
              inline={false}
            />
          </button>
        ) : null}
        {editable && showBlocker ? (
          <button
            aria-label="Move face blocker guide"
            className="admin-opening-face-blocker"
            onPointerDown={beginBlockerDrag}
            style={openingBlockerStyle(blocker)}
            type="button"
          >
            <span>Keep Clear</span>
          </button>
        ) : null}
        <div className="opening-location-card">
          <strong>{safeSettings.locationName}</strong>
          <span>{safeSettings.locationDetail}</span>
        </div>
        <section className="opening-dialogue admin-opening-preview-dialogue" aria-live="polite">
          <div>
            <span>{beat?.speaker ?? safeSettings.locationName}</span>
            <small>
              {beatIndex + 1}/{beats.length}
            </small>
          </div>
          <p>{beat?.text ?? safeSettings.locationDetail}</p>
          <button
            className="primary-button"
            disabled={beatIndex >= beats.length - 1}
            type="button"
            onClick={continuePreview}
          >
            Continue
          </button>
          <button className="paper-button" type="button" onClick={restartPreview}>
            Restart
          </button>
        </section>
      </div>
      {editable ? (
        <div className="admin-opening-placement-controls" aria-label="Opening character placement">
          <div className="admin-opening-preview-controls-row">
            <button
              className={showPreviousOnion ? 'active' : ''}
              disabled={!previousBeat}
              type="button"
              onClick={() => setShowPreviousOnion((visible) => !visible)}
            >
              Onion Previous
            </button>
            <button
              className={showBlocker ? 'active' : ''}
              type="button"
              onClick={() => setShowBlocker((visible) => !visible)}
            >
              Face Blocker
            </button>
            <button
              className={isOpeningActorFlipped(beat, 'lila') ? 'active' : ''}
              disabled={!lilaVisible}
              type="button"
              onClick={() => toggleCurrentBeatFlip('lila')}
            >
              Flip Lila
            </button>
            <button
              className={isOpeningActorFlipped(beat, 'grace') ? 'active' : ''}
              disabled={!graceVisible}
              type="button"
              onClick={() => toggleCurrentBeatFlip('grace')}
            >
              Flip Grace
            </button>
          </div>
          {showBlocker ? (
            <>
              <label>
                <span>Block width</span>
                <input
                  min={6}
                  max={48}
                  type="range"
                  value={blocker.width}
                  onInput={(event) =>
                    updateBlocker({ width: Number(event.currentTarget.value) })
                  }
                  onChange={(event) =>
                    updateBlocker({ width: Number(event.currentTarget.value) })
                  }
                />
                <small>{Math.round(blocker.width)}%</small>
              </label>
              <label>
                <span>Block height</span>
                <input
                  min={6}
                  max={48}
                  type="range"
                  value={blocker.height}
                  onInput={(event) =>
                    updateBlocker({ height: Number(event.currentTarget.value) })
                  }
                  onChange={(event) =>
                    updateBlocker({ height: Number(event.currentTarget.value) })
                  }
                />
                <small>{Math.round(blocker.height)}%</small>
              </label>
            </>
          ) : null}
          {(['lila', 'grace'] as const).map((actor) => {
            const placement = actor === 'lila' ? currentLilaPlacement : currentGracePlacement;
            const label = actor === 'lila' ? 'Lila' : 'Grace';

            return (
              <label key={actor}>
                <span>{label} scale</span>
                <input
                  min={40}
                  max={500}
                  type="range"
                  value={placement.scale}
                  onInput={(event) =>
                    updatePlacement(actor, { scale: Number(event.currentTarget.value) })
                  }
                  onChange={(event) =>
                    updatePlacement(actor, { scale: Number(event.currentTarget.value) })
                  }
                />
                <small>{placement.scale}%</small>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface OpeningStageBackgroundProps {
  settings: AdminOpeningSettings;
}

function OpeningStageBackground({ settings }: OpeningStageBackgroundProps) {
  return (
    <div
      className={`opening-background ${settings.backgroundSrc ? 'has-image' : ''}`}
      style={
        settings.backgroundSrc
          ? ({ '--opening-bg': cssAssetUrl(settings.backgroundSrc) } as CSSProperties)
          : undefined
      }
      aria-hidden="true"
    >
      <div className="opening-building-placeholder">
        <span>{settings.locationName}</span>
      </div>
    </div>
  );
}

interface OpeningCharacterSpriteProps {
  actor: OpeningActor;
  imageSrc: string;
  placement: AdminOpeningPlacement;
  side: 'left' | 'right';
  active: boolean;
  flipped?: boolean;
  inline?: boolean;
}

function OpeningCharacterSprite({
  actor,
  imageSrc,
  placement,
  side,
  active,
  flipped = false,
  inline = true,
}: OpeningCharacterSpriteProps) {
  const label = actor === 'grace' ? 'Grace' : actor === 'lila' ? 'Lila' : 'Narrator';
  return (
    <div
      className={`opening-character opening-character-${side} opening-character-${actor} ${
        active ? 'active' : ''
      } ${inline ? '' : 'opening-character-inline'}`}
      style={inline ? openingCharacterPlacementStyle(placement, active, flipped) : undefined}
    >
      {imageSrc ? (
        <img alt="" draggable={false} src={resolveAssetSrc(imageSrc)} />
      ) : (
        <span className="opening-character-placeholder">{label}</span>
      )}
    </div>
  );
}

interface TutorialCoachCardProps {
  imageSrc: string;
  message: string;
  warning?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function TutorialCoachCard({
  imageSrc,
  message,
  warning = '',
  actionLabel,
  onAction,
}: TutorialCoachCardProps) {
  return (
    <aside className="tutorial-coach-card" aria-live="polite">
      <div className="tutorial-coach-portrait" aria-hidden="true">
        {imageSrc ? (
          <img alt="" draggable={false} src={resolveAssetSrc(imageSrc)} />
        ) : (
          <span>Lila</span>
        )}
      </div>
      <div>
        <strong>Lila</strong>
        <p>{message}</p>
      </div>
      {actionLabel && onAction ? (
        <button className="tutorial-coach-action" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
      {warning ? <p className="tutorial-coach-warning">{warning}</p> : null}
    </aside>
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
  musicMuted: boolean;
  musicVolume: number;
  onContinue: () => void;
  onStories: () => void;
  onAdmin: () => void;
  onReset: () => void;
  onMusicMutedChange: (muted: boolean) => void;
  onMusicVolumeChange: (volume: number) => void;
  showAdmin: boolean;
}

interface SetupScreenProps {
  onComplete: (cafeName: string, catName: string) => void;
}

interface StartGameScreenProps {
  onStart: () => void;
}

function StartGameScreen({ onStart }: StartGameScreenProps) {
  return (
    <main className="setup-screen intro-screen">
      <section className="setup-card intro-card" aria-label="Game introduction">
        <p className="eyebrow">Cat Cafe</p>
        <h1>Start Game</h1>
        <p className="setup-intro">
          Play as the cafe cat in a quiet story game about listening to the people who visit your
          cafe. Serve their drinks, comfort them with gentle cat actions, and help lift their moods
          as they share pieces of their lives. The more cared for your guests feel, the more your
          cafe's reputation grows.
        </p>
        <button className="primary-button" type="button" onClick={onStart}>
          Start Game
        </button>
      </section>
    </main>
  );
}

interface ContentWarningScreenProps {
  onContinue: () => void;
}

function ContentWarningScreen({ onContinue }: ContentWarningScreenProps) {
  return (
    <main className="setup-screen intro-screen">
      <section className="setup-card intro-card warning-card" aria-label="Content warning">
        <p className="eyebrow">Before You Begin</p>
        <h1>Warning</h1>
        <p className="setup-intro">
          Know that some character stories involve abuse, slavery, and stalking.
        </p>
        <button className="primary-button" type="button" onClick={onContinue}>
          Continue
        </button>
      </section>
    </main>
  );
}

function SetupScreen({ onComplete }: SetupScreenProps) {
  const [cafeName, setCafeName] = useState('');
  const [catName, setCatName] = useState('');

  function submitSetup(event: ReactFormEvent<HTMLFormElement>) {
    event.preventDefault();
    onComplete(cafeName, catName);
  }

  return (
    <main className="setup-screen">
      <form className="setup-card" aria-label="Name your cafe and cat" onSubmit={submitSetup}>
        <h1>Welcome In</h1>
        <p className="setup-intro">Please name your cafe and the cat!</p>
        <label>
          <span>Cafe name</span>
          <input
            autoFocus
            maxLength={40}
            onChange={(event) => setCafeName(event.target.value)}
            placeholder={DEFAULT_CAFE_NAME}
            type="text"
            value={cafeName}
          />
        </label>
        <label>
          <span>Cat name</span>
          <input
            maxLength={40}
            onChange={(event) => setCatName(event.target.value)}
            placeholder={DEFAULT_CAT_NAME}
            type="text"
            value={catName}
          />
        </label>
        <button className="primary-button" type="submit">
          Continue
        </button>
      </form>
    </main>
  );
}

interface SettingsPopupProps {
  musicMuted: boolean;
  musicVolume: number;
  onClose: () => void;
  onMenu?: () => void;
  onMusicMutedChange: (muted: boolean) => void;
  onMusicVolumeChange: (volume: number) => void;
  onReset: () => void;
}

function SettingsPopup({
  musicMuted,
  musicVolume,
  onClose,
  onMenu,
  onMusicMutedChange,
  onMusicVolumeChange,
  onReset,
}: SettingsPopupProps) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  function confirmResetSave() {
    onReset();
    onClose();
  }

  function backToMenu() {
    onMenu?.();
    onClose();
  }

  return (
    <section className="settings-popover" role="dialog" aria-label="Settings">
      <div className="settings-popover-head">
        <strong>Settings</strong>
        <button className="quiet-icon-button" type="button" onClick={onClose} aria-label="Close">
          x
        </button>
      </div>
      <label className="menu-toggle-row">
        <span>Mute music</span>
        <input
          type="checkbox"
          checked={musicMuted}
          onChange={(event) => onMusicMutedChange(event.currentTarget.checked)}
        />
      </label>
      <label className="settings-volume-row">
        <span>Music volume</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={musicVolume}
          onChange={(event) => onMusicVolumeChange(Number(event.currentTarget.value))}
        />
        <strong>{musicVolume}%</strong>
      </label>
      {onMenu ? (
        <button className="paper-button settings-menu-button" type="button" onClick={backToMenu}>
          Back to Menu
        </button>
      ) : null}
      <div className="menu-reset-area">
        <button
          className="quiet-button danger-reset-button"
          type="button"
          onClick={() => setResetConfirmOpen(true)}
        >
          Reset Save
        </button>
        <p>Warning: this clears your current save and starts the game over.</p>
      </div>
      {resetConfirmOpen ? (
        <div className="reset-confirm-overlay" role="presentation">
          <section
            className="reset-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-confirm-title"
          >
            <strong id="reset-confirm-title">Reset save?</strong>
            <p>
              Reset can remove your data. This clears your cafe progress, stories, tips, upgrades,
              and tutorial state.
            </p>
            <div className="reset-confirm-actions">
              <button
                className="paper-button"
                type="button"
                onClick={() => setResetConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="quiet-button danger-reset-button"
                type="button"
                onClick={confirmResetSave}
              >
                Reset Save
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function MenuScreen({
  musicMuted,
  musicVolume,
  onContinue,
  onStories,
  onAdmin,
  onReset,
  onMusicMutedChange,
  onMusicVolumeChange,
  showAdmin,
}: MenuScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <main className="menu-screen">
      <section className="storefront" aria-label="Cat Cafe storefront">
        <div className="shop-sign">
          <span>Cat</span>
          <strong>Cafe</strong>
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
        <div className="menu-buttons">
          <button className="primary-button" type="button" onClick={onContinue}>
            Continue
          </button>
          <button className="paper-button" type="button" onClick={onStories}>
            Guest Log
          </button>
          {showAdmin ? (
            <button className="paper-button" type="button" onClick={onAdmin}>
              Admin
            </button>
          ) : null}
          <button
            className="paper-button"
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
          >
            Settings
          </button>
        </div>
        <p className="menu-content-note">
          Note: There are topics in this game such as stalking, slavery mentioned.
        </p>
      </section>

      {settingsOpen ? (
        <div className="menu-settings-modal" role="presentation">
          <div className="menu-settings-dialog">
            <SettingsPopup
              musicMuted={musicMuted}
              musicVolume={musicVolume}
              onClose={() => setSettingsOpen(false)}
              onMusicMutedChange={onMusicMutedChange}
              onMusicVolumeChange={onMusicVolumeChange}
              onReset={onReset}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

interface AdminScreenProps {
  adminChats: AdminChats;
  adminCatSettings: AdminCatSettings;
  adminChatMenuSettings: AdminChatMenuSettings;
  adminMoodIcons: AdminMoodIcon[];
  openingSettings: AdminOpeningSettings;
  characterSettings: AdminCharacterSettings;
  layouts: AdminLayouts;
  saveMessage: string;
  seatSpotLayouts: AdminSeatSpotLayouts;
  selectedCharacterId: AdminSubjectId;
  onAdminChatsChange: (chats: AdminChats) => void;
  onAdminCatSettingsChange: (settings: AdminCatSettings) => void;
  onAdminChatEntryTest: (subjectId: AdminSubjectId, entryId: string) => void;
  onAdminChatMenuSettingsChange: (settings: AdminChatMenuSettings) => void;
  onAdminMoodIconsChange: (icons: AdminMoodIcon[]) => void;
  onOpeningSettingsChange: (settings: AdminOpeningSettings) => void;
  onBack: () => void;
  onCatScaleChange: (characterId: AdminSubjectId, scale: number) => void;
  onCharacterScaleChange: (characterId: AdminSubjectId, scale: number) => void;
  onCharacterSettingsChange: (characterId: CharacterId, settings: CharacterAdminSettings) => void;
  onLayoutChange: (
    characterId: AdminSubjectId,
    item: AdminLayoutDragItem,
    position: AdminPosition,
  ) => void;
  onResetLayout: (characterId: AdminSubjectId) => void;
  onResetSeatSpots: (ownerId: AdminSeatSpotOwnerId) => void;
  onResetTalkingLayout: (characterId: AdminSubjectId) => void;
  onSave: () => void;
  onSeatSpotAnchorChange: (
    ownerId: AdminSeatSpotOwnerId,
    slot: TableSlot,
    anchor: AdminSeatAnchor,
    position: AdminPosition,
  ) => void;
  onSeatSpotDrinkScaleChange: (characterId: AdminSubjectId, slot: TableSlot, scale: number) => void;
  onSeatSpotScaleChange: (ownerId: AdminSeatSpotOwnerId, slot: TableSlot, scale: number) => void;
  onSelectCharacter: (characterId: AdminSubjectId) => void;
  onSubjectEnabledChange: (characterId: AdminSubjectId, enabled: boolean) => void;
  onTalkingDefaultImageChange: (characterId: AdminSubjectId, imageSrc: string) => void;
  onTalkingImageChange: (characterId: AdminSubjectId, imageSrc: string) => void;
  onTalkingImageDelete: (characterId: AdminSubjectId, imageSrc: string) => void;
  onTalkingImagesAdd: (characterId: AdminSubjectId, imageSrcs: string[]) => void;
  onTalkingFaceBlockerChange: (
    characterId: AdminSubjectId,
    faceBlocker: AdminFaceBlocker,
  ) => void;
  onTalkingLayoutChange: (
    characterId: AdminSubjectId,
    item: 'character' | 'cat' | 'bubble' | 'drink' | 'patience',
    position: AdminPosition,
  ) => void;
  onTalkingScaleChange: (
    characterId: AdminSubjectId,
    scaleKind: 'characterScale' | 'catScale' | 'drinkScale',
    scale: number,
  ) => void;
}

function AdminScreen({
  adminChats,
  adminCatSettings,
  adminChatMenuSettings,
  adminMoodIcons,
  openingSettings,
  characterSettings,
  layouts,
  saveMessage,
  seatSpotLayouts,
  selectedCharacterId,
  onAdminChatsChange,
  onAdminCatSettingsChange,
  onAdminChatEntryTest,
  onAdminChatMenuSettingsChange,
  onAdminMoodIconsChange,
  onOpeningSettingsChange,
  onBack,
  onCatScaleChange,
  onCharacterScaleChange,
  onCharacterSettingsChange,
  onLayoutChange,
  onResetLayout,
  onResetSeatSpots,
  onResetTalkingLayout,
  onSave,
  onSeatSpotAnchorChange,
  onSeatSpotDrinkScaleChange,
  onSeatSpotScaleChange,
  onSelectCharacter,
  onSubjectEnabledChange,
  onTalkingDefaultImageChange,
  onTalkingImageChange,
  onTalkingImageDelete,
  onTalkingImagesAdd,
  onTalkingFaceBlockerChange,
  onTalkingLayoutChange,
  onTalkingScaleChange,
}: AdminScreenProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const chatMenuPreviewRef = useRef<HTMLElement | null>(null);
  const chatMenuEditorRef = useRef<HTMLDivElement | null>(null);
  const dragItemRef = useRef<AdminLayoutDragItem | null>(null);
  const dragItemOffsetRef = useRef<AdminPosition>({ x: 0, y: 0 });
  const dragSeatSlotRef = useRef<TableSlot | null>(null);
  const dragSeatAnchorRef = useRef<AdminSeatAnchor>('marker');
  const dragSeatOwnerRef = useRef<AdminSeatSpotOwnerId | null>(null);
  const dragSeatOffsetRef = useRef<AdminPosition>({ x: 0, y: 0 });
  const dragChatMenuActionRef = useRef<CatActionId | null>(null);
  const dragChatMenuOffsetRef = useRef<AdminPosition>({ x: 0, y: 0 });
  const dragChatMenuWheelRef = useRef(false);
  const dragChatMenuWheelOffsetRef = useRef<AdminPosition>({ x: 0, y: 0 });
  const dragChatBlockIdRef = useRef('');
  const dragFaceBlockerRef = useRef(false);
  const dragFaceBlockerOffsetRef = useRef<AdminPosition>({ x: 0, y: 0 });
  const [sidePanelMode, setSidePanelMode] = useState<AdminSidePanelMode>('inspector');
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<AdminPreviewMode>('shop');
  const [showChatFaceBlocker, setShowChatFaceBlocker] = useState(false);
  const [characterManagerView, setCharacterManagerView] =
    useState<AdminCharacterManagerView>('list');
  const [characterDetailTab, setCharacterDetailTab] = useState<AdminCharacterDetailTab>('settings');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedChatSubjectId, setSelectedChatSubjectId] = useState<AdminSubjectId | ''>('');
  const [selectedChatGroupId, setSelectedChatGroupId] = useState('');
  const [selectedChatEntryId, setSelectedChatEntryId] = useState('');
  const [chatEditorMode, setChatEditorMode] = useState<AdminChatEditorMode>('list');
  const [chatToolMode, setChatToolMode] = useState<AdminChatToolMode>('chats');
  const [previewChatKind, setPreviewChatKind] = useState<AdminChatKind>('story');
  const [previewChatEntryId, setPreviewChatEntryId] = useState('');
  const [openingTab, setOpeningTab] = useState<AdminOpeningTab>('settings');
  const [addingChatGroupId, setAddingChatGroupId] = useState('');
  const [chatImportMessage, setChatImportMessage] = useState('');
  const [selectedSeatSlot, setSelectedSeatSlot] = useState<TableSlot>(0);
  const [onionCharacterId, setOnionCharacterId] = useState<AdminSubjectId | ''>('');
  const selectedCustomer = getAdminSubjectCustomer(selectedCharacterId, characterSettings);
  const selectedSubjectIsParty = isAdminPartyId(selectedCharacterId);
  const selectedPrimaryCharacterId = getCustomerPrimaryCharacterId(selectedCustomer) ?? 'shadow';
  const selectedCharacter = getEditableCharacterProfile(
    selectedPrimaryCharacterId,
    characterSettings,
  );
  const selectedSettings = normalizeCharacterAdminSettings(
    selectedPrimaryCharacterId,
    characterSettings[selectedPrimaryCharacterId] ??
      defaultCharacterAdminSettings(selectedCharacter),
  );
  const selectedLayout = normalizeAdminLayout(layouts[selectedCharacterId], selectedCharacterId);
  const selectedTalkingLayout = selectedLayout.talking;
  const chatFaceBlocker = selectedTalkingLayout.faceBlocker;
  const selectedSubjectEnabled = selectedSubjectIsParty
    ? selectedLayout.enabled
    : selectedSettings.enabled;
  const talkingPoses = useMemo<CharacterPose[]>(() => {
    const hiddenSrcs = new Set(selectedTalkingLayout.hiddenImageSrcs);
    const basePoses = getCharacterTalkingPoses(selectedCharacterId).filter(
      (pose) => !hiddenSrcs.has(pose.src),
    );
    const poseSrcs = new Set(basePoses.map((pose) => pose.src));
    const uploadPoses = selectedTalkingLayout.enabledImageSrcs
      .filter((src) => src && !poseSrcs.has(src) && !hiddenSrcs.has(src))
      .map((src, index) => ({
        id: `${selectedCharacterId}-upload-${index}`,
        label: `Upload ${index + 1}`,
        src,
      }));
    return [...basePoses, ...uploadPoses];
  }, [
    selectedCharacterId,
    selectedTalkingLayout.enabledImageSrcs,
    selectedTalkingLayout.hiddenImageSrcs,
  ]);
  const activeDefaultImage =
    selectedTalkingLayout.defaultImageSrc ||
    getVisibleDefaultTalkingImageSrc(selectedCharacterId, selectedTalkingLayout.hiddenImageSrcs) ||
    getVisibleDefaultTalkingImageSrc(
      selectedPrimaryCharacterId,
      selectedTalkingLayout.hiddenImageSrcs,
    );
  const activeTalkingImage =
    selectedTalkingLayout.imageSrc ||
    selectedTalkingLayout.defaultImageSrc ||
    getVisibleDefaultTalkingImageSrc(selectedCharacterId, selectedTalkingLayout.hiddenImageSrcs) ||
    getVisibleDefaultTalkingImageSrc(
      selectedPrimaryCharacterId,
      selectedTalkingLayout.hiddenImageSrcs,
    );
  const selectedPortrait = selectedSettings.portrait;
  const patienceSeconds = Math.round(selectedSettings.patienceMs / 1000);
  const selectedSeatSpots = getAdminSeatSpots(seatSpotLayouts, selectedCharacterId);
  const selectedSeatSpot = getAdminSeatSpot(selectedSeatSpots, selectedSeatSlot);
  const emptyTableSeatSpots = getEmptyTableSeatSpots(seatSpotLayouts);
  const selectedEmptyTableSpot = getAdminSeatSpot(emptyTableSeatSpots, selectedSeatSlot, 300);
  const activeOnionCharacterId =
    onionCharacterId && onionCharacterId !== selectedCharacterId ? onionCharacterId : null;
  const onionCustomer = activeOnionCharacterId
    ? getAdminSubjectCustomer(activeOnionCharacterId, characterSettings)
    : null;
  const onionCharacter = onionCustomer?.members[0] ?? null;
  const onionPrimaryCharacterId = onionCustomer
    ? getCustomerPrimaryCharacterId(onionCustomer)
    : null;
  const onionPortrait =
    onionPrimaryCharacterId != null
      ? normalizeCharacterAdminSettings(
          onionPrimaryCharacterId,
          characterSettings[onionPrimaryCharacterId] ??
            defaultCharacterAdminSettings(CHARACTER_PROFILES[onionPrimaryCharacterId]),
        ).portrait
      : null;
  const onionLayout = activeOnionCharacterId
    ? normalizeAdminLayout(layouts[activeOnionCharacterId], activeOnionCharacterId)
    : null;
  const onionSeatSpots =
    activeOnionCharacterId != null
      ? getAdminSeatSpots(seatSpotLayouts, activeOnionCharacterId)
      : null;
  const onionTalkingImage =
    activeOnionCharacterId != null && onionLayout
      ? onionLayout.talking.defaultImageSrc ||
        getVisibleDefaultTalkingImageSrc(
          activeOnionCharacterId,
          onionLayout.talking.hiddenImageSrcs,
        )
      : '';
  const onionConversationImage =
    activeOnionCharacterId != null && onionLayout
      ? onionLayout.talking.imageSrc ||
        onionLayout.talking.defaultImageSrc ||
        getVisibleDefaultTalkingImageSrc(
          activeOnionCharacterId,
          onionLayout.talking.hiddenImageSrcs,
        )
      : '';
  const adminAssets = useMemo<AdminAssetItem[]>(() => {
    const storeAssets = ADMIN_SUBJECT_IDS.map<AdminAssetItem>((subjectId) => {
      const customer = getAdminSubjectCustomer(subjectId, characterSettings);
      const layout = normalizeAdminLayout(layouts[subjectId], subjectId);
      return {
        id: `store-${subjectId}`,
        kind: 'store',
        label: `${customer.name} store art`,
        owner: customer.name,
        detail: customer.members.length > 1 ? 'Party image' : 'Default store image',
        src:
          layout.talking.defaultImageSrc ||
          getVisibleDefaultTalkingImageSrc(subjectId, layout.talking.hiddenImageSrcs) ||
          getVisibleDefaultTalkingImageSrc(
            getCustomerPrimaryCharacterId(customer) ?? undefined,
            layout.talking.hiddenImageSrcs,
          ),
        subjectId,
      };
    });

    const portraitAssets = ADMIN_CHARACTER_IDS.map<AdminAssetItem>((characterId) => {
      const profile = getEditableCharacterProfile(characterId, characterSettings);
      const settings = normalizeCharacterAdminSettings(characterId, characterSettings[characterId]);
      return {
        id: `portrait-${characterId}`,
        kind: 'portrait',
        label: `${profile.name} portrait`,
        owner: profile.name,
        detail: 'Character portrait',
        src: settings.portrait.imageSrc,
        characterId,
      };
    });

    const recipeAssets = SERVICE_ITEMS.map<AdminAssetItem>((service) => ({
      id: `recipe-${service.id}`,
      kind: 'static',
      label: service.name,
      owner: service.category,
      detail: 'Recipe image',
      src: service.imageSrc,
    }));

    const sceneAssets: AdminAssetItem[] = [
      {
        id: 'scene-shop-background',
        kind: 'static',
        label: 'Shop background',
        owner: 'Store',
        detail: 'Background image',
        src: '/cat/shop-empty-tall.png',
      },
    ];

    return [...storeAssets, ...portraitAssets, ...recipeAssets, ...sceneAssets].filter(
      (asset) => asset.src,
    );
  }, [characterSettings, layouts]);
  const selectedAsset = adminAssets.find((asset) => asset.id === selectedAssetId) ?? null;
  const safeOpeningSettings = normalizeOpeningSettings(openingSettings);
  const lilaOpeningImages = safeOpeningSettings.lilaImages;
  const graceOpeningImages = safeOpeningSettings.graceImages;
  const selectedChatCustomer = selectedChatSubjectId
    ? getAdminSubjectCustomer(selectedChatSubjectId, characterSettings)
    : null;
  const selectedChatGroups = selectedChatSubjectId
    ? (adminChats[selectedChatSubjectId] ?? getDefaultAdminChatsForSubject(selectedChatSubjectId))
    : [];
  const selectedChatGroup =
    selectedChatGroups.find((group) => group.id === selectedChatGroupId) ??
    selectedChatGroups[0] ??
    null;
  const selectedChatEntry =
    selectedChatGroup?.entries.find((entry) => entry.id === selectedChatEntryId) ?? null;
  const previewChatGroups =
    adminChats[selectedCharacterId] ?? getDefaultAdminChatsForSubject(selectedCharacterId);
  const previewChatEntries = previewChatGroups
    .flatMap((group) => group.entries)
    .filter((entry) => entry.kind === previewChatKind);
  const previewChatEntry =
    previewChatEntries.find((entry) => entry.id === previewChatEntryId) ??
    previewChatEntries[0] ??
    null;
  const previewChatImage =
    previewChatEntry && previewChatEntry.kind !== 'leave'
      ? getAdminChatStoryLineImages(previewChatEntry).find(Boolean) || ''
      : '';
  const activePreviewTalkingImage = previewChatImage || activeTalkingImage;
  const previewChatLines = previewChatEntry ? getAdminChatStoryLines(previewChatEntry) : [];
  const previewChatLineCount = Math.max(previewChatLines.length, 1);
  const previewChatTitle = previewChatEntry
    ? previewChatEntry.kind === 'story'
      ? previewChatEntry.title || `${selectedCustomer.name}'s Story`
      : `${ADMIN_CHAT_KIND_LABELS[previewChatEntry.kind]}: ${previewChatEntry.title}`
    : `No ${ADMIN_CHAT_KIND_LABELS[previewChatKind].toLowerCase()} set`;
  const previewChatLine =
    previewChatLines[0] ||
    previewChatEntry?.summary ||
    previewChatEntry?.title ||
    `Add a ${ADMIN_CHAT_KIND_LABELS[previewChatKind].toLowerCase()} to preview it here.`;
  const previewChatFallbackEntryId = previewChatEntries[0]?.id ?? '';
  useEffect(() => {
    if (previewChatEntries.some((entry) => entry.id === previewChatEntryId)) return;
    setPreviewChatEntryId(previewChatFallbackEntryId);
  }, [
    adminChats,
    previewChatEntries,
    previewChatEntryId,
    previewChatFallbackEntryId,
    previewChatKind,
    selectedCharacterId,
  ]);
  const selectedChatImageOptions = useMemo(() => {
    if (!selectedChatSubjectId) return [];
    const chatLayout = normalizeAdminLayout(layouts[selectedChatSubjectId], selectedChatSubjectId);
    const chatCustomer = getAdminSubjectCustomer(selectedChatSubjectId, characterSettings);
    const primaryCharacterId = getCustomerPrimaryCharacterId(chatCustomer);
    const hiddenSrcs = new Set(chatLayout.talking.hiddenImageSrcs);
    const srcOptions = [
      ...getCharacterTalkingPoses(selectedChatSubjectId)
        .filter((pose) => !hiddenSrcs.has(pose.src))
        .map((pose) => ({
          label: pose.label,
          src: pose.src,
        })),
      {
        label: 'Conversation',
        src: chatLayout.talking.imageSrc,
      },
      {
        label: 'Default',
        src: chatLayout.talking.defaultImageSrc,
      },
      ...chatLayout.talking.enabledImageSrcs
        .filter((src) => !hiddenSrcs.has(src))
        .map((src, index) => ({
          label: `Saved ${index + 1}`,
          src,
        })),
      {
        label: 'Built-in default',
        src:
          getVisibleDefaultTalkingImageSrc(
            selectedChatSubjectId,
            chatLayout.talking.hiddenImageSrcs,
          ) ||
          getVisibleDefaultTalkingImageSrc(
            primaryCharacterId ?? undefined,
            chatLayout.talking.hiddenImageSrcs,
          ),
      },
    ];
    const seen = new Set<string>();
    return srcOptions.filter((option) => {
      if (!option.src || seen.has(option.src) || hiddenSrcs.has(option.src)) return false;
      seen.add(option.src);
      return true;
    });
  }, [characterSettings, layouts, selectedChatSubjectId]);
  const selectedCharacterImageOptions = useMemo(() => {
    const hiddenSrcs = new Set(selectedTalkingLayout.hiddenImageSrcs);
    const builtInPoses = getCharacterTalkingPoses(selectedCharacterId)
      .filter((pose) => !hiddenSrcs.has(pose.src))
      .map((pose) => ({
        label: pose.label,
        src: pose.src,
        source: 'Built-in',
        canDelete: true,
      }));
    const uploadedPoses = selectedTalkingLayout.enabledImageSrcs
      .filter((src) => !hiddenSrcs.has(src))
      .map((src, index) => ({
        label: `Upload ${index + 1}`,
        src,
        source: 'Upload',
        canDelete: true,
      }));
    const currentPoses = [
      {
        label: 'Default sitting',
        src: selectedTalkingLayout.defaultImageSrc,
        source: 'Selected',
        canDelete: true,
      },
      {
        label: 'Default chat',
        src: selectedTalkingLayout.imageSrc,
        source: 'Selected',
        canDelete: true,
      },
      ...builtInPoses,
      ...uploadedPoses,
    ];
    const seen = new Set<string>();
    return currentPoses.filter((pose) => {
      if (!pose.src || seen.has(pose.src) || hiddenSrcs.has(pose.src)) return false;
      seen.add(pose.src);
      return true;
    });
  }, [
    selectedCharacterId,
    selectedTalkingLayout.defaultImageSrc,
    selectedTalkingLayout.enabledImageSrcs,
    selectedTalkingLayout.hiddenImageSrcs,
    selectedTalkingLayout.imageSrc,
  ]);
  const storyTriggerOptions = ADMIN_SUBJECT_IDS.flatMap((subjectId) => {
    const customer = getAdminSubjectCustomer(subjectId, characterSettings);
    const groups = adminChats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId);
    return groups.flatMap((group) =>
      group.entries
        .filter((entry) => entry.kind === 'story')
        .map((entry) => ({
          id: entry.id,
          label: `${customer.name}: ${entry.title} (${entry.id})`,
        })),
    );
  });
  function getChatKindCounts(subjectId: AdminSubjectId): Record<AdminChatKind, number> {
    const groups = adminChats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId);
    return groups
      .flatMap((group) => group.entries)
      .reduce<Record<AdminChatKind, number>>(
        (counts, entry) => ({
          ...counts,
          [entry.kind]: counts[entry.kind] + 1,
        }),
        { story: 0, comment: 0, leave: 0, order: 0, happy: 0 },
      );
  }
  const selectedChatCounts = getChatKindCounts(selectedCharacterId);
  const sidePanelAriaLabel =
    sidePanelMode === 'characters'
      ? 'Character gallery'
      : sidePanelMode === 'assets'
        ? 'Asset inspector'
        : sidePanelMode === 'chats'
          ? 'Chat inspector'
          : sidePanelMode === 'chatMenu'
            ? 'Chat menu editor'
            : sidePanelMode === 'cat'
              ? 'Cat editor'
              : sidePanelMode === 'ref'
                ? 'Reference editor'
                : sidePanelMode === 'opening'
                  ? 'Opening editor'
                  : 'Inspector';
  const sidePanelEyebrow =
    sidePanelMode === 'characters'
      ? 'Roster'
      : sidePanelMode === 'assets'
        ? 'Asset'
        : sidePanelMode === 'chats'
          ? 'Chats'
          : sidePanelMode === 'chatMenu'
            ? 'Chat Menu'
            : sidePanelMode === 'cat'
              ? 'Cat'
              : sidePanelMode === 'ref'
                ? 'Ref'
                : sidePanelMode === 'opening'
                  ? 'Opening'
                  : 'Properties';
  const sidePanelTitle =
    sidePanelMode === 'characters'
      ? 'Characters'
      : sidePanelMode === 'assets'
        ? 'Replace Image'
        : sidePanelMode === 'chats'
          ? 'Chat Tools'
          : sidePanelMode === 'chatMenu'
            ? 'Action Wheel'
            : sidePanelMode === 'cat'
              ? 'Cat Images'
              : sidePanelMode === 'ref'
                ? 'Reference Points'
                : sidePanelMode === 'opening'
                  ? 'Opening'
                  : 'Inspector';

  useEffect(() => {
    if (onionCharacterId === selectedCharacterId) setOnionCharacterId('');
  }, [onionCharacterId, selectedCharacterId]);

  useEffect(() => {
    if (selectedSubjectIsParty && characterDetailTab === 'portrait') {
      setCharacterDetailTab('settings');
    }
  }, [characterDetailTab, selectedSubjectIsParty]);

  useEffect(() => {
    if (sidePanelMode !== 'assets') return;
    if (!selectedAssetId || !adminAssets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(adminAssets[0]?.id ?? '');
    }
  }, [adminAssets, selectedAssetId, sidePanelMode]);

  useEffect(() => {
    if (!selectedChatSubjectId || selectedChatGroupId) return;
    setSelectedChatGroupId(selectedChatGroups[0]?.id ?? '');
  }, [selectedChatGroupId, selectedChatGroups, selectedChatSubjectId]);

  function dragStyle(item: AdminLayoutDragItem): CSSProperties {
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

  function storeCharacterStyle(
    layout: AdminLayout = selectedLayout,
    spot: AdminSeatSpot = selectedSeatSpot,
  ): CSSProperties {
    return {
      bottom: 'auto',
      left: `${spot.marker.x}%`,
      right: 'auto',
      top: `${spot.marker.y}%`,
      '--store-character-scale': (layout.characterScale / 100) * (spot.scale / 100),
    } as CSSProperties;
  }

  function seatMarkerStyle(
    slot: TableSlot,
    spots: AdminSeatSpots = selectedSeatSpots,
  ): CSSProperties {
    const spot = getAdminSeatSpot(spots, slot);
    return {
      bottom: 'auto',
      left: `${spot.marker.x}%`,
      right: 'auto',
      top: `${spot.marker.y}%`,
    };
  }

  function seatAnchorStyle(
    slot: TableSlot,
    anchor: AdminSeatAnchor,
    spots: AdminSeatSpots = selectedSeatSpots,
  ): CSSProperties {
    const spot = getAdminSeatSpot(spots, slot);
    const position = spot[anchor];
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
    };
  }

  function seatDrinkStyle(slot: TableSlot, spots = selectedSeatSpots): CSSProperties {
    const spot = getAdminSeatSpot(spots, slot);
    return {
      ...seatAnchorStyle(slot, 'drink', spots),
      '--drink-scale': spot.drinkScale / 100,
    } as CSSProperties;
  }

  function emptyTableSpotStyle(slot: TableSlot, spots = emptyTableSeatSpots): CSSProperties {
    const spot = getAdminSeatSpot(spots, slot, 300);
    return {
      ...seatAnchorStyle(slot, 'emptyTable', spots),
      '--empty-table-scale': spot.scale / 100,
    } as CSSProperties;
  }

  function seatScaleBarStyle(slot: TableSlot, anchor: 'marker' | 'drink'): CSSProperties {
    return seatAnchorStyle(slot, anchor);
  }

  function seatAnchorDragItem(anchor: AdminSeatAnchor): AdminDragItem {
    if (anchor === 'marker') return 'character';
    if (anchor === 'emptyTable') return 'character';
    if (anchor === 'patience') return 'order';
    if (anchor === 'moodIcon') return 'moodIcon';
    return anchor;
  }

  function talkingDragStyle(
    item: 'character' | 'cat' | 'bubble' | 'drink' | 'patience',
    layout: AdminTalkingLayout = selectedTalkingLayout,
  ): CSSProperties {
    const position = layout[item] ?? DEFAULT_ADMIN_LAYOUT.talking[item];
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
    };
  }

  function talkingCharacterStyle(
    layout: AdminTalkingLayout = selectedTalkingLayout,
  ): CSSProperties {
    return {
      ...talkingDragStyle('character', layout),
      '--talking-character-scale': layout.characterScale / 100,
    } as CSSProperties;
  }

  function talkingCatStyle(): CSSProperties {
    return {
      ...talkingDragStyle('cat'),
      '--cat-scale': selectedTalkingLayout.catScale / 100,
    } as CSSProperties;
  }

  function talkingDrinkStyle(): CSSProperties {
    return {
      ...talkingDragStyle('drink'),
      '--drink-scale': selectedTalkingLayout.drinkScale / 100,
    } as CSSProperties;
  }

  function talkingDrinkScaleBarStyle(): CSSProperties {
    return talkingDragStyle('drink');
  }

  function portraitImageStyle(portrait: CharacterPortraitSettings): CSSProperties {
    return {
      objectPosition: `${portrait.x}% ${portrait.y}%`,
      transform: `scale(${portrait.scale / 100})`,
      transformOrigin: `${portrait.x}% ${portrait.y}%`,
    };
  }

  function updateSettings(patch: Partial<CharacterAdminSettings>) {
    onCharacterSettingsChange(selectedPrimaryCharacterId, {
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

  async function saveUploadedImageToRepo(file: File, imageSrc: string): Promise<string> {
    if (!import.meta.env.DEV) return imageSrc;

    try {
      const response = await fetch('/__admin/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataUrl: imageSrc,
          filename: file.name,
          folder: selectedCharacterId,
        }),
      });
      if (!response.ok) return imageSrc;
      const parsed = (await response.json()) as { src?: unknown };
      return typeof parsed.src === 'string' && parsed.src ? parsed.src : imageSrc;
    } catch {
      return imageSrc;
    }
  }

  function readUploadedImages(
    event: ChangeEvent<HTMLInputElement>,
    onImages: (imageSrcs: string[]) => void,
  ) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
    if (files.length <= 0) return;

    void Promise.all(
      files.map(
        (file) =>
          new Promise<{ file: File; imageSrc: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
              if (typeof reader.result === 'string') {
                resolve({ file, imageSrc: reader.result });
              } else {
                reject(new Error('Image did not load.'));
              }
            });
            reader.addEventListener('error', () => reject(reader.error));
            reader.readAsDataURL(file);
          }),
      ),
    ).then(
      (uploads) => {
        void Promise.all(
          uploads.map((upload) => saveUploadedImageToRepo(upload.file, upload.imageSrc)),
        ).then((imageSrcs) => onImages(imageSrcs));
        input.value = '';
      },
      () => {
        input.value = '';
      },
    );
  }

  function readUploadedImage(
    event: ChangeEvent<HTMLInputElement>,
    onImage: (imageSrc: string) => void,
  ) {
    readUploadedImages(event, (imageSrcs) => {
      const [imageSrc] = imageSrcs;
      if (imageSrc) onImage(imageSrc);
    });
  }

  function getStagePosition(
    event: ReactPointerEvent<HTMLElement>,
    item: AdminDragItem,
  ): AdminPosition | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    return clampAdminStagePosition(
      {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      },
      item,
    );
  }

  function getStagePercent(event: ReactPointerEvent<HTMLElement>): AdminPosition | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, -20, 120),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, -20, 120),
    };
  }

  function updateChatFaceBlocker(patch: Partial<AdminFaceBlocker>) {
    const nextFaceBlocker = normalizeAdminFaceBlocker(
      {
        ...selectedTalkingLayout.faceBlocker,
        ...patch,
      },
      selectedTalkingLayout.faceBlocker,
    );
    onTalkingFaceBlockerChange(selectedCharacterId, nextFaceBlocker);
  }

  function beginChatFaceBlockerDrag(event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = getStagePercent(event);
    if (!position) return;
    dragFaceBlockerRef.current = true;
    dragFaceBlockerOffsetRef.current = {
      x: position.x - chatFaceBlocker.x,
      y: position.y - chatFaceBlocker.y,
    };
  }

  function offsetStagePosition(
    position: AdminPosition,
    offset: AdminPosition,
    item: AdminDragItem,
  ): AdminPosition {
    return clampAdminStagePosition(
      {
        x: position.x - offset.x,
        y: position.y - offset.y,
      },
      item,
    );
  }

  function currentDragPosition(item: AdminLayoutDragItem): AdminPosition {
    if (
      previewMode === 'talking' &&
      (item === 'character' ||
        item === 'cat' ||
        item === 'bubble' ||
        item === 'drink' ||
        item === 'patience')
    ) {
      return selectedTalkingLayout[item];
    }

    return selectedLayout[item] ?? DEFAULT_ADMIN_LAYOUT[item];
  }

  function beginDrag(item: AdminLayoutDragItem, event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = getStagePosition(event, item);
    if (!position) return;
    const currentPosition = currentDragPosition(item);
    dragItemRef.current = item;
    dragSeatSlotRef.current = null;
    dragSeatOwnerRef.current = null;
    dragItemOffsetRef.current = {
      x: position.x - currentPosition.x,
      y: position.y - currentPosition.y,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragFaceBlockerRef.current) {
      const position = getStagePercent(event);
      if (!position) return;
      updateChatFaceBlocker({
        x: position.x - dragFaceBlockerOffsetRef.current.x,
        y: position.y - dragFaceBlockerOffsetRef.current.y,
      });
      return;
    }

    const dragSeatSlot = dragSeatSlotRef.current;
    if (dragSeatSlot != null) {
      const dragSeatAnchor = dragSeatAnchorRef.current;
      const dragSeatOwner = dragSeatOwnerRef.current ?? selectedCharacterId;
      const position = getStagePosition(event, seatAnchorDragItem(dragSeatAnchor));
      if (!position) return;
      const nextPosition = offsetStagePosition(
        position,
        dragSeatOffsetRef.current,
        seatAnchorDragItem(dragSeatAnchor),
      );
      onSeatSpotAnchorChange(dragSeatOwner, dragSeatSlot, dragSeatAnchor, nextPosition);
      return;
    }

    const dragItem = dragItemRef.current;
    if (!dragItem) return;
    const position = getStagePosition(event, dragItem);
    if (!position) return;
    const nextPosition = offsetStagePosition(position, dragItemOffsetRef.current, dragItem);
    if (
      previewMode === 'talking' &&
      (dragItem === 'character' ||
        dragItem === 'cat' ||
        dragItem === 'bubble' ||
        dragItem === 'drink' ||
        dragItem === 'patience')
    ) {
      onTalkingLayoutChange(selectedCharacterId, dragItem, nextPosition);
      return;
    }
    onLayoutChange(selectedCharacterId, dragItem, nextPosition);
  }

  function stopDrag() {
    dragItemRef.current = null;
    dragItemOffsetRef.current = { x: 0, y: 0 };
    dragSeatSlotRef.current = null;
    dragSeatAnchorRef.current = 'marker';
    dragSeatOwnerRef.current = null;
    dragSeatOffsetRef.current = { x: 0, y: 0 };
    dragFaceBlockerRef.current = false;
    dragFaceBlockerOffsetRef.current = { x: 0, y: 0 };
  }

  function beginSeatSpotDrag(
    slot: TableSlot,
    event: ReactPointerEvent<HTMLElement>,
    anchor: AdminSeatAnchor = 'marker',
    ownerId: AdminSeatSpotOwnerId = selectedCharacterId,
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedSeatSlot(slot);
    const position = getStagePosition(event, seatAnchorDragItem(anchor));
    if (!position) return;
    const ownerSpots =
      ownerId === EMPTY_TABLE_SEAT_SPOTS_ID ? emptyTableSeatSpots : selectedSeatSpots;
    const currentPosition = getAdminSeatSpot(ownerSpots, slot)[anchor];
    dragItemRef.current = null;
    dragSeatSlotRef.current = slot;
    dragSeatAnchorRef.current = anchor;
    dragSeatOwnerRef.current = ownerId;
    dragSeatOffsetRef.current = {
      x: position.x - currentPosition.x,
      y: position.y - currentPosition.y,
    };
  }

  function applyDefaultSeatSpotScales() {
    TABLE_SLOTS.forEach((slot) => {
      onSeatSpotScaleChange(
        selectedCharacterId,
        slot,
        DEFAULT_ADMIN_SEAT_SPOTS[seatSpotKey(slot)].scale,
      );
      onSeatSpotDrinkScaleChange(
        selectedCharacterId,
        slot,
        DEFAULT_ADMIN_SEAT_SPOTS[seatSpotKey(slot)].drinkScale,
      );
    });
  }

  function seatSpotForOwner(ownerId: AdminSeatSpotOwnerId): AdminSeatSpot {
    return ownerId === EMPTY_TABLE_SEAT_SPOTS_ID ? selectedEmptyTableSpot : selectedSeatSpot;
  }

  function updateReferencePointAxis(
    ownerId: AdminSeatSpotOwnerId,
    anchor: AdminSeatAnchor,
    axis: keyof AdminPosition,
    value: string,
  ) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    const currentPosition = seatSpotForOwner(ownerId)[anchor];
    onSeatSpotAnchorChange(ownerId, selectedSeatSlot, anchor, {
      ...currentPosition,
      [axis]: numeric,
    });
  }

  function renderReferencePointControls(
    label: string,
    ownerId: AdminSeatSpotOwnerId,
    anchor: AdminSeatAnchor,
    position: AdminPosition,
  ) {
    return (
      <fieldset className="admin-reference-point-editor" key={`${ownerId}-${anchor}`}>
        <legend>{label}</legend>
        <label>
          <span>X</span>
          <input
            max={100}
            min={0}
            step={1}
            type="number"
            value={Math.round(position.x)}
            onChange={(event) =>
              updateReferencePointAxis(ownerId, anchor, 'x', event.currentTarget.value)
            }
          />
          <small>%</small>
        </label>
        <label>
          <span>Y</span>
          <input
            max={100}
            min={0}
            step={1}
            type="number"
            value={Math.round(position.y)}
            onChange={(event) =>
              updateReferencePointAxis(ownerId, anchor, 'y', event.currentTarget.value)
            }
          />
          <small>%</small>
        </label>
      </fieldset>
    );
  }

  function renderOnionSelector() {
    return (
      <label>
        <span>Onion</span>
        <select
          value={onionCharacterId}
          onChange={(event) => {
            const nextId = event.currentTarget.value;
            setOnionCharacterId(
              isAdminSubjectId(nextId) && nextId !== selectedCharacterId ? nextId : '',
            );
          }}
        >
          <option value="">Off</option>
          {ADMIN_SUBJECT_IDS.filter((characterId) => characterId !== selectedCharacterId).map(
            (characterId) => (
              <option key={characterId} value={characterId}>
                {getAdminSubjectCustomer(characterId, characterSettings).name}
              </option>
            ),
          )}
        </select>
        <small>{onionCharacter ? 'View only' : 'Off'}</small>
      </label>
    );
  }

  function replaceSelectedAsset(imageSrc: string) {
    if (!selectedAsset) return;
    if (selectedAsset.kind === 'store' && selectedAsset.subjectId) {
      onTalkingDefaultImageChange(selectedAsset.subjectId, imageSrc);
      return;
    }

    if (selectedAsset.kind === 'portrait' && selectedAsset.characterId) {
      const currentSettings = normalizeCharacterAdminSettings(
        selectedAsset.characterId,
        characterSettings[selectedAsset.characterId],
      );
      onCharacterSettingsChange(selectedAsset.characterId, {
        ...currentSettings,
        portrait: {
          ...currentSettings.portrait,
          imageSrc,
        },
      });
    }
  }

  function selectChatSubject(subjectId: AdminSubjectId) {
    const groups = adminChats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId);
    setChatToolMode('chats');
    setSelectedChatSubjectId(subjectId);
    setSelectedChatGroupId(groups[0]?.id ?? '');
    setSelectedChatEntryId('');
    setChatEditorMode('list');
    setAddingChatGroupId('');
  }

  function updateChatGroups(subjectId: AdminSubjectId, groups: AdminRelationshipChatGroup[]) {
    onAdminChatsChange({
      ...adminChats,
      [subjectId]: groups,
    });
  }

  async function importChatsFromSpreadsheet(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    if (!file) return;

    setChatImportMessage('Importing chats...');
    try {
      const result = await importChatsFromOdsFile(file, adminChats, characterSettings);
      if (result.importedEntries <= 0) {
        setChatImportMessage('No matching chat rows found.');
        return;
      }

      onAdminChatsChange(result.chats);
      const firstSubjectId = getAdminSubjectIdForSheetName(
        result.importedSheets[0] ?? '',
        characterSettings,
      );
      if (firstSubjectId) {
        const firstGroups = result.chats[firstSubjectId] ?? [];
        setSelectedChatSubjectId(firstSubjectId);
        setSelectedChatGroupId(firstGroups[0]?.id ?? '');
        setSelectedChatEntryId('');
        setChatEditorMode('list');
        setChatToolMode('chats');
      }
      const skipped =
        result.skippedSheets.length > 0 ? ` Skipped: ${result.skippedSheets.join(', ')}.` : '';
      setChatImportMessage(
        `Imported ${result.importedEntries} chats from ${result.importedSheets.length} sheets.${skipped}`,
      );
    } catch (error) {
      setChatImportMessage(error instanceof Error ? error.message : 'Could not import that file.');
    }
  }

  function clearAllAdminChats() {
    if (!window.confirm('Clear all chats for every character? This cannot be undone.')) return;
    const emptyChats = createEmptyAdminChats();
    onAdminChatsChange(emptyChats);
    setSelectedChatGroupId(emptyChats[selectedChatSubjectId || selectedCharacterId]?.[0]?.id ?? '');
    setSelectedChatEntryId('');
    setChatEditorMode('list');
    setAddingChatGroupId('');
    setChatImportMessage('Cleared all chats.');
  }

  function addRelationshipGroup() {
    if (!selectedChatSubjectId) return;
    const nextThreshold =
      selectedChatGroups.length > 0
        ? clamp(
            Math.max(...selectedChatGroups.map((group) => group.threshold)) + 25,
            0,
            MAX_RELATIONSHIP_SCORE,
          )
        : 0;
    const nextGroup: AdminRelationshipChatGroup = {
      id: `${selectedChatSubjectId}-relationship-${Date.now()}`,
      threshold: nextThreshold,
      entries: [],
    };
    updateChatGroups(selectedChatSubjectId, [...selectedChatGroups, nextGroup]);
    setSelectedChatGroupId(nextGroup.id);
    setSelectedChatEntryId('');
    setChatEditorMode('list');
  }

  function addChatEntry(kind: AdminChatKind, groupId = selectedChatGroup?.id ?? '') {
    if (!selectedChatSubjectId || !groupId) return;
    const group = selectedChatGroups.find((item) => item.id === groupId);
    if (!group) return;
    const nextEntry = defaultAdminChatEntry(selectedChatSubjectId, kind, group.entries.length);
    updateChatGroups(
      selectedChatSubjectId,
      selectedChatGroups.map((item) =>
        item.id === group.id
          ? {
              ...item,
              entries: [...item.entries, nextEntry],
            }
          : item,
      ),
    );
    setSelectedChatGroupId(group.id);
    setSelectedChatEntryId(nextEntry.id);
    setChatEditorMode(kind);
    setAddingChatGroupId('');
  }

  function editChatEntry(groupId: string, entry: AdminChatEntry) {
    setSelectedChatGroupId(groupId);
    setSelectedChatEntryId(entry.id);
    setChatEditorMode(entry.kind);
    setAddingChatGroupId('');
  }

  function deleteSelectedChatEntry() {
    if (!selectedChatSubjectId || !selectedChatGroup || !selectedChatEntry) return;
    updateChatGroups(
      selectedChatSubjectId,
      selectedChatGroups.map((group) =>
        group.id === selectedChatGroup.id
          ? {
              ...group,
              entries: group.entries.filter((entry) => entry.id !== selectedChatEntry.id),
            }
          : group,
      ),
    );
    setSelectedChatEntryId('');
    setChatEditorMode('list');
  }

  function updateSelectedChatEntry(patch: Partial<AdminChatEntry>) {
    if (!selectedChatSubjectId || !selectedChatGroup || !selectedChatEntry) return;
    updateChatGroups(
      selectedChatSubjectId,
      selectedChatGroups.map((group) =>
        group.id === selectedChatGroup.id
          ? {
              ...group,
              entries: group.entries.map((entry) =>
                entry.id === selectedChatEntry.id ? { ...entry, ...patch } : entry,
              ),
            }
          : group,
      ),
    );
  }

  function updateSelectedChatEntryId(nextIdValue: string) {
    if (!selectedChatSubjectId || !selectedChatGroup || !selectedChatEntry) return;
    const nextId = nextIdValue.trim().replace(/\s+/g, '_');
    if (!nextId) return;
    updateChatGroups(
      selectedChatSubjectId,
      selectedChatGroups.map((group) =>
        group.id === selectedChatGroup.id
          ? {
              ...group,
              entries: group.entries.map((entry) =>
                entry.id === selectedChatEntry.id ? { ...entry, id: nextId } : entry,
              ),
            }
          : group,
      ),
    );
    setSelectedChatEntryId(nextId);
  }

  function addMoodIcons(imageSrcs: string[]) {
    const uploadId = Date.now();
    const nextIcons = imageSrcs.filter(Boolean).map<AdminMoodIcon>((imageSrc, index) => ({
      id: `mood-icon-${uploadId}-${index}`,
      name: `Mood Icon ${adminMoodIcons.length + index + 1}`,
      src: imageSrc,
    }));
    if (nextIcons.length <= 0) return;
    onAdminMoodIconsChange([...adminMoodIcons, ...nextIcons]);
  }

  function updateMoodIcon(iconId: string, patch: Partial<AdminMoodIcon>) {
    onAdminMoodIconsChange(
      adminMoodIcons.map((icon) => (icon.id === iconId ? { ...icon, ...patch } : icon)),
    );
  }

  function deleteMoodIcon(iconId: string) {
    onAdminMoodIconsChange(adminMoodIcons.filter((icon) => icon.id !== iconId));
    onAdminChatsChange(
      ADMIN_SUBJECT_IDS.reduce<AdminChats>((nextChats, subjectId) => {
        const groups = adminChats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId);
        nextChats[subjectId] = groups.map((group) => ({
          ...group,
          entries: group.entries.map((entry) => ({
            ...entry,
            moodIconIds: entry.moodIconIds.filter((id) => id !== iconId),
          })),
        }));
        return nextChats;
      }, {}),
    );
  }

  function toggleSelectedChatMoodIcon(iconId: string) {
    if (!selectedChatEntry) return;
    const selectedIds = selectedChatEntry.moodIconIds;
    updateSelectedChatEntry({
      moodIconIds: selectedIds.includes(iconId)
        ? selectedIds.filter((id) => id !== iconId)
        : [...selectedIds, iconId],
    });
  }

  function updateOpeningSettings(patch: Partial<AdminOpeningSettings>) {
    onOpeningSettingsChange({
      ...openingSettings,
      ...patch,
    });
  }

  function updateOpeningBeat(beatId: string, patch: Partial<AdminOpeningBeat>) {
    updateOpeningSettings({
      beats: openingSettings.beats.map((beat) =>
        beat.id === beatId ? { ...beat, ...patch } : beat,
      ),
    });
  }

  function updateOpeningBeatActor(beat: AdminOpeningBeat, actor: OpeningActor) {
    updateOpeningBeat(beat.id, {
      actor,
      speaker: openingSpeakerName(actor, safeOpeningSettings),
      side:
        actor === 'narrator'
          ? 'none'
          : beat.side === 'none'
            ? actor === 'lila'
              ? 'left'
              : 'right'
            : beat.side,
    });
  }

  function updateOpeningBeatImage(beatId: string, actor: 'lila' | 'grace', imageId: string) {
    updateOpeningBeat(
      beatId,
      actor === 'lila' ? { lilaImageId: imageId } : { graceImageId: imageId },
    );
  }

  function addOpeningReactionImages(actor: 'lila' | 'grace', imageSrcs: string[]) {
    const nextImageSrcs = imageSrcs.filter(Boolean);
    if (nextImageSrcs.length <= 0) return;

    const normalized = normalizeOpeningSettings(openingSettings);
    const images = actor === 'lila' ? normalized.lilaImages : normalized.graceImages;
    const actorLabel = actor === 'lila' ? 'Lila' : 'Grace';
    const uploadId = Date.now();
    const nextImages = nextImageSrcs.map<AdminOpeningImage>((imageSrc, index) => ({
      id: `${actor}-opening-${uploadId}-${index}`,
      label: `${actorLabel} ${images.length + index + 1}`,
      src: imageSrc,
    }));

    if (actor === 'lila') {
      updateOpeningSettings({
        lilaImageSrc: nextImageSrcs[0],
        lilaImages: [...images, ...nextImages],
      });
    } else {
      updateOpeningSettings({
        graceImageSrc: nextImageSrcs[0],
        graceImages: [...images, ...nextImages],
      });
    }
  }

  function updateSelectedChatBlocks(blocks: AdminChatBlock[]) {
    const synced = syncAdminChatEntryBlocks(blocks);
    updateSelectedChatEntry({
      blocks: synced.blocks,
      bubbles: synced.bubbles,
      catReply: synced.catReply,
    });
  }

  function updateSelectedChatBubble(blockId: string, value: string) {
    if (!selectedChatEntry) return;
    updateSelectedChatBlocks(
      selectedChatEntry.blocks.map((block) =>
        block.id === blockId && block.kind === 'bubble' ? { ...block, text: value } : block,
      ),
    );
  }

  function updateSelectedChatBubbleImage(blockId: string, imageSrc: string) {
    if (!selectedChatEntry) return;
    updateSelectedChatBlocks(
      selectedChatEntry.blocks.map((block) =>
        block.id === blockId && block.kind === 'bubble' ? { ...block, imageSrc } : block,
      ),
    );
  }

  function renderChatImagePicker(
    label: string,
    value: string,
    onSelect: (imageSrc: string) => void,
    emptyLabel: string,
    hint: string,
  ) {
    return (
      <section className="admin-chat-image-picker" aria-label={label}>
        <div className="admin-field-row">
          <span>{label}</span>
          <small>{hint}</small>
        </div>
        <div className="admin-chat-image-choice-grid">
          <button className={!value ? 'active' : ''} type="button" onClick={() => onSelect('')}>
            <span className="admin-chat-image-empty">{emptyLabel}</span>
          </button>
          {selectedChatImageOptions.map((option) => (
            <button
              className={value === option.src ? 'active' : ''}
              key={`${label}-${option.src}`}
              type="button"
              onClick={() => onSelect(option.src)}
            >
              <img alt="" draggable={false} src={resolveAssetSrc(option.src)} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
        {selectedChatImageOptions.length === 0 ? (
          <small className="admin-muted-copy">No character images are available yet.</small>
        ) : null}
      </section>
    );
  }

  function addSelectedChatBubbleBlock() {
    if (!selectedChatEntry) return;
    updateSelectedChatBlocks([
      ...selectedChatEntry.blocks,
      createAdminBubbleBlock('', `${selectedChatEntry.id}-bubble-${Date.now()}`),
    ]);
  }

  function addSelectedCatReplyBlock() {
    if (!selectedChatEntry) return;
    updateSelectedChatBlocks([
      ...selectedChatEntry.blocks,
      createAdminCatReplyBlock(
        defaultAdminCatReply(),
        `${selectedChatEntry.id}-cat-reply-${Date.now()}`,
      ),
    ]);
  }

  function deleteSelectedChatBlock(blockId: string) {
    if (!selectedChatEntry) return;
    const nextBlocks = selectedChatEntry.blocks.filter((block) => block.id !== blockId);
    updateSelectedChatBlocks(nextBlocks.length > 0 ? nextBlocks : [createAdminBubbleBlock('')]);
  }

  function beginChatBlockDrag(blockId: string, event: ReactDragEvent<HTMLElement>) {
    dragChatBlockIdRef.current = blockId;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', blockId);
  }

  function dropChatBlock(targetBlockId: string, event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();
    if (!selectedChatEntry) return;
    const sourceBlockId = dragChatBlockIdRef.current || event.dataTransfer.getData('text/plain');
    if (!sourceBlockId || sourceBlockId === targetBlockId) return;
    const sourceIndex = selectedChatEntry.blocks.findIndex((block) => block.id === sourceBlockId);
    const targetIndex = selectedChatEntry.blocks.findIndex((block) => block.id === targetBlockId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const nextBlocks = [...selectedChatEntry.blocks];
    const [sourceBlock] = nextBlocks.splice(sourceIndex, 1);
    if (!sourceBlock) return;
    nextBlocks.splice(targetIndex, 0, sourceBlock);
    updateSelectedChatBlocks(nextBlocks);
    dragChatBlockIdRef.current = '';
  }

  function stopChatBlockDrag() {
    dragChatBlockIdRef.current = '';
  }

  function updateChatMenuSettings(settings: AdminChatMenuSettings) {
    onAdminChatMenuSettingsChange(normalizeAdminChatMenuSettings(settings));
  }

  function updateChatMenuPatch(patch: Partial<AdminChatMenuSettings>) {
    updateChatMenuSettings({
      ...adminChatMenuSettings,
      ...patch,
    });
  }

  function updateChatMenuItem(actionId: CatActionId, patch: Partial<AdminChatMenuItem>) {
    updateChatMenuPatch({
      items: {
        ...adminChatMenuSettings.items,
        [actionId]: {
          ...adminChatMenuSettings.items[actionId],
          ...patch,
        },
      },
    });
  }

  function updateCatPoseImage(poseKey: CatPoseKey, imageSrc: string) {
    onAdminCatSettingsChange({
      ...adminCatSettings,
      [poseKey]: imageSrc,
    });
  }

  function getChatMenuEditorPosition(event: ReactPointerEvent<HTMLElement>): AdminPosition | null {
    const editor = chatMenuEditorRef.current;
    if (!editor) return null;
    const rect = editor.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function getChatMenuPreviewPosition(event: ReactPointerEvent<HTMLElement>): AdminPosition | null {
    const preview = chatMenuPreviewRef.current;
    if (!preview) return null;
    const rect = preview.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  }

  function beginChatMenuWheelDrag(event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointerPosition = getChatMenuPreviewPosition(event);
    if (!pointerPosition) return;
    const currentPosition = adminChatMenuSettings.position;
    dragChatMenuWheelRef.current = true;
    dragChatMenuActionRef.current = null;
    dragChatMenuWheelOffsetRef.current = {
      x: pointerPosition.x - currentPosition.x,
      y: pointerPosition.y - currentPosition.y,
    };
  }

  function beginChatMenuDrag(actionId: CatActionId, event: ReactPointerEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointerPosition = getChatMenuEditorPosition(event);
    if (!pointerPosition) return;
    const currentPosition = adminChatMenuSettings.items[actionId].position;
    dragChatMenuActionRef.current = actionId;
    dragChatMenuOffsetRef.current = {
      x: pointerPosition.x - currentPosition.x,
      y: pointerPosition.y - currentPosition.y,
    };
  }

  function moveChatMenuDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragChatMenuWheelRef.current) {
      const pointerPosition = getChatMenuPreviewPosition(event);
      if (!pointerPosition) return;
      const offset = dragChatMenuWheelOffsetRef.current;
      updateChatMenuPatch({
        position: {
          x: clamp(pointerPosition.x - offset.x, 10, 90),
          y: clamp(pointerPosition.y - offset.y, 10, 90),
        },
      });
      return;
    }

    const actionId = dragChatMenuActionRef.current;
    if (!actionId) return;
    const pointerPosition = getChatMenuEditorPosition(event);
    if (!pointerPosition) return;
    const offset = dragChatMenuOffsetRef.current;
    updateChatMenuItem(actionId, {
      position: {
        x: clamp(pointerPosition.x - offset.x, 0, 100),
        y: clamp(pointerPosition.y - offset.y, 0, 100),
      },
    });
  }

  function stopChatMenuDrag() {
    dragChatMenuActionRef.current = null;
    dragChatMenuOffsetRef.current = { x: 0, y: 0 };
    dragChatMenuWheelRef.current = false;
    dragChatMenuWheelOffsetRef.current = { x: 0, y: 0 };
  }

  function chatMenuWheelStyle(settings: AdminChatMenuSettings): CSSProperties {
    return {
      '--chat-menu-scale': settings.scale / 100,
      left: `${settings.position.x}%`,
      top: `${settings.position.y}%`,
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%) scale(var(--chat-menu-scale, 1))',
    } as CSSProperties;
  }

  function chatMenuActionStyle(actionId: CatActionId): CSSProperties {
    const item = adminChatMenuSettings.items[actionId];
    return {
      backgroundImage: cssAssetUrl(item.imageSrc),
      backgroundPosition: `${item.imagePosition.x}% ${item.imagePosition.y}%`,
      backgroundSize: `${item.imageScale}% ${item.imageScale}%`,
      left: `${item.position.x}%`,
      top: `${item.position.y}%`,
      right: 'auto',
      bottom: 'auto',
      transform: `translate(-50%, -50%) scale(${item.hexScale / 100})`,
      zIndex: item.layer,
    };
  }

  function chatMenuBackgroundStyle(): CSSProperties {
    return {
      backgroundImage: cssAssetUrl(adminChatMenuSettings.backgroundImageSrc),
      width: `${44 * (adminChatMenuSettings.backgroundScale / 100)}%`,
      zIndex: adminChatMenuSettings.backgroundLayer,
    };
  }

  function chatMenuActionClass(actionId: CatActionId, extraClass = ''): string {
    const item = adminChatMenuSettings.items[actionId];
    return `visit-hex-button visit-hex-${actionId === 'serve' ? 'center' : actionId} ${
      actionId === 'serve' ? 'visit-hex-serve' : ''
    } ${extraClass} ${item.imageSrc ? 'visit-hex-custom-bg' : ''} ${
      item.textEnabled ? '' : 'visit-hex-hide-text'
    }`;
  }

  function renderChatMenuActionIcon(actionId: CatActionId, imageSrc: string) {
    if (imageSrc) return null;
    if (actionId === 'purr') return <PawIcon />;
    if (actionId === 'listen') return <CupIcon />;
    if (actionId === 'leave') return <ShopIcon />;
    if (actionId === 'cute') return <StarIcon />;
    if (actionId === 'serve') return <ServiceIcon kind="blackTea" />;
    return <CatHeadIcon />;
  }

  function openSidePanel(mode: AdminSidePanelMode = sidePanelMode) {
    setSidePanelMode(mode);
    setSidePanelCollapsed(false);
    setMobilePreview(false);
  }

  function openStoreChatEditor() {
    setSidePanelMode('inspector');
    setSidePanelCollapsed(false);
    setMobilePreview(false);
    if (previewMode === 'settings') setPreviewMode('shop');
  }

  function openReferenceEditor() {
    setSidePanelMode('ref');
    setSidePanelCollapsed(false);
    setMobilePreview(false);
    setPreviewMode('shop');
  }

  function openCharacterManager() {
    setCharacterManagerView('list');
    setCharacterDetailTab('settings');
    openSidePanel('characters');
  }

  function toggleMobilePreview() {
    const nextMobilePreview = !mobilePreview;
    setMobilePreview(nextMobilePreview);
    if (nextMobilePreview) {
      setSidePanelMode('inspector');
      setSidePanelCollapsed(true);
    }
  }

  const openingMode = sidePanelMode === 'opening';
  const charactersMode = sidePanelMode === 'characters';
  const refMode = sidePanelMode === 'ref';
  const referenceEditMode = refMode && previewMode === 'shop';
  const storePlacementEditMode =
    sidePanelMode === 'inspector' && previewMode === 'shop' && !referenceEditMode;
  const fullWorkbenchMode =
    openingMode || charactersMode || sidePanelMode === 'chatMenu' || sidePanelMode === 'cat';

  function selectCharacterForDetail(characterId: AdminSubjectId) {
    onSelectCharacter(characterId);
    setCharacterManagerView('detail');
    setCharacterDetailTab('settings');
  }

  function addCustomCharacter() {
    const nextCharacterId = CUSTOM_CHARACTER_IDS.find((characterId) => {
      const settings = normalizeCharacterAdminSettings(characterId, characterSettings[characterId]);
      return !settings.enabled;
    });
    if (!nextCharacterId) return;

    const currentSettings = normalizeCharacterAdminSettings(
      nextCharacterId,
      characterSettings[nextCharacterId],
    );
    onCharacterSettingsChange(nextCharacterId, {
      ...currentSettings,
      enabled: true,
    });
    selectCharacterForDetail(nextCharacterId);
  }

  function deleteCustomCharacter(characterId: AdminSubjectId) {
    if (!isCharacterId(characterId) || !CUSTOM_CHARACTER_IDS.includes(characterId)) return;
    if (
      !window.confirm(`Delete ${selectedCustomer.name}? This clears this custom character slot.`)
    ) {
      return;
    }

    onCharacterSettingsChange(
      characterId,
      defaultCharacterAdminSettings(CHARACTER_PROFILES[characterId]),
    );
    const nextChats = { ...adminChats };
    delete nextChats[characterId];
    onAdminChatsChange(nextChats);
    onResetLayout(characterId);
    onResetSeatSpots(characterId);
    onResetTalkingLayout(characterId);
    if (selectedChatSubjectId === characterId) {
      setSelectedChatSubjectId('');
      setSelectedChatGroupId('');
      setSelectedChatEntryId('');
      setChatEditorMode('list');
    }
    onSelectCharacter('shadow');
    setCharacterManagerView('list');
  }

  return (
    <main
      className={`admin-screen admin-side-${sidePanelMode} ${
        sidePanelCollapsed ? 'admin-panel-collapsed' : ''
      } ${mobilePreview ? 'admin-mobile-preview' : ''} ${
        openingMode ? 'admin-opening-mode' : ''
      } ${charactersMode ? 'admin-character-browser-mode' : ''} ${
        fullWorkbenchMode ? 'admin-full-workbench-mode' : ''
      }`}
    >
      <header className="admin-editor-topbar">
        <div className="admin-topbar-brand">
          <button className="admin-menu-button" type="button" aria-label="Admin menu">
            <MenuIcon />
          </button>
          <h1>
            {charactersMode
              ? 'Characters'
              : sidePanelMode === 'chatMenu'
                ? 'Chat Menu'
                : sidePanelMode === 'cat'
                  ? 'Cat'
                  : sidePanelMode === 'ref'
                    ? 'Ref'
                    : sidePanelMode === 'opening'
                      ? 'Opening'
                      : selectedCustomer.name}
          </h1>
        </div>
        <div className="admin-topbar-tabs" aria-label="Admin preview mode" role="tablist">
          <button
            aria-selected={sidePanelMode === 'inspector'}
            className={sidePanelMode === 'inspector' ? 'active' : ''}
            onClick={openStoreChatEditor}
            role="tab"
            type="button"
          >
            Store / Chat
          </button>
        </div>
        <div className="admin-toolbar-actions admin-topbar-actions">
          {saveMessage ? <span className="admin-save-message">{saveMessage}</span> : null}
          {sidePanelMode === 'inspector' && previewMode === 'talking' ? (
            <button
              className="paper-button"
              type="button"
              onClick={() => onResetTalkingLayout(selectedCharacterId)}
            >
              Reset Talking
            </button>
          ) : null}
          <button
            className={`paper-button ${mobilePreview ? 'active' : ''}`}
            type="button"
            onClick={toggleMobilePreview}
          >
            {mobilePreview ? 'Desktop View' : 'Mobile View'}
          </button>
          {!openingMode ? (
            <>
              {!fullWorkbenchMode ? (
                <button
                  className="paper-button"
                  type="button"
                  onClick={() => setSidePanelCollapsed((collapsed) => !collapsed)}
                >
                  {sidePanelCollapsed ? 'Show Inspector' : 'Hide Inspector'}
                </button>
              ) : null}
              <button
                className="paper-button"
                type="button"
                onClick={() => openSidePanel('inspector')}
              >
                Preview
              </button>
            </>
          ) : null}
          <button className="primary-button" type="button" onClick={onSave}>
            Save
          </button>
          <button className="paper-button" type="button" onClick={onBack}>
            Back
          </button>
        </div>
      </header>

      <nav className="admin-rail" aria-label="Admin sections">
        <button
          className={sidePanelMode === 'characters' ? 'active' : ''}
          type="button"
          onClick={openCharacterManager}
        >
          <span>Characters</span>
        </button>
        <button
          className={sidePanelMode === 'assets' ? 'active' : ''}
          type="button"
          onClick={() => openSidePanel('assets')}
        >
          <span>Assets</span>
        </button>
        <button
          className={sidePanelMode === 'chats' ? 'active' : ''}
          type="button"
          onClick={() => openSidePanel('chats')}
        >
          <span>Chats</span>
        </button>
        <button
          className={sidePanelMode === 'chatMenu' ? 'active' : ''}
          type="button"
          onClick={() => openSidePanel('chatMenu')}
        >
          <span>Chat Menu</span>
        </button>
        <button
          className={sidePanelMode === 'cat' ? 'active' : ''}
          type="button"
          onClick={() => openSidePanel('cat')}
        >
          <span>Cat</span>
        </button>
        <button
          className={sidePanelMode === 'ref' ? 'active' : ''}
          type="button"
          onClick={openReferenceEditor}
        >
          <span>Ref</span>
        </button>
        <button
          className={sidePanelMode === 'opening' ? 'active' : ''}
          type="button"
          onClick={() => openSidePanel('opening')}
        >
          <span>Opening</span>
        </button>
        <button
          className={sidePanelMode === 'inspector' ? 'active' : ''}
          type="button"
          onClick={() => openSidePanel('inspector')}
        >
          <span>Settings</span>
        </button>
      </nav>

      <section className="admin-workbench" aria-label="Admin character layout editor">
        {sidePanelMode === 'inspector' && !charactersMode ? (
          <div className="admin-view-tabs" aria-label="Admin preview mode" role="tablist">
            <button
              aria-selected={previewMode === 'shop'}
              className={previewMode === 'shop' ? 'active' : ''}
              onClick={() => setPreviewMode('shop')}
              role="tab"
              type="button"
            >
              Store
            </button>
            <button
              aria-selected={previewMode === 'talking'}
              className={previewMode === 'talking' ? 'active' : ''}
              onClick={() => setPreviewMode('talking')}
              role="tab"
              type="button"
            >
              Conversation
            </button>
          </div>
        ) : null}

        {charactersMode ? (
          <div className="admin-character-board" aria-label="Character manager">
            {characterManagerView === 'list' ? (
              <>
                <header className="admin-board-header">
                  <div>
                    <p className="eyebrow">Characters</p>
                    <h2>Character Manager</h2>
                  </div>
                  <div className="admin-board-header-actions">
                    <button
                      className="primary-button"
                      disabled={CUSTOM_CHARACTER_IDS.every(
                        (characterId) =>
                          normalizeCharacterAdminSettings(
                            characterId,
                            characterSettings[characterId],
                          ).enabled,
                      )}
                      type="button"
                      onClick={addCustomCharacter}
                    >
                      Add Character
                    </button>
                    <span>
                      {
                        ADMIN_CHARACTER_IDS.filter(
                          (characterId) =>
                            !CUSTOM_CHARACTER_IDS.includes(characterId) ||
                            normalizeCharacterAdminSettings(
                              characterId,
                              characterSettings[characterId],
                            ).enabled,
                        ).length
                      }{' '}
                      people, {ADMIN_PARTY_IDS.length} parties
                    </span>
                  </div>
                </header>
                <div className="admin-character-grid">
                  {ADMIN_SUBJECT_IDS.filter((characterId) => {
                    if (isAdminPartyId(characterId)) return true;
                    if (!CUSTOM_CHARACTER_IDS.includes(characterId)) return true;
                    return normalizeCharacterAdminSettings(
                      characterId,
                      characterSettings[characterId],
                    ).enabled;
                  }).map((characterId) => {
                    const customer = getAdminSubjectCustomer(characterId, characterSettings);
                    const primaryCharacterId = getCustomerPrimaryCharacterId(customer) ?? 'shadow';
                    const settings = normalizeCharacterAdminSettings(
                      primaryCharacterId,
                      characterSettings[primaryCharacterId],
                    );
                    const subjectLayout = normalizeAdminLayout(layouts[characterId], characterId);
                    const counts = getChatKindCounts(characterId);
                    const enabled = isCustomerEnabled(customer, characterSettings, layouts);
                    const subjectImageSrc =
                      subjectLayout.talking.defaultImageSrc ||
                      subjectLayout.talking.imageSrc ||
                      getVisibleDefaultTalkingImageSrc(
                        characterId,
                        subjectLayout.talking.hiddenImageSrcs,
                      ) ||
                      getVisibleDefaultTalkingImageSrc(
                        primaryCharacterId,
                        subjectLayout.talking.hiddenImageSrcs,
                      );
                    const party = isAdminPartyId(characterId);

                    return (
                      <article
                        className={`admin-character-card ${
                          selectedCharacterId === characterId ? 'active' : ''
                        } ${enabled ? '' : 'disabled'}`}
                        key={characterId}
                      >
                        <button
                          className="admin-character-card-main"
                          type="button"
                          onClick={() => selectCharacterForDetail(characterId)}
                        >
                          <span className="admin-gallery-avatar" aria-hidden="true">
                            {party && subjectImageSrc ? (
                              <img
                                alt=""
                                className="admin-portrait-image"
                                draggable={false}
                                src={resolveAssetSrc(subjectImageSrc)}
                              />
                            ) : settings.portrait.imageSrc ? (
                              <img
                                alt=""
                                className="admin-portrait-image"
                                draggable={false}
                                src={resolveAssetSrc(settings.portrait.imageSrc)}
                                style={portraitImageStyle(settings.portrait)}
                              />
                            ) : (
                              <AnimalAvatar customer={customer} size="small" />
                            )}
                          </span>
                          <span>
                            <strong>{customer.name}</strong>
                            <small>{party ? 'Party' : TIP_STYLE_LABELS[settings.tipStyle]}</small>
                          </span>
                        </button>
                        <span className={`admin-status-pill ${enabled ? 'enabled' : 'disabled'}`}>
                          {enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <div className="admin-character-card-meta">
                          <span>{counts.comment} comments</span>
                          <span>{counts.story} stories</span>
                          <span>{Math.round(settings.patienceMs / 1000)}s patience</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <header className="admin-character-detail-header">
                  <button
                    className="paper-button"
                    type="button"
                    onClick={() => setCharacterManagerView('list')}
                  >
                    Back to Characters
                  </button>
                  <div>
                    <p className="eyebrow">
                      {selectedSubjectIsParty ? 'Party Settings' : 'Character Settings'}
                    </p>
                    <h2>{selectedCustomer.name}</h2>
                  </div>
                  <span
                    className={`admin-status-pill ${selectedSubjectEnabled ? 'enabled' : 'disabled'}`}
                  >
                    {selectedSubjectEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {isCharacterId(selectedCharacterId) &&
                  CUSTOM_CHARACTER_IDS.includes(selectedCharacterId) ? (
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => deleteCustomCharacter(selectedCharacterId)}
                    >
                      Delete Character
                    </button>
                  ) : null}
                </header>
                <div className="admin-character-detail">
                  <div
                    className="admin-character-tabs"
                    role="tablist"
                    aria-label={`${selectedCustomer.name} settings sections`}
                  >
                    {(selectedSubjectIsParty
                      ? (['settings', 'uploads'] as AdminCharacterDetailTab[])
                      : (['settings', 'uploads', 'portrait'] as AdminCharacterDetailTab[])
                    ).map((tab) => (
                      <button
                        aria-selected={characterDetailTab === tab}
                        className={characterDetailTab === tab ? 'active' : ''}
                        key={tab}
                        onClick={() => setCharacterDetailTab(tab)}
                        role="tab"
                        type="button"
                      >
                        {tab === 'settings'
                          ? 'Settings'
                          : tab === 'uploads'
                            ? 'Uploads'
                            : 'Portrait'}
                      </button>
                    ))}
                  </div>

                  {characterDetailTab === 'settings' ? (
                    <section className="admin-character-detail-body">
                      <div className="admin-character-count-grid" aria-label="Chat counts">
                        <span>
                          <strong>{selectedChatCounts.comment}</strong>
                          Comments
                        </span>
                        <span>
                          <strong>{selectedChatCounts.story}</strong>
                          Stories
                        </span>
                        <span>
                          <strong>{selectedChatCounts.leave}</strong>
                          Leave
                        </span>
                        <span>
                          <strong>{selectedChatCounts.order}</strong>
                          Order
                        </span>
                      </div>
                      <div className="admin-character-settings-grid">
                        <label className="admin-toggle-row">
                          <span>{selectedSubjectIsParty ? 'Use full party' : 'Use in game'}</span>
                          <input
                            checked={selectedSubjectEnabled}
                            type="checkbox"
                            onChange={(event) =>
                              onSubjectEnabledChange(
                                selectedCharacterId,
                                event.currentTarget.checked,
                              )
                            }
                          />
                        </label>
                        {selectedSubjectIsParty ? (
                          <div className="admin-selected-status enabled">
                            <span>Party entry</span>
                            <small>Tips and patience still come from the individual members.</small>
                          </div>
                        ) : (
                          <>
                            <label>
                              <span>Name</span>
                              <input
                                type="text"
                                value={selectedSettings.displayName}
                                onChange={(event) =>
                                  updateSettings({ displayName: event.target.value })
                                }
                              />
                            </label>
                            <label>
                              <span>Tip style</span>
                              <select
                                value={selectedSettings.tipStyle}
                                onChange={(event) =>
                                  updateSettings({
                                    tipStyle: tipStyleValue(
                                      event.target.value,
                                      selectedSettings.tipStyle,
                                    ),
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
                                onChange={(event) =>
                                  updateSettings({ tipBase: Number(event.target.value) })
                                }
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
                                  updateSettings({
                                    patienceMs: Math.round(Number(event.target.value) * 1000),
                                  })
                                }
                              />
                              <small>seconds</small>
                            </label>
                          </>
                        )}
                      </div>
                      <section className="admin-character-picture-section">
                        <div className="admin-field-row">
                          <span>Default chat picture</span>
                          <small>Used when this character is in conversation.</small>
                        </div>
                        <div className="admin-picture-grid">
                          <button
                            className={!selectedTalkingLayout.imageSrc ? 'active' : ''}
                            type="button"
                            onClick={() => onTalkingImageChange(selectedCharacterId, '')}
                          >
                            <span className="admin-chat-image-empty">Built-in default</span>
                            <strong>No override</strong>
                          </button>
                          {selectedCharacterImageOptions.map((option) => (
                            <button
                              className={
                                selectedTalkingLayout.imageSrc === option.src ? 'active' : ''
                              }
                              key={`chat-${option.src}`}
                              type="button"
                              onClick={() => onTalkingImageChange(selectedCharacterId, option.src)}
                            >
                              <img alt="" draggable={false} src={resolveAssetSrc(option.src)} />
                              <strong>{option.label}</strong>
                              <small>{option.source}</small>
                            </button>
                          ))}
                        </div>
                      </section>
                      <section className="admin-character-picture-section">
                        <div className="admin-field-row">
                          <span>Store image</span>
                          <small>Used in the store before the cat sits with them.</small>
                        </div>
                        <div className="admin-picture-grid">
                          <button
                            className={!selectedTalkingLayout.defaultImageSrc ? 'active' : ''}
                            type="button"
                            onClick={() => onTalkingDefaultImageChange(selectedCharacterId, '')}
                          >
                            <span className="admin-chat-image-empty">Built-in default</span>
                            <strong>No store override</strong>
                          </button>
                          {selectedCharacterImageOptions.map((option) => (
                            <button
                              className={
                                selectedTalkingLayout.defaultImageSrc === option.src ? 'active' : ''
                              }
                              key={`sitting-${option.src}`}
                              type="button"
                              onClick={() =>
                                onTalkingDefaultImageChange(selectedCharacterId, option.src)
                              }
                            >
                              <img alt="" draggable={false} src={resolveAssetSrc(option.src)} />
                              <strong>{option.label}</strong>
                              <small>{option.source}</small>
                            </button>
                          ))}
                        </div>
                      </section>
                    </section>
                  ) : null}

                  {characterDetailTab === 'uploads' ? (
                    <section className="admin-character-detail-body">
                      <label className="admin-upload-line admin-character-upload-panel">
                        <span>Character pictures</span>
                        <strong>Upload Images</strong>
                        <input
                          accept="image/*"
                          multiple
                          type="file"
                          onChange={(event) =>
                            readUploadedImages(event, (imageSrcs) =>
                              onTalkingImagesAdd(selectedCharacterId, imageSrcs),
                            )
                          }
                        />
                      </label>
                      <div className="admin-picture-grid">
                        {selectedCharacterImageOptions.map((option) => (
                          <article className="admin-picture-card" key={`upload-${option.src}`}>
                            <img alt="" draggable={false} src={resolveAssetSrc(option.src)} />
                            <strong>{option.label}</strong>
                            <small>{option.source}</small>
                            <div className="admin-picture-actions">
                              <button
                                className={
                                  selectedTalkingLayout.imageSrc === option.src ? 'active' : ''
                                }
                                type="button"
                                onClick={() =>
                                  onTalkingImageChange(selectedCharacterId, option.src)
                                }
                              >
                                Conversation
                              </button>
                              <button
                                className={
                                  selectedTalkingLayout.defaultImageSrc === option.src
                                    ? 'active'
                                    : ''
                                }
                                type="button"
                                onClick={() =>
                                  onTalkingDefaultImageChange(selectedCharacterId, option.src)
                                }
                              >
                                Store
                              </button>
                              {option.canDelete ? (
                                <button
                                  className="danger"
                                  type="button"
                                  onClick={() =>
                                    onTalkingImageDelete(selectedCharacterId, option.src)
                                  }
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </article>
                        ))}
                      </div>
                      {selectedCharacterImageOptions.length === 0 ? (
                        <p className="admin-muted-copy">
                          No pictures uploaded for this character yet.
                        </p>
                      ) : null}
                    </section>
                  ) : null}

                  {characterDetailTab === 'portrait' ? (
                    <section className="admin-character-detail-body admin-character-portrait-body">
                      <div className="admin-portrait-detail-preview">
                        <div className="admin-portrait-preview-frame">
                          {selectedPortrait.imageSrc ? (
                            <img
                              alt=""
                              className="admin-portrait-image"
                              draggable={false}
                              src={resolveAssetSrc(selectedPortrait.imageSrc)}
                              style={portraitImageStyle(selectedPortrait)}
                            />
                          ) : (
                            <AnimalAvatar
                              customer={characterPreviewCustomer(selectedCharacter)}
                              size="portrait"
                            />
                          )}
                        </div>
                        <label className="admin-upload-line">
                          <span>Portrait image</span>
                          <strong>Upload Portrait</strong>
                          <input
                            accept="image/*"
                            type="file"
                            onChange={(event) =>
                              readUploadedImage(event, (imageSrc) =>
                                updatePortrait({ imageSrc, scale: 100, x: 50, y: 50 }),
                              )
                            }
                          />
                        </label>
                      </div>
                      <div className="admin-picture-grid">
                        {selectedCharacterImageOptions.map((option) => (
                          <button
                            className={selectedPortrait.imageSrc === option.src ? 'active' : ''}
                            key={`portrait-${option.src}`}
                            type="button"
                            onClick={() => updatePortrait({ imageSrc: option.src })}
                          >
                            <img alt="" draggable={false} src={resolveAssetSrc(option.src)} />
                            <strong>{option.label}</strong>
                            <small>{option.source}</small>
                          </button>
                        ))}
                      </div>
                      {selectedPortrait.imageSrc ? (
                        <div className="admin-character-settings-grid">
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
                              onChange={(event) =>
                                updatePortrait({ scale: Number(event.target.value) })
                              }
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
                              onInput={(event) =>
                                updatePortrait({ x: Number(event.currentTarget.value) })
                              }
                              onChange={(event) =>
                                updatePortrait({ x: Number(event.target.value) })
                              }
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
                              onInput={(event) =>
                                updatePortrait({ y: Number(event.currentTarget.value) })
                              }
                              onChange={(event) =>
                                updatePortrait({ y: Number(event.target.value) })
                              }
                            />
                            <small>{selectedPortrait.y}%</small>
                          </label>
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : sidePanelMode === 'opening' ? (
          <div className="admin-opening-board" aria-label="Opening editor">
            <div className="admin-opening-tabs" role="tablist" aria-label="Opening sections">
              {(['settings', 'dialogue', 'preview'] as AdminOpeningTab[]).map((tab) => (
                <button
                  aria-selected={openingTab === tab}
                  className={openingTab === tab ? 'active' : ''}
                  key={tab}
                  onClick={() => setOpeningTab(tab)}
                  role="tab"
                  type="button"
                >
                  {tab === 'settings' ? 'Settings' : tab === 'dialogue' ? 'Dialogue' : 'Preview'}
                </button>
              ))}
            </div>
            {openingTab === 'settings' ? (
              <section className="admin-opening-layout">
                <div className="admin-opening-fields">
                  <label>
                    <span>Building name</span>
                    <input
                      type="text"
                      value={openingSettings.locationName}
                      onChange={(event) =>
                        updateOpeningSettings({ locationName: event.currentTarget.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Location line</span>
                    <input
                      type="text"
                      value={openingSettings.locationDetail}
                      onChange={(event) =>
                        updateOpeningSettings({ locationDetail: event.currentTarget.value })
                      }
                    />
                  </label>
                  <label className="admin-upload-line">
                    <span>Opening image</span>
                    <strong>Choose Image</strong>
                    <input
                      accept="image/*"
                      type="file"
                      onChange={(event) =>
                        readUploadedImage(event, (imageSrc) =>
                          updateOpeningSettings({ backgroundSrc: imageSrc }),
                        )
                      }
                    />
                  </label>
                  {safeOpeningSettings.backgroundSrc ? (
                    <div className="admin-opening-image-preview">
                      <img
                        alt=""
                        draggable={false}
                        src={resolveAssetSrc(safeOpeningSettings.backgroundSrc)}
                      />
                      <span>Opening image loaded</span>
                    </div>
                  ) : null}
                  <label className="admin-upload-line">
                    <span>Lila reactions</span>
                    <strong>Add Lila Image</strong>
                    <input
                      accept="image/*"
                      multiple
                      type="file"
                      onChange={(event) =>
                        readUploadedImages(event, (imageSrcs) =>
                          addOpeningReactionImages('lila', imageSrcs),
                        )
                      }
                    />
                  </label>
                  {lilaOpeningImages.length > 0 ? (
                    <div className="admin-opening-reaction-grid" aria-label="Lila reaction images">
                      {lilaOpeningImages.map((image) => (
                        <button
                          className={safeOpeningSettings.lilaImageSrc === image.src ? 'active' : ''}
                          key={image.id}
                          type="button"
                          onClick={() => updateOpeningSettings({ lilaImageSrc: image.src })}
                        >
                          <img alt="" draggable={false} src={resolveAssetSrc(image.src)} />
                          <span>{image.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <label className="admin-upload-line">
                    <span>Grace reactions</span>
                    <strong>Add Grace Image</strong>
                    <input
                      accept="image/*"
                      multiple
                      type="file"
                      onChange={(event) =>
                        readUploadedImages(event, (imageSrcs) =>
                          addOpeningReactionImages('grace', imageSrcs),
                        )
                      }
                    />
                  </label>
                  {graceOpeningImages.length > 0 ? (
                    <div className="admin-opening-reaction-grid" aria-label="Grace reaction images">
                      {graceOpeningImages.map((image) => (
                        <button
                          className={
                            safeOpeningSettings.graceImageSrc === image.src ? 'active' : ''
                          }
                          key={image.id}
                          type="button"
                          onClick={() => updateOpeningSettings({ graceImageSrc: image.src })}
                        >
                          <img alt="" draggable={false} src={resolveAssetSrc(image.src)} />
                          <span>{image.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
            {openingTab === 'dialogue' ? (
              <section className="admin-opening-beats" aria-label="Opening dialogue">
                {openingSettings.beats.map((beat, index) => (
                  <article className="admin-opening-beat" key={beat.id}>
                    <strong>{index + 1}</strong>
                    <label>
                      <span>Speaker</span>
                      <select
                        value={beat.actor}
                        onChange={(event) =>
                          updateOpeningBeatActor(beat, event.currentTarget.value as OpeningActor)
                        }
                      >
                        <option value="narrator">Narrator</option>
                        <option value="lila">Lila</option>
                        <option value="grace">Grace</option>
                      </select>
                    </label>
                    <label>
                      <span>Name</span>
                      <input
                        type="text"
                        value={beat.speaker}
                        onChange={(event) =>
                          updateOpeningBeat(beat.id, { speaker: event.currentTarget.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Side</span>
                      <select
                        value={beat.side}
                        onChange={(event) =>
                          updateOpeningBeat(beat.id, {
                            side: event.currentTarget.value as OpeningSide,
                          })
                        }
                      >
                        <option value="none">None</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                    {(['lila', 'grace'] as const).map((sceneActor) => {
                      const selectedImageId =
                        sceneActor === 'lila' ? beat.lilaImageId : beat.graceImageId;
                      const flipped = sceneActor === 'lila' ? beat.lilaFlipped : beat.graceFlipped;
                      const actorLabel = sceneActor === 'lila' ? 'Lila' : 'Grace';
                      const defaultImageSrc = getOpeningDefaultImageSrc(
                        safeOpeningSettings,
                        sceneActor,
                      );

                      return (
                        <div className="admin-opening-reaction-picker" key={sceneActor}>
                          <span>{actorLabel} image</span>
                          <button
                            className={`admin-opening-flip-button ${flipped ? 'active' : ''}`}
                            type="button"
                            onClick={() =>
                              updateOpeningBeat(
                                beat.id,
                                sceneActor === 'lila'
                                  ? { lilaFlipped: !flipped }
                                  : { graceFlipped: !flipped },
                              )
                            }
                          >
                            {flipped ? 'Unflip' : 'Flip'}
                          </button>
                          <div
                            className="admin-opening-reaction-options"
                            aria-label={`${actorLabel} image for beat ${index + 1}`}
                          >
                            <button
                              className={selectedImageId === OPENING_IMAGE_NONE ? 'active' : ''}
                              type="button"
                              onClick={() =>
                                updateOpeningBeatImage(beat.id, sceneActor, OPENING_IMAGE_NONE)
                              }
                            >
                              <span className="admin-opening-reaction-placeholder">None</span>
                              <strong>None</strong>
                            </button>
                            <button
                              className={selectedImageId === '' ? 'active' : ''}
                              type="button"
                              onClick={() => updateOpeningBeatImage(beat.id, sceneActor, '')}
                            >
                              {defaultImageSrc ? (
                                <img
                                  alt=""
                                  draggable={false}
                                  src={resolveAssetSrc(defaultImageSrc)}
                                />
                              ) : (
                                <span className="admin-opening-reaction-placeholder">
                                  {actorLabel}
                                </span>
                              )}
                              <strong>Default</strong>
                            </button>
                            {getOpeningImagesForActor(safeOpeningSettings, sceneActor).map(
                              (image) => (
                                <button
                                  className={selectedImageId === image.id ? 'active' : ''}
                                  key={image.id}
                                  type="button"
                                  onClick={() =>
                                    updateOpeningBeatImage(beat.id, sceneActor, image.id)
                                  }
                                >
                                  <img alt="" draggable={false} src={resolveAssetSrc(image.src)} />
                                  <strong>{image.label}</strong>
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <label className="admin-opening-line-field">
                      <span>Line</span>
                      <textarea
                        value={beat.text}
                        onChange={(event) =>
                          updateOpeningBeat(beat.id, { text: event.currentTarget.value })
                        }
                      />
                    </label>
                  </article>
                ))}
              </section>
            ) : null}
            {openingTab === 'preview' ? (
              <section className="admin-opening-preview-section" aria-label="Opening preview">
                <h3>Preview</h3>
                <div className="admin-opening-preview">
                  <OpeningStagePreview
                    settings={openingSettings}
                    editable
                    onBeatChange={updateOpeningBeat}
                  />
                </div>
              </section>
            ) : null}
          </div>
        ) : sidePanelMode === 'assets' ? (
          <div className="admin-assets-board" aria-label="Admin asset browser">
            <header className="admin-board-header">
              <div>
                <p className="eyebrow">Assets</p>
                <h2>Images In Use</h2>
              </div>
              <span>{adminAssets.length} images</span>
            </header>
            <div className="admin-asset-grid">
              {adminAssets.map((asset) => (
                <button
                  className={`admin-asset-tile ${selectedAsset?.id === asset.id ? 'active' : ''}`}
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedAssetId(asset.id)}
                >
                  <span className="admin-asset-thumb">
                    <img alt="" draggable={false} src={resolveAssetSrc(asset.src)} />
                  </span>
                  <strong>{asset.label}</strong>
                  <small>{asset.detail}</small>
                </button>
              ))}
            </div>
          </div>
        ) : sidePanelMode === 'chats' ? (
          <div className="admin-chats-board" aria-label="Admin chat editor">
            <aside className="admin-chat-character-column" aria-label="Chat characters">
              <h2>Chats</h2>
              <div className="admin-chat-file-actions">
                <label className="paper-button admin-upload-button">
                  Load ODS
                  <input
                    accept=".ods,application/vnd.oasis.opendocument.spreadsheet"
                    type="file"
                    onChange={importChatsFromSpreadsheet}
                  />
                </label>
                <button className="danger-text-button" type="button" onClick={clearAllAdminChats}>
                  Clear All Chats
                </button>
              </div>
              {chatImportMessage ? (
                <small className="admin-chat-import-message">{chatImportMessage}</small>
              ) : null}
              <button
                className={chatToolMode === 'moodIcons' ? 'active' : ''}
                type="button"
                onClick={() => {
                  setChatToolMode('moodIcons');
                  setSelectedChatSubjectId('');
                  setSelectedChatGroupId('');
                  setSelectedChatEntryId('');
                  setChatEditorMode('list');
                  setAddingChatGroupId('');
                }}
              >
                <strong>Mood Icons</strong>
                <small>Upload and name</small>
              </button>
              {ADMIN_SUBJECT_IDS.filter((subjectId) => {
                if (!isCharacterId(subjectId) || !CUSTOM_CHARACTER_IDS.includes(subjectId)) {
                  return true;
                }
                return normalizeCharacterAdminSettings(subjectId, characterSettings[subjectId])
                  .enabled;
              }).map((subjectId) => {
                const customer = getAdminSubjectCustomer(subjectId, characterSettings);
                return (
                  <button
                    className={
                      chatToolMode === 'chats' && selectedChatSubjectId === subjectId
                        ? 'active'
                        : ''
                    }
                    key={subjectId}
                    type="button"
                    onClick={() => selectChatSubject(subjectId)}
                  >
                    <strong>{customer.name}</strong>
                    <small>{customer.members.length > 1 ? 'Couple / group' : 'Solo'}</small>
                  </button>
                );
              })}
            </aside>

            <section className="admin-chat-editor-panel">
              {chatToolMode === 'moodIcons' ? (
                <div className="admin-mood-icon-manager">
                  <header className="admin-chat-topline">
                    <div>
                      <p className="eyebrow">Chats</p>
                      <h2>Mood Icons</h2>
                    </div>
                    <label className="paper-button admin-upload-button">
                      Upload Icons
                      <input
                        accept="image/*"
                        multiple
                        type="file"
                        onChange={(event) => readUploadedImages(event, addMoodIcons)}
                      />
                    </label>
                  </header>
                  <div className="admin-mood-icon-grid">
                    {adminMoodIcons.map((icon) => (
                      <article className="admin-mood-icon-card" key={icon.id}>
                        <MoodIconBubble src={icon.src} />
                        <label>
                          <span>Name</span>
                          <input
                            type="text"
                            value={icon.name}
                            onChange={(event) =>
                              updateMoodIcon(icon.id, { name: event.currentTarget.value })
                            }
                          />
                        </label>
                        <button
                          className="danger-text-button"
                          type="button"
                          onClick={() => deleteMoodIcon(icon.id)}
                        >
                          Delete
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              ) : !selectedChatSubjectId || !selectedChatCustomer ? (
                <div className="admin-empty-state">
                  <h2>Select a character</h2>
                  <p>Choose who you want to write comments and stories for.</p>
                </div>
              ) : chatEditorMode === 'list' ? (
                <>
                  <header className="admin-chat-topline">
                    <h2>{selectedChatCustomer.name}</h2>
                    <button className="paper-button" type="button" onClick={addRelationshipGroup}>
                      Add Relationship
                    </button>
                  </header>
                  <div className="admin-chat-groups">
                    {selectedChatGroups.map((group) => (
                      <section className="admin-chat-group" key={group.id}>
                        <header>
                          <label>
                            <span>Relationship</span>
                            <input
                              min={0}
                              max={MAX_RELATIONSHIP_SCORE}
                              type="number"
                              value={group.threshold}
                              onChange={(event) => {
                                setSelectedChatGroupId(group.id);
                                if (selectedChatSubjectId) {
                                  updateChatGroups(
                                    selectedChatSubjectId,
                                    selectedChatGroups.map((item) =>
                                      item.id === group.id
                                        ? {
                                            ...item,
                                            threshold: clamp(
                                              Math.floor(
                                                numericValue(event.currentTarget.value, 0),
                                              ),
                                              0,
                                              MAX_RELATIONSHIP_SCORE,
                                            ),
                                          }
                                        : item,
                                    ),
                                  );
                                }
                              }}
                            />
                          </label>
                          <div>
                            {addingChatGroupId === group.id ? (
                              <span className="admin-chat-add-menu">
                                {(['comment', 'story', 'leave', 'order'] as AdminChatKind[]).map(
                                  (kind) => (
                                    <button
                                      key={kind}
                                      type="button"
                                      onClick={() => addChatEntry(kind, group.id)}
                                    >
                                      {ADMIN_CHAT_KIND_LABELS[kind]}
                                    </button>
                                  ),
                                )}
                              </span>
                            ) : null}
                            <button
                              className="text-button"
                              type="button"
                              onClick={() =>
                                setAddingChatGroupId(addingChatGroupId === group.id ? '' : group.id)
                              }
                            >
                              Add Chat
                            </button>
                          </div>
                        </header>
                        <div className="admin-chat-entry-list">
                          {group.entries.map((entry) => (
                            <button
                              className={`admin-chat-entry-row admin-chat-${entry.kind}`}
                              key={entry.id}
                              type="button"
                              onClick={() => editChatEntry(group.id, entry)}
                            >
                              <span>{ADMIN_CHAT_KIND_LABELS[entry.kind]}</span>
                              <strong>{entry.title}</strong>
                              {entry.triggerStoryId ? (
                                <small>
                                  Trigger
                                  {entry.triggerDelayDays > 0 ? ` +${entry.triggerDelayDays}d` : ''}
                                </small>
                              ) : null}
                            </button>
                          ))}
                          {group.entries.length === 0 ? (
                            <p className="admin-muted-copy">No chats in this relationship yet.</p>
                          ) : null}
                        </div>
                      </section>
                    ))}
                  </div>
                </>
              ) : selectedChatEntry ? (
                <div className={`admin-chat-form admin-chat-form-${selectedChatEntry.kind}`}>
                  <header className="admin-chat-topline">
                    <div>
                      <p className="eyebrow">{selectedChatCustomer.name}</p>
                      <h2>{ADMIN_CHAT_KIND_LABELS[selectedChatEntry.kind]}</h2>
                    </div>
                    <div>
                      <button
                        className="paper-button"
                        type="button"
                        onClick={() => {
                          if (selectedChatSubjectId) {
                            onAdminChatEntryTest(selectedChatSubjectId, selectedChatEntry.id);
                          }
                        }}
                      >
                        Test in Shop
                      </button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={deleteSelectedChatEntry}
                      >
                        Delete
                      </button>
                      <button
                        className="paper-button"
                        type="button"
                        onClick={() => setChatEditorMode('list')}
                      >
                        Save
                      </button>
                      <button
                        className="paper-button"
                        type="button"
                        onClick={() => setChatEditorMode('list')}
                      >
                        Back
                      </button>
                    </div>
                  </header>

                  <label>
                    <span>ID</span>
                    <input
                      type="text"
                      value={selectedChatEntry.id}
                      onChange={(event) => updateSelectedChatEntryId(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Title</span>
                    <input
                      type="text"
                      value={selectedChatEntry.title}
                      onChange={(event) => updateSelectedChatEntry({ title: event.target.value })}
                    />
                  </label>

                  {selectedChatEntry.kind === 'story' ? (
                    <label>
                      <span>Summary</span>
                      <textarea
                        value={selectedChatEntry.summary}
                        onChange={(event) =>
                          updateSelectedChatEntry({ summary: event.target.value })
                        }
                      />
                    </label>
                  ) : null}

                  {renderChatImagePicker(
                    'Starting image',
                    selectedChatEntry.startImageSrc,
                    (imageSrc) => updateSelectedChatEntry({ startImageSrc: imageSrc }),
                    'Default',
                    'Used when this dialog starts.',
                  )}

                  <section className="admin-mood-icon-picker" aria-label="Mood icons for chat">
                    <div className="admin-field-row">
                      <span>Mood icons</span>
                      <small>Selected icons can pop up beside the character.</small>
                    </div>
                    <div className="admin-mood-icon-choice-grid">
                      {adminMoodIcons.map((icon) => {
                        const selected = selectedChatEntry.moodIconIds.includes(icon.id);
                        return (
                          <button
                            className={`admin-mood-icon-choice ${selected ? 'active' : ''}`}
                            key={icon.id}
                            type="button"
                            onClick={() => toggleSelectedChatMoodIcon(icon.id)}
                          >
                            <MoodIconBubble src={icon.src} />
                            <strong>{icon.name}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <div className="admin-chat-blocks-editor">
                    {selectedChatEntry.blocks.map((block, index) => {
                      const bubbleNumber = selectedChatEntry.blocks
                        .slice(0, index + 1)
                        .filter((item) => item.kind === 'bubble').length;
                      return (
                        <section
                          className={`admin-chat-block admin-chat-block-${block.kind}`}
                          key={block.id}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => dropChatBlock(block.id, event)}
                        >
                          <header>
                            <button
                              aria-label="Drag chat block"
                              className="admin-drag-handle"
                              draggable
                              type="button"
                              onDragEnd={stopChatBlockDrag}
                              onDragStart={(event) => beginChatBlockDrag(block.id, event)}
                            >
                              Drag
                            </button>
                            <h3>
                              {block.kind === 'bubble'
                                ? `Word bubble ${bubbleNumber}`
                                : 'Cat reply'}
                            </h3>
                            <button
                              className="danger-text-button"
                              type="button"
                              onClick={() => deleteSelectedChatBlock(block.id)}
                            >
                              Delete
                            </button>
                          </header>

                          {block.kind === 'bubble' ? (
                            <>
                              {renderChatImagePicker(
                                'Bubble image',
                                block.imageSrc,
                                (imageSrc) => updateSelectedChatBubbleImage(block.id, imageSrc),
                                'Use start',
                                'Overrides the starting image for this bubble.',
                              )}
                              <textarea
                                value={block.text}
                                onChange={(event) =>
                                  updateSelectedChatBubble(block.id, event.currentTarget.value)
                                }
                              />
                            </>
                          ) : null}
                        </section>
                      );
                    })}
                    <div className="admin-add-block-row">
                      <button
                        className="text-button"
                        type="button"
                        onClick={addSelectedChatBubbleBlock}
                      >
                        + word bubble
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={addSelectedCatReplyBlock}
                      >
                        + cat reply
                      </button>
                    </div>
                  </div>

                  {selectedChatEntry.kind === 'story' ? (
                    <label className="admin-story-trigger-field">
                      <span>Trigger</span>
                      <select
                        value={selectedChatEntry.triggerStoryId}
                        onChange={(event) => {
                          const triggerStoryId = event.currentTarget.value;
                          updateSelectedChatEntry({
                            triggerStoryId,
                            triggerDelayDays: triggerStoryId
                              ? selectedChatEntry.triggerDelayDays
                              : 0,
                          });
                        }}
                      >
                        <option value="">No trigger</option>
                        {storyTriggerOptions
                          .filter((option) => option.id !== selectedChatEntry.id)
                          .map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                    </label>
                  ) : null}
                  {selectedChatEntry.kind === 'story' && selectedChatEntry.triggerStoryId ? (
                    <label className="admin-story-trigger-field">
                      <span>Days after trigger</span>
                      <input
                        min={0}
                        max={365}
                        type="number"
                        value={selectedChatEntry.triggerDelayDays}
                        onChange={(event) =>
                          updateSelectedChatEntry({
                            triggerDelayDays: clamp(
                              Math.floor(numericValue(event.currentTarget.valueAsNumber, 0)),
                              0,
                              365,
                            ),
                          })
                        }
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        ) : sidePanelMode === 'chatMenu' ? (
          <div className="admin-chat-menu-board" aria-label="Admin chat menu editor">
            <header className="admin-board-header">
              <div>
                <p className="eyebrow">Chat Menu</p>
                <h2>Action Wheel</h2>
              </div>
              <label>
                <span>Overall scale</span>
                <input
                  min={55}
                  max={180}
                  type="range"
                  value={adminChatMenuSettings.scale}
                  onInput={(event) =>
                    updateChatMenuPatch({ scale: Number(event.currentTarget.value) })
                  }
                  onChange={(event) =>
                    updateChatMenuPatch({ scale: Number(event.currentTarget.value) })
                  }
                />
                <small>{adminChatMenuSettings.scale}%</small>
              </label>
              <label>
                <span>Menu X</span>
                <input
                  min={10}
                  max={90}
                  type="range"
                  value={adminChatMenuSettings.position.x}
                  onInput={(event) =>
                    updateChatMenuPatch({
                      position: {
                        ...adminChatMenuSettings.position,
                        x: Number(event.currentTarget.value),
                      },
                    })
                  }
                  onChange={(event) =>
                    updateChatMenuPatch({
                      position: {
                        ...adminChatMenuSettings.position,
                        x: Number(event.currentTarget.value),
                      },
                    })
                  }
                />
                <small>{Math.round(adminChatMenuSettings.position.x)}%</small>
              </label>
              <label>
                <span>Menu Y</span>
                <input
                  min={10}
                  max={90}
                  type="range"
                  value={adminChatMenuSettings.position.y}
                  onInput={(event) =>
                    updateChatMenuPatch({
                      position: {
                        ...adminChatMenuSettings.position,
                        y: Number(event.currentTarget.value),
                      },
                    })
                  }
                  onChange={(event) =>
                    updateChatMenuPatch({
                      position: {
                        ...adminChatMenuSettings.position,
                        y: Number(event.currentTarget.value),
                      },
                    })
                  }
                />
                <small>{Math.round(adminChatMenuSettings.position.y)}%</small>
              </label>
              <label>
                <span>Cat scale</span>
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
                      Number(event.currentTarget.value),
                    )
                  }
                />
                <small>{selectedTalkingLayout.catScale}%</small>
              </label>
            </header>
            <div className="admin-chat-menu-workspace">
              <section
                className="admin-chat-menu-preview"
                aria-label="Chat action menu editor"
                ref={chatMenuPreviewRef}
              >
                <div
                  className="visit-action-wheel admin-chat-menu-preview-wheel"
                  ref={chatMenuEditorRef}
                  onPointerCancel={stopChatMenuDrag}
                  onPointerDown={beginChatMenuWheelDrag}
                  onPointerMove={moveChatMenuDrag}
                  onPointerUp={stopChatMenuDrag}
                  style={chatMenuWheelStyle(adminChatMenuSettings)}
                >
                  {adminChatMenuSettings.backgroundImageSrc ? (
                    <span className="admin-chat-menu-bg" style={chatMenuBackgroundStyle()} />
                  ) : null}
                  {CAT_ACTION_IDS.map((actionId) => {
                    const item = adminChatMenuSettings.items[actionId];
                    return (
                      <button
                        className={chatMenuActionClass(actionId)}
                        key={actionId}
                        type="button"
                        style={chatMenuActionStyle(actionId)}
                        onPointerDown={(event) => beginChatMenuDrag(actionId, event)}
                      >
                        {renderChatMenuActionIcon(actionId, item.imageSrc)}
                        <strong>{CAT_ACTION_LABELS[actionId]}</strong>
                      </button>
                    );
                  })}
                </div>
                <div
                  className="admin-chat-menu-cat-reference"
                  style={{ '--cat-scale': selectedTalkingLayout.catScale / 100 } as CSSProperties}
                  aria-hidden="true"
                >
                  <CatSprite imageSrc={getCatImageSrc(adminCatSettings, 'idle')} resting />
                </div>
              </section>
              <section className="admin-chat-menu-controls">
                <label className="admin-upload-line">
                  <span>Background circle</span>
                  <strong>Choose Image</strong>
                  <input
                    accept="image/*"
                    type="file"
                    onChange={(event) =>
                      readUploadedImage(event, (imageSrc) =>
                        updateChatMenuPatch({ backgroundImageSrc: imageSrc }),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Background scale</span>
                  <input
                    min={20}
                    max={220}
                    type="range"
                    value={adminChatMenuSettings.backgroundScale}
                    onInput={(event) =>
                      updateChatMenuPatch({ backgroundScale: Number(event.currentTarget.value) })
                    }
                    onChange={(event) =>
                      updateChatMenuPatch({ backgroundScale: Number(event.currentTarget.value) })
                    }
                  />
                  <small>{adminChatMenuSettings.backgroundScale}%</small>
                </label>
                <label>
                  <span>Background layer</span>
                  <input
                    min={0}
                    max={20}
                    type="number"
                    value={adminChatMenuSettings.backgroundLayer}
                    onChange={(event) =>
                      updateChatMenuPatch({
                        backgroundLayer: clamp(
                          Math.floor(numericValue(event.currentTarget.valueAsNumber, 0)),
                          0,
                          20,
                        ),
                      })
                    }
                  />
                </label>
                <div className="admin-chat-menu-action-grid">
                  {CAT_ACTION_IDS.map((actionId) => {
                    const item = adminChatMenuSettings.items[actionId];
                    return (
                      <article className="admin-chat-menu-action-card" key={actionId}>
                        <header>
                          <strong>{CAT_ACTION_LABELS[actionId]}</strong>
                          <small>
                            {Math.round(item.position.x)}%, {Math.round(item.position.y)}%
                          </small>
                        </header>
                        <label className="admin-upload-line">
                          <span>Hex background</span>
                          <strong>Choose Image</strong>
                          <input
                            accept="image/*"
                            type="file"
                            onChange={(event) =>
                              readUploadedImage(event, (imageSrc) =>
                                updateChatMenuItem(actionId, { imageSrc, textEnabled: false }),
                              )
                            }
                          />
                        </label>
                        {actionId === 'serve' ? (
                          <>
                            <label className="admin-upload-line">
                              <span>Served/default bg</span>
                              <strong>Choose Image</strong>
                              <input
                                accept="image/*"
                                type="file"
                                onChange={(event) =>
                                  readUploadedImage(event, (servedImageSrc) =>
                                    updateChatMenuItem(actionId, {
                                      servedImageSrc,
                                      textEnabled: false,
                                    }),
                                  )
                                }
                              />
                            </label>
                            {item.servedImageSrc ? (
                              <button
                                className="danger-text-button"
                                type="button"
                                onClick={() => updateChatMenuItem(actionId, { servedImageSrc: '' })}
                              >
                                Clear Served Image
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        <label>
                          <span>Hex size</span>
                          <input
                            min={45}
                            max={180}
                            type="range"
                            value={item.hexScale}
                            onInput={(event) =>
                              updateChatMenuItem(actionId, {
                                hexScale: Number(event.currentTarget.value),
                              })
                            }
                            onChange={(event) =>
                              updateChatMenuItem(actionId, {
                                hexScale: Number(event.currentTarget.value),
                              })
                            }
                          />
                          <small>{item.hexScale}%</small>
                        </label>
                        <label>
                          <span>Image scale</span>
                          <input
                            min={35}
                            max={260}
                            type="range"
                            value={item.imageScale}
                            onInput={(event) =>
                              updateChatMenuItem(actionId, {
                                imageScale: Number(event.currentTarget.value),
                              })
                            }
                            onChange={(event) =>
                              updateChatMenuItem(actionId, {
                                imageScale: Number(event.currentTarget.value),
                              })
                            }
                          />
                          <small>{item.imageScale}%</small>
                        </label>
                        <label>
                          <span>Image X</span>
                          <input
                            min={0}
                            max={100}
                            type="range"
                            value={item.imagePosition.x}
                            onInput={(event) =>
                              updateChatMenuItem(actionId, {
                                imagePosition: {
                                  ...item.imagePosition,
                                  x: Number(event.currentTarget.value),
                                },
                              })
                            }
                            onChange={(event) =>
                              updateChatMenuItem(actionId, {
                                imagePosition: {
                                  ...item.imagePosition,
                                  x: Number(event.currentTarget.value),
                                },
                              })
                            }
                          />
                          <small>{item.imagePosition.x}%</small>
                        </label>
                        <label>
                          <span>Image Y</span>
                          <input
                            min={0}
                            max={100}
                            type="range"
                            value={item.imagePosition.y}
                            onInput={(event) =>
                              updateChatMenuItem(actionId, {
                                imagePosition: {
                                  ...item.imagePosition,
                                  y: Number(event.currentTarget.value),
                                },
                              })
                            }
                            onChange={(event) =>
                              updateChatMenuItem(actionId, {
                                imagePosition: {
                                  ...item.imagePosition,
                                  y: Number(event.currentTarget.value),
                                },
                              })
                            }
                          />
                          <small>{item.imagePosition.y}%</small>
                        </label>
                        <label className="admin-chat-menu-checkbox">
                          <span>Show text</span>
                          <input
                            type="checkbox"
                            checked={item.textEnabled}
                            onChange={(event) =>
                              updateChatMenuItem(actionId, {
                                textEnabled: event.currentTarget.checked,
                              })
                            }
                          />
                          <small>{item.textEnabled ? 'On' : 'Off'}</small>
                        </label>
                        <label>
                          <span>Layer</span>
                          <input
                            min={0}
                            max={20}
                            type="number"
                            value={item.layer}
                            onChange={(event) =>
                              updateChatMenuItem(actionId, {
                                layer: clamp(
                                  Math.floor(numericValue(event.currentTarget.valueAsNumber, 2)),
                                  0,
                                  20,
                                ),
                              })
                            }
                          />
                          <small>{item.layer}</small>
                        </label>
                        {item.imageSrc ? (
                          <button
                            className="danger-text-button"
                            type="button"
                            onClick={() => updateChatMenuItem(actionId, { imageSrc: '' })}
                          >
                            Clear Image
                          </button>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        ) : sidePanelMode === 'cat' ? (
          <div className="admin-cat-board" aria-label="Admin cat image editor">
            <header className="admin-board-header">
              <div>
                <p className="eyebrow">Cat</p>
                <h2>Cat Images</h2>
              </div>
              <span>Idle plus action poses</span>
            </header>
            <div className="admin-cat-pose-grid">
              {CAT_POSE_KEYS.map((poseKey) => (
                <article className="admin-cat-pose-card" key={poseKey}>
                  <div className="admin-cat-pose-preview">
                    <CatSprite imageSrc={adminCatSettings[poseKey]} resting={poseKey === 'idle'} />
                  </div>
                  <h3>{getCatPoseLabel(poseKey)}</h3>
                  <label className="admin-upload-line">
                    <span>Image</span>
                    <strong>Choose Image</strong>
                    <input
                      accept="image/*"
                      type="file"
                      onChange={(event) =>
                        readUploadedImage(event, (imageSrc) =>
                          updateCatPoseImage(poseKey, imageSrc),
                        )
                      }
                    />
                  </label>
                  {adminCatSettings[poseKey] ? (
                    <button
                      className="danger-text-button"
                      type="button"
                      onClick={() => updateCatPoseImage(poseKey, '')}
                    >
                      Clear Image
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : (
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
                {referenceEditMode ? (
                  <>
                    <div className="admin-empty-table-markers" aria-label="Empty table markers">
                      <button
                        aria-label={`Move empty table spot ${selectedSeatSlot + 1}`}
                        className="admin-draggable admin-empty-table-prop active"
                        onPointerDown={(event) =>
                          beginSeatSpotDrag(
                            selectedSeatSlot,
                            event,
                            'emptyTable',
                            EMPTY_TABLE_SEAT_SPOTS_ID,
                          )
                        }
                        style={emptyTableSpotStyle(selectedSeatSlot)}
                        type="button"
                      >
                        <img
                          alt=""
                          draggable={false}
                          src={resolveAssetSrc(EMPTY_TABLE_IMAGE_SRC)}
                        />
                        <span>Empty {selectedSeatSlot + 1}</span>
                      </button>
                    </div>
                    <div className="admin-stage-scale-bars" aria-label="Empty table scale handle">
                      <div className="admin-stage-scale-pair">
                        <label
                          className="admin-stage-scale-bar admin-empty-scale-bar active"
                          style={emptyTableSpotStyle(selectedSeatSlot)}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <span>Empty {selectedSeatSlot + 1}</span>
                          <input
                            min={55}
                            max={300}
                            type="range"
                            value={selectedEmptyTableSpot.scale}
                            onInput={(event) =>
                              onSeatSpotScaleChange(
                                EMPTY_TABLE_SEAT_SPOTS_ID,
                                selectedSeatSlot,
                                Number(event.currentTarget.value),
                              )
                            }
                            onChange={(event) =>
                              onSeatSpotScaleChange(
                                EMPTY_TABLE_SEAT_SPOTS_ID,
                                selectedSeatSlot,
                                Number(event.target.value),
                              )
                            }
                          />
                          <small>{selectedEmptyTableSpot.scale}%</small>
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}
                {storePlacementEditMode ? (
                  <>
                    <div className="admin-spot-drink-markers" aria-label="Spot drink markers">
                      <button
                        aria-label={`Move spot ${selectedSeatSlot + 1} drink`}
                        className="admin-draggable admin-drink-prop admin-spot-drink-prop active"
                        onPointerDown={(event) =>
                          beginSeatSpotDrag(selectedSeatSlot, event, 'drink')
                        }
                        style={seatDrinkStyle(selectedSeatSlot)}
                        type="button"
                      >
                        <ServiceIcon kind="blackTea" />
                      </button>
                    </div>
                    <div
                      className="admin-spot-order-markers"
                      aria-label="Spot order bubble markers"
                    >
                      <button
                        aria-label={`Move spot ${selectedSeatSlot + 1} order bubble`}
                        className="admin-draggable admin-order-prop service-request admin-spot-order-prop active"
                        onPointerDown={(event) =>
                          beginSeatSpotDrag(selectedSeatSlot, event, 'order')
                        }
                        style={seatAnchorStyle(selectedSeatSlot, 'order')}
                        type="button"
                      >
                        <span className="admin-order-patience-preview">
                          <span style={{ width: '68%' }} />
                        </span>
                        <ServiceIcon kind="blackTea" />
                        <span>Spot {selectedSeatSlot + 1}</span>
                      </button>
                    </div>
                    <div
                      className="admin-spot-mood-icon-markers"
                      aria-label="Spot mood icon markers"
                    >
                      <button
                        aria-label={`Move spot ${selectedSeatSlot + 1} mood icon`}
                        className="admin-draggable admin-spot-mood-icon-prop active"
                        onPointerDown={(event) =>
                          beginSeatSpotDrag(selectedSeatSlot, event, 'moodIcon')
                        }
                        style={seatAnchorStyle(selectedSeatSlot, 'moodIcon')}
                        type="button"
                      >
                        <MoodIconBubble src={adminMoodIcons[0]?.src ?? DEFAULT_MOOD_ICON_SRC} />
                      </button>
                    </div>
                    <div className="admin-seat-markers" aria-label="Table spot markers">
                      <button
                        aria-label={`Move spot ${selectedSeatSlot + 1}`}
                        className="admin-draggable admin-seat-marker active"
                        onPointerDown={(event) =>
                          beginSeatSpotDrag(selectedSeatSlot, event, 'marker')
                        }
                        style={seatMarkerStyle(selectedSeatSlot)}
                        type="button"
                      >
                        <span>{selectedSeatSlot + 1}</span>
                      </button>
                    </div>
                    <div className="admin-stage-scale-bars" aria-label="Stage scale handles">
                      <div className="admin-stage-scale-pair">
                        <label
                          className="admin-stage-scale-bar admin-character-scale-bar active"
                          style={seatScaleBarStyle(selectedSeatSlot, 'marker')}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <span>Spot {selectedSeatSlot + 1}</span>
                          <input
                            min={55}
                            max={180}
                            type="range"
                            value={selectedSeatSpot.scale}
                            onInput={(event) =>
                              onSeatSpotScaleChange(
                                selectedCharacterId,
                                selectedSeatSlot,
                                Number(event.currentTarget.value),
                              )
                            }
                            onChange={(event) =>
                              onSeatSpotScaleChange(
                                selectedCharacterId,
                                selectedSeatSlot,
                                Number(event.target.value),
                              )
                            }
                          />
                          <small>{selectedSeatSpot.scale}%</small>
                        </label>
                        <label
                          className="admin-stage-scale-bar admin-tea-scale-bar active"
                          style={seatScaleBarStyle(selectedSeatSlot, 'drink')}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <span>Tea {selectedSeatSlot + 1}</span>
                          <input
                            min={45}
                            max={250}
                            type="range"
                            value={selectedSeatSpot.drinkScale}
                            onInput={(event) =>
                              onSeatSpotDrinkScaleChange(
                                selectedCharacterId,
                                selectedSeatSlot,
                                Number(event.currentTarget.value),
                              )
                            }
                            onChange={(event) =>
                              onSeatSpotDrinkScaleChange(
                                selectedCharacterId,
                                selectedSeatSlot,
                                Number(event.target.value),
                              )
                            }
                          />
                          <small>{selectedSeatSpot.drinkScale}%</small>
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}

                {(referenceEditMode || storePlacementEditMode) &&
                onionCharacter &&
                onionLayout &&
                onionSeatSpots ? (
                  <div
                    className="admin-store-character-prop admin-onion-character-prop"
                    style={storeCharacterStyle(
                      onionLayout,
                      getAdminSeatSpot(onionSeatSpots, selectedSeatSlot),
                    )}
                    aria-hidden="true"
                  >
                    {onionTalkingImage ? (
                      <img alt="" draggable={false} src={resolveAssetSrc(onionTalkingImage)} />
                    ) : onionCustomer && onionCustomer.members.length > 1 ? (
                      <AnimalAvatar customer={onionCustomer} size="table" />
                    ) : onionCharacter.imageSrc ? (
                      <img
                        alt=""
                        className="character-image"
                        draggable={false}
                        src={resolveAssetSrc(onionCharacter.imageSrc)}
                      />
                    ) : (
                      <CharacterBust member={onionCharacter} index={0} total={1} />
                    )}
                  </div>
                ) : null}

                {!referenceEditMode ? (
                  <button
                    aria-label={`Move ${selectedCustomer.name}`}
                    className="admin-draggable admin-store-character-prop"
                    style={storeCharacterStyle()}
                    onPointerDown={(event) => beginSeatSpotDrag(selectedSeatSlot, event)}
                    type="button"
                  >
                    {activeDefaultImage ? (
                      <img alt="" draggable={false} src={resolveAssetSrc(activeDefaultImage)} />
                    ) : selectedCustomer.members.length > 1 ? (
                      <AnimalAvatar customer={selectedCustomer} size="table" />
                    ) : selectedCharacter.imageSrc ? (
                      <img
                        alt=""
                        className="character-image"
                        draggable={false}
                        src={resolveAssetSrc(selectedCharacter.imageSrc)}
                      />
                    ) : (
                      <CharacterBust member={selectedCharacter} index={0} total={1} />
                    )}
                  </button>
                ) : null}
              </>
            ) : previewMode === 'talking' ? (
              <>
                <div className="visit-backdrop" />
                {onionCharacter && onionLayout ? (
                  <div
                    className="admin-talking-character-prop admin-onion-character-prop"
                    style={talkingCharacterStyle(onionLayout.talking)}
                    aria-hidden="true"
                  >
                    {onionConversationImage ? (
                      <img alt="" draggable={false} src={resolveAssetSrc(onionConversationImage)} />
                    ) : onionCustomer && onionCustomer.members.length > 1 ? (
                      <AnimalAvatar customer={onionCustomer} size="large" />
                    ) : onionCharacter.imageSrc ? (
                      <img
                        alt=""
                        className="character-image"
                        draggable={false}
                        src={resolveAssetSrc(onionCharacter.imageSrc)}
                      />
                    ) : (
                      <CharacterBust member={onionCharacter} index={0} total={1} />
                    )}
                  </div>
                ) : null}
                <div
                  aria-label={`Move ${selectedCustomer.name} talking image`}
                  className="admin-draggable admin-talking-character-prop"
                  role="button"
                  tabIndex={0}
                  style={talkingCharacterStyle()}
                  onPointerDown={(event) => beginDrag('character', event)}
                >
                  {activePreviewTalkingImage ? (
                    <img
                      alt=""
                      draggable={false}
                      src={resolveAssetSrc(activePreviewTalkingImage)}
                    />
                  ) : (
                    <AnimalAvatar customer={selectedCustomer} size="large" />
                  )}
                </div>
                {showChatFaceBlocker ? (
                  <button
                    aria-label="Move talking face blocker guide"
                    className="admin-face-blocker admin-chat-face-blocker"
                    onPointerDown={beginChatFaceBlockerDrag}
                    style={openingBlockerStyle(chatFaceBlocker)}
                    type="button"
                  >
                    <span>Keep Clear</span>
                  </button>
                ) : null}
                <button
                  aria-label="Move talking view drink"
                  className="admin-draggable admin-drink-prop admin-talking-drink-prop"
                  onPointerDown={(event) => beginDrag('drink', event)}
                  style={talkingDrinkStyle()}
                  type="button"
                >
                  <ServiceIcon kind="blackTea" />
                </button>
                <label
                  className="admin-stage-scale-bar admin-talking-tea-scale-bar active"
                  style={talkingDrinkScaleBarStyle()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <span>Tea</span>
                  <input
                    min={45}
                    max={250}
                    type="range"
                    value={selectedTalkingLayout.drinkScale}
                    onInput={(event) =>
                      onTalkingScaleChange(
                        selectedCharacterId,
                        'drinkScale',
                        Number(event.currentTarget.value),
                      )
                    }
                    onChange={(event) =>
                      onTalkingScaleChange(
                        selectedCharacterId,
                        'drinkScale',
                        Number(event.target.value),
                      )
                    }
                  />
                  <small>{selectedTalkingLayout.drinkScale}%</small>
                </label>
                <button
                  aria-label="Move talking view patience timer"
                  className="admin-draggable admin-talking-patience-prop patience-strip active"
                  onPointerDown={(event) => beginDrag('patience', event)}
                  style={talkingDragStyle('patience')}
                  type="button"
                >
                  <span className="patience-strip-fill" style={{ width: '68%' }} />
                  <b className="patience-countdown">18s</b>
                </button>
              </>
            ) : (
              <div className="admin-settings-preview">
                <div className="admin-portrait-preview-frame">
                  {selectedPortrait.imageSrc ? (
                    <img
                      alt=""
                      className="admin-portrait-image"
                      draggable={false}
                      src={resolveAssetSrc(selectedPortrait.imageSrc)}
                      style={portraitImageStyle(selectedPortrait)}
                    />
                  ) : (
                    <AnimalAvatar
                      customer={characterPreviewCustomer(selectedCharacter)}
                      size="portrait"
                    />
                  )}
                  {onionCharacter && onionPortrait ? (
                    onionPortrait.imageSrc ? (
                      <img
                        alt=""
                        className="admin-portrait-image admin-onion-portrait-image"
                        draggable={false}
                        src={resolveAssetSrc(onionPortrait.imageSrc)}
                        style={portraitImageStyle(onionPortrait)}
                      />
                    ) : onionCustomer ? (
                      <div className="admin-onion-portrait-avatar">
                        <AnimalAvatar customer={onionCustomer} size="portrait" />
                      </div>
                    ) : null
                  ) : null}
                </div>
                <div>
                  <p className="eyebrow">Character Settings</p>
                  <h2>{selectedCustomer.name}</h2>
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
                  <strong>{previewChatTitle}</strong>
                  <span className="story-bubble-count">Bubble 1/{previewChatLineCount}</span>
                </div>
                <span className="story-bubble-line">{previewChatLine}</span>
              </div>
            ) : null}

            {previewMode !== 'settings' && !referenceEditMode ? (
              <div
                aria-label="Move cat"
                className="admin-draggable admin-cat-prop"
                role="button"
                tabIndex={0}
                style={previewMode === 'talking' ? talkingCatStyle() : catDragStyle()}
                onPointerDown={(event) => beginDrag('cat', event)}
              >
                <CatSprite imageSrc={getCatImageSrc(adminCatSettings, 'idle')} resting />
              </div>
            ) : null}

            {previewMode === 'talking' ? (
              <>
                <aside
                  className="visit-mood-bar admin-reference-mood-bar"
                  aria-label="Visit status reference"
                >
                  <HeartIcon />
                  <span>{selectedCustomer.name}'s Mood</span>
                  <Meter value={37} label={`${selectedCustomer.name} preview mood`} />
                  <strong>37%</strong>
                </aside>
                <div
                  className="visit-action-wheel admin-reference-action-wheel"
                  aria-label="Cat action menu reference"
                  style={chatMenuWheelStyle(adminChatMenuSettings)}
                >
                  {adminChatMenuSettings.backgroundImageSrc ? (
                    <span className="visit-action-menu-bg" style={chatMenuBackgroundStyle()} />
                  ) : null}
                  <div className={chatMenuActionClass('meow')} style={chatMenuActionStyle('meow')}>
                    {renderChatMenuActionIcon('meow', adminChatMenuSettings.items.meow.imageSrc)}
                    <strong>Meow</strong>
                    <small>+6</small>
                  </div>
                  <div className={chatMenuActionClass('purr')} style={chatMenuActionStyle('purr')}>
                    {renderChatMenuActionIcon('purr', adminChatMenuSettings.items.purr.imageSrc)}
                    <strong>Purr</strong>
                    <small>Soothe</small>
                  </div>
                  <div
                    className={chatMenuActionClass('listen')}
                    style={chatMenuActionStyle('listen')}
                  >
                    {renderChatMenuActionIcon(
                      'listen',
                      adminChatMenuSettings.items.listen.imageSrc,
                    )}
                    <strong>Listen</strong>
                    <small>+12</small>
                  </div>
                  <div
                    className={chatMenuActionClass('leave')}
                    style={chatMenuActionStyle('leave')}
                  >
                    {renderChatMenuActionIcon('leave', adminChatMenuSettings.items.leave.imageSrc)}
                    <strong>Leave</strong>
                    <small>Shop</small>
                  </div>
                  <div className={chatMenuActionClass('cute')} style={chatMenuActionStyle('cute')}>
                    {renderChatMenuActionIcon('cute', adminChatMenuSettings.items.cute.imageSrc)}
                    <strong>Be Cute</strong>
                    <small>Charm</small>
                  </div>
                  <div className={chatMenuActionClass('roll')} style={chatMenuActionStyle('roll')}>
                    {renderChatMenuActionIcon('roll', adminChatMenuSettings.items.roll.imageSrc)}
                    <strong>Roll</strong>
                    <small>Play</small>
                  </div>
                  <div
                    className={chatMenuActionClass('serve')}
                    style={chatMenuActionStyle('serve')}
                  >
                    {renderChatMenuActionIcon('serve', adminChatMenuSettings.items.serve.imageSrc)}
                    <strong>Serve</strong>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </section>

      {!fullWorkbenchMode && sidePanelCollapsed ? (
        <button
          className="admin-panel-pull-tab"
          type="button"
          onClick={() => setSidePanelCollapsed(false)}
        >
          Inspector
        </button>
      ) : null}

      {!fullWorkbenchMode ? (
        <aside
          className={`admin-gallery admin-${sidePanelMode}-panel`}
          id="admin-side-panel"
          aria-label={sidePanelAriaLabel}
          hidden={sidePanelCollapsed}
        >
          <div className="admin-panel-header">
            <div>
              <p className="eyebrow">{sidePanelEyebrow}</p>
              <h2>{sidePanelTitle}</h2>
            </div>
            <button
              className="paper-button admin-panel-switch"
              type="button"
              onClick={() => openSidePanel('characters')}
            >
              Characters
            </button>
          </div>
          {sidePanelMode === 'ref' ? (
            <section
              className="admin-edit-card admin-reference-card"
              aria-label={`${selectedCustomer.name} reference points`}
            >
              <h3>Reference Points</h3>
              <div className="admin-spot-tabs" aria-label="Store spots">
                {TABLE_SLOTS.map((slot) => (
                  <button
                    className={selectedSeatSlot === slot ? 'active' : ''}
                    key={slot}
                    onClick={() => setSelectedSeatSlot(slot)}
                    type="button"
                  >
                    Spot {slot + 1}
                  </button>
                ))}
              </div>
              <div className="admin-reference-editor" aria-label="Reference point editor">
                <h4>Empty Table Reference</h4>
                {renderReferencePointControls(
                  'Empty Table',
                  EMPTY_TABLE_SEAT_SPOTS_ID,
                  'emptyTable',
                  selectedEmptyTableSpot.emptyTable,
                )}
                <fieldset className="admin-reference-point-editor admin-reference-scale-editor">
                  <legend>Empty Table Scale</legend>
                  <label>
                    <span>Empty</span>
                    <input
                      max={300}
                      min={55}
                      type="range"
                      value={selectedEmptyTableSpot.scale}
                      onInput={(event) =>
                        onSeatSpotScaleChange(
                          EMPTY_TABLE_SEAT_SPOTS_ID,
                          selectedSeatSlot,
                          Number(event.currentTarget.value),
                        )
                      }
                      onChange={(event) =>
                        onSeatSpotScaleChange(
                          EMPTY_TABLE_SEAT_SPOTS_ID,
                          selectedSeatSlot,
                          Number(event.target.value),
                        )
                      }
                    />
                    <small>{selectedEmptyTableSpot.scale}%</small>
                  </label>
                </fieldset>
              </div>
              {renderOnionSelector()}
              <button
                className="paper-button admin-reset-spots"
                type="button"
                onClick={() => onResetSeatSpots(EMPTY_TABLE_SEAT_SPOTS_ID)}
              >
                Reset Empty Tables
              </button>
              <small>
                Empty spot {selectedSeatSlot + 1}: {Math.round(selectedEmptyTableSpot.emptyTable.x)}
                %, {Math.round(selectedEmptyTableSpot.emptyTable.y)}%
              </small>
            </section>
          ) : null}
          {sidePanelMode === 'assets' ? (
            <section className="admin-edit-card admin-asset-inspector">
              {selectedAsset ? (
                <>
                  <span className="admin-asset-large-preview">
                    <img alt="" draggable={false} src={resolveAssetSrc(selectedAsset.src)} />
                  </span>
                  <h3>{selectedAsset.label}</h3>
                  <p className="admin-muted-copy">{selectedAsset.detail}</p>
                  <label className="admin-image-path-field">
                    <span>Image path</span>
                    <input
                      disabled={selectedAsset.kind === 'static'}
                      type="text"
                      value={selectedAsset.src}
                      onChange={(event) => replaceSelectedAsset(event.currentTarget.value)}
                    />
                    <small>
                      {selectedAsset.kind === 'store'
                        ? 'Store art'
                        : selectedAsset.kind === 'portrait'
                          ? 'Portrait'
                          : 'Static file'}
                    </small>
                  </label>
                  <label className="admin-upload-field">
                    <span>Replace</span>
                    <input
                      accept="image/*"
                      disabled={selectedAsset.kind === 'static'}
                      type="file"
                      onChange={(event) => readUploadedImage(event, replaceSelectedAsset)}
                    />
                    <small>
                      {selectedAsset.kind === 'static'
                        ? 'Not editable here'
                        : 'Saved to repo in dev'}
                    </small>
                  </label>
                </>
              ) : (
                <p className="admin-muted-copy">Select an image to replace it.</p>
              )}
            </section>
          ) : null}
          {sidePanelMode === 'chats' ? (
            <section className="admin-edit-card admin-chat-side-card">
              {selectedChatCustomer ? (
                <>
                  <h3>{selectedChatCustomer.name}</h3>
                  <p className="admin-muted-copy">
                    {selectedChatGroups.length} relationship sections. Stories can require another
                    collected story as a trigger, then wait a set number of days.
                  </p>
                  <button className="paper-button" type="button" onClick={addRelationshipGroup}>
                    Add Relationship
                  </button>
                  {selectedChatEntry ? (
                    <div className="admin-chat-current">
                      <strong>{ADMIN_CHAT_KIND_LABELS[selectedChatEntry.kind]}</strong>
                      <span>{selectedChatEntry.title}</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="admin-muted-copy">Pick a character in the Chats screen.</p>
              )}
            </section>
          ) : null}
          {sidePanelMode === 'inspector' ? (
            <section className="admin-edit-card" aria-label={`${selectedCustomer.name} settings`}>
              {previewMode === 'shop' ? (
                <>
                  <h3>Store Options</h3>
                  <div
                    className={`admin-selected-status ${
                      selectedSettings.enabled ? 'enabled' : 'disabled'
                    }`}
                  >
                    <span>{selectedSettings.enabled ? 'Enabled' : 'Disabled'}</span>
                    <small>
                      {selectedSettings.enabled ? 'Can appear in game' : 'Will not spawn'}
                    </small>
                  </div>
                  <label>
                    <span>Store image</span>
                    <input
                      min={45}
                      max={250}
                      type="range"
                      value={selectedLayout.characterScale}
                      onInput={(event) =>
                        onCharacterScaleChange(
                          selectedCharacterId,
                          Number(event.currentTarget.value),
                        )
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
                  {renderOnionSelector()}
                  <div
                    className="admin-reference-editor admin-store-placement-editor"
                    aria-label="Store placement editor"
                  >
                    <h4>Store Placement</h4>
                    <div className="admin-spot-tabs" aria-label="Character store spots">
                      {TABLE_SLOTS.map((slot) => (
                        <button
                          className={selectedSeatSlot === slot ? 'active' : ''}
                          key={slot}
                          onClick={() => setSelectedSeatSlot(slot)}
                          type="button"
                        >
                          Spot {slot + 1}
                        </button>
                      ))}
                    </div>
                    <fieldset className="admin-reference-point-editor admin-reference-scale-editor">
                      <legend>Scale</legend>
                      <label>
                        <span>Guest</span>
                        <input
                          max={180}
                          min={55}
                          type="range"
                          value={selectedSeatSpot.scale}
                          onInput={(event) =>
                            onSeatSpotScaleChange(
                              selectedCharacterId,
                              selectedSeatSlot,
                              Number(event.currentTarget.value),
                            )
                          }
                          onChange={(event) =>
                            onSeatSpotScaleChange(
                              selectedCharacterId,
                              selectedSeatSlot,
                              Number(event.target.value),
                            )
                          }
                        />
                        <small>{selectedSeatSpot.scale}%</small>
                      </label>
                      <label>
                        <span>Drink</span>
                        <input
                          max={250}
                          min={45}
                          type="range"
                          value={selectedSeatSpot.drinkScale}
                          onInput={(event) =>
                            onSeatSpotDrinkScaleChange(
                              selectedCharacterId,
                              selectedSeatSlot,
                              Number(event.currentTarget.value),
                            )
                          }
                          onChange={(event) =>
                            onSeatSpotDrinkScaleChange(
                              selectedCharacterId,
                              selectedSeatSlot,
                              Number(event.target.value),
                            )
                          }
                        />
                        <small>{selectedSeatSpot.drinkScale}%</small>
                      </label>
                    </fieldset>
                  </div>
                  <button
                    className="paper-button admin-reset-spots"
                    type="button"
                    onClick={() => onResetSeatSpots(selectedCharacterId)}
                  >
                    Reset Character Points
                  </button>
                  <button
                    className="paper-button admin-reset-spots"
                    type="button"
                    onClick={applyDefaultSeatSpotScales}
                  >
                    Depth Scales
                  </button>
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
                  {renderOnionSelector()}
                  <div className="admin-face-blocker-controls">
                    <button
                      className={`paper-button ${showChatFaceBlocker ? 'active' : ''}`}
                      type="button"
                      onClick={() => setShowChatFaceBlocker((visible) => !visible)}
                    >
                      Face Blocker
                    </button>
                    {showChatFaceBlocker ? (
                      <>
                        <label>
                          <span>Block width</span>
                          <input
                            max={48}
                            min={6}
                            type="range"
                            value={chatFaceBlocker.width}
                            onInput={(event) =>
                              updateChatFaceBlocker({
                                width: Number(event.currentTarget.value),
                              })
                            }
                            onChange={(event) =>
                              updateChatFaceBlocker({ width: Number(event.target.value) })
                            }
                          />
                          <small>{Math.round(chatFaceBlocker.width)}%</small>
                        </label>
                        <label>
                          <span>Block height</span>
                          <input
                            max={48}
                            min={6}
                            type="range"
                            value={chatFaceBlocker.height}
                            onInput={(event) =>
                              updateChatFaceBlocker({
                                height: Number(event.currentTarget.value),
                              })
                            }
                            onChange={(event) =>
                              updateChatFaceBlocker({ height: Number(event.target.value) })
                            }
                          />
                          <small>{Math.round(chatFaceBlocker.height)}%</small>
                        </label>
                      </>
                    ) : null}
                  </div>
                  <div className="admin-chat-preview-tester">
                    <h3>Test Dialogue</h3>
                    <div className="admin-spot-tabs" aria-label="Dialogue type to preview">
                      {(['comment', 'story', 'order', 'leave'] as AdminChatKind[]).map((kind) => (
                        <button
                          className={previewChatKind === kind ? 'active' : ''}
                          key={kind}
                          type="button"
                          onClick={() => setPreviewChatKind(kind)}
                        >
                          {ADMIN_CHAT_KIND_LABELS[kind]}
                        </button>
                      ))}
                    </div>
                    <label>
                      <span>Chat</span>
                      <select
                        disabled={previewChatEntries.length === 0}
                        value={previewChatEntry?.id ?? ''}
                        onChange={(event) => setPreviewChatEntryId(event.currentTarget.value)}
                      >
                        {previewChatEntries.length > 0 ? (
                          previewChatEntries.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.title || ADMIN_CHAT_KIND_LABELS[entry.kind]}
                            </option>
                          ))
                        ) : (
                          <option value="">No {ADMIN_CHAT_KIND_LABELS[previewChatKind]}</option>
                        )}
                      </select>
                      <small>{previewChatEntries.length} found</small>
                    </label>
                    <button
                      className="paper-button"
                      disabled={!previewChatEntry}
                      type="button"
                      onClick={() => {
                        if (previewChatEntry) {
                          onAdminChatEntryTest(selectedCharacterId, previewChatEntry.id);
                        }
                      }}
                    >
                      Test in Shop
                    </button>
                  </div>
                </>
              ) : null}

              {previewMode === 'settings' ? (
                <>
                  <h3>Character Settings</h3>
                  <label className="admin-toggle-row">
                    <span>Use in game</span>
                    <input
                      checked={selectedSettings.enabled}
                      type="checkbox"
                      onChange={(event) => updateSettings({ enabled: event.currentTarget.checked })}
                    />
                  </label>
                  {renderOnionSelector()}
                  <div className="admin-portrait-editor">
                    <span>Character picture</span>
                    <label className="admin-upload-field admin-portrait-upload-field">
                      <span>Upload</span>
                      <input
                        accept="image/*"
                        type="file"
                        onChange={(event) =>
                          readUploadedImage(event, (imageSrc) =>
                            updatePortrait({ imageSrc, scale: 100, x: 50, y: 50 }),
                          )
                        }
                      />
                      <small>Saved to repo in dev</small>
                    </label>
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
                              <img alt="" draggable={false} src={resolveAssetSrc(pose.src)} />
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
                          onChange={(event) =>
                            updatePortrait({ scale: Number(event.target.value) })
                          }
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
                          onInput={(event) =>
                            updatePortrait({ x: Number(event.currentTarget.value) })
                          }
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
                          onInput={(event) =>
                            updatePortrait({ y: Number(event.currentTarget.value) })
                          }
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
                        updateSettings({
                          patienceMs: Math.round(Number(event.target.value) * 1000),
                        })
                      }
                    />
                    <small>seconds</small>
                  </label>
                </>
              ) : null}
            </section>
          ) : null}
        </aside>
      ) : null}
    </main>
  );
}

interface ShopScreenProps {
  adminChats: AdminChats;
  adminLayouts: AdminLayouts;
  adminMoodIcons: AdminMoodIcon[];
  adminSeatSpotLayouts: AdminSeatSpotLayouts;
  customers: Array<Customer | null>;
  forceSpawnCustomers: readonly Customer[];
  game: GameState;
  seatCustomerSlots: Array<number | null>;
  recipes: string[];
  tableCount: number;
  arrivalState: ArrivalState;
  selectedSlot: TableSlot;
  activeService: ServiceItem;
  servedSlots: TableSlot[];
  servedOrdersBySlot: Partial<Record<TableSlot, number[]>>;
  departingSlots: TableSlot[];
  patiencePercents: Partial<Record<TableSlot, number>>;
  patienceRemainingBySlot: Partial<Record<TableSlot, number>>;
  clockProgress: number;
  catImageSrc: string;
  onServe: (slot?: TableSlot, orderIndex?: number) => void;
  onVisit: (slot?: TableSlot) => void;
  onForceSpawn: (customerId: string) => void;
  onStories: () => void;
  customerLogCount: number;
  showForceSpawn: boolean;
  tutorialCoachSrc: string;
  tutorialPatienceExpired: boolean;
  tutorialStep: TutorialStep;
  onTutorialNext: () => void;
}

function ShopUpgradeDecor({ upgrades }: { upgrades: string[] }) {
  const owned = new Set(upgrades);
  const visibleUpgradeIds = ['cushion', 'cat-bed', 'tea-plant', 'lamp', 'window-seat', 'hearth'];

  return (
    <div className="shop-upgrade-decor" aria-hidden="true">
      {visibleUpgradeIds.map((id) =>
        owned.has(id) ? (
          <span className={`shop-upgrade-prop shop-upgrade-${id}`} key={id}>
            <UpgradeIcon id={id} />
          </span>
        ) : null,
      )}
    </div>
  );
}

function ShopScreen({
  adminChats,
  adminLayouts,
  adminMoodIcons,
  adminSeatSpotLayouts,
  customers,
  forceSpawnCustomers,
  game,
  seatCustomerSlots,
  recipes,
  tableCount,
  arrivalState,
  selectedSlot,
  activeService,
  servedSlots,
  servedOrdersBySlot,
  departingSlots,
  patiencePercents,
  patienceRemainingBySlot,
  clockProgress,
  catImageSrc,
  onServe,
  onVisit,
  onForceSpawn,
  onStories,
  customerLogCount,
  showForceSpawn,
  tutorialCoachSrc,
  tutorialPatienceExpired,
  tutorialStep,
  onTutorialNext,
}: ShopScreenProps) {
  const tutorialPatienceActive = tutorialStep === 'patience';
  const tutorialServeActive = tutorialStep === 'serve';
  const tutorialVisitActive = tutorialStep === 'visit';
  const tutorialClockActive = tutorialStep === 'clock';
  const tutorialOpenActive = tutorialStep === 'open';
  const tutorialFirstDayStoryIntroActive = tutorialStep === 'firstDayStoryIntro';
  const tutorialShopActive =
    tutorialPatienceActive ||
    tutorialServeActive ||
    tutorialVisitActive ||
    tutorialClockActive ||
    tutorialOpenActive ||
    tutorialFirstDayStoryIntroActive;
  const emptyTableSeatSpots = getEmptyTableSeatSpots(adminSeatSpotLayouts);
  const tutorialMessage = tutorialPatienceActive
    ? TUTORIAL_PATIENCE_MESSAGE
    : tutorialServeActive
      ? TUTORIAL_SERVE_MESSAGE
      : tutorialVisitActive
        ? TUTORIAL_VISIT_MESSAGE
        : tutorialClockActive
          ? TUTORIAL_CLOCK_MESSAGE
          : tutorialOpenActive
            ? resolveGameTextVariables(TUTORIAL_OPEN_MESSAGE, game)
            : tutorialFirstDayStoryIntroActive
              ? FIRST_DAY_STORY_INTRO_MESSAGE
              : '';
  const tutorialActionLabel = tutorialPatienceActive
    ? 'Next'
    : tutorialClockActive
      ? 'Next'
      : tutorialOpenActive
        ? 'Open Shop'
        : '';

  function livePositionStyle(position: AdminPosition, scale = 1): CSSProperties {
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
      transform: `translate(-50%, -50%)${scale === 1 ? '' : ` scale(${scale})`}`,
    };
  }

  function liveGroundStyle(position: AdminPosition, scale = 1): CSSProperties {
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
      transform: `translate(-50%, -100%)${scale === 1 ? '' : ` scale(${scale})`}`,
    };
  }

  function getMoodIconSrcForCustomer(customer: Customer, kind: AdminChatKind): string {
    const subjectId = getCustomerAdminSubjectId(customer);
    if (!subjectId) return '';
    const relationshipScore = getCustomerRelationshipScore(game, customer);
    const groups = adminChats[subjectId] ?? getDefaultAdminChatsForSubject(subjectId);
    const matchingEntry = [...groups]
      .filter((group) => relationshipScore >= group.threshold)
      .sort((a, b) => b.threshold - a.threshold)
      .flatMap((group) => group.entries)
      .find((entry) => entry.kind === kind && entry.moodIconIds.length > 0);
    const iconId = matchingEntry?.moodIconIds[0] ?? '';
    return adminMoodIcons.find((icon) => icon.id === iconId)?.src ?? '';
  }

  function getMoodIconSrcById(iconId: string): string {
    return adminMoodIcons.find((icon) => icon.id === iconId)?.src ?? '';
  }

  function getStoryCueForCustomer(customer: Customer, customerSlot: number | null) {
    if (
      !tutorialFirstDayStoryIntroActive ||
      !isFirstDayStoryTutorialFinalCustomerSlot(customerSlot)
    ) {
      return null;
    }

    const visitNumber = getCustomerVisitCount(game, customer.id) + 1;
    const story = getStoryForVisit(customer, visitNumber, adminChats);

    const moodIconSrc = getMoodIconSrcById(story.moodIconIds?.[0] ?? '');
    if (!story.imageSrc && !moodIconSrc) return null;

    return {
      imageSrc: story.imageSrc ?? '',
      moodIconSrc,
    };
  }

  return (
    <main className="shop-screen">
      <section className="shop-stage" aria-label="Cat cafe floor">
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
        <ShopUpgradeDecor upgrades={game.upgrades} />

        {TABLE_SLOTS.map((slot) => {
          if (slot >= tableCount) return null;

          const visualSlot = getVisualStoreSlot(slot, tableCount);
          const customer = customers[slot];
          const isOccupied = Boolean(customer);
          const isDeparting = departingSlots.includes(slot);
          const isActive = isOccupied && slot === selectedSlot && arrivalState === 'ready';
          const customerSlot = seatCustomerSlots[slot] ?? null;
          const services =
            customerSlot == null || !customer
              ? [activeService]
              : getServicesForCustomer(customerSlot, recipes, customer);
          const seatServed = customer
            ? isTableFullyServed(customer, servedOrdersBySlot, slot)
            : servedSlots.includes(slot);
          const visibleServedService = getVisibleServedService(
            services,
            getServedOrderIndexes(servedOrdersBySlot, slot),
          );
          const seatPatiencePercent = patiencePercents[slot] ?? 100;
          const seatPatienceMs = getSeatPatience(patienceRemainingBySlot, seatCustomerSlots, slot);
          const seatPatienceLabel = formatCooldown(seatPatienceMs);
          const adminLayout = customer ? getCustomerAdminLayout(customer, adminLayouts) : null;
          const adminSubjectId = customer ? getCustomerAdminSubjectId(customer) : null;
          const seatSpot = adminSubjectId
            ? getCharacterAdminSeatSpot(adminSeatSpotLayouts, adminSubjectId, visualSlot)
            : getAdminSeatSpot(DEFAULT_ADMIN_SEAT_SPOTS, visualSlot);
          const storeImageSrc =
            customer && adminLayout
              ? getStoryCueForCustomer(customer, customerSlot)?.imageSrc ||
                getCustomerStoreImageSrc(customer, adminLayout)
              : '';

          if (isOccupied && customer && adminLayout) {
            const characterScale = (adminLayout.characterScale / 100) * (seatSpot.scale / 100);
            const orderPosition = seatSpot.order;
            const drinkPosition = seatSpot.drink;
            const moodIconPosition = seatSpot.moodIcon;
            const storyCue = getStoryCueForCustomer(customer, customerSlot);
            const moodIconSrc =
              storyCue?.moodIconSrc || getMoodIconSrcForCustomer(customer, 'order');

            return (
              <div
                className={`live-store-layout live-store-layout-${visualSlot + 1} ${
                  isActive ? 'active' : ''
                } ${isDeparting ? 'departing' : ''}`}
                key={slot}
              >
                <button
                  className={`live-store-character ${
                    tutorialVisitActive && customer.id === 'matthew' ? 'tutorial-focus' : ''
                  }`}
                  disabled={
                    tutorialPatienceActive ||
                    tutorialServeActive ||
                    tutorialClockActive ||
                    tutorialOpenActive
                  }
                  onClick={() => onVisit(slot)}
                  type="button"
                  aria-label={`Sit with ${customer.name}`}
                  style={liveGroundStyle(seatSpot.marker, characterScale)}
                >
                  {storeImageSrc ? (
                    <img alt="" draggable={false} src={resolveAssetSrc(storeImageSrc)} />
                  ) : (
                    <AnimalAvatar customer={customer} size="table" />
                  )}
                </button>
                <div
                  className="service-request-stack live-store-orders"
                  style={livePositionStyle(orderPosition)}
                >
                  {services.map((tableService, orderIndex) => {
                    const orderServed = isOrderServed(servedOrdersBySlot, slot, orderIndex);
                    const member = customer.members[orderIndex];
                    const labelName = member?.name ?? customer.name;
                    const serveLabel = `Serve ${tableService.label} to ${labelName}, ${seatPatienceLabel} left`;
                    const tutorialServeTarget = tutorialServeActive && customer.id === 'matthew';
                    const serveDisabled =
                      arrivalState !== 'ready' ||
                      orderServed ||
                      tutorialPatienceActive ||
                      tutorialClockActive ||
                      tutorialOpenActive ||
                      (tutorialServeActive && customer.id !== 'matthew') ||
                      (tutorialVisitActive && customer.id === 'matthew');

                    return (
                      <div
                        className={`service-request-wrap ${
                          !seatServed && !orderServed ? 'with-patience' : ''
                        } ${tutorialServeTarget ? 'tutorial-focus' : ''}`}
                        key={`${customer.id}-${orderIndex}`}
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest('button')) return;
                          if (!serveDisabled) onServe(slot, orderIndex);
                        }}
                      >
                        {!seatServed && !orderServed ? (
                          <span
                            className={`patience-strip store-order-patience ${
                              tutorialPatienceActive && customer.id === 'matthew'
                                ? 'tutorial-focus'
                                : ''
                            }`}
                            aria-hidden="true"
                          >
                            {tutorialPatienceActive && customer.id === 'matthew' ? (
                              <b className="tutorial-meter-arrow">Patience Meter</b>
                            ) : null}
                            <span
                              className="patience-strip-fill"
                              style={{ width: `${clamp(seatPatiencePercent, 0, 100)}%` }}
                            />
                            <b className="patience-countdown">{seatPatienceLabel}</b>
                          </span>
                        ) : null}
                        <button
                          className="service-request"
                          disabled={serveDisabled}
                          onClick={() => onServe(slot, orderIndex)}
                          type="button"
                          aria-label={serveLabel}
                          title={serveLabel}
                        >
                          {orderServed ? <CheckIcon /> : <ServiceIcon kind={tableService.id} />}
                          <span className="service-request-label">
                            {orderServed ? 'Served' : tableService.name}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
                {seatServed ? (
                  <span
                    className="live-store-drink"
                    style={livePositionStyle(drinkPosition, seatSpot.drinkScale / 100)}
                  >
                    <ServiceIcon kind={visibleServedService.id} />
                  </span>
                ) : null}
                {moodIconSrc ? (
                  <span
                    className="live-store-mood-icon"
                    style={livePositionStyle(moodIconPosition)}
                  >
                    <MoodIconBubble src={moodIconSrc} />
                  </span>
                ) : null}
              </div>
            );
          }

          if (!isOccupied) {
            const emptySeatSpot = getAdminSeatSpot(emptyTableSeatSpots, visualSlot, 300);
            return (
              <span
                className={`empty-table-slot empty-table-slot-${visualSlot + 1}`}
                key={slot}
                style={liveGroundStyle(emptySeatSpot.emptyTable, emptySeatSpot.scale / 100)}
              >
                <img
                  alt=""
                  className="empty-table-image"
                  draggable={false}
                  src={resolveAssetSrc(EMPTY_TABLE_IMAGE_SRC)}
                />
              </span>
            );
          }

          return (
            <div
              className={`customer-seat customer-seat-${visualSlot + 1} ${isActive ? 'active' : ''} ${
                isOccupied ? 'occupied' : 'empty'
              } ${isDeparting ? 'departing' : ''}`}
              key={slot}
            >
              {customer ? (
                <>
                  <button
                    className={`customer-visit-button ${
                      tutorialVisitActive && customer.id === 'matthew' ? 'tutorial-focus' : ''
                    }`}
                    disabled={
                      tutorialPatienceActive ||
                      tutorialServeActive ||
                      tutorialClockActive ||
                      tutorialOpenActive
                    }
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
                      const serveLabel = `Serve ${tableService.label} to ${labelName}, ${seatPatienceLabel} left`;
                      const tutorialServeTarget = tutorialServeActive && customer.id === 'matthew';
                      const serveDisabled =
                        arrivalState !== 'ready' ||
                        orderServed ||
                        tutorialPatienceActive ||
                        tutorialClockActive ||
                        tutorialOpenActive ||
                        (tutorialServeActive && customer.id !== 'matthew') ||
                        (tutorialVisitActive && customer.id === 'matthew');

                      return (
                        <div
                          className={`service-request-wrap ${
                            !seatServed && !orderServed ? 'with-patience' : ''
                          } ${tutorialServeTarget ? 'tutorial-focus' : ''}`}
                          key={`${customer.id}-${orderIndex}`}
                          onClick={(event) => {
                            if ((event.target as HTMLElement).closest('button')) return;
                            if (!serveDisabled) onServe(slot, orderIndex);
                          }}
                        >
                          {!seatServed && !orderServed ? (
                            <span
                              className={`patience-strip store-order-patience ${
                                tutorialPatienceActive && customer.id === 'matthew'
                                  ? 'tutorial-focus'
                                  : ''
                              }`}
                              aria-hidden="true"
                            >
                              {tutorialPatienceActive && customer.id === 'matthew' ? (
                                <b className="tutorial-meter-arrow">Patience Meter</b>
                              ) : null}
                              <span
                                className="patience-strip-fill"
                                style={{ width: `${clamp(seatPatiencePercent, 0, 100)}%` }}
                              />
                              <b className="patience-countdown">{seatPatienceLabel}</b>
                            </span>
                          ) : null}
                          <button
                            className="service-request"
                            disabled={serveDisabled}
                            onClick={() => onServe(slot, orderIndex)}
                            type="button"
                            aria-label={serveLabel}
                            title={serveLabel}
                          >
                            {orderServed ? <CheckIcon /> : <ServiceIcon kind={tableService.id} />}
                            <span className="service-request-label">
                              {orderServed ? 'Served' : tableService.name}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}

        <div className="cat-floor">
          <CatSprite imageSrc={catImageSrc} />
        </div>

        {arrivalState === 'waiting' ? (
          <div className="arrival-card" aria-live="polite">
            <BellIcon />
            <strong>Quiet cafe</strong>
            <span>A new customer will come in soon.</span>
          </div>
        ) : null}

        {tutorialShopActive ? (
          <TutorialCoachCard
            key={tutorialMessage}
            imageSrc={tutorialCoachSrc}
            message={tutorialMessage}
            warning={tutorialPatienceExpired ? TUTORIAL_PATIENCE_EXPIRED_MESSAGE : ''}
            actionLabel={tutorialActionLabel}
            onAction={tutorialActionLabel ? onTutorialNext : undefined}
          />
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
      {showForceSpawn ? (
        <aside className="force-spawn-panel" aria-label="Force spawn guests">
          <span>Force Spawn</span>
          <div>
            {forceSpawnCustomers.map((customer) => {
              const enabled = isCustomerEnabled(customer);
              return (
                <button
                  className={enabled ? '' : 'disabled'}
                  disabled={!enabled}
                  key={customer.id}
                  type="button"
                  onClick={() => onForceSpawn(customer.id)}
                  title={enabled ? `${customer.name} enabled` : `${customer.name} disabled`}
                >
                  <span>{customer.name}</span>
                  <small>{enabled ? 'On' : 'Off'}</small>
                </button>
              );
            })}
          </div>
        </aside>
      ) : null}
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
  patienceRemaining: number;
  mood: number;
  purrBeat: number;
  purrCooldownRemaining: number;
  meowCooldownRemaining: number;
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
  storyImageSrc: string;
  storyChoices: readonly [KittyChatOption, KittyChatOption] | null;
  storyChoiceReady: boolean;
  storyChoiceAnswer: 0 | 1 | 2;
  storyChoiceReply: string;
  kittyChatReady: boolean;
  forceDialogueReady: boolean;
  kittyQuestion: string;
  kittyImageSrc: string;
  kittyOptions: readonly [KittyChatOption, KittyChatOption] | null;
  kittyAnswer: 0 | 1 | 2;
  kittyReply: string;
  orderLine: string;
  layout: AdminLayout;
  chatMenuSettings: AdminChatMenuSettings;
  catImageSrc: string;
  afterHoursComment: string;
  tutorialStep: TutorialStep;
  tutorialCoachSrc: string;
  tutorialLine: string;
  tutorialLineCount: number;
  tutorialLineIndex: number;
  tutorialThanksLine: string;
  onServe: (slot?: TableSlot, orderIndex?: number) => void;
  onMeow: () => void;
  onPurr: () => void;
  onQuiet: () => void;
  onRollOver: () => void;
  onBeCute: () => void;
  onKittyAnswer: (answer: 1 | 2) => void;
  onTutorialMeow: () => void;
  onBack: () => void;
  shopDayEnded: boolean;
}

function VisitScreen({
  customer,
  services,
  servedOrderIndexes,
  serviceServed,
  patiencePercent,
  patienceRemaining,
  mood,
  purrBeat,
  purrCooldownRemaining,
  meowCooldownRemaining,
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
  storyImageSrc,
  storyChoices,
  storyChoiceReady,
  storyChoiceAnswer,
  storyChoiceReply,
  kittyChatReady,
  forceDialogueReady,
  kittyQuestion,
  kittyImageSrc,
  kittyOptions,
  kittyAnswer,
  kittyReply,
  orderLine,
  layout,
  chatMenuSettings,
  catImageSrc,
  afterHoursComment,
  tutorialStep,
  tutorialCoachSrc,
  tutorialLine,
  tutorialLineCount,
  tutorialLineIndex,
  tutorialThanksLine,
  onServe,
  onMeow,
  onPurr,
  onQuiet,
  onRollOver,
  onBeCute,
  onKittyAnswer,
  onTutorialMeow,
  onBack,
  shopDayEnded,
}: VisitScreenProps) {
  const tutorialMeowActive = tutorialStep === 'meow';
  const tutorialMoodActive = tutorialStep === 'mood';
  const tutorialBaseLeaveActive = tutorialStep === 'leave';
  const tutorialFirstDayStoryOrderActive = tutorialStep === 'firstDayStoryOrder';
  const tutorialFirstDayStoryLeaveActive = tutorialStep === 'firstDayStoryLeave';
  const tutorialLeaveActive = tutorialBaseLeaveActive || tutorialFirstDayStoryLeaveActive;
  const tutorialActive = tutorialMeowActive || tutorialMoodActive || tutorialLeaveActive;
  const purrReady = purrCooldownRemaining <= 0;
  const meowReady = tutorialMeowActive || meowCooldownRemaining <= 0;
  const quietReady = quietCooldownRemaining <= 0;
  const rollReady = fullMoodCareUnlocked && rollCooldownRemaining <= 0;
  const cuteReady = fullMoodCareUnlocked && cuteCooldownRemaining <= 0;
  const storyBubbleText = storyLine;
  const patienceLabel = formatCooldown(patienceRemaining);
  const kittyBubbleSource = kittyAnswer > 0 ? kittyReply : kittyQuestion;
  const kittyBubbleText = kittyBubbleSource;
  const orderBubbleText = orderLine;
  const storyProgressLabel = `${storyProgress}/${storyLineCount}`;
  const storyChoiceAnswered = storyChoiceAnswer > 0;
  const showAfterHoursBubble =
    shopDayEnded &&
    afterHoursComment.trim().length > 0 &&
    !tutorialFirstDayStoryOrderActive &&
    !storyReady &&
    !storyChoiceReady &&
    !tutorialActive;
  const normalStoryReady = !tutorialActive && storyReady;
  const normalStoryChoiceReady = !tutorialActive && storyChoiceReady;
  const normalKittyChatReady =
    !tutorialActive && (serviceServed || forceDialogueReady) && kittyChatReady;
  const storyCompleteLeaveOnly = normalStoryReady && storyComplete;
  const leaveOnlyMode = tutorialLeaveActive || storyCompleteLeaveOnly;
  const storyReplyPending = normalStoryChoiceReady && Boolean(storyChoices) && !storyChoiceAnswered;
  const kittyReplyPending = normalKittyChatReady && kittyOptions != null && kittyAnswer <= 0;
  const replyPromptActive = storyReplyPending || kittyReplyPending;
  const catMenuLockedForReply = replyPromptActive && !tutorialActive;
  const catActionsUnlocked = serviceServed || tutorialActive || storyCompleteLeaveOnly;
  const canMeow =
    catActionsUnlocked &&
    meowReady &&
    (tutorialMeowActive || tutorialMoodActive || (!tutorialActive && !catMenuLockedForReply));
  const showKittyReplyPanel = kittyReplyPending;
  const hasDialoguePanel = tutorialActive || normalStoryChoiceReady || showKittyReplyPanel;
  const nextUnservedOrderIndex = services.findIndex(
    (_, orderIndex) => !servedOrderIndexes.includes(orderIndex),
  );
  const nextUnservedService = nextUnservedOrderIndex >= 0 ? services[nextUnservedOrderIndex] : null;
  const canServeNext = nextUnservedOrderIndex >= 0 && Boolean(nextUnservedService);
  const visitLayout = normalizeAdminLayout(layout);
  const safeChatMenuSettings = normalizeAdminChatMenuSettings(chatMenuSettings);
  const visitSubjectId = getCustomerAdminSubjectId(customer);
  const primaryCharacterId = getCustomerPrimaryCharacterId(customer);
  const dialogueImageSrc = normalStoryReady
    ? storyImageSrc
    : normalKittyChatReady
      ? kittyImageSrc
      : '';
  const talkingImageSrc =
    dialogueImageSrc ||
    visitLayout.talking.imageSrc ||
    visitLayout.talking.defaultImageSrc ||
    getVisibleDefaultTalkingImageSrc(
      visitSubjectId ?? undefined,
      visitLayout.talking.hiddenImageSrcs,
    ) ||
    getVisibleDefaultTalkingImageSrc(
      primaryCharacterId ?? undefined,
      visitLayout.talking.hiddenImageSrcs,
    );
  const useTalkingImage = Boolean(talkingImageSrc);
  const servedDrinkKind = getVisibleServedService(services, servedOrderIndexes).id;
  const tutorialCoachMessage = tutorialMeowActive
    ? tutorialLineIndex > 0
      ? TUTORIAL_CHAT_PROGRESS_MESSAGE
      : 'Answer him with Meow. The other actions will unlock after this.'
    : tutorialMoodActive
      ? TUTORIAL_MOOD_MESSAGE
      : tutorialLeaveActive
        ? tutorialFirstDayStoryLeaveActive
          ? FIRST_DAY_STORY_COLLECTED_MESSAGE
          : TUTORIAL_LEAVE_MESSAGE
        : '';
  const showInteractionHint = storyCompleteLeaveOnly || (!tutorialActive && !hasDialoguePanel);
  const interactionHint = storyCompleteLeaveOnly
    ? `Select another action to continue with ${customer.name}`
    : catActionsUnlocked
      ? `Select an action to interact with ${customer.name}`
      : `Serve ${customer.name}'s order to unlock cat actions`;

  function chatMenuButtonStyle(
    actionId: CatActionId,
    imageSrc = chatMenuImage(actionId),
  ): CSSProperties {
    const item = safeChatMenuSettings.items[actionId];
    return {
      backgroundImage: cssAssetUrl(imageSrc),
      backgroundPosition: `${item.imagePosition.x}% ${item.imagePosition.y}%`,
      backgroundSize: `${item.imageScale}% ${item.imageScale}%`,
      left: `${item.position.x}%`,
      top: `${item.position.y}%`,
      right: 'auto',
      bottom: 'auto',
      transform: `translate(-50%, -50%) scale(${item.hexScale / 100})`,
      zIndex: item.layer,
    };
  }

  function chatMenuCalloutStyle(actionId: CatActionId): CSSProperties {
    const item = safeChatMenuSettings.items[actionId];
    return {
      left: `${item.position.x}%`,
      top: `${item.position.y}%`,
      zIndex: item.layer + 1,
      '--tutorial-callout-offset': `${Math.round(44 * (item.hexScale / 100))}px`,
    } as CSSProperties;
  }

  function visitChatMenuBackgroundStyle(): CSSProperties {
    return {
      backgroundImage: cssAssetUrl(safeChatMenuSettings.backgroundImageSrc),
      width: `${44 * (safeChatMenuSettings.backgroundScale / 100)}%`,
      zIndex: safeChatMenuSettings.backgroundLayer,
    };
  }

  function visitChatMenuWheelStyle(): CSSProperties {
    return {
      '--chat-menu-scale': safeChatMenuSettings.scale / 100,
      left: `${safeChatMenuSettings.position.x}%`,
      top: `${safeChatMenuSettings.position.y}%`,
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%) scale(var(--chat-menu-scale, 1))',
    } as CSSProperties;
  }

  function chatMenuImage(actionId: CatActionId, served = false): string {
    const item = safeChatMenuSettings.items[actionId];
    return served && actionId === 'serve' ? item.servedImageSrc || item.imageSrc : item.imageSrc;
  }

  function chatMenuTextClass(actionId: CatActionId): string {
    return safeChatMenuSettings.items[actionId].textEnabled ? '' : 'visit-hex-hide-text';
  }

  function visitScaleTransform(scale = 1): string {
    return ` scale(${scale}) scale(var(--visit-mobile-scale, 1))`;
  }

  function visitPositionStyle(item: AdminLayoutDragItem, scale = 1): CSSProperties {
    const position = visitLayout[item] ?? DEFAULT_ADMIN_LAYOUT[item];
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
      transform: `translate(-50%, -50%)${visitScaleTransform(scale)}`,
    };
  }

  function talkingPositionStyle(
    item: 'character' | 'cat' | 'bubble' | 'drink' | 'patience',
    scale = 1,
  ): CSSProperties {
    const position = visitLayout.talking[item] ?? DEFAULT_ADMIN_LAYOUT.talking[item];
    return {
      bottom: 'auto',
      left: `${position.x}%`,
      right: 'auto',
      top: `${position.y}%`,
      transform: `translate(-50%, -50%)${visitScaleTransform(scale)}`,
    };
  }

  function talkingBubbleStyle(): CSSProperties {
    const faceBlocker = normalizeAdminFaceBlocker(
      visitLayout.talking.faceBlocker,
      DEFAULT_ADMIN_LAYOUT.talking.faceBlocker,
    );
    const menuScale = safeChatMenuSettings.scale / 100;
    const menuLeftEdge = safeChatMenuSettings.position.x - 21 * menuScale;
    const safeRight = clamp(menuLeftEdge - 3, 48, 86);
    const compactVisit =
      typeof window !== 'undefined' &&
      window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
    const estimatedBubbleWidth = compactVisit ? 24 : 20;
    const centerX = clamp(faceBlocker.x + faceBlocker.width / 2, 18, safeRight - 8);
    const middleY = clamp(faceBlocker.y + faceBlocker.height / 2, 18, 42);
    const rightX = faceBlocker.x + faceBlocker.width + 2;
    const leftX = faceBlocker.x - 2;

    if (rightX + estimatedBubbleWidth <= safeRight) {
      return {
        bottom: 'auto',
        left: `${clamp(rightX, 16, safeRight - estimatedBubbleWidth)}%`,
        right: 'auto',
        top: `${middleY}%`,
        transform: 'translate(0, -50%)',
      };
    }

    if (leftX - estimatedBubbleWidth >= 12) {
      return {
        bottom: 'auto',
        left: `${clamp(leftX, estimatedBubbleWidth + 12, 70)}%`,
        right: 'auto',
        top: `${middleY}%`,
        transform: 'translate(-100%, -50%)',
      };
    }

    const aboveTop = faceBlocker.y - 4;

    if (aboveTop >= 20) {
      return {
        bottom: 'auto',
        left: `${centerX}%`,
        right: 'auto',
        top: `${aboveTop}%`,
        transform: 'translate(-50%, -100%)',
      };
    }

    return {
      bottom: 'auto',
      left: `${clamp(safeRight - estimatedBubbleWidth, 28, 62)}%`,
      right: 'auto',
      top: `${clamp(faceBlocker.y + faceBlocker.height + 5, 28, 46)}%`,
      transform: 'translate(0, -50%)',
    };
  }

  const bubbleStyle = useTalkingImage
    ? talkingBubbleStyle()
    : visitPositionStyle('bubble');
  const catStyle = useTalkingImage
    ? talkingPositionStyle('cat', visitLayout.talking.catScale / 100)
    : visitPositionStyle('cat', visitLayout.catScale / 100);
  const patienceStyle = useTalkingImage
    ? talkingPositionStyle('patience')
    : visitPositionStyle('patience');
  const serveMenuImage = chatMenuImage('serve', !canServeNext);
  const meowCooldownLabel = actionCooldownLabel(meowCooldownRemaining, meowReady);
  const purrCooldownLabel = actionCooldownLabel(purrCooldownRemaining, purrReady);
  const listenCooldownLabel = actionCooldownLabel(quietCooldownRemaining, quietReady);
  const cuteCooldownLabel = fullMoodCareUnlocked
    ? actionCooldownLabel(cuteCooldownRemaining, cuteReady)
    : 'Locked';
  const rollCooldownLabel = fullMoodCareUnlocked
    ? actionCooldownLabel(rollCooldownRemaining, rollReady)
    : 'Locked';

  function actionCooldownLabel(remainingMs: number, ready: boolean): string {
    if (!catActionsUnlocked) return 'Serve first';
    return ready ? 'Ready' : formatCooldown(remainingMs);
  }

  function meowAction() {
    if (!canMeow) return;
    if (tutorialMeowActive) {
      onTutorialMeow();
      return;
    }
    onMeow();
  }

  function serveNextOrder() {
    if (!canServeNext) return;
    onServe(undefined, nextUnservedOrderIndex);
  }

  return (
    <main className="visit-screen">
      <section className="visit-stage" aria-label={`Sitting with ${customer.name}`}>
        <div className="visit-backdrop" />
        {tutorialMeowActive || tutorialBaseLeaveActive ? (
          <div
            className="customer-story-bubble visit-floating-bubble tutorial-dialogue-bubble"
            style={bubbleStyle}
            aria-live="polite"
          >
            {tutorialMeowActive ? (
              <span className="story-bubble-count story-bubble-floating-count">
                {tutorialLineIndex + 1}/{tutorialLineCount}
              </span>
            ) : null}
            <div className="story-bubble-head">
              <strong>{customer.name}</strong>
            </div>
            <span className="story-bubble-line">
              {tutorialBaseLeaveActive ? tutorialThanksLine : tutorialLine}
            </span>
          </div>
        ) : showAfterHoursBubble ? (
          <div
            className="customer-story-bubble visit-floating-bubble"
            style={bubbleStyle}
            aria-live="polite"
          >
            <div className="story-bubble-head">
              <strong>{customer.name}</strong>
            </div>
            <span className="story-bubble-line">{afterHoursComment}</span>
          </div>
        ) : !serviceServed ? (
          <div
            className="customer-story-bubble visit-floating-bubble order-request-bubble"
            style={bubbleStyle}
            aria-live="polite"
          >
            <div className="story-bubble-head">
              <strong>{customer.name}</strong>
            </div>
            <span className="story-bubble-line">{orderBubbleText}</span>
          </div>
        ) : normalKittyChatReady ? (
          <div
            className="customer-story-bubble visit-floating-bubble kitty-chat-bubble"
            style={bubbleStyle}
            aria-live="polite"
          >
            <div className="story-bubble-head">
              <strong>{customer.name}</strong>
            </div>
            <span className="story-bubble-line">{kittyBubbleText}</span>
          </div>
        ) : normalStoryReady && storyProgress > 0 ? (
          <div
            className="customer-story-bubble visit-floating-bubble"
            style={bubbleStyle}
            aria-live="polite"
          >
            <span className="story-bubble-count story-bubble-floating-count">
              {storyProgressLabel}
            </span>
            <div className="story-bubble-head">
              <strong>{nextStoryTitle}</strong>
            </div>
            <span className="story-bubble-line">{storyBubbleText}</span>
          </div>
        ) : null}
        {useTalkingImage ? (
          <div
            className="customer-close customer-close-image"
            style={talkingPositionStyle('character', visitLayout.talking.characterScale / 100)}
          >
            <img alt="" draggable={false} src={resolveAssetSrc(talkingImageSrc)} />
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
          <CatSprite imageSrc={catImageSrc} />
        </div>
        {serviceServed ? (
          <div
            className="cup-on-table"
            style={
              useTalkingImage
                ? talkingPositionStyle('drink', visitLayout.talking.drinkScale / 100)
                : visitPositionStyle('drink', visitLayout.drinkScale / 100)
            }
          >
            <ServiceIcon kind={servedDrinkKind} />
          </div>
        ) : null}
        {!serviceServed ? (
          <div
            className="patience-strip visit-floating-patience"
            aria-label={`${customer.name} patience, ${patienceLabel} left`}
            title={`${customer.name} patience, ${patienceLabel} left`}
            style={patienceStyle}
          >
            <span
              className="patience-strip-fill"
              style={{ width: `${clamp(patiencePercent, 0, 100)}%` }}
            />
            <b className="patience-countdown">{patienceLabel}</b>
          </div>
        ) : null}
        <aside
          className={`visit-mood-bar ${tutorialMoodActive ? 'tutorial-focus' : ''}`}
          aria-label={`${customer.name} mood`}
        >
          <HeartIcon />
          <span>{customer.name}'s Mood</span>
          <Meter value={mood} label={`${customer.name} mood`} />
          <strong>{mood}%</strong>
        </aside>

        <div
          className={`visit-action-wheel ${tutorialLeaveActive ? 'tutorial-leave-mode' : ''} ${
            catMenuLockedForReply ? 'visit-action-wheel-locked' : ''
          }`}
          aria-label="Cat actions"
          style={visitChatMenuWheelStyle()}
        >
          {safeChatMenuSettings.backgroundImageSrc ? (
            <span className="visit-action-menu-bg" style={visitChatMenuBackgroundStyle()} />
          ) : null}
          {tutorialMeowActive ? (
            <span className="tutorial-action-arrow" style={chatMenuCalloutStyle('meow')}>
              Click Meow Here
            </span>
          ) : null}
          {tutorialLeaveActive ? (
            <span className="tutorial-leave-arrow" style={chatMenuCalloutStyle('leave')}>
              Click Leave Here
            </span>
          ) : null}
          <button
            className={`visit-hex-button visit-hex-meow ${
              chatMenuImage('meow') ? 'visit-hex-custom-bg' : ''
            } ${chatMenuTextClass('meow')}`}
            disabled={!canMeow}
            onClick={meowAction}
            style={chatMenuButtonStyle('meow')}
            type="button"
          >
            {chatMenuImage('meow') ? null : <CatHeadIcon />}
            <strong>Meow</strong>
            <small>{meowCooldownLabel}</small>
          </button>
          <button
            className={`visit-hex-button visit-hex-purr ${
              chatMenuImage('purr') ? 'visit-hex-custom-bg' : ''
            } ${chatMenuTextClass('purr')}`}
            disabled={
              catMenuLockedForReply ||
              !catActionsUnlocked ||
              (tutorialActive && !tutorialMoodActive) ||
              !purrReady
            }
            onClick={onPurr}
            style={chatMenuButtonStyle('purr')}
            type="button"
          >
            {chatMenuImage('purr') ? null : <PawIcon />}
            <strong>Purr</strong>
            <small>{purrCooldownLabel}</small>
          </button>
          <button
            className={`visit-hex-button visit-hex-listen ${
              chatMenuImage('listen') ? 'visit-hex-custom-bg' : ''
            } ${chatMenuTextClass('listen')}`}
            disabled={
              catMenuLockedForReply ||
              !catActionsUnlocked ||
              (tutorialActive && !tutorialMoodActive) ||
              !quietReady
            }
            onClick={onQuiet}
            style={chatMenuButtonStyle('listen')}
            type="button"
          >
            {chatMenuImage('listen') ? null : <CupIcon />}
            <strong>Listen</strong>
            <small>{listenCooldownLabel}</small>
          </button>
          <button
            className={`visit-hex-button visit-hex-leave ${
              chatMenuImage('leave') ? 'visit-hex-custom-bg' : ''
            } ${tutorialLeaveActive ? 'tutorial-leave-target tutorial-focus' : ''} ${chatMenuTextClass(
              'leave',
            )}`}
            onClick={onBack}
            type="button"
            disabled={
              catMenuLockedForReply ||
              !catActionsUnlocked ||
              (tutorialActive && !tutorialLeaveActive)
            }
            style={chatMenuButtonStyle('leave')}
            aria-label={
              shopDayEnded
                ? `Finish ${customer.name}'s visit and end the day`
                : `Leave ${customer.name} and return to shop`
            }
          >
            {chatMenuImage('leave') ? null : <ShopIcon />}
            <strong>Leave</strong>
            <small>{leaveOnlyMode ? 'Ready' : 'Back'}</small>
          </button>
          <button
            className={`visit-hex-button visit-hex-cute ${
              chatMenuImage('cute') ? 'visit-hex-custom-bg' : ''
            } ${chatMenuTextClass('cute')}`}
            disabled={
              catMenuLockedForReply ||
              !catActionsUnlocked ||
              (tutorialActive && !tutorialMoodActive) ||
              !fullMoodCareUnlocked ||
              !cuteReady
            }
            onClick={onBeCute}
            style={chatMenuButtonStyle('cute')}
            type="button"
          >
            {chatMenuImage('cute') ? null : <StarIcon />}
            <strong>Be Cute</strong>
            <small>{cuteCooldownLabel}</small>
          </button>
          <button
            className={`visit-hex-button visit-hex-roll ${
              chatMenuImage('roll') ? 'visit-hex-custom-bg' : ''
            } ${chatMenuTextClass('roll')}`}
            disabled={
              catMenuLockedForReply ||
              !catActionsUnlocked ||
              (tutorialActive && !tutorialMoodActive) ||
              !fullMoodCareUnlocked ||
              !rollReady
            }
            onClick={onRollOver}
            style={chatMenuButtonStyle('roll')}
            type="button"
          >
            {chatMenuImage('roll') ? null : <CatHeadIcon />}
            <strong>Roll</strong>
            <small>{rollCooldownLabel}</small>
          </button>
          <button
            className={`visit-hex-button visit-hex-center ${
              canServeNext ? 'visit-hex-serve' : 'visit-hex-face'
            } ${serveMenuImage ? 'visit-hex-custom-bg' : ''} ${chatMenuTextClass('serve')}`}
            disabled={
              storyCompleteLeaveOnly || catMenuLockedForReply || tutorialActive || !canServeNext
            }
            onClick={serveNextOrder}
            style={chatMenuButtonStyle('serve', serveMenuImage)}
            type="button"
            aria-label={
              nextUnservedService
                ? `Serve ${nextUnservedService.label} to ${customer.name}`
                : `${customer.name} is served`
            }
          >
            {serveMenuImage ? null : nextUnservedService ? (
              <ServiceIcon kind={nextUnservedService.id} />
            ) : (
              <CatHeadIcon />
            )}
            <strong>{nextUnservedService ? 'Serve' : 'Served'}</strong>
            <small>{nextUnservedService?.name ?? 'All set'}</small>
          </button>
        </div>

        {showInteractionHint ? (
          <div className="visit-interaction-hint">{interactionHint}</div>
        ) : null}

        {hasDialoguePanel ? (
          <div
            className={`mood-panel visit-dialogue-panel ${
              tutorialActive ? 'tutorial-panel-open' : ''
            }`}
          >
            {tutorialActive ? (
              <div className="tutorial-visit-panel">
                <TutorialCoachCard
                  key={tutorialCoachMessage}
                  imageSrc={tutorialCoachSrc}
                  message={tutorialCoachMessage}
                />
              </div>
            ) : null}
            {normalStoryChoiceReady && storyChoices ? (
              <div
                className={`story-choice-prompt ${storyChoiceAnswered ? 'story-choice-answered' : ''}`}
              >
                <span>
                  {storyChoiceAnswered
                    ? storyChoiceReply
                    : `${customer.name} is waiting for your answer.`}
                </span>
                <div className="kitty-chat-actions">
                  {storyChoices.map((option) => (
                    <button
                      className={storyChoiceAnswer === option.id ? 'selected' : ''}
                      disabled={storyChoiceAnswered}
                      key={`story-choice-${option.id}`}
                      onClick={() => onKittyAnswer(option.id)}
                      type="button"
                    >
                      {storyChoiceAnswer === option.id ? <CheckIcon /> : null}
                      Meow
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {showKittyReplyPanel ? (
              <div className={`kitty-chat-prompt ${kittyAnswer > 0 ? 'kitty-chat-answered' : ''}`}>
                <CatHeadIcon />
                <span>{kittyAnswer > 0 ? kittyReply : kittyQuestion}</span>
                {kittyOptions ? (
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
                        Meow
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

interface StoryScreenProps {
  customer: Customer;
  game: GameState;
  story: StoryChapter;
  chapterNumber: number;
  chapterTotal: number;
  onCollect: () => void;
}

function StoryScreen({
  customer,
  game,
  story,
  chapterNumber,
  chapterTotal,
  onCollect,
}: StoryScreenProps) {
  const storyImageSrc = story.imageSrc?.trim() ?? '';

  return (
    <main className="story-screen">
      <div className="soft-shop-bg" />
      <section className="story-card" aria-label="New story collected">
        <div className="story-title-row">
          <CatHeadIcon />
          <h2>New Story</h2>
          <LeafIcon />
        </div>
        <div className={`story-portrait ${storyImageSrc ? 'story-portrait-image' : ''}`}>
          {storyImageSrc ? (
            <img alt="" draggable={false} src={resolveAssetSrc(storyImageSrc)} />
          ) : (
            <AnimalAvatar customer={customer} size="portrait" />
          )}
        </div>
        <span className="chapter-marker">
          Chapter {chapterNumber} of {chapterTotal}
        </span>
        <h3>{resolveGameTextVariables(story.title, game)}</h3>
        <p>{resolveGameTextVariables(story.text, game)}</p>
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
  onEndDay: () => void;
}

function SummaryScreen({ game, shopQuality, shopRank, onEndDay }: SummaryScreenProps) {
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
              Cafe Rank
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
        </dl>
        <button className="primary-button" type="button" onClick={onEndDay}>
          <SunIcon />
          Next Day
        </button>
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
  const tableUpgrades = UPGRADES.filter(
    (upgrade) => upgrade.id === SECOND_TABLE_UPGRADE_ID || upgrade.id === THIRD_TABLE_UPGRADE_ID,
  );
  const comfortUpgrades = UPGRADES.filter(
    (upgrade) => upgrade.id !== SECOND_TABLE_UPGRADE_ID && upgrade.id !== THIRD_TABLE_UPGRADE_ID,
  );
  const tabs = [
    { id: 'store', label: 'Store Upgrade' },
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
                  const actionLabel = careActionLabel(upgrade.action);

                  return (
                    <article className={`upgrade-item ${owned ? 'owned' : ''}`} key={upgrade.id}>
                      <div className="upgrade-art training-art">
                        {upgrade.action === 'cute' ? (
                          <StarIcon />
                        ) : upgrade.action === 'quiet' ? (
                          <CupIcon />
                        ) : (
                          <PawIcon />
                        )}
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
                {comfortUpgrades.map((upgrade) => {
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

          {activeTab === 'store' ? (
            <section
              aria-labelledby="ledger-tab-store"
              className="ledger-section"
              id="ledger-store"
              role="tabpanel"
            >
              <div className="section-head">
                <h3>Store Upgrade</h3>
                <span>{getTableCount(game)}/3 tables</span>
              </div>
              <div className="upgrade-grid">
                {tableUpgrades.map((upgrade) => {
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
                        <span className="comfort-bonus">Adds another customer spot</span>
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
  const selectedCustomerNameUnlocked = selectedCustomer
    ? hasMetCustomer(game, selectedCustomer.id)
    : false;

  return (
    <main className="collection-screen">
      <section className="story-ledger" aria-label="Guest log">
        <div className="ledger-head">
          <div>
            <h2>
              {selectedCustomer
                ? selectedCustomerNameUnlocked
                  ? selectedCustomer.name
                  : '???'
                : 'Guest Log'}
            </h2>
          </div>
          {selectedCustomer ? (
            <button
              className="paper-button log-back-button"
              type="button"
              onClick={() => setSelectedLogId(null)}
            >
              <UiImageIcon alt="" src={UI_ICON_SRC.logBook} />
              Guest List
            </button>
          ) : null}
        </div>

        {loggedCustomers.length === 0 ? (
          <div className="empty-stories">
            <CatSprite resting />
            <p>No guests logged yet. The first regular is waiting by the window.</p>
          </div>
        ) : selectedCustomer ? (
          <div className="story-detail-view">
            <StoryEntry
              customer={selectedCustomer}
              game={game}
              nameUnlocked={selectedCustomerNameUnlocked}
            />
          </div>
        ) : (
          <div className="guest-log-grid">
            {loggedCustomers.map((customer) => (
              <GuestLogCard
                customer={customer}
                game={game}
                key={customer.id}
                nameUnlocked={hasMetCustomer(game, customer.id)}
                onSelect={() => setSelectedLogId(customer.id)}
              />
            ))}
          </div>
        )}

        <button className="paper-button ledger-back" type="button" onClick={onBack}>
          <UiImageIcon alt="" src={UI_ICON_SRC.store} />
          Back to Shop
        </button>
      </section>
    </main>
  );
}

interface GuestLogCardProps {
  customer: Customer;
  game: GameState;
  nameUnlocked: boolean;
  onSelect: () => void;
}

function GuestLogCard({ customer, game, nameUnlocked, onSelect }: GuestLogCardProps) {
  const relationshipScore = getCustomerStats(game, customer.id).bond;
  const displayName = nameUnlocked ? customer.name : '???';

  return (
    <button
      className="guest-log-card"
      type="button"
      onClick={onSelect}
      aria-label={`Open ${displayName}'s log`}
    >
      <AnimalAvatar customer={customer} size="small" />
      <span className="guest-log-card-copy">
        <strong>{displayName}</strong>
        <span
          className="relationship-heart-row"
          aria-label={`Relationship ${relationshipScore}/100`}
        >
          <img
            alt=""
            draggable={false}
            src={resolveAssetSrc(getRelationshipHeartSrc(relationshipScore))}
          />
        </span>
      </span>
    </button>
  );
}

interface StoryEntryProps {
  customer: Customer;
  game: GameState;
  nameUnlocked: boolean;
}

function StoryEntry({ customer, game, nameUnlocked }: StoryEntryProps) {
  const chapters = getCollectedStoryChapters(customer, game);
  const chapterTotal = getStoryArcLength(customer);
  const stats = getCustomerStats(game, customer.id);
  const returnChance = getCustomerReturnChance(game, customer);
  const displayName = nameUnlocked ? customer.name : '???';

  return (
    <article className="story-entry">
      <AnimalAvatar customer={customer} size="small" />
      <div>
        <div className="story-entry-head">
          <h3>{displayName}</h3>
          <div className="story-entry-chips">
            <span>
              {chapters.length}/{chapterTotal}
            </span>
          </div>
        </div>
        <div className="customer-log-stats">
          <span className="earned">Earned {stats.earned}</span>
          <span>{getCustomerTipStyleLabel(customer)}</span>
          <span>Visits {stats.visits}</span>
          <span>Served {stats.served}</span>
          <span className="relationship-stat" aria-label={`Relationship ${stats.bond}/100`}>
            <img
              alt=""
              draggable={false}
              src={resolveAssetSrc(getRelationshipHeartSrc(stats.bond))}
            />
            <strong>{stats.bond}/100</strong>
          </span>
          <span className={stats.missed > 0 ? 'missed' : ''}>Missed {stats.missed}</span>
          <span>Return {returnChance}%</span>
        </div>
        {chapters.length > 0 ? (
          <div className="story-chapter-list">
            {chapters.map((chapter, index) => (
              <div className="story-chapter-row" key={`${customer.id}-${chapter.title}`}>
                <span className="chapter-index">{index + 1}</span>
                <div>
                  <strong>{resolveGameTextVariables(chapter.title, game)}</strong>
                  <p>{resolveGameTextVariables(chapter.text, game)}</p>
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

interface LoadingScreenProps {
  adminReady: boolean;
  catImageSrc: string;
  poseLabel: string;
  state: AssetPreloadState;
}

function LoadingScreen({ adminReady, catImageSrc, poseLabel, state }: LoadingScreenProps) {
  const total = Math.max(1, state.total);
  const loaded = clamp(state.loaded, 0, total);
  const percent = adminReady ? Math.round((loaded / total) * 100) : 0;
  const status = adminReady ? `Preloading assets ${loaded}/${total}` : 'Gathering cafe assets';

  return (
    <main className="loading-screen" aria-label="Loading Cat Cafe">
      <section className="loading-card" aria-live="polite">
        <div className="loading-cat-frame">
          <CatSprite imageSrc={catImageSrc} resting={poseLabel === 'Idle'} />
        </div>
        <div className="loading-copy">
          <p className="eyebrow">Cat Cafe</p>
          <h1>Loading</h1>
          <span className="loading-pose">{poseLabel}</span>
          <div
            className={`loading-meter ${adminReady && loaded <= 0 ? 'loading-meter-pending' : ''}`}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <strong>{status}</strong>
        </div>
      </section>
    </main>
  );
}

interface IconButtonProps {
  children: React.ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
}

function IconButton({ children, className = '', label, onClick }: IconButtonProps) {
  return (
    <button
      className={`icon-button ${className}`.trim()}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

interface UiImageIconProps {
  alt: string;
  src: string;
}

function UiImageIcon({ alt, src }: UiImageIconProps) {
  return <img className="ui-image-icon" alt={alt} draggable={false} src={resolveAssetSrc(src)} />;
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
            src={resolveAssetSrc(member.portraitImageSrc || member.imageSrc || '')}
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
  imageSrc?: string;
  resting?: boolean;
}

function CatSprite({ imageSrc = '', resting = false }: CatSpriteProps) {
  if (imageSrc) {
    return (
      <img
        alt="Shop cat"
        className={`cat-sprite cat-sprite-image ${resting ? 'cat-resting' : ''}`}
        draggable={false}
        src={resolveAssetSrc(imageSrc)}
      />
    );
  }

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
      src={resolveAssetSrc(service.imageSrc)}
    />
  );
}

interface MoodIconBubbleProps {
  src?: string;
  className?: string;
}

function MoodIconBubble({ src = DEFAULT_MOOD_ICON_SRC, className = '' }: MoodIconBubbleProps) {
  return (
    <span className={`mood-icon-bubble ${className}`} aria-hidden="true">
      <img alt="" draggable={false} src={resolveAssetSrc(src)} />
    </span>
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
