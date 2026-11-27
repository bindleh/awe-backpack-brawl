# Backpack Brawl API

The local API is a small Express server in `server/index.js`. It listens on port 4200 (override with the `PORT` environment variable). During Vite development, `/api` is proxied to it, so the frontend uses relative URLs such as `/api/opponents?round=1`. All responses are JSON. The only state the server keeps is the hall of fame, held in memory: restarting the server empties it. Everything else is deterministic.

## `GET /api/health`

Always answers immediately with status 200:

```json
{ "ok": true, "service": "backpack-brawl" }
```

## `GET /api/opponents`

Returns the opponent for one round of a run. The opponent table lives in `server/opponents.js`.

### Query parameters

| Parameter | Required | Meaning |
|---|---|---|
| `round` | yes | The 1-based round number. Must be a positive whole number written in digits (`1`, `2`, …). |
| `latency` | no | Response delay in milliseconds, clamped to 0–5000. Defaults to 1200. A value that is not a number falls back to the default. |
| `fail` | no | `fail=true` forces a 503 response (see below). |

### Success — 200

```json
{
  "id": "mossback-hermit",
  "name": "Mossback Hermit",
  "icon": "🐢",
  "hp": 25,
  "items": ["chipped-dagger", "pot-lid"],
  "round": 1
}
```

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Stable identifier of the opponent |
| `name` | string | Display name |
| `icon` | string | Emoji shown in the battle view |
| `hp` | number | Maximum (and starting) HP |
| `items` | string[] | Item ids from the catalog in `src/items.ts`; the same id may appear several times |
| `round` | number | The round this opponent was requested for (echoes `round`) |

The response matches the `Opponent` type in `src/types.ts`.

The answer is deterministic: the same `round` always returns the same opponent. There is one hand-built opponent per round for rounds 1–7. Every round past the table returns the last opponent with +6 HP per additional round. The table never needs more than 7 rounds (5 wins + 3 lives − 1), and an opponent never carries more than 6 items, the size of the player's 2×3 backpack.

### Errors

Every error response has the shape:

```json
{ "error": "human-readable explanation" }
```

| Status | When | `error` |
|---|---|---|
| 400 | `round` is missing, not a whole number, or less than 1 | `round must be a positive whole number` |
| 503 | `fail=true`, or the server was started with `API_FAIL=true` | `The arena gates are shut. No challenger answered the call.` |

An invalid `round` is reported as 400 even when failure is forced. All responses from this endpoint, errors included, arrive after the configured delay.

## `POST /api/hall-of-fame`

Stores one finished run as a hall of fame entry. Each run can be submitted at most once (identified by `runId`). The validation and ranking rules live in `server/hallOfFame.js`.

### Request

`Content-Type: application/json`

```json
{
  "runId": "2f6c1a8e-6f0b-4c43-9a0d-0d6b1f3c2a11",
  "name": "Ada",
  "outcome": "victory",
  "wins": 5,
  "lives": 2,
  "rounds": 6
}
```

| Field | Type | Rule |
|---|---|---|
| `runId` | string | Non-empty, at most 100 characters. The client generates a UUID per run. |
| `name` | string | 1–20 characters after trimming leading and trailing spaces; stored trimmed. |
| `outcome` | `"victory"` \| `"defeat"` | `"victory"` requires `wins` = 5 and `lives` ≥ 1; `"defeat"` requires `lives` = 0 and `wins` < 5. |
| `wins` | number | Whole number from 0 to 5. |
| `lives` | number | Whole number from 0 to 3 (lives left at the end of the run). |
| `rounds` | number | Whole number ≥ 1 and exactly `wins + (3 − lives)`: every round is one battle, won or lost. |

### Success — 201

The stored entry, with the server's submission time added:

```json
{
  "runId": "2f6c1a8e-6f0b-4c43-9a0d-0d6b1f3c2a11",
  "name": "Ada",
  "outcome": "victory",
  "wins": 5,
  "lives": 2,
  "rounds": 6,
  "submittedAt": "2026-11-26T20:15:03.120Z"
}
```

### Errors

| Status | When | `error` (example) |
|---|---|---|
| 400 | Body is not valid JSON or not an object | `Request body must be valid JSON` / `Request body must be a JSON object` |
| 400 | A field is missing, has the wrong type or is out of range | e.g. `name must be 1–20 characters (leading and trailing spaces are ignored)` |
| 400 | `outcome` does not match `wins` and `lives` | e.g. `A victory needs 5 wins and at least 1 life left` |
| 400 | `rounds` is not `wins + (3 − lives)` | e.g. `rounds must equal wins + lost lives (5 + 1 = 6)` |
| 409 | An entry with this `runId` already exists | `This run was already submitted.` |

The first failing rule is reported. The client treats 409 like success: the run is stored already, for example because the first response got lost.

## `GET /api/hall-of-fame`

Returns the best 10 entries (same shape as the 201 response above) as a JSON array, already in ranking order. With no entries it returns `[]`.

### Ranking

1. Victories before defeats.
2. More `wins` first.
3. Fewer `rounds` first.
4. Earlier `submittedAt` first.

## Environment variables

| Variable | Effect |
|---|---|
| `PORT` | Port to listen on (default 4200). The Vite proxy expects 4200. |
| `API_LATENCY` | Default delay in milliseconds when a request has no `latency` parameter. |
| `API_FAIL` | `true` makes every opponent request fail with 503. |

Example: `API_FAIL=true pnpm server`.

## Client

`submitHallOfFame(entry)` posts a finished run and resolves on 201 or 409; `fetchHallOfFame()` resolves with the ranked entries. Both throw an `Error` with the server's `error` text like `fetchOpponent`.

`fetchOpponent(round)` in `src/api.ts` performs the request. It resolves with the `Opponent` on success and throws an `Error` carrying the server's `error` text (or a generic message with the status code) for any non-2xx response. When the API is not running, the Vite proxy answers with an error status of its own, which is reported the same way; a network failure rejects as well.
