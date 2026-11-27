export interface ItemEffects {
  damage?: number;
  block?: number;
  burnStacks?: number;
  poisonStacks?: number;
  heal?: number;
}

export type ItemSet = "Fire" | "Stone";

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  price: number;
  /** Cooldown in battle ticks (1 tick = 0.5 s). */
  cooldown: number;
  effects: ItemEffects;
  set?: ItemSet;
}

/** A concrete item the player owns; several instances may share one `itemId`. */
export interface ItemInstance {
  uid: string;
  itemId: string;
}

/** Fixed-size grid, row by row; `null` marks a free slot. */
export type Backpack = (ItemInstance | null)[];

/** Shop offers by item id; `null` marks an offer that was already bought. */
export type ShopOffers = (string | null)[];

export type Phase = "shop" | "searching" | "battle" | "finished";

export interface RunState {
  /** Unique id of this run; the hall of fame accepts each run once. */
  runId: string;
  round: number;
  gold: number;
  lives: number;
  wins: number;
  /** Seed for the next shop roll — keeps every shop deterministic. */
  seed: number;
  shop: ShopOffers;
  backpack: Backpack;
  /** Counter for generating unique `ItemInstance.uid`s. */
  nextUid: number;
}

export interface Opponent {
  id: string;
  name: string;
  icon: string;
  hp: number;
  round: number;
  items: string[];
}

export type Side = "player" | "opponent";

export interface FighterSnapshot {
  hp: number;
  maxHp: number;
  block: number;
  burn: number;
  poison: number;
}

export type BattleEventKind = "damage" | "block" | "burn" | "poison" | "heal";

export interface BattleEvent {
  tick: number;
  /** Who caused the event. */
  source: Side;
  /** Who is affected by it. */
  target: Side;
  kind: BattleEventKind;
  amount: number;
  /** Item that triggered the event. */
  itemId: string;
  message: string;
}

export interface BattleFrame {
  tick: number;
  player: FighterSnapshot;
  opponent: FighterSnapshot;
  /** Events that happened during this tick. */
  events: BattleEvent[];
}

export interface BattleResult {
  winner: Side;
  reason: "knockout" | "timeout";
  frames: BattleFrame[];
  events: BattleEvent[];
}

/** An item as it fights: the catalog values it brings into battle. */
export interface FighterItem {
  itemId: string;
  name: string;
  icon: string;
  cooldown: number;
  effects: ItemEffects;
}

/** Everything `simulateBattle` needs to know about one side. */
export interface Fighter {
  name: string;
  maxHp: number;
  items: FighterItem[];
}

/** A simulated battle being replayed frame by frame. */
export interface BattleReplay {
  opponent: Opponent;
  player: Fighter;
  enemy: Fighter;
  result: BattleResult;
  /** Index into `result.frames` that is currently shown. */
  frame: number;
}

/** Everything the UI needs: the run plus where in the round loop we are. */
export interface GameState {
  phase: Phase;
  run: RunState;
  /** Set while `phase === "battle"`. */
  battle: BattleReplay | null;
  /** Last opponent-search error, shown in the shop. */
  error: string | null;
  /** Counts started searches; only the response of the current search may start a battle. */
  searchId: number;
  /** Whether this finished run was saved in the hall of fame. */
  submitted: boolean;
}

/** A finished run as sent to `POST /api/hall-of-fame`. */
export interface HallOfFameSubmission {
  runId: string;
  name: string;
  outcome: "victory" | "defeat";
  wins: number;
  lives: number;
  rounds: number;
}

/** A stored hall of fame entry as returned by the API. */
export interface HallOfFameEntry extends HallOfFameSubmission {
  /** ISO timestamp set by the server. */
  submittedAt: string;
}
