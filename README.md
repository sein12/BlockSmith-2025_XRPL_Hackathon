# DA-Fi(Decentralized Autonomous Financial) Solution Backend
A FastAPI backend that demonstrates KRW IOU TokenEscrow on XRPL Devnet, automatic wallet bootstrap/prefunding (XRP + KRW), issuer authorization controls, trustline setup, and a small agent pipeline (Gemma-3) that validates/auto-finishes escrows. Includes a built-in HTML tester UI.

## Features
XRPL Devnet integration

Faucet funding, wallet activation, top-ups

IOU issuer (KRW), insurer (owner), client (destination)

Trustline setup + optional RequireAuth with issuer-side authorization

TokenEscrow for IOU (KRW): create, finish, cancel

Balance endpoints (separate insurer and client)

Agents (Gemma-3)

Intent classification → coverage validation → data completeness → document extraction → validator → explainer

Image (optional) + knowledge_markdown support

If decision is Accepted, auto-finishes the most recent pending escrow for the logged-in client

Built-in Tester UI

Served at / — click Health, Login (Faucet), check balances, create/finish/cancel escrow, and run Agents

macOS-friendly with uv virtual environment (tested on macOS 13.7.1)

🧱 Architecture Overview
flowchart LR
  A[Startup] --> B[Bootstrap wallets via keychain or random seeds]
  B --> C[Activate via Faucet + Top-up XRP]
  C --> D[Create/Ensure trustlines KRW (issuer -> insurer/client)]
  D --> E[Optional RequireAuth + issuer authorizations]
  E --> F[REST API (FastAPI)]
  F -->|/escrow/create| G[EscrowCreate (IOU: KRW)]
  F -->|/escrow/finish| H[EscrowFinish]
  F -->|/escrow/cancel| I[EscrowCancel]
  F -->|/agent_transaction_request| J[Agents (Gemma-3)]
  J -->|Accepted| H

## Requirements

Python 3.11+

uv (virtual environment & package manager)

macOS 13.7.1 tested (Linux likely fine; Windows WSL may work)

Internet access (to download the Hugging Face model the first time)

Suggested package versions

The code uses pydantic.validator (Pydantic v1 style). Pin Pydantic to <2.

```
uv venv
source .venv/bin/activate
uv pip install \
  "fastapi==0.110.*" \
  "uvicorn[standard]==0.27.*" \
  "pydantic<2" \
  "torch>=2.2" \
  "pillow" \
  "transformers>=4.44.0" \
  "accelerate>=0.30" \
  "sentencepiece" \
  "xrpl-py>=4.3.0" \
  "cryptoconditions>=0.8" \
  "keyring>=24"

```

If you have Apple Silicon and want MPS, install a compatible PyTorch build.


## Run
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

```aiignore
Open: http://localhost:8000/
 to use the Tester UI.

Startup prints (example):

XRPL JSON-RPC: https://s.devnet.rippletest.net:51234
Server version: <rippled build version>
INSURER_ADDRESS: r...
CLIENT_ADDRESS : r...
IOU_ISSUER_ADDR: r...
```


## Quick Start (Tester UI)

Health → ensure server & XRPL node reachable.

Login (Faucet) → creates a dev session for the default client and stores a X-Session-Token.

Balances → check insurer/client XRP and KRW (IOU) balances.

Create Escrow → enter amount_krw (e.g., 1000) and press Create.

Finish / Cancel → select an escrow and Finish (pays to client) or Cancel (returns IOU to insurer).

Agent Transaction Request → submit description (+ optional image); the agent may return Accepted/Declined/Escalate. If Accepted and a pending escrow exists for the logged-in client, it auto-finishes.


## REST API (Summary)

All protected endpoints require header: X-Session-Token: <token> (obtain from /auth/login_faucet).

Health
GET /health


200 → { "status": "ok", "rpc": "...", "faucet": "...", "server_version": "..." }

Auth (Dev-only Faucet Login)
POST /auth/login_faucet


200 →

{
  "session_token": "string",
  "address": "r....",
  "seed": "..." ,
  "public_key": "..."
}


Seed is returned only for Devnet demo. Never expose seeds in production.

Balances
GET /balances/insurer
GET /balances/client


200 →
/balances/insurer:

{
  "insurer_address": "r...",
  "insurer_balance_xrp": 20.1,
  "insurer_balance_krw": 1000.0
}


/balances/client:

{
  "client_address": "r...",
  "client_balance_xrp": 20.1,
  "client_balance_krw": 0.0
}

TokenEscrow (KRW IOU)
Create
POST /escrow/create?amount_krw=1000


200 →

{ "escrow_id": "uuid", "message": "An IOU (KRW) TokenEscrow has been created" }

Finish
POST /escrow/finish
Content-Type: application/json

{ "escrow_id": "uuid" }


200 →

{
  "escrow_id": "uuid",
  "finished": true,
  "tx_hash": "ABC123...",
  "message": "The insurance benefit you requested has been paid"
}

Cancel
POST /escrow/cancel
Content-Type: application/json

{ "escrow_id": "uuid" }


200 →

{
  "escrow_id": "uuid",
  "canceled": true,
  "tx_hash": "DEF456...",
  "message": "The escrow has been canceled. The deposited IOU has been returned to the insurer's wallet"
}

## Agent Pipeline
POST /agent_transaction_request
Content-Type: multipart/form-data

- user_transaction_description: string (required)
- image: file (optional)
- knowledge_markdown: string (optional; defaults to a boilerplate)
- agent1_max_new_tokens: int (default 256)
- agent2_max_new_tokens: int (default 256)
- agent1_system_prompt: string (optional)
- agent2_system_prompt: string (optional)
- temperature: float (default 0.2)


200 → decision payload, e.g.:

{
  "results": {
    "decision": "Accepted",
    "reason": "…why the document extractor/validator accepted…",
    "escrow_id": "uuid",
    "tx_hash": "ABC123..."
  }
}


Possible decision: "Accepted" | "Declined" | "Escalate to human" | "Unknown".

## Example cURL
### 1) Login (get session token)
curl -X POST http://localhost:8000/auth/login_faucet

### 2) Use token
TOKEN="paste-session-token"

### 3) Create escrow 1000 KRW
curl -X POST "http://localhost:8000/escrow/create?amount_krw=1000" \
  -H "X-Session-Token: $TOKEN"

### 4) Finish escrow (replace ESCROW_ID)
curl -X POST http://localhost:8000/escrow/finish \
  -H "X-Session-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"escrow_id":"ESCROW_ID"}'

## File/Module Highlights

Wallet bootstrap & keychain: _bootstrap_wallets_keychain, build_wallet_from_seed, keyring shim

Funding/Activation: _generate_faucet_wallet_compat, _pay_xrp, fund_existing_wallet, ensure_activated, _top_up_if_needed

Trustlines & IOU: ensure_trustline, issue_iou, issuer_requires_auth, set_issuer_require_auth, issuer_authorize_line

Escrow lifecycle: escrow_create, escrow_finish, escrow_cancel

Balances: /balances/insurer, /balances/client

Agents: _generate_with_system, parse_llm_raw, IntentClassifierAgentSystem, ValidatorAgentSystem, ExplainerAgentSystem, etc.

Tester UI: GET / serves a self-contained HTML test page