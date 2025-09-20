#XRPLHACKATON SEOUL 2025
#Sep20 2025

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#This code work with macOS
#Tested on macOS 13.7.1
#Using uv virtual environment
#All of this code designed and develop by Jaeyoon Lee
#Getting code advice with ChatGPT-5


from __future__ import annotations

import asyncio
import io
import logging
import os
import re
import secrets
import time
import uuid
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Literal, Optional, Tuple

import torch
from PIL import Image
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, validator
from starlette.middleware.cors import CORSMiddleware
from transformers import AutoProcessor
from transformers.models.gemma3 import Gemma3ForConditionalGeneration

from xrpl.asyncio.clients import AsyncJsonRpcClient
from xrpl.asyncio.transaction import (
    autofill_and_sign as async_autofill_and_sign,
    submit_and_wait as async_submit_and_wait,
)
from xrpl.asyncio.wallet import generate_faucet_wallet as async_generate_faucet_wallet
from xrpl.core.addresscodec import is_valid_xaddress, xaddress_to_classic_address
from xrpl.models.amounts import IssuedCurrencyAmount
from xrpl.models.requests import AccountInfo, AccountLines, ServerInfo
from xrpl.models.transactions import AccountSet, EscrowCancel, EscrowCreate, EscrowFinish, Payment, TrustSet
from xrpl.utils import drops_to_xrp, xrp_to_drops
from xrpl.wallet import Wallet

from cryptoconditions import PreimageSha256

from agent_configuration import IntentClassifierAgentSystemInput, ValidatorAgentSystemInput, \
    DataCompletenessEvaluatorAgentSystemInput, DocuementExtractorAgentSystemInput

try:
    from xrpl.models.transactions.account_set import AccountSetFlag as _ASF
    ASF_ALLOW_TRUSTLINE_LOCKING = getattr(_ASF, "ASF_ALLOW_TRUSTLINE_LOCKING", None)
except Exception:
    ASF_ALLOW_TRUSTLINE_LOCKING = None

XRPL_RPC_URL = os.getenv("XRPL_RPC_URL", "https://s.devnet.rippletest.net:51234")
XRPL_FAUCET_URL = os.getenv("XRPL_FAUCET_URL", "https://faucet.devnet.rippletest.net")

CLIENT = AsyncJsonRpcClient(XRPL_RPC_URL)
from decimal import Decimal

STARTUP_KRW_OWNER  = Decimal(os.getenv("STARTUP_KRW_OWNER",  "1000"))  # insurer/owner KRW min
STARTUP_KRW_CLIENT = Decimal(os.getenv("STARTUP_KRW_CLIENT", "0"))     # client/dest KRW min (set >0 to prefund)

app = FastAPI(title="DA-Fi Solution (Code B, updated like Code A)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("da_fi")

SESSIONS: Dict[str, str] = {}
CHALLENGES: Dict[str, bytes] = {}

INSURER_WALLET: Optional[Wallet] = None
CLIENT_WALLET: Optional[Wallet] = None
CLIENT_WALLETS: Dict[str, Wallet] = {}
IOU_ISSUER_WALLET: Optional[Wallet] = None

IOU_CURRENCY = os.getenv("IOU_CURRENCY", "KRW")
IOU_TRUST_LIMIT = os.getenv("IOU_TRUST_LIMIT", "1000000000")
IOU_REQUIRE_AUTH = os.getenv("IOU_REQUIRE_AUTH", "0") in ("1", "true", "True", "YES", "yes")

ASF_REQUIRE_AUTH_IDX = 2                  # AccountSet.set_flag index to toggle RequireAuth
FLAGS_REQUIRE_AUTH_BIT = 0x00040000       # AccountRoot Flags bit to read RequireAuth
TF_SET_AUTH = 0x00010000                  # TrustSet authorize flag

#Keychain helpers
try:
    import keyring
except Exception:
    class _KeyringShim:
        _mem: Dict[str, str] = {}
        def get_password(self, service: str, name: str) -> Optional[str]:
            return self._mem.get((service + "::" + name))
        def set_password(self, service: str, name: str, secret: str) -> None:
            self._mem[(service + "::" + name)] = secret
        def delete_password(self, service: str, name: str) -> None:
            self._mem.pop((service + "::" + name), None)
    keyring = _KeyringShim()  # type: ignore
KEYCHAIN_SERVICE = os.getenv("KEYCHAIN_SERVICE_NAME", "xrpl.devnet.wallets")

def _kc_get(name: str) -> Optional[str]:
    try:
        return keyring.get_password(KEYCHAIN_SERVICE, name)  # type: ignore[attr-defined]
    except Exception:
        return None

def _kc_set(name: str, secret: str) -> None:
    try:
        keyring.set_password(KEYCHAIN_SERVICE, name, secret)  # type: ignore[attr-defined]
    except Exception:
        pass

def _kc_delete(name: str) -> None:
    try:
        keyring.delete_password(KEYCHAIN_SERVICE, name)  # type: ignore[attr-defined]
    except Exception:
        pass

#Pydantic / API models
class SimpleLoginIn(BaseModel):
    address: str
    @validator("address")
    def _addr(cls, v: str) -> str:
        if not (v and v.startswith("r") and len(v) >= 25):
            raise ValueError("Not a classic XRPL address (r...)")
        return v

class FaucetLoginOut(BaseModel):
    session_token: str
    address: str
    seed: Optional[str] = None      # DEVNET ONLY (never expose in prod)
    public_key: Optional[str] = None

@dataclass
class EscrowRef:
    id: str
    owner: str
    destination: str
    offer_sequence: int
    amount_iou: Decimal
    condition_hex: str
    fulfillment_hex: str
    preimage_hex: str
    finished: bool = False
    finish_tx: Optional[str] = None
    canceled: bool = False
    cancel_tx: Optional[str] = None

ESCROWS: Dict[str, EscrowRef] = {}

class CreateOut(BaseModel):
    escrow_id: str
    message: str

class FinishIn(BaseModel):
    escrow_id: str

class FinishOut(BaseModel):
    escrow_id: str
    finished: bool
    tx_hash: Optional[str]
    message: str

class CancelIn(BaseModel):
    escrow_id: str

class CancelOut(BaseModel):
    escrow_id: str
    canceled: bool
    tx_hash: Optional[str]
    message: str

class InsurerBalanceOut(BaseModel):
    insurer_address: str
    insurer_balance_xrp: float
    insurer_balance_krw: float

class ClientBalanceOut(BaseModel):
    client_address: str
    client_balance_xrp: float
    client_balance_krw: float

#XRPL helpers
def ripple_epoch_now() -> int:
    return int(time.time()) - 946_684_800

async def server_version() -> str:
    r = await CLIENT.request(ServerInfo())
    return r.result["info"].get("build_version", "?")

def _unwrap_result(resp):
    return getattr(resp, "result", resp) or {}

def _tx_succeeded(resp) -> bool:
    r = _unwrap_result(resp)
    eng = r.get("engine_result")
    if eng is not None:
        return eng == "tesSUCCESS"
    meta = r.get("meta") or r.get("meta_json")
    if isinstance(meta, dict):
        return meta.get("TransactionResult") == "tesSUCCESS"
    return False

def _pretty_err(resp) -> Dict[str, Any]:
    r = _unwrap_result(resp)
    return {
        "engine_result": r.get("engine_result"),
        "engine_result_message": r.get("engine_result_message"),
        "hash": (r.get("tx_json") or {}).get("hash") or r.get("hash"),
    }

def _tx_hash_of(resp) -> Optional[str]:
    r = _unwrap_result(resp)
    return (r.get("tx_json") or {}).get("hash") or r.get("hash")

async def xrpl_balance(address: str) -> float:
    acct = address
    if is_valid_xaddress(acct):
        acct, _tag, _is_test = xaddress_to_classic_address(acct)
    resp = await CLIENT.request(AccountInfo(account=acct, ledger_index="validated", strict=True))
    if not resp.is_successful():
        raise RuntimeError(f"account_info failed: {resp.result}")
    drops = resp.result["account_data"]["Balance"]
    return float(drops_to_xrp(drops))

async def has_trustline(holder_addr: str, issuer_addr: str, currency: str) -> bool:
    resp = await CLIENT.request(AccountLines(account=holder_addr, ledger_index="validated"))
    for line in resp.result.get("lines", []):
        if line.get("currency") == currency and line.get("account") == issuer_addr:
            return True
    return False

async def get_line(holder_addr: str, issuer_addr: str, currency: str) -> Optional[dict]:
    resp = await CLIENT.request(AccountLines(account=holder_addr, ledger_index="validated"))
    for line in resp.result.get("lines", []):
        if line.get("currency") == currency and line.get("account") == issuer_addr:
            return line
    return None

async def ensure_trustline(holder_wallet: Wallet, issuer_addr: str, currency: str, limit: str) -> None:
    if await has_trustline(holder_wallet.classic_address, issuer_addr, currency):
        return
    ts = TrustSet(
        account=holder_wallet.classic_address,
        limit_amount=IssuedCurrencyAmount(currency=currency, issuer=issuer_addr, value=str(limit)),
    )
    signed = await async_autofill_and_sign(ts, CLIENT, holder_wallet)
    res = await async_submit_and_wait(signed, CLIENT)
    if not _tx_succeeded(res):
        raise RuntimeError(f"TrustSet failed: {_pretty_err(res)}")

async def trust_balance(holder_addr: str, issuer_addr: str, currency: str) -> Decimal:
    resp = await CLIENT.request(AccountLines(account=holder_addr, ledger_index="validated"))
    for line in resp.result.get("lines", []):
        if line.get("currency") == currency and line.get("account") == issuer_addr:
            return Decimal(line.get("balance", "0"))
    return Decimal("0")

async def ensure_issuer_allows_locking(issuer_wallet: Wallet) -> None:
    setval = ASF_ALLOW_TRUSTLINE_LOCKING if ASF_ALLOW_TRUSTLINE_LOCKING is not None else 17
    try:
        tx = AccountSet(account=issuer_wallet.classic_address, set_flag=setval)
        prepared = await async_autofill_and_sign(tx, CLIENT, issuer_wallet)
        res = await async_submit_and_wait(prepared, CLIENT)
        if not _tx_succeeded(res):
            logger.warning("AllowTrustLineLocking not applied: %s", _pretty_err(res))
    except Exception as e:
        logger.warning("AllowTrustLineLocking attempt failed: %s", e)

async def issuer_requires_auth(issuer_addr: str) -> bool:
    resp = await CLIENT.request(AccountInfo(account=issuer_addr, ledger_index="validated", strict=True))
    flags = resp.result["account_data"].get("Flags", 0)
    return bool(flags & FLAGS_REQUIRE_AUTH_BIT)

async def set_issuer_require_auth(issuer_wallet: Wallet, enable: bool) -> None:
    tx = AccountSet(
        account=issuer_wallet.classic_address,
        set_flag=ASF_REQUIRE_AUTH_IDX if enable else None,
        clear_flag=None if enable else ASF_REQUIRE_AUTH_IDX,
    )
    signed = await async_autofill_and_sign(tx, CLIENT, issuer_wallet)
    res = await async_submit_and_wait(signed, CLIENT)
    if not _tx_succeeded(res):
        raise RuntimeError(f"AccountSet(RequireAuth={enable}) failed: {_pretty_err(res)}")

async def issuer_authorize_line(issuer_wallet: Wallet, holder_addr: str, currency: str) -> None:
    ts = TrustSet(
        account=issuer_wallet.classic_address,
        limit_amount=IssuedCurrencyAmount(currency=currency, issuer=holder_addr, value="0"),
        flags=TF_SET_AUTH,
    )
    signed = await async_autofill_and_sign(ts, CLIENT, issuer_wallet)
    res = await async_submit_and_wait(signed, CLIENT)
    if not _tx_succeeded(res):
        raise RuntimeError(f"Issuer TrustSet authorize failed: {_pretty_err(res)}")

async def issue_iou(issuer_wallet: Wallet, to_addr: str, currency: str, value: Decimal) -> None:
    pay = Payment(
        account=issuer_wallet.classic_address,
        destination=to_addr,
        amount=IssuedCurrencyAmount(currency=currency, issuer=issuer_wallet.classic_address, value=str(value)),
    )
    signed = await async_autofill_and_sign(pay, CLIENT, issuer_wallet)
    res = await async_submit_and_wait(signed, CLIENT)
    if not _tx_succeeded(res):
        raise RuntimeError(f"Payment(IOU {currency}) failed: {_pretty_err(res)}")

#Funding & activation
async def _generate_faucet_wallet_compat() -> Wallet:
    try:
        return await async_generate_faucet_wallet(CLIENT, debug=False, faucet_host=XRPL_FAUCET_URL)
    except TypeError:
        return await async_generate_faucet_wallet(CLIENT, debug=False)

async def _pay_xrp(sender_wallet: Wallet, destination: str, amount_xrp: float) -> None:
    candidate_amounts = [amount_xrp, 10.0, 2.0, 1.0]
    last_err: Optional[Exception] = None
    for amt in candidate_amounts:
        try:
            tx = Payment(
                account=sender_wallet.classic_address,
                destination=destination,
                amount=xrp_to_drops(amt),
            )
            signed = await async_autofill_and_sign(tx, CLIENT, sender_wallet)
            res = await async_submit_and_wait(signed, CLIENT)
            if _tx_succeeded(res):
                return
        except Exception as e:
            last_err = e
            await asyncio.sleep(0.8)
    raise RuntimeError(f"Payment from temp faucet wallet failed: {last_err}")

async def fund_existing_wallet(wallet: Wallet) -> None:
    donor = await _generate_faucet_wallet_compat()
    await _pay_xrp(donor, wallet.classic_address, amount_xrp=20.0)

async def ensure_activated(wallet: Wallet, timeout_s: float = 180.0, poll_s: float = 3.0) -> None:
    addr = wallet.classic_address
    deadline = time.monotonic() + timeout_s
    faucet_called = False

    while time.monotonic() < deadline:
        try:
            resp = await CLIENT.request(AccountInfo(account=addr, ledger_index="validated", strict=True))
            _ = resp.result["account_data"]
            return
        except Exception:
            if not faucet_called:
                try:
                    await fund_existing_wallet(wallet)
                except Exception:
                    pass
                faucet_called = True
            await asyncio.sleep(poll_s)

    raise TimeoutError(f"Activation not observed for {addr} within {timeout_s}s")

async def _top_up_if_needed(wallet: Wallet, min_xrp: float = 20.0, wait_timeout_s: float = 180.0) -> None:
    await ensure_activated(wallet, timeout_s=wait_timeout_s)

    def enough(v: float) -> bool: return v >= float(min_xrp)
    bal = await xrpl_balance(wallet.classic_address)
    if enough(bal):
        return

    await fund_existing_wallet(wallet)

    deadline = time.monotonic() + wait_timeout_s
    while time.monotonic() < deadline:
        bal = await xrpl_balance(wallet.classic_address)
        if enough(bal):
            return
        await asyncio.sleep(3.0)

    raise TimeoutError(f"Top-up for {wallet.classic_address} did not reach {min_xrp} XRP in time (last={bal})")

#Wallet bootstrap (Keychain)
def build_wallet_from_seed(seed: str) -> Wallet:
    if hasattr(Wallet, "from_seed"):
        return Wallet.from_seed(seed)
    from xrpl.core.keypairs import derive_keypair, derive_classic_address
    public_key, private_key = derive_keypair(seed)
    classic_address = derive_classic_address(public_key)
    try:
        return Wallet(public_key=public_key, private_key=private_key, master_address=classic_address)
    except TypeError:
        try:
            return Wallet(public_key=public_key, private_key=private_key)
        except TypeError:
            return Wallet(public_key, private_key, classic_address)

async def _bootstrap_wallets_keychain() -> None:
    insurer_seed = _kc_get("INSURER_SEED")
    client_seed = _kc_get("CLIENT_SEED")
    iou_issuer_seed = _kc_get("IOU_ISSUER_SEED")

    if not insurer_seed:
        insurer_seed = Wallet.create().seed
        _kc_set("INSURER_SEED", insurer_seed)

    if not client_seed:
        client_seed = Wallet.create().seed
        _kc_set("CLIENT_SEED", client_seed)

    if not iou_issuer_seed:
        iou_issuer_seed = Wallet.create().seed
        _kc_set("IOU_ISSUER_SEED", iou_issuer_seed)

    global INSURER_WALLET, CLIENT_WALLET, IOU_ISSUER_WALLET
    INSURER_WALLET = build_wallet_from_seed(insurer_seed)
    CLIENT_WALLET = build_wallet_from_seed(client_seed)
    IOU_ISSUER_WALLET = build_wallet_from_seed(iou_issuer_seed)

    await ensure_activated(INSURER_WALLET)
    await ensure_activated(CLIENT_WALLET)
    await ensure_activated(IOU_ISSUER_WALLET)
    await _top_up_if_needed(INSURER_WALLET, min_xrp=20.0)
    await _top_up_if_needed(CLIENT_WALLET,  min_xrp=20.0)
    await _top_up_if_needed(IOU_ISSUER_WALLET, min_xrp=20.0)

async def _startup_prefund_xrp_and_krw() -> None:
    issuer = await ensure_iou_issuer_wallet()
    insurer = await ensure_insurer_wallet()
    client = await ensure_client_wallet()

    await asyncio.gather(
        ensure_activated(issuer),
        ensure_activated(insurer),
        ensure_activated(client),
    )
    await asyncio.gather(
        _top_up_if_needed(issuer, min_xrp=20.0),
        _top_up_if_needed(insurer, min_xrp=20.0),
        _top_up_if_needed(client, min_xrp=20.0),
    )

    await ensure_trustline(insurer, issuer.classic_address, IOU_CURRENCY, IOU_TRUST_LIMIT)
    await ensure_trustline(client, issuer.classic_address, IOU_CURRENCY, IOU_TRUST_LIMIT)

    try:
        await ensure_issuer_allows_locking(issuer)  # best-effort/no-op if unsupported
    except Exception:
        pass

    if IOU_REQUIRE_AUTH and not await issuer_requires_auth(issuer.classic_address):
        await set_issuer_require_auth(issuer, True)

    if IOU_REQUIRE_AUTH:
        await issuer_authorize_line(issuer, insurer.classic_address, IOU_CURRENCY)
        await issuer_authorize_line(issuer, client.classic_address, IOU_CURRENCY)

    owner_bal = await trust_balance(insurer.classic_address, issuer.classic_address, IOU_CURRENCY)
    if owner_bal < STARTUP_KRW_OWNER:
        await issue_iou(issuer, insurer.classic_address, IOU_CURRENCY, STARTUP_KRW_OWNER - owner_bal)

    if STARTUP_KRW_CLIENT > 0:
        client_bal = await trust_balance(client.classic_address, issuer.classic_address, IOU_CURRENCY)
        if client_bal < STARTUP_KRW_CLIENT:
            await issue_iou(issuer, client.classic_address, IOU_CURRENCY, STARTUP_KRW_CLIENT - client_bal)

    owner_bal = await trust_balance(insurer.classic_address, issuer.classic_address, IOU_CURRENCY)
    client_bal = await trust_balance(client.classic_address, issuer.classic_address, IOU_CURRENCY)
    logger.info("[startup] KRW balances -> insurer=%s %s, client=%s %s",
                owner_bal, IOU_CURRENCY, client_bal, IOU_CURRENCY)


#Accessors
async def ensure_insurer_wallet() -> Wallet:
    if INSURER_WALLET is None:
        raise RuntimeError("Wallets not bootstrapped yet")
    return INSURER_WALLET

async def ensure_client_wallet() -> Wallet:
    if CLIENT_WALLET is None:
        raise RuntimeError("Wallets not bootstrapped yet")
    return CLIENT_WALLET

async def ensure_iou_issuer_wallet() -> Wallet:
    if IOU_ISSUER_WALLET is None:
        raise RuntimeError("Wallets not bootstrapped yet")
    return IOU_ISSUER_WALLET

#Preflight
def _line_str(line: Optional[dict]) -> str:
    if not line:
        return "(no line)"
    return (
        f"bal={line.get('balance')} "
        f"limit={line.get('limit')} "
        f"auth={line.get('authorized')} "
        f"peer_auth={line.get('peer_authorized')} "
        f"freeze={line.get('freeze')} "
        f"peer_freeze={line.get('peer_freeze')}"
    )

async def fund_insurer_in_krw_if_needed(insurer_wallet: Wallet, issuer_wallet: Wallet, amount_needed: Decimal) -> None:
    await ensure_trustline(insurer_wallet, issuer_wallet.classic_address, IOU_CURRENCY, IOU_TRUST_LIMIT)
    current = await trust_balance(insurer_wallet.classic_address, issuer_wallet.classic_address, IOU_CURRENCY)
    short = amount_needed - current
    if short > Decimal("0"):
        pay = Payment(
            account=issuer_wallet.classic_address,
            destination=insurer_wallet.classic_address,
            amount=IssuedCurrencyAmount(currency=IOU_CURRENCY, issuer=issuer_wallet.classic_address, value=str(short)),
        )
        signed = await async_autofill_and_sign(pay, CLIENT, issuer_wallet)
        res = await async_submit_and_wait(signed, CLIENT)
        if not _tx_succeeded(res):
            raise RuntimeError(f"IOU issue Payment failed: {_pretty_err(res)}")

async def preflight_token_escrow(dest_addr: str, amount_krw: Decimal) -> tuple[Wallet, Wallet]:
    insurer = await ensure_insurer_wallet()
    issuer = await ensure_iou_issuer_wallet()

    await ensure_issuer_allows_locking(issuer)

    if not await has_trustline(dest_addr, issuer.classic_address, IOU_CURRENCY):
        cw = CLIENT_WALLETS.get(dest_addr)
        if cw:
            await ensure_trustline(cw, issuer.classic_address, IOU_CURRENCY, IOU_TRUST_LIMIT)
        else:
            raise HTTPException(
                412,
                f"Destination must open a trustline to {IOU_CURRENCY}/{issuer.classic_address} before escrow can deliver."
            )

    requires_auth_now = await issuer_requires_auth(issuer.classic_address)
    if IOU_REQUIRE_AUTH and not requires_auth_now:
        await set_issuer_require_auth(issuer, True)
        requires_auth_now = True
    elif not IOU_REQUIRE_AUTH and requires_auth_now:
        try:
            await set_issuer_require_auth(issuer, False)
            requires_auth_now = False
        except Exception:
            pass

    if requires_auth_now:
        ow = await get_line(insurer.classic_address, issuer.classic_address, IOU_CURRENCY)
        if not (ow and ow.get("authorized")):
            await issuer_authorize_line(issuer, insurer.classic_address, IOU_CURRENCY)
        ds = await get_line(dest_addr, issuer.classic_address, IOU_CURRENCY)
        if not (ds and ds.get("authorized")):
            await issuer_authorize_line(issuer, dest_addr, IOU_CURRENCY)

    ow = await get_line(insurer.classic_address, issuer.classic_address, IOU_CURRENCY)
    ds = await get_line(dest_addr, issuer.classic_address, IOU_CURRENCY)
    logger.info("owner line: %s", _line_str(ow))
    logger.info("dest  line: %s", _line_str(ds))

    if ow and (ow.get("freeze") or ow.get("peer_freeze")):
        raise HTTPException(409, "Owner trust line is frozen.")
    if ds and (ds.get("freeze") or ds.get("peer_freeze")):
        raise HTTPException(409, "Destination trust line is frozen.")

    await fund_insurer_in_krw_if_needed(insurer, issuer, amount_krw)
    bal = await trust_balance(insurer.classic_address, issuer.classic_address, IOU_CURRENCY)
    if bal < amount_krw:
        raise HTTPException(409, f"Owner IOU balance {bal} < escrow amount {amount_krw}.")

    return insurer, issuer

#Session helpers
def require_session(x_session_token: Optional[str]) -> str:
    if not x_session_token:
        raise HTTPException(401, "Login required. Provide X-Session-Token header.")
    addr = SESSIONS.get(x_session_token)
    if not addr:
        raise HTTPException(401, "Invalid session.")
    return addr

def make_condition() -> tuple[str, str, str]:
    preimage = os.urandom(32)
    fulfillment = PreimageSha256(preimage=preimage)
    condition_hex = fulfillment.condition_binary.hex().upper()
    fulfillment_hex = fulfillment.serialize_binary().hex().upper()
    preimage_hex = preimage.hex().upper()
    return condition_hex, fulfillment_hex, preimage_hex

# FastAPI RESTFUL API
@app.on_event("startup")
async def _startup() -> None:
    await _bootstrap_wallets_keychain()

    CLIENT_WALLETS[CLIENT_WALLET.classic_address] = CLIENT_WALLET

    await _startup_prefund_xrp_and_krw()

    print("XRPL JSON-RPC:", XRPL_RPC_URL)
    print("Server version:", await server_version())
    print("INSURER_ADDRESS:", INSURER_WALLET.classic_address)
    print("CLIENT_ADDRESS :", CLIENT_WALLET.classic_address)
    print("IOU_ISSUER_ADDR:", IOU_ISSUER_WALLET.classic_address)


@app.get("/health")
async def health():
    ver = await server_version()
    return {"status": "ok", "rpc": XRPL_RPC_URL, "faucet": XRPL_FAUCET_URL, "server_version": ver}

@app.post("/auth/login_faucet", response_model=FaucetLoginOut)
async def login_faucet() -> FaucetLoginOut:
    try:
        client_wallet = CLIENT_WALLET
        if client_wallet is None:
            raise RuntimeError("CLIENT_WALLET is not initialized")

        token = secrets.token_urlsafe(24)
        SESSIONS[token] = client_wallet.classic_address
        CLIENT_WALLETS[client_wallet.classic_address] = client_wallet

        return FaucetLoginOut(
            session_token=token,
            address=client_wallet.classic_address,
            seed=getattr(client_wallet, "seed", None),
            public_key=getattr(client_wallet, "public_key", None),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Faucet login failed: {e}")

#Escrow (TokenEscrow: KRW IOU)
@app.post("/escrow/create", response_model=CreateOut)
async def escrow_create(amount_krw: str, x_session_token: Optional[str] = Header(None)) -> CreateOut:

    destination = require_session(x_session_token)
    insurer_wallet = await ensure_insurer_wallet()
    issuer_wallet = await ensure_iou_issuer_wallet()

    try:
        amt_krw = Decimal(amount_krw)
        if amt_krw <= 0:
            raise ValueError()
    except Exception:
        raise HTTPException(422, "KRW must be a positive numeric string (interpreted as KRW).")

    _insurer, issuer_wallet = await preflight_token_escrow(destination, amt_krw)

    condition_hex, fulfillment_hex, preimage_hex = make_condition()

    try:
        tx = EscrowCreate(
            account=insurer_wallet.classic_address,
            destination=destination,
            amount=IssuedCurrencyAmount(
                currency=IOU_CURRENCY,
                issuer=issuer_wallet.classic_address,
                value=str(amt_krw),
            ),
            condition=condition_hex,
            cancel_after=ripple_epoch_now() + 3600,
        )
        prepared = await async_autofill_and_sign(tx, CLIENT, insurer_wallet)
        offer_seq = prepared.sequence
        result = await async_submit_and_wait(prepared, CLIENT)
        if not _tx_succeeded(result):

            raise HTTPException(502, detail={"escrow_create_error": _pretty_err(result)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, detail=f"EscrowCreate failed: {e}")

    escrow_id = str(uuid.uuid4())
    ESCROWS[escrow_id] = EscrowRef(
        id=escrow_id,
        owner=insurer_wallet.classic_address,
        destination=destination,
        offer_sequence=offer_seq,
        amount_iou=amt_krw,
        condition_hex=condition_hex,
        fulfillment_hex=fulfillment_hex,
        preimage_hex=preimage_hex,
    )

    return CreateOut(escrow_id=escrow_id, message="An IOU (KRW) TokenEscrow has been created")

@app.post("/escrow/finish", response_model=FinishOut)
async def escrow_finish(body: FinishIn, x_session_token: Optional[str] = Header(None)) -> FinishOut:
    claimant = require_session(x_session_token)
    insurer_wallet = await ensure_insurer_wallet()
    ref = ESCROWS.get(body.escrow_id)
    if not ref:
        raise HTTPException(404, "Unknown escrow_id")
    if ref.destination != claimant:
        raise HTTPException(403, "This escrow does not belong to the logged-in address")
    if ref.finished:
        return FinishOut(escrow_id=ref.id, finished=True, tx_hash=ref.finish_tx, message="Already paid.")

    try:
        tx = EscrowFinish(
            account=insurer_wallet.classic_address,
            owner=ref.owner,
            offer_sequence=ref.offer_sequence,
            fulfillment=ref.fulfillment_hex,
            condition=ref.condition_hex,
        )
        prepared = await async_autofill_and_sign(tx, CLIENT, insurer_wallet)
        result = await async_submit_and_wait(prepared, CLIENT)
        if not _tx_succeeded(result):
            raise RuntimeError(_pretty_err(result))
        ref.finished = True
        ref.finish_tx = _tx_hash_of(result)
    except Exception as e:
        raise HTTPException(502, f"EscrowFinish failed: {e}")

    return FinishOut(
        escrow_id=ref.id,
        finished=True,
        tx_hash=ref.finish_tx,
        message="The insurance benefit you requested has been paid"
    )

@app.post("/escrow/cancel", response_model=CancelOut)
async def escrow_cancel(body: CancelIn, x_session_token: Optional[str] = Header(None)) -> CancelOut:
    _ = require_session(x_session_token)
    insurer_wallet = await ensure_insurer_wallet()

    ref = ESCROWS.get(body.escrow_id)
    if not ref:
        raise HTTPException(404, "Unknown escrow_id")
    if ref.finished:
        return CancelOut(escrow_id=ref.id, canceled=False, tx_hash=ref.finish_tx, message="Escrow already finished.")
    if ref.canceled:
        return CancelOut(escrow_id=ref.id, canceled=True, tx_hash=ref.cancel_tx, message="Escrow already canceled.")

    try:
        tx = EscrowCancel(
            account=insurer_wallet.classic_address,
            owner=ref.owner,
            offer_sequence=ref.offer_sequence,
        )
        prepared = await async_autofill_and_sign(tx, CLIENT, insurer_wallet)
        result = await async_submit_and_wait(prepared, CLIENT)
        if not _tx_succeeded(result):
            raise RuntimeError(_pretty_err(result))
        ref.canceled = True
        ref.cancel_tx = _tx_hash_of(result)
    except Exception as e:
        raise HTTPException(502, f"EscrowCancel failed: {e}")

    return CancelOut(
        escrow_id=ref.id,
        canceled=True,
        tx_hash=ref.cancel_tx,
        message="The escrow has been canceled. The deposited IOU has been returned to the insurer's wallet"
    )

@app.get("/balances/insurer", response_model=InsurerBalanceOut)
async def get_insurer_balance(x_session_token: Optional[str] = Header(None)) -> InsurerBalanceOut:
    _ = require_session(x_session_token)
    insurer_wallet = await ensure_insurer_wallet()
    try:
        insurer_balance_xrp = await xrpl_balance(insurer_wallet.classic_address)
        issuer = await ensure_iou_issuer_wallet()
        krw_bal = await trust_balance(
            holder_addr=insurer_wallet.classic_address,
            issuer_addr=issuer.classic_address,
            currency=IOU_CURRENCY,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Insurer balance lookup failed: {e}")

    return InsurerBalanceOut(
        insurer_address=insurer_wallet.classic_address,
        insurer_balance_krw=float(krw_bal),
        insurer_balance_xrp=insurer_balance_xrp
    )

@app.get("/balances/client", response_model=ClientBalanceOut)
async def get_client_balance(x_session_token: Optional[str] = Header(None)) -> ClientBalanceOut:
    client_address = require_session(x_session_token)
    try:
        client_balance_xrp = await xrpl_balance(client_address)
        issuer = await ensure_iou_issuer_wallet()
        krw_bal = await trust_balance(
            holder_addr=client_address,
            issuer_addr=issuer.classic_address,
            currency=IOU_CURRENCY,
        )
        client_balance_krw = float(krw_bal)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Client balance lookup failed: {e}")

    return ClientBalanceOut(
        client_address=client_address,
        client_balance_xrp=client_balance_xrp,
        client_balance_krw=client_balance_krw,
    )

# Agent
MODEL_ID = "google/gemma-3-4b-it"
DEVICE = "cpu"
DTYPE = torch.bfloat16 if DEVICE in ("cuda", "mps") else torch.float32

processor = AutoProcessor.from_pretrained(MODEL_ID)
model = Gemma3ForConditionalGeneration.from_pretrained(MODEL_ID, torch_dtype=DTYPE)
model.to(DEVICE)
model.eval()
logger.info(f"Model loaded: {MODEL_ID} on device={DEVICE}, dtype={DTYPE}")

@dataclass
class ChatTurn:
    role: Literal["user", "model"]
    content: str

@dataclass
class ParsedLLMOutput:
    raw: str
    model_generated_output: str
    last_user: Optional[str]
    system_prompt: Optional[str]
    turns: List[ChatTurn]

class ChatTurnSchema(BaseModel):
    role: Literal["user", "model"]
    content: str

class ParsedLLMOutputSchema(BaseModel):
    raw: str
    model_generated_output: str
    last_user: Optional[str] = None
    system_prompt: Optional[str] = None
    turns: List[ChatTurnSchema]

class AgentsResponse(BaseModel):
    results: Dict[str, str]

def _read_image(upload: UploadFile) -> Image.Image:
    raw = upload.file.read()
    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")
    MAX_SIDE = 2000
    w, h = img.size
    if max(w, h) > MAX_SIDE:
        s = MAX_SIDE / float(max(w, h))
        img = img.resize((int(w * s), int(h * s)))
    return img

def _to_device(batch: Dict[str, Any], device: str) -> Dict[str, Any]:
    moved = {}
    for k, v in batch.items():
        try:
            moved[k] = v.to(device)
        except AttributeError:
            moved[k] = v
    return moved

def _generate_with_system(
    system_prompt: str,
    test_input: str,
    pil_img: Optional[Image.Image],
    max_new_tokens: int,
    temperature: float = 0.2,
) -> str:
    if pil_img is not None:
        messages = [
            {"role": "system", "content": [{"type": "text", "text": system_prompt}]},
            {"role": "user", "content": [{"type": "image"}, {"type": "text", "text": test_input}]},
        ]
        has_image = True
    else:
        messages = [
            {"role": "system", "content": [{"type": "text", "text": system_prompt}]},
            {"role": "user", "content": [{"type": "text", "text": test_input}]},
        ]
        has_image = False

    prompt = processor.apply_chat_template(messages, add_generation_prompt=True, tokenize=False)
    if has_image:
        encoded = processor(text=prompt, images=[pil_img], do_pan_and_scan=True, return_tensors="pt")
    else:
        encoded = processor(text=prompt, return_tensors="pt")
    encoded = _to_device(encoded, DEVICE)

    with torch.inference_mode():
        generated = model.generate(**encoded, max_new_tokens=max_new_tokens, temperature=temperature)
    text = processor.batch_decode(generated, skip_special_tokens=True)[0].strip()
    if not text:
        raise HTTPException(status_code=502, detail="Empty response from model.")
    return text

_TURN_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"(?:^|\n)<start_of_turn>\s*user\s*(?:\n|$)", re.IGNORECASE), "user"),
    (re.compile(r"(?:^|\n)<start_of_turn>\s*model\s*(?:\n|$)", re.IGNORECASE), "model"),
    (re.compile(r"(?:^|\n)user\s*(?:\n|$)", re.IGNORECASE), "user"),
    (re.compile(r"(?:^|\n)model\s*(?:\n|$)", re.IGNORECASE), "model"),
    (re.compile(r"(?:^|\n)assistant\s*(?:\n|$)", re.IGNORECASE), "model"),
    (re.compile(r"(?:^|\n)###\s*User\s*:?\s*(?:\n|$)", re.IGNORECASE), "user"),
    (re.compile(r"(?:^|\n)###\s*Assistant\s*:?\s*(?:\n|$)", re.IGNORECASE), "model"),
]

def _split_rendered_chat_turns(full_text: str) -> List[Tuple[str, str]]:
    text = full_text if isinstance(full_text, str) else str(full_text)
    markers: List[Tuple[int, int, str]] = []
    for pat, role in _TURN_PATTERNS:
        for m in pat.finditer(text):
            markers.append((m.start(), m.end(), role))
    if not markers:
        return [("model", text.strip())] if text.strip() else []
    markers.sort(key=lambda x: x[0])
    segments: List[Tuple[str, str]] = []
    for i, (start, end, role) in enumerate(markers):
        seg_start = end
        seg_end = markers[i + 1][0] if i + 1 < len(markers) else len(text)
        if seg_start <= seg_end:
            content = text[seg_start:seg_end].strip()
            if content:
                segments.append((role, content))
    return segments

def parse_llm_raw(full_decoded_text: str, system_prompt_hint: Optional[str] = None) -> ParsedLLMOutput:
    turns_tuples = _split_rendered_chat_turns(full_decoded_text)
    turns = [ChatTurn(role=r, content=c) for (r, c) in turns_tuples]
    model_out = ""
    for r, c in reversed(turns_tuples):
        if r == "model":
            model_out = c.strip()
            break
    if not model_out:
        model_out = full_decoded_text.strip()
    last_user = None
    for r, c in reversed(turns_tuples):
        if r == "user":
            last_user = c.strip()
            break
    return ParsedLLMOutput(
        raw=full_decoded_text,
        model_generated_output=model_out,
        last_user=last_user,
        system_prompt=system_prompt_hint,
        turns=turns,
    )

#Agent Set
def IntentClassifierAgentSystem(text_input: str, pil_img: Optional[Image.Image], max_new_tokens: int,
           system_prompt: Optional[str] = None, temperature: float = 0.2) -> ParsedLLMOutput:
    sys_prompt = IntentClassifierAgentSystemInput
    raw = _generate_with_system(sys_prompt, text_input, pil_img, max_new_tokens, temperature)
    print(f"IntentClassifierAgentSystem:{raw}")

    return parse_llm_raw(raw, system_prompt_hint=sys_prompt)

def CoveredDecisionAgent(text_input: str, pil_img: Optional[Image.Image], max_new_tokens: int,
           system_prompt: Optional[str] = None, temperature: float = 0.2) -> ParsedLLMOutput:
    sys_prompt = ValidatorAgentSystemInput
    raw = _generate_with_system(sys_prompt, text_input, pil_img, max_new_tokens, temperature)
    print(f"CoveredDecisionAgent:{raw}")
    return parse_llm_raw(raw, system_prompt_hint=sys_prompt)

def DataCompletenessEvaluatorAgent(text_input: str, pil_img: Optional[Image.Image], max_new_tokens: int,
           system_prompt: Optional[str] = None, temperature: float = 0.2) -> ParsedLLMOutput:
    sys_prompt = DataCompletenessEvaluatorAgentSystemInput
    raw = _generate_with_system(sys_prompt, text_input, pil_img, max_new_tokens, temperature)
    print(f"DataCompletenessEvaluatorAgent:{raw}")
    return parse_llm_raw(raw, system_prompt_hint=sys_prompt)

def DocuementExtractorAgent(text_input: str, pil_img: Optional[Image.Image], max_new_tokens: int,
           system_prompt: Optional[str] = None, temperature: float = 0.2) -> ParsedLLMOutput:
    sys_prompt = DocuementExtractorAgentSystemInput
    raw = _generate_with_system(sys_prompt, text_input, pil_img, max_new_tokens, temperature)
    print(f"DocuementExtractorAgent:{raw}")
    return parse_llm_raw(raw, system_prompt_hint=sys_prompt)

def ValidatorAgentSystem(text_input: str, pil_img: Optional[Image.Image], max_new_tokens: int,
           system_prompt: Optional[str] = None, temperature: float = 0.2) -> ParsedLLMOutput:
    sys_prompt = ValidatorAgentSystemInput
    raw = _generate_with_system(sys_prompt, text_input, pil_img, max_new_tokens, temperature)
    print(f"ValidatorAgentSystem:{raw}")
    return parse_llm_raw(raw, system_prompt_hint=sys_prompt)

def ExplainerAgentSystem(text_input: str, pil_img: Optional[Image.Image], max_new_tokens: int,
           system_prompt: Optional[str] = None, temperature: float = 0.2) -> ParsedLLMOutput:
    sys_prompt = system_prompt
    raw = _generate_with_system(sys_prompt, text_input, pil_img, max_new_tokens, temperature)
    print(f"ExplainerAgentSystem:{raw}")
    return parse_llm_raw(raw, system_prompt_hint=sys_prompt)

DEFAULT_KNOWLEDGE_MD = """# Knowledge
_No additional knowledge was provided. Use only the user description and image if any._
"""

@app.post("/agent_transaction_request", response_model=AgentsResponse)
async def agent_transaction_request(
    user_transaction_description: str = Form(...),
    image: Optional[UploadFile] = File(None),
    knowledge_markdown: Optional[str] = Form(None),
    agent1_max_new_tokens: int = Form(256),
    agent2_max_new_tokens: int = Form(256),
    agent1_system_prompt: Optional[str] = Form(None),
    agent2_system_prompt: Optional[str] = Form(None),
    temperature: float = Form(0.2),
    x_session_token: Optional[str] = Header(None),
):
    model_knowledge_md_input = (knowledge_markdown or DEFAULT_KNOWLEDGE_MD).strip()

    req_id = uuid.uuid4().hex[:8]
    t0 = time.perf_counter()
    has_img = bool(image is not None and getattr(image, "filename", ""))
    logger.info(
        f"[{req_id}] /run_agents start | image={has_img} | "
        f"agent1_max={agent1_max_new_tokens} | agent2_max={agent2_max_new_tokens} | temp={temperature}"
    )

    pil_img = _read_image(image) if has_img else None

    try:
        IntentClassifierAgentSystem_text_input_merged = (
            f"user_prompt:{user_transaction_description}"
        )
        IntentClassifierAgent_out = IntentClassifierAgentSystem(
            text_input=IntentClassifierAgentSystem_text_input_merged,
            pil_img=None,
            max_new_tokens=agent1_max_new_tokens,
            system_prompt=agent1_system_prompt,
            temperature=temperature,
        )
        CoveredDecisionAgent_text_input_merged = (
            f"user_prompt:{user_transaction_description}"
            f"mark_down:{model_knowledge_md_input}"
        )
        CoveredDecisionAgent_out = CoveredDecisionAgent(
            text_input=CoveredDecisionAgent_text_input_merged,
            pil_img=None,
            max_new_tokens=agent2_max_new_tokens,
            system_prompt=agent2_system_prompt,
            temperature=temperature,
        )

        DataCompletenessEvaluatorAgent_out = DataCompletenessEvaluatorAgent(
            text_input="Only check data completeness",
            pil_img=pil_img,
            max_new_tokens=agent2_max_new_tokens,
            system_prompt=agent2_system_prompt,
            temperature=temperature,
        )
        DocuementExtractorAgent_out = DocuementExtractorAgent(
            text_input="Only extract text in document image",
            pil_img=pil_img,
            max_new_tokens=agent2_max_new_tokens,
            system_prompt=agent2_system_prompt,
            temperature=temperature,)

        ValidatorAgent_text_input_merged = (
            f"user_prompt:{user_transaction_description}"
            f"IntentClassifierAgent_out:{IntentClassifierAgent_out.model_generated_output}"
            f"CoveredDecisionAgent_out: {CoveredDecisionAgent_out.model_generated_output}"
            f"DataCompletenessEvaluatorAgent_out: {DataCompletenessEvaluatorAgent_out.model_generated_output}"
            f"DocuementExtractorAgent_out: {DocuementExtractorAgent_out.model_generated_output}"
        )

        ValidatorAgentSystem_out = ValidatorAgentSystem(
            text_input=ValidatorAgent_text_input_merged,
            pil_img=pil_img,
            max_new_tokens=agent2_max_new_tokens,
            system_prompt=agent2_system_prompt,
            temperature=temperature,
        )

        ExplainerAgentSystemInput = (
            f"role:Based on the information below, infer why DocuementExtractorAgent_out made this decision and explain it in detail. Tell me what additional information is needed."
            f"{ValidatorAgent_text_input_merged}"
            f"ValidatorAgentSystem_out:{ValidatorAgentSystem_out.model_generated_output}"
        )

        ExplainerAgentSystem_out = ExplainerAgentSystem(
            text_input=ValidatorAgent_text_input_merged,
            pil_img=pil_img,
            max_new_tokens=agent2_max_new_tokens,
            system_prompt=ExplainerAgentSystemInput,
            temperature=temperature,
        )


        if ValidatorAgentSystem_out.model_generated_output == "Accepted":
            claimant = require_session(x_session_token)
            pending = [
                e for e in ESCROWS.values()
                if e.destination == claimant and not e.finished and not e.canceled
            ]
            if not pending:
                return AgentsResponse(results={"decision": "Accepted", "reason": "No pending escrow to finish."})

            ref = max(pending, key=lambda e: e.offer_sequence)
            fin = await escrow_finish(FinishIn(escrow_id=ref.id), x_session_token=x_session_token)

            return AgentsResponse(results={
                "decision": "Accepted",
                "reason": ExplainerAgentSystem_out.model_generated_output,
                "escrow_id": fin.escrow_id,
                "tx_hash": fin.tx_hash,
            })

        elif ValidatorAgentSystem_out.model_generated_output == "Declined":
            return AgentsResponse(results={"decision": "Declined", "Reason": ExplainerAgentSystem_out.model_generated_output})
        elif ValidatorAgentSystem_out.model_generated_output == "Escalate to human":
            return AgentsResponse(results={"decision": "Escalate to human", "Reason": ExplainerAgentSystem_out.model_generated_output})
        else:
            return AgentsResponse(results={"decision": "Unknown", "Reason": ExplainerAgentSystem_out.model_generated_output})

    except Exception as e:
        logger.exception(f"[{req_id}] /run_agents failed: {e}")
        raise HTTPException(status_code=500, detail=f"Agent error: {e}")
    finally:
        dt = time.perf_counter() - t0
        logger.info(f"[{req_id}] /run_agents finished in {dt:.2f}s")

#Tester UI
TEST_HTML = r"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>DA-Fi Backend Tester</title>
<style>
  :root { --bg:#0b0c10; --card:#12141a; --muted:#9aa3af; --fg:#e5e7eb; --accent:#60a5fa; --ok:#34d399; --warn:#f59e0b; --err:#ef4444; }
  * { box-sizing: border-box; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
  body { margin:0; background:var(--bg); color:var(--fg); }
  .wrap { max-width: 980px; margin: 24px auto 120px; padding: 0 16px; }
  h1 { font-size: 20px; margin: 0 0 12px; }
  h2 { font-size: 16px; margin: 24px 0 10px; color: var(--muted); }
  .card { background: var(--card); border: 1px solid #1f2430; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
  .row { display:flex; gap:8px; align-items:center; flex-wrap: wrap; }
  input, button, select, textarea { background:#0f1220; color:var(--fg); border:1px solid #1f2430; border-radius:8px; padding:8px 10px; }
  input[type="file"] { padding: 6px; }
  button { cursor:pointer; background:#111827; border-color:#273043; }
  button.primary { background:#1f2937; border-color:#334155; color:var(--accent); }
  button:hover { filter: brightness(1.08); }
  code, pre { background:#0f1220; color:#cbd5e1; border:1px solid #273043; border-radius:8px; padding:10px; display:block; overflow:auto; }
  .muted { color: var(--muted); }
  .pill { padding:2px 8px; border-radius:999px; border:1px solid #334155; background:#0f1220; }
  .ok { color: var(--ok); } .warn { color: var(--warn); } .err { color: var(--err); }
  .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 880px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <h1>DA-Fi Backend Tester <span class="pill" id="base"></span></h1>

  <div class="card">
    <div class="row">
      <button id="btnHealth" class="primary">Health</button>
      <button id="btnFaucet" class="primary">Login (Faucet)</button>
      <span class="muted">Session:</span>
      <span id="tok" class="pill">none</span>
      <span class="muted">Client:</span>
      <span id="addr" class="pill">—</span>
    </div>
    <div id="healthOut" style="margin-top:10px;"></div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>Balances</h2>
      <div class="row">
        <button id="btnBalInsurer">Insurer Balance</button>
        <button id="btnBalClient">Client Balance</button>
      </div>
        <pre id="balOut" style="margin-top:10px; min-height: 64px;"></pre>
    </div>

    <div class="card">
      <h2>Create Escrow</h2>
      <div class="row">
        <input id="inAmount" type="text" placeholder="amount_krw (e.g. 1000)" />
        <button id="btnCreate">Create</button>
      </div>
      <div class="muted" style="margin-top:8px;">Returned <code>escrow_id</code> will be saved locally (not on server).</div>
      <pre id="createOut" style="margin-top:10px; min-height:48px;"></pre>
    </div>
  </div>

  <div class="card">
    <h2>Finish / Cancel Escrow</h2>
    <div class="row" style="margin-bottom:8px;">
      <select id="escrows"></select>
      <button id="btnFinish">Finish</button>
      <button id="btnCancel">Cancel</button>
      <button id="btnForget">Forget Locally</button>
    </div>
    <div class="muted">Escrows shown here are those you’ve created in this browser (stored in <code>localStorage</code>).</div>
    <pre id="fxOut" style="margin-top:10px; min-height: 64px;"></pre>
  </div>

  <div class="card">
    <h2>Agent Transaction Request</h2>
    <div class="row">
      <input type="number" id="a1max" value="256" min="1" style="width:120px" />
      <label for="a1max" class="muted">agent1_max_new_tokens</label>
    </div>
    <div class="row" style="margin-top:6px;">
      <input type="number" id="a2max" value="256" min="1" style="width:120px" />
      <label for="a2max" class="muted">agent2_max_new_tokens</label>
    </div>
    <div class="row" style="margin-top:6px;">
      <input type="number" id="temp" value="0.2" step="0.1" style="width:120px" />
      <label for="temp" class="muted">temperature</label>
    </div>
    <textarea id="desc" rows="4" placeholder="Describe the claim / transaction..." style="width:100%; margin-top:8px;"></textarea>
    <div class="row" style="margin-top:8px;">
      <input id="img" type="file" accept="image/*" />
      <button id="btnAgent" class="primary">Run Agent</button>
    </div>
    <pre id="agentOut" style="margin-top:10px; min-height: 80px;"></pre>
  </div>

  <div class="card">
    <h2>Console</h2>
    <pre id="log" style="min-height: 100px;"></pre>
  </div>
</div>

<script>
  const $ = (sel) => document.querySelector(sel);
  const log = (msg, cls="") => { const box = $("#log"); const line = document.createElement("div"); if (cls) line.className = cls; line.textContent = msg; box.appendChild(line); box.scrollTop = box.scrollHeight; };
  const BASE = location.origin;
  $("#base").textContent = BASE;

  const state = {
    token: localStorage.getItem("session_token") || "",
    address: localStorage.getItem("client_address") || "",
    escrows: JSON.parse(localStorage.getItem("escrows") || "[]"),
  };

  const applyAuthUI = () => {
    $("#tok").textContent = state.token ? state.token.slice(0,12) + "..." : "none";
    $("#addr").textContent = state.address || "—";
  };
  const saveEscrows = () => localStorage.setItem("escrows", JSON.stringify(state.escrows));
  const refreshEscrowSelect = () => {
    const sel = $("#escrows"); sel.innerHTML = "";
    if (state.escrows.length === 0) {
      const opt = document.createElement("option");
      opt.value = ""; opt.textContent = "(no local escrows)"; sel.appendChild(opt); return;
    }
    for (const e of state.escrows) {
      const opt = document.createElement("option");
      opt.value = e.id; opt.textContent = `${e.id} — ${e.amount_krw ?? "?"} KRW`; sel.appendChild(opt);
    }
  };
  applyAuthUI(); refreshEscrowSelect();

  async function http(path, { method="GET", body=null, headers={} } = {}) {
    const url = path.startsWith("http") ? path : (BASE + path);
    const options = { method, headers: { ...headers } };
    const isForm = (body && (body instanceof FormData));
    if (state.token) options.headers["X-Session-Token"] = state.token;
    if (body && !isForm) { options.headers["Content-Type"] = "application/json"; options.body = JSON.stringify(body); }
    else if (isForm) { options.body = body; }
    const res = await fetch(url, options);
    let data = null; try { data = await res.json(); } catch {}
    if (!res.ok) {
      const detail = (data && (data.detail || data.message)) || res.statusText;
      throw new Error(`HTTP ${res.status}: ${detail}`);
    }
    return data;
  }
  const showJSON = (node, obj) => node.textContent = JSON.stringify(obj, null, 2);

  $("#btnHealth").onclick = async () => { try { const j = await http("/health"); showJSON($("#healthOut"), j); log("Health OK","ok"); } catch(e){ log(e.message,"err"); } };
  $("#btnFaucet").onclick = async () => {
    try {
      const j = await http("/auth/login_faucet", { method: "POST" });
      state.token = j.session_token; state.address = j.address;
      localStorage.setItem("session_token", state.token);
      localStorage.setItem("client_address", state.address);
      applyAuthUI(); showJSON($("#healthOut"), j); log("Faucet login complete. Token stored.","ok");
    } catch(e){ log(e.message,"err"); }
  };
  $("#btnBalInsurer").onclick = async () => { try{ const j = await http("/balances/insurer"); showJSON($("#balOut"), j); log("Fetched insurer balance","ok"); } catch(e){ log(e.message,"err"); } };
  $("#btnBalClient").onclick = async () => { try{ const j = await http("/balances/client"); showJSON($("#balOut"), j); log("Fetched client balance","ok"); } catch(e){ log(e.message,"err"); } };
  $("#btnCreate").onclick = async () => {
    const amt = $("#inAmount").value.trim(); if (!amt) { alert("Enter amount_krw"); return; }
    try {
      const j = await http(`/escrow/create?amount_krw=${encodeURIComponent(amt)}`, { method: "POST" });
      showJSON($("#createOut"), j);
      state.escrows.unshift({ id: j.escrow_id, amount_krw: amt }); state.escrows = state.escrows.slice(0, 20);
      saveEscrows(); refreshEscrowSelect(); log(`Escrow created: ${j.escrow_id}`,"ok");
    } catch(e){ log(e.message,"err"); }
  };
  $("#btnFinish").onclick = async () => {
    const id = $("#escrows").value; if (!id) { alert("No escrow selected"); return; }
    try { const j = await http("/escrow/finish", { method:"POST", body:{ escrow_id:id } });
      showJSON($("#fxOut"), j); log(`Finish OK: ${id}`,"ok");
      state.escrows = state.escrows.filter(x => x.id !== id); saveEscrows(); refreshEscrowSelect();
    } catch(e){ log(e.message,"err"); }
  };
  $("#btnCancel").onclick = async () => {
    const id = $("#escrows").value; if (!id) { alert("No escrow selected"); return; }
    try { const j = await http("/escrow/cancel", { method:"POST", body:{ escrow_id:id } });
      showJSON($("#fxOut"), j); log(`Cancel attempted: ${id}`,"warn");
      state.escrows = state.escrows.filter(x => x.id !== id); saveEscrows(); refreshEscrowSelect();
    } catch(e){ log(e.message,"err"); }
  };
  $("#btnForget").onclick = () => {
    const id = $("#escrows").value; if (!id) return;
    state.escrows = state.escrows.filter(x => x.id !== id); saveEscrows(); refreshEscrowSelect(); $("#fxOut").textContent = ""; log(`Forgot local escrow: ${id}`,"warn");
  };
  $("#btnAgent").onclick = async () => {
    const desc = $("#desc").value.trim(); if (!desc) { alert("Enter description text"); return; }
    const a1 = parseInt($("#a1max").value || "256", 10);
    const a2 = parseInt($("#a2max").value || "256", 10);
    const t  = parseFloat($("#temp").value || "0.2");
    const f = new FormData(); f.append("user_transaction_description", desc);
    f.append("agent1_max_new_tokens", String(a1)); f.append("agent2_max_new_tokens", String(a2)); f.append("temperature", String(t));
    const file = $("#img").files[0]; if (file) f.append("image", file);
    try { const j = await http("/agent_transaction_request", { method:"POST", body:f }); showJSON($("#agentOut"), j); log("Agent request done","ok"); } catch(e){ log(e.message,"err"); }
  };
</script>
</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
def tester_home():
    return HTMLResponse(TEST_HTML)
