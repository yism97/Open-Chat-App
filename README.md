# 💬 Open Chat App

Socket.io와 MongoDB를 기반으로 한 **실시간 채팅 웹 애플리케이션**입니다.
누구나 접속하여 즉시 채팅에 참여할 수 있습니다.

---

## 🚀 주요 기능

- 실시간 메시지 송수신 (Socket.io)
- 사용자 입장 / 퇴장 알림
- 최근 메시지 히스토리 로드 (최대 50개)
- MongoDB 기반 메시지 영구 저장
- 반응형 웹 디자인

---

## 🛠️ 기술 스택

### Backend

- Node.js
- Express.js
- Socket.io
- MongoDB
- Mongoose

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript

---

## 📋 설치 및 실행 방법

### 1. 저장소 클론

```bash
git clone https://github.com/yism97/open-chat-app.git
cd open-chat-app
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env` 파일 생성 후 아래 내용 입력

```
PORT=3000
MONGO_URI=your_mongodb_connection_string
```

👉 MongoDB Atlas 사용 시:

```
mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>
```

---

### 4. 서버 실행

```bash
npm start
```

👉 개발용 (추천)

```bash
npm run dev
```

---

### 5. 접속

브라우저에서 아래 주소 접속

```
http://localhost:3000
```

---

## 📁 프로젝트 구조

```
open-chat-app/
├── public/
│   ├── index.html
│   └── styles.css
├── src/
│   └── models/
│       └── message.js
├── .env
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## 🔧 Socket.io 이벤트 구조

### 클라이언트 → 서버

- `user_join` : 사용자 입장
- `send_message` : 메시지 전송

### 서버 → 클라이언트

- `load_messages` : 이전 메시지 로드
- `receive_message` : 메시지 수신
- `notice` : 시스템 알림
- `update_users` : 사용자 목록 업데이트

---

## 🎨 사용 방법

1. 이름 입력 후 입장
2. 메시지 입력 후 Enter 또는 전송 버튼 클릭
3. 브라우저 종료 시 자동 퇴장 처리

---

## 🔒 보안

- MongoDB 연결 정보는 `.env` 환경 변수로 관리
- 민감 정보는 Git에 포함되지 않도록 `.gitignore` 설정

---

## 📈 개발 진행 단계 (Roadmap)

### ✅ 완료

- Express 서버 구축
- Socket.io 실시간 채팅 구현
- MongoDB 메시지 저장 및 조회
- 채팅방 기능 (Socket.io Rooms)
- 로그인 기능 구헌 (jwt / bcrypt)
- 파일 / 이미지 전송 (Multer)

### 🚧 진행 예정

- 서비스 배포 (Railway / Render)

---

## 💡 향후 개선 아이디어

- 채팅방별 권한 관리
- 읽음 표시 / 타이핑 상태 표시
- Redis 기반 메시지 캐싱

---
