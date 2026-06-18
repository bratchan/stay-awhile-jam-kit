import { useEffect, useMemo, useState } from 'react';
import { getSafeArea } from './services/environment';

type Scene = 'menu' | 'shop' | 'visit' | 'story' | 'summary' | 'upgrades' | 'collection';
type Species = 'bear' | 'fox' | 'frog' | 'rabbit' | 'moth';
type ArrivalState = 'ready' | 'waiting';
type ServiceKind = 'tea' | 'coffee' | 'cake';

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
  moodBoost: number;
  tipBonus: number;
  happinessGain: number;
}

interface GameState {
  day: number;
  shopHappiness: number;
  teaCups: number;
  stories: string[];
  upgrades: string[];
  customerSlot: number;
  visitsToday: number;
  tipsToday: number;
  storiesToday: number;
  missedToday: number;
  customerVisits: Record<string, number>;
}

const SAVE_KEY = 'tea-shop-cat-save-v1';
const VISITS_PER_DAY = 3;
const ARRIVAL_DELAY_MS = 2400;
const PATIENCE_TICK_MS = 250;
const TABLE_SLOTS = [0, 1, 2] as const;

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
    id: 'tea',
    label: 'tea',
    moodBoost: 14,
    tipBonus: 8,
    happinessGain: 2,
  },
  {
    id: 'coffee',
    label: 'coffee',
    moodBoost: 12,
    tipBonus: 10,
    happinessGain: 1,
  },
  {
    id: 'cake',
    label: 'cake',
    moodBoost: 16,
    tipBonus: 12,
    happinessGain: 2,
  },
] as const satisfies readonly [ServiceItem, ...ServiceItem[]];

const DEFAULT_GAME: GameState = {
  day: 1,
  shopHappiness: 62,
  teaCups: 90,
  stories: [],
  upgrades: [],
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

function getService(slot: number): ServiceItem {
  const index = ((slot % SERVICE_ITEMS.length) + SERVICE_ITEMS.length) % SERVICE_ITEMS.length;
  return SERVICE_ITEMS[index] ?? SERVICE_ITEMS[0];
}

function getTableCount(day: number, slot: number): number {
  const rhythm = (day + slot) % 5;
  if (rhythm === 0) return 3;
  if (rhythm === 2 || rhythm === 4) return 2;
  return 1;
}

function getOwnedComfort(upgradeIds: string[]): number {
  return upgradeIds.reduce((total, id) => {
    const upgrade = UPGRADES.find((item) => item.id === id);
    return total + (upgrade?.comfort ?? 0);
  }, 0);
}

function getStoryForVisit(customer: Customer, visitNumber: number): StoryChapter {
  if (visitNumber <= 1) {
    return { title: customer.storyTitle, text: customer.story };
  }
  const index = (visitNumber - 2) % customer.followUps.length;
  const chapter = customer.followUps[index] ?? customer.followUps[0] ?? {
    title: `${customer.name}'s Return`,
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

function loadGame(): GameState {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return DEFAULT_GAME;
    const parsed = JSON.parse(raw) as Partial<GameState>;

    return {
      day: clamp(Math.floor(numericValue(parsed.day, DEFAULT_GAME.day)), 1, 999),
      shopHappiness: clamp(
        Math.floor(numericValue(parsed.shopHappiness, DEFAULT_GAME.shopHappiness)),
        0,
        100,
      ),
      teaCups: clamp(Math.floor(numericValue(parsed.teaCups, DEFAULT_GAME.teaCups)), 0, 9999),
      stories: stringList(parsed.stories),
      upgrades: stringList(parsed.upgrades),
      customerSlot: clamp(
        Math.floor(numericValue(parsed.customerSlot, DEFAULT_GAME.customerSlot)),
        0,
        9999,
      ),
      visitsToday: clamp(
        Math.floor(numericValue(parsed.visitsToday, DEFAULT_GAME.visitsToday)),
        0,
        VISITS_PER_DAY,
      ),
      tipsToday: clamp(Math.floor(numericValue(parsed.tipsToday, DEFAULT_GAME.tipsToday)), 0, 9999),
      storiesToday: clamp(
        Math.floor(numericValue(parsed.storiesToday, DEFAULT_GAME.storiesToday)),
        0,
        VISITS_PER_DAY,
      ),
      missedToday: clamp(
        Math.floor(numericValue(parsed.missedToday, DEFAULT_GAME.missedToday)),
        0,
        9999,
      ),
      customerVisits: numberRecord(parsed.customerVisits),
    };
  } catch {
    return DEFAULT_GAME;
  }
}

function TeaShopCat() {
  const safeArea = getSafeArea();
  const [scene, setScene] = useState<Scene>('menu');
  const [game, setGame] = useState<GameState>(() => loadGame());
  const [mood, setMood] = useState(40);
  const [purrBeat, setPurrBeat] = useState(0);
  const [arrivalState, setArrivalState] = useState<ArrivalState>('ready');
  const [serviceServed, setServiceServed] = useState(false);
  const [patienceRemaining, setPatienceRemaining] = useState(() => getCustomer(0).patienceMs);

  const currentCustomer = getCustomer(game.customerSlot);
  const currentService = getService(game.customerSlot);
  const currentVisitNumber = getCustomerVisitCount(game, currentCustomer.id) + 1;
  const currentStory = getStoryForVisit(currentCustomer, currentVisitNumber);
  const tableCount = arrivalState === 'ready' ? getTableCount(game.day, game.customerSlot) : 0;
  const visibleCustomers = useMemo(
    () => TABLE_SLOTS.slice(0, tableCount).map((offset) => getCustomer(game.customerSlot + offset)),
    [game.customerSlot, tableCount],
  );

  const ownedUpgradeNames = useMemo(() => new Set(game.upgrades), [game.upgrades]);
  const totalComfort = useMemo(() => getOwnedComfort(game.upgrades), [game.upgrades]);
  const dailyProgress = Math.round((game.visitsToday / VISITS_PER_DAY) * 100);
  const storyChapterCount = getStoryChapterCount(game);
  const patiencePercent = Math.ceil((patienceRemaining / currentCustomer.patienceMs) * 100);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } catch {
      // Local saves are a convenience in browser preview; the game still runs without them.
    }
  }, [game]);

  useEffect(() => {
    if (arrivalState !== 'waiting') return undefined;
    const timer = window.setTimeout(() => setArrivalState('ready'), ARRIVAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [arrivalState, game.customerSlot]);

  useEffect(() => {
    setPatienceRemaining(currentCustomer.patienceMs);
  }, [currentCustomer.id, currentCustomer.patienceMs, arrivalState]);

  useEffect(() => {
    if (arrivalState !== 'ready' || serviceServed) return undefined;
    if (scene !== 'shop' && scene !== 'visit') return undefined;

    const interval = window.setInterval(() => {
      setPatienceRemaining((prev) => clamp(prev - PATIENCE_TICK_MS, 0, currentCustomer.patienceMs));
    }, PATIENCE_TICK_MS);

    return () => window.clearInterval(interval);
  }, [arrivalState, currentCustomer.patienceMs, scene, serviceServed]);

  useEffect(() => {
    if (arrivalState !== 'ready' || serviceServed || patienceRemaining > 0) return;
    customerLeaves();
  }, [arrivalState, patienceRemaining, serviceServed]);

  function startingMood(served: boolean): number {
    const comfortMoodBoost = Math.min(totalComfort * 2, 18);
    const serviceBoost = served ? currentService.moodBoost : 0;
    return clamp(currentCustomer.moodStart + comfortMoodBoost + serviceBoost, 0, 96);
  }

  function startDay() {
    setGame((prev) => ({
      ...prev,
      visitsToday: 0,
      tipsToday: 0,
      storiesToday: 0,
      missedToday: 0,
      shopHappiness: clamp(prev.shopHappiness, 35, 100),
    }));
    setMood(40);
    setPurrBeat(0);
    setArrivalState('ready');
    setServiceServed(false);
    setScene('shop');
  }

  function continueDay() {
    setMood(40);
    setPurrBeat(0);
    setArrivalState('ready');
    setServiceServed(false);
    setScene('shop');
  }

  function beginVisit() {
    if (arrivalState !== 'ready') return;
    setMood(startingMood(serviceServed));
    setPurrBeat(0);
    setScene('visit');
  }

  function serveRequest() {
    if (arrivalState !== 'ready' || serviceServed) return;
    setServiceServed(true);
    if (scene === 'visit') {
      const nextMood = clamp(mood + currentService.moodBoost, 0, 100);
      setMood(nextMood);
      if (nextMood >= 100) {
        setScene('story');
      }
    }
  }

  function purr() {
    const catBedBoost = ownedUpgradeNames.has('cat-bed') ? 5 : 0;
    const nextMood = clamp(mood + 18 + catBedBoost, 0, 100);
    setMood(nextMood);
    setPurrBeat((prev) => prev + 1);
    if (nextMood >= 100) {
      setScene('story');
    }
  }

  function sitQuietly() {
    const nextMood = clamp(mood + 10, 0, 100);
    setMood(nextMood);
    if (nextMood >= 100) {
      setScene('story');
    }
  }

  function collectStory() {
    const alreadyCollected = game.stories.includes(currentCustomer.id);
    const finishingDay = game.visitsToday + 1 >= VISITS_PER_DAY;
    const serviceTipBonus = serviceServed ? currentService.tipBonus : 0;
    const serviceHappinessGain = serviceServed ? currentService.happinessGain : 0;
    const comfortTipBonus = totalComfort * 3;

    setGame((prev) => ({
      ...prev,
      stories: alreadyCollected ? prev.stories : [...prev.stories, currentCustomer.id],
      storiesToday: prev.storiesToday + 1,
      visitsToday: clamp(prev.visitsToday + 1, 0, VISITS_PER_DAY),
      tipsToday: prev.tipsToday + currentCustomer.tip + serviceTipBonus + comfortTipBonus,
      teaCups: prev.teaCups + currentCustomer.tip + serviceTipBonus + comfortTipBonus,
      shopHappiness: clamp(
        prev.shopHappiness + currentCustomer.happinessGain + serviceHappinessGain,
        0,
        100,
      ),
      customerSlot: prev.customerSlot + 1,
      customerVisits: {
        ...prev.customerVisits,
        [currentCustomer.id]: getCustomerVisitCount(prev, currentCustomer.id) + 1,
      },
    }));

    setMood(40);
    setPurrBeat(0);
    setServiceServed(false);
    if (finishingDay) {
      setArrivalState('ready');
      setScene('summary');
    } else {
      setArrivalState('waiting');
      setScene('shop');
    }
  }

  function customerLeaves() {
    setGame((prev) => ({
      ...prev,
      customerSlot: prev.customerSlot + 1,
      missedToday: prev.missedToday + 1,
      shopHappiness: clamp(prev.shopHappiness - 3, 0, 100),
    }));
    setMood(40);
    setPurrBeat(0);
    setServiceServed(false);
    setArrivalState('waiting');
    setScene('shop');
  }

  function endDay() {
    setGame((prev) => ({
      ...prev,
      day: prev.day + 1,
      visitsToday: 0,
      tipsToday: 0,
      storiesToday: 0,
      missedToday: 0,
      shopHappiness: clamp(prev.shopHappiness - 3, 0, 100),
    }));
    setArrivalState('ready');
    setServiceServed(false);
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

  function resetSave() {
    setGame(DEFAULT_GAME);
    setMood(40);
    setPurrBeat(0);
    setArrivalState('ready');
    setServiceServed(false);
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
        {scene === 'shop' || scene === 'visit' || scene === 'upgrades' || scene === 'collection' ? (
          <TopBar
            game={game}
            totalComfort={totalComfort}
            dailyProgress={dailyProgress}
            onMenu={() => setScene('menu')}
            onShop={() => setScene('shop')}
            onStories={() => setScene('collection')}
            onUpgrades={() => setScene('upgrades')}
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
            game={game}
            customers={visibleCustomers}
            currentCustomer={currentCustomer}
            tableCount={tableCount}
            arrivalState={arrivalState}
            activeService={currentService}
            serviceServed={serviceServed}
            patiencePercent={patiencePercent}
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
            visitNumber={currentVisitNumber}
            patiencePercent={patiencePercent}
            mood={mood}
            purrBeat={purrBeat}
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
            visitNumber={currentVisitNumber}
            onCollect={collectStory}
          />
        ) : null}

        {scene === 'summary' ? <SummaryScreen game={game} onEndDay={endDay} /> : null}

        {scene === 'upgrades' ? (
          <UpgradesScreen
            game={game}
            totalComfort={totalComfort}
            onBuy={buyUpgrade}
            onBack={() => setScene('shop')}
          />
        ) : null}

        {scene === 'collection' ? (
          <CollectionScreen game={game} onBack={() => setScene('shop')} />
        ) : null}
      </div>
    </div>
  );
}

interface TopBarProps {
  game: GameState;
  totalComfort: number;
  dailyProgress: number;
  onMenu: () => void;
  onShop: () => void;
  onStories: () => void;
  onUpgrades: () => void;
}

function TopBar({ game, totalComfort, dailyProgress, onMenu, onShop, onStories, onUpgrades }: TopBarProps) {
  return (
    <header className="top-bar" aria-label="Tea shop status">
      <div className="day-chip">
        <SunIcon />
        <span>Day {game.day}</span>
      </div>
      <div className="happiness-meter">
        <CatHeadIcon />
        <div>
          <div className="meter-label">
            <span>Shop Happiness</span>
            <strong>{game.shopHappiness}%</strong>
          </div>
          <Meter value={game.shopHappiness} label="Shop happiness" />
        </div>
      </div>
      <div className="day-meter" aria-label="Customers helped today">
        <span>{game.visitsToday}/{VISITS_PER_DAY}</span>
        <Meter value={dailyProgress} label="Daily visits" />
      </div>
      <div className="comfort-chip" aria-label={`Shop comfort ${totalComfort}`}>
        <HeartIcon />
        <strong>{totalComfort}</strong>
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
      </nav>
    </header>
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
  game: GameState;
  customers: Customer[];
  currentCustomer: Customer;
  tableCount: number;
  arrivalState: ArrivalState;
  activeService: ServiceItem;
  serviceServed: boolean;
  patiencePercent: number;
  onServe: () => void;
  onVisit: () => void;
  onStories: () => void;
  storyChapterCount: number;
}

function ShopScreen({
  game,
  customers,
  currentCustomer,
  tableCount,
  arrivalState,
  activeService,
  serviceServed,
  patiencePercent,
  onServe,
  onVisit,
  onStories,
  storyChapterCount,
}: ShopScreenProps) {
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

        {TABLE_SLOTS.map((slot) => {
          const customer = customers[slot];
          const isOccupied = Boolean(customer) && slot < tableCount;
          const isActive = isOccupied && slot === 0 && arrivalState === 'ready';
          const service = slot === 0 ? activeService : getService(game.customerSlot + slot);
          const previousVisits = customer ? getCustomerVisitCount(game, customer.id) : 0;
          const returnCount = Math.max(0, previousVisits);

          return (
            <div
              className={`customer-seat customer-seat-${slot + 1} ${isActive ? 'active' : ''} ${
                isOccupied ? 'occupied' : 'empty'
              }`}
              key={slot}
            >
              {isOccupied && customer ? (
                <>
                  <span className="speech-bubble">{isActive ? '...' : customer.seat}</span>
                  {returnCount > 0 ? <span className="return-badge">Return {returnCount}</span> : null}
                  <AnimalAvatar customer={customer} size="table" />
                  <button
                    className={`service-request ${isActive ? '' : 'muted'}`}
                    disabled={!isActive || serviceServed}
                    onClick={onServe}
                    type="button"
                    aria-label={`Serve ${service.label}`}
                    title={`Serve ${service.label}`}
                  >
                    {serviceServed && isActive ? <CheckIcon /> : <ServiceIcon kind={service.id} />}
                  </button>
                  {isActive && !serviceServed ? (
                    <div className="patience-strip" aria-label={`${customer.name} patience`}>
                      <span style={{ width: `${clamp(patiencePercent, 0, 100)}%` }} />
                    </div>
                  ) : null}
                </>
              ) : (
                <span className="empty-chair" aria-hidden="true" />
              )}
              <span className="tea-table">
                {isOccupied ? <ServiceIcon kind={service.id} /> : null}
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

        <button className="sit-button" disabled={arrivalState !== 'ready'} type="button" onClick={onVisit}>
          {arrivalState === 'ready' ? <PawIcon /> : <BellIcon />}
          {arrivalState === 'ready' ? `Sit with ${currentCustomer.name}` : 'Waiting for customer'}
        </button>

        <button className="story-bag" type="button" onClick={onStories}>
          <BookIcon />
          <span>{storyChapterCount}</span>
        </button>
      </section>
    </main>
  );
}

interface VisitScreenProps {
  customer: Customer;
  service: ServiceItem;
  serviceServed: boolean;
  visitNumber: number;
  patiencePercent: number;
  mood: number;
  purrBeat: number;
  onServe: () => void;
  onPurr: () => void;
  onQuiet: () => void;
  onBack: () => void;
}

function VisitScreen({
  customer,
  service,
  serviceServed,
  visitNumber,
  patiencePercent,
  mood,
  purrBeat,
  onServe,
  onPurr,
  onQuiet,
  onBack,
}: VisitScreenProps) {
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
            <span>{visitNumber > 1 ? `Return ${visitNumber - 1}` : 'First visit'}</span>
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
            <button className="primary-button" type="button" onClick={onPurr}>
              <PawIcon />
              Purr
            </button>
            <button className="paper-button" type="button" onClick={onQuiet}>
              <CupIcon />
              Sit Quietly
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
  visitNumber: number;
  onCollect: () => void;
}

function StoryScreen({ customer, story, visitNumber, onCollect }: StoryScreenProps) {
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
        <span className="story-chapter-badge">
          {visitNumber > 1 ? `Return ${visitNumber - 1}` : 'First visit'}
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
  onEndDay: () => void;
}

function SummaryScreen({ game, onEndDay }: SummaryScreenProps) {
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
              <CatHeadIcon />
              Shop Happiness
            </dt>
            <dd>{game.shopHappiness}%</dd>
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
  onBuy: (id: string) => void;
  onBack: () => void;
}

function UpgradesScreen({ game, totalComfort, onBuy, onBack }: UpgradesScreenProps) {
  return (
    <main className="upgrades-screen">
      <section className="shop-ledger" aria-label="Shop upgrades">
        <div className="ledger-head">
          <div>
            <p className="eyebrow">Shop</p>
            <h2>Upgrades</h2>
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
        <div className="upgrade-tabs" aria-label="Upgrade categories">
          <span>Furniture</span>
          <span>Decor</span>
          <span>Comfort</span>
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
                  onClick={() => onBuy(upgrade.id)}
                  type="button"
                >
                  {owned ? 'Owned' : `${upgrade.cost}`}
                  {!owned ? <CupIcon /> : null}
                </button>
              </article>
            );
          })}
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
  const returns = Math.max(0, visits - 1);

  return (
    <article className="story-entry">
      <AnimalAvatar customer={customer} size="small" />
      <div>
        <div className="story-entry-head">
          <h3>{latestStory.title}</h3>
          <span>{returns} returns</span>
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
  if (kind === 'coffee') return <CoffeeIcon />;
  if (kind === 'cake') return <CakeIcon />;
  return <CupIcon />;
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

function CoffeeIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M8 13h14v7a6 6 0 0 1-12 0v-7Z" fill="#efe1ca" stroke="#6b432e" strokeWidth="2" />
      <path d="M22 15h3a3 3 0 0 1 0 6h-3" fill="none" stroke="#6b432e" strokeWidth="2" />
      <path d="M10 15h10v3H10Z" fill="#7a4c31" opacity="0.9" />
      <path d="M8 26h15" stroke="#6b432e" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 10c-1-2 2-3 1-5M19 10c-1-2 2-3 1-5" stroke="#a86b42" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CakeIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 15h18v9H7Z" fill="#f0bd73" stroke="#7a4c31" strokeWidth="2" />
      <path d="M8 13c2-4 13-5 16 0v4H8v-4Z" fill="#fff1cf" stroke="#7a4c31" strokeWidth="2" />
      <path d="M11 18h3M18 18h3M10 23h13" stroke="#c8793b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="11" r="2" fill="#df7070" />
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

function HeartIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 27S5 20 5 12a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-11 15-11 15Z" fill="#df7070" stroke="#8b4545" strokeWidth="2" />
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
