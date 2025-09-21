# 📱 DA-Fi 앱

DA-Fi 앱은 사용자가 직접 실행해 볼 수 있는 **메인 애플리케이션**입니다. 이 브랜치는 **프론트엔드와 백엔드가 함께 동작**하며, 로컬 환경에서 바로 테스트할 수 있습니다.

---

### 🗂️ 디렉토리 구조

```
app/
├─ frontend/ # React + Vite (사용자 UI)
└─ backend/ # Express + Prisma (API 서버)
```

---

### 🚀 실행 방법

#### 1️⃣ 저장소 클론 및 브랜치 이동

먼저, 아래 명령어를 실행해 저장소를 클론하고 `app` 브랜치로 이동하세요.

```bash
git clone https://github.com/sein12/BlockSmith-2025_XRPL_Hackathon.git
cd BlockSmith-2025_XRPL_Hackathon
git checkout app
```

---

#### 2️⃣ 백엔드 설정

1. backend 디렉토리로 이동

```
cd backend
```

2. 환경 변수 설정
   .env 파일을 생성하고 아래 내용을 입력합니다.
   (JWT_SECRET은 직접 생성한 임의 문자열, PARTNER_BASE_URL은 실제 API 서버 주소 또는 테스트용 URL)

```
DATABASE_URL="file:./dev.db"

# API
PORT=3000
NODE_ENV=development

# Auth
JWT_SECRET=여기에_직접_생성한_JWT_시크릿_키
PARTNER_BASE_URL=사용자_API_주소_또는_테스트_URL
```

3. 의존성 설치 및 서버 실행

```
npm install
npm run dev
```

백엔드 서버는 기본적으로 http://localhost:3000 에서 실행됩니다.

#### 3️⃣ 프론트엔드 설정

1. frontend 디렉토리로 이동

```
cd ../frontend
```

2. 의존성 설치 및 개발 서버 실행

```
npm install
npm run dev
```

---

### 📌 주의사항

- 백엔드 .env 필수: DATABASE_URL, JWT_SECRET, PARTNER_BASE_URL을 설정하지 않으면 서버가 실행되지 않거나 인증/외부 연동이 동작하지 않습니다.

- 데이터베이스는 SQLite(dev.db) 를 사용하며, 최초 실행 시 Prisma가 자동으로 스키마를 초기화합니다.

- 포트가 이미 사용 중이라면 .env에서 PORT 값을 변경해 주세요.

### 🧩 기술 스택

- Frontend: React + Vite + TypeScript + Shadcn UI

- Backend: Node.js + Express + Prisma + SQLite

- Auth: JWT 기반 사용자 인증
