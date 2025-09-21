# 📱 DA-Fi 앱 관리자 페이지

DA-Fi 앱 관리자 페이지는 사용자의 보험 청구 및 Agent를 관리하는 페이지입니다. 보험 청구가 Agent에서 부적절하다고 판단될 경우 직접 확인하고 EscrowFinish나 EscrowCancle을 할 수 있습니다. 이 브랜치는 **프론트엔드로 동작**하며, app브랜치에서 백엔드 서버를 킨 후 로컬 환경에서 바로 테스트할 수 있습니다.

---

### 🚀 실행 방법

#### 1️⃣ 저장소 클론 및 브랜치 이동

먼저, 아래 명령어를 실행해 저장소를 클론하고 `frontend/admin` 브랜치로 이동하세요.

```bash
git clone https://github.com/sein12/BlockSmith-2025_XRPL_Hackathon.git
cd BlockSmith-2025_XRPL_Hackathon
git checkout frontend/admin
```

---

#### 2️⃣ 백엔드 설정 (app 브랜치의 README.md 참고)

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

#### 3️⃣ 프론트엔드 설정 (현재 브랜치인 frontend/admin 기준)

의존성 설치 및 개발 서버 실행

```
npm install
npm run dev
```

---

### 🧩 기술 스택

- Frontend: React + Vite + TypeScript + Shadcn UI
