# pi-solo

Pi extensions for [Soloterm](https://soloterm.com) — agent orchestration, parallel dispatch, and fork workflows.

## Commands

### `/fork-solo`

Fork the current session at a selected message and open it as a new Pi agent in Soloterm. The current session stays intact.

```
/fork-solo              — show message selector, fork in new Solo agent
/fork-solo <message>    — fork + pre-fill initial prompt
```

### `/dispatch`

Spawn a Pi worker agent in Soloterm with a focused task. Quick and simple.

```
/dispatch Fix the login form validation in src/components/LoginForm.vue
/dispatch Write unit tests for the payment service
```

### `/orchestrate`

Plan parallel work and dispatch multiple Solo worker agents. Parses multi-line goals into independent lanes.

```
/orchestrate
- Refactor auth middleware to use JWT refresh tokens
- Add rate limiting to /api/bookings endpoint
- Write E2E tests for the booking flow
```

## LLM Tool

### `dispatch_solo_worker`

The LLM can call this tool directly to spawn parallel workers when it identifies independent work lanes. Useful during planning conversations — the model can dispatch workers as it breaks down the problem.

## Requirements

- [Soloterm](https://soloterm.com) running with Pi configured as an agent tool
- Must be running inside Solo (needs `SOLO_PROJECT_ID` env var)
- Pi agent tool must be enabled in Solo Settings → Agents

## Install

```bash
pi install npm:pi-solo
```

Or load locally:

```bash
# In settings.json packages array:
"/path/to/pi-solo"
```

## How it works

- Uses `solo-cli` (bundled in Solo.app) to spawn agent processes
- Auto-discovers Pi's agent tool ID on first use
- Workers appear in Solo's Agents sidebar section with clear labels
- Each worker runs independently with its own conversation

## License

MIT
