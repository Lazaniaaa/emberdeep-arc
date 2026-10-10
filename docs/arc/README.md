# Hall of Descents on Arc

Emberdeep's on-chain part. A descent that came home can be written to **Arc mainnet** (chain id 5042), where the contract keeps every player's best descent and a public leaderboard is read from it with plain calls (no log history needed). A record cannot be made up: the game's server replays every move of the descent before it signs it, and the contract takes no record without that signature.

## How a record is made

1. **While you play**, the game keeps the setup of the descent (seed, flasks, loadout) and every move as a short code (`src/state/run-store.ts`). Every change to a descent goes through one pure function, `applyAction`, and the dungeon, creatures and loot all come from the seed, so the same setup and moves always give the same result.
2. **After a descent that came home**, the run report offers **Record on Arc**. The game sends the setup and moves to the attestation server (`server/attest.ts`, behind `/api/attest`).
3. **The server replays the descent** (`src/game/replay.ts`). It refuses moves that do not replay, moves after the end, a descent that has not ended, more than 20,000 moves, and any loadout the game cannot give (each perk is held to the strongest legal combination, the weapon to a real weapon, flasks to 1-5, potions to 50 each). Numbers sent with the request are never read; the result is what the replay reaches.
4. **The server signs** the result with EIP-712 (domain "Emberdeep Hall", version 1, Arc's chain id, the Hall's address): player, runId, depth, gold, kills, home, boss slain, and a deadline one hour ahead. The runId is a hash of the player, the checked setup and the moves, so one descent always gets the same runId.
5. **The game checks** that the server's result matches the run report (if not, the game and the server disagree about the rules, and nothing is sent), then **simulates the call** on Arc so a refusal is explained before the wallet is asked anything, then the **player's wallet sends** `record(descent, signature)`. Arc settles in under a second.

## The contract: `contracts/EmberdeepHall.sol`

Built with Solady's `EIP712` and `ECDSA`, the same libraries Onchain Heroes' contracts use. About 5.2 KB.

| It checks | so that |
| --- | --- |
| the signature recovers to `signer` | only descents the server replayed get in |
| `runId` not recorded yet | a descent is recorded once |
| `block.timestamp <= deadline` | an old signature cannot be used forever |
| `1 <= depth <= 7` | even a wrong signature cannot write an impossible depth |
| `!paused` | the owner can stop new records |

**Anyone may submit a signed record**: the player's wallet, or later the game's server paying the gas for a player who holds no USDC (an email login, for example). The record always goes to the `player` inside the signed descent, so a signature seen in the mempool can only be submitted for that same player, once. (The first version also required `msg.sender == player`; it was dropped before deployment, 2026-10-10, to leave room for that.)

**The leaderboard lives in the contract.** Each record updates the player's `Standing` (one storage slot: best depth, gold, kills and boss of a descent that came home, plus the number of records) and adds a new player to `players`. The game reads `playerCount`, `totalRecords` and `standings(start, count)` in pages of 500 and ranks them (deeper first, then more gold; a tie keeps the player who joined first). Reading the events instead does not work for long: from some regions the primary RPC refuses connections (Cloudflare 1009), and the public partner RPCs serve logs only for about the last day and a half (blockdaemon) or for ranges of about 100 blocks (drpc, free plan). A player's first record costs about 150k gas, later ones about 60k: well under a cent at Arc's 20 Gwei.

**RPCs.** The game and the deploy page read Arc through viem's `fallback` over `ARC_RPCS` in `src/chain/arc-config.ts` (blockdaemon, drpc, then the primary), and ask the wallet to add Arc with the same list.

**It holds no funds.** No function is payable, there is no `receive` or `fallback`, and it makes no external calls, so there is nothing to drain and no reentrancy. Solady's `Ownable` was not used because its functions are `payable`, and USDC sent there by mistake (Arc's gas token) would be stuck; the contract has its own two-step ownership instead (`transferOwnership` then `acceptOwnership`, zero cancels).

**What a stolen key could do.** The signer key could sign false records until the owner calls `setSigner` with a new key (old signatures stop working at once). The owner key could pause new records or change the signer. Neither can change or remove records already written, or touch any money (there is none).

**Admin calls** (owner only): `setSigner(address)`, `setPaused(bool)`, `transferOwnership(address)`. On Blockscout they can be made from the explorer's "Write contract" tab with the owner's wallet.

## What the signature does not prove

- **The loadout.** Items, perks and locks come from the simulated economy in the player's browser. The server holds them to what the game allows; it cannot know what a player has bought.
- **That a human played.** A bot can produce valid moves (the project has bots). The replay proves the moves are a real descent under the rules, not who pressed them.
- **The seed is the player's.** A player could look for an easy dungeon. It is still played move by move.

## Tests

- `contracts/EmberdeepHall.test.ts` (18): the compiled contract in an in-memory EVM (ethereumjs), signatures made with viem as the server makes them. It covers accepting a good record, one record per runId, other keys, changed fields, other Hall or chain, malformed signatures, a record submitted by someone else (still the signed player's, once; naming another player breaks the signature), the standings (best descent home, run counts, ties, pages), expiry (and the last valid second), depth bounds, refusing USDC on every path, pause, signer rotation, two-step ownership, deploying without a signer, and that the ABI the game calls matches the compiled contract.
- `server/attest.test.ts` (6): a bot plays, the server replays and signs, and the compiled Hall accepts the record; lost descents, stable runIds, tampered moves, boosted loadouts, ignored claimed numbers, bad requests, size limits and the rate limit.
- `src/game/replay.test.ts` (10), `src/chain/arc.test.ts` (17), `src/state/hall.test.ts` (6): replay matches bot results exactly, move codes, the loadout ceiling, the wallet flow, error messages and the move log.

`npm run hall:compile` writes `contracts/out/EmberdeepHall.json` (ABI and bytecode for the deploy page) and `contracts/out/EmberdeepHall.standard-input.json` (for source verification). solc 0.8.28 and Solady 0.1.26 are pinned, because a different version changes the bytecode.

## Deploying, in order

Everything that needs a key happens on your machine or your server. Nothing here asks for a private key.

1. **Signing server, first time.** `.\deploy\attest.ps1 -Server <IP>` (or `bash deploy/attest.sh <IP>`). It installs Node and the server, makes the signing key **on the server** (`/etc/emberdeep/signer.key`, readable only by the service user) and prints the **signer address**.
2. **USDC for gas on Arc.** A few cents are enough: one deployment and your own test records. Circle's CCTP bridge moves native USDC to Arc from Ethereum, Base, Arbitrum and others.
3. **Deploy the Hall.** `npm run dev`, open `http://localhost:5741/deploy-hall.html`, connect the wallet that will own the Hall, paste the signer address, press Deploy. Rehearse on **Arc Testnet** first if you like (free USDC at faucet.circle.com). Note the **Hall address** it shows.
4. **Verify the source** on `explorer.arc.io`: "Solidity (Standard JSON input)", compiler `v0.8.28+commit.7893614a`, file `contracts/out/EmberdeepHall.standard-input.json`, constructor arguments as the deploy page prints them.
5. **Start the signing server for that Hall.** `.\deploy\attest.ps1 -Server <IP> -Hall <Hall address>`. It starts the service and adds the `/api` route to Caddy; the last line is a health check.
6. **Turn the Hall on in the game.** The Hall address goes into `DEPLOYED` in `src/chain/arc-config.ts`; then publish the site as usual (`.\deploy\deploy.ps1 -Server <IP>`).

### Rehearsal on Arc Testnet (free USDC)

Everything runs on your own machine; only the wallet steps are yours. In PowerShell, from the project folder:

1. Testnet USDC for the wallet that will deploy and play: https://faucet.circle.com (Arc Testnet).
2. A throwaway signing key and the server: `npm run server:build`, then `node server-dist/attest.mjs keygen .ehearsal.key`. It prints the **signer address**. (`*.key` files must never be committed; this one is only for the testnet.)
3. `npm run dev`, open `http://localhost:5741/deploy-hall.html`, pick **Arc Testnet**, connect, paste the signer address, Deploy. Note the **Hall address**.
4. Start the server for that Hall (a second window): `$env:HALL_ADDRESS='<Hall address>'; $env:HALL_CHAIN_ID='5042002'; $env:SIGNER_KEY_FILE='.ehearsal.key'; node server-dist/attest.mjs`.
5. Point the game at it: a file `.env.local` with `VITE_ARC_NETWORK=testnet` and `VITE_ARC_HALL_ADDRESS=<Hall address>`, then restart `npm run dev`.
6. Play a descent, come home, press **Record on Arc**, then open the Hall (the trophy in the header): the record should be in the table. Delete `.env.local` afterwards.

To try it all locally first: `npm run server:build`, then `node server-dist/attest.mjs keygen ./test.key` and run `node server-dist/attest.mjs` with `HALL_ADDRESS`, `HALL_CHAIN_ID` and `SIGNER_KEY_FILE` set; `npm run dev` proxies `/api` to it, and `.env.local` with `VITE_ARC_HALL_ADDRESS` turns the Hall on in the dev build.
