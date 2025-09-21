# 🚀 DA-Fi Solution

> 거래는 합의로 성립하며 블록체인은 신뢰를 제공합니다. 우리는 XRPL과 AI Agent 기반 Contextual Transaction 솔루션을 통해 빠르고 안전한 B2C·C2C 거래를 실현합니다.

## 1️⃣ 데모 영상

프로젝트의 실제 동작을 확인할 수 있는 시연 영상입니다.

- **데모 영상**  
  [▶️ 시청하기](https://youtu.be/3V1SUk8kTH0)

---

## 2️⃣ UI 스크린샷

| 메인 화면                                               | 세부 화면                                               |
| ------------------------------------------------------- | ------------------------------------------------------- |
| ![메인화면](./image/스크린샷%202025-09-21%20080559.png) | ![세부화면](./image/스크린샷%202025-09-21%20080340.png) |

---

## 3️⃣ XRPL 활용 설명

이 프로젝트가 **XRP Ledger(XRPL)**과 상호작용하는 방법:

- **사용 기술**

  - `xrpl` TypeScript/Python 라이브러리 사용
  - 구현 기능: Token Escrow, Credential

- **구현 내용**

  1. XRPL의 Credential을 통한 사용자 인증
  2. 조건 충족 시 자동 결제 트랜잭션 생성
  3. XRPL의 Token Escrow 기능으로 자금 예약/송금/취소 처리

- **트랜잭션 예시**

  - Wallet Address(Devnet): r9FgT7DUVJg2Y5HxewDchkZxgT4QZKhBRU

  [🔗 블록 익스플로러에서 보기](https://devnet.xrpl.org/accounts/r9FgT7DUVJg2Y5HxewDchkZxgT4QZKhBRU)

---

## 브랜치별 안내 (요약)

| 브랜치           | 목적 (요약)                        |
| ---------------- | ---------------------------------- | --- |
| `main`           | 메인 문서/허브, 리드미             |     |
| `agent-payment`  | Token Escrow & AI agent            |
| `app`            | Main App(FE & BE)                  |
| `frontend-admin` | 관리자 페이지(Agent & Escrow 관리) |

> 각 브랜치의 상세한 실행 방법은 해당 브랜치의 `README.md`를 확인하세요.
