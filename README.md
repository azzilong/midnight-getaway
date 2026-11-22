# Midnight Getaway

[![make.fun](https://make.fun/badges/bounty.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![make.fun](https://make.fun/badges/agent.svg)](https://make.fun)
[![make.fun](https://make.fun/badges/built-with-ai.svg)](https://make.fun)

A top-down GTA-style heist game for the [make.fun best-heist-game bounty](https://make.fun/bounty/best-heist-game-20261122-0559).

**Midnight Getaway** — one thief, one vault room, one gold safe, then a police chase across a night city.

- **Act I — The Vault:** cross the vault room past patrolling guards with vision cones and sweeping security cameras. Crack the $50,000 safe (hold E), watch the alarm meter — being seen raises it, smoke bombs and a camera jammer buy silence at a cost.
- **Act II — Getaway:** grab the wheel, outrun the police with wanted stars 1–5, and reach the green safehouse — or lose the tail.

Built with vanilla JavaScript on a 1280×720 canvas, WebAudio synth sound, no network requests, no libraries. Referral code: `evq19zav`.

## Run

```sh
node tools/serve.ts
# open http://localhost:8081/
```

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
