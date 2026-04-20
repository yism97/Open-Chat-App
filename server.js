const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Room = require('./src/models/Room.js');
const authRouter = require('./src/routes/auth.js');
const uploadRouter = require('./src/routes/upload.js');
const initSocket = require('./src/socket/index.js');
const startCleanup = require('./src/utils/cleanExpiredFiles.js');
const { DEFAULT_ROOM } = require('./src/constants/index.js');
require('dotenv').config();

// 환경변수 검증
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.error(`환경변수 ${key}가 없어요!`);
    process.exit(1); // 필수 환경변수 없으면 서버 시작 안 해요
  }
});

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

app.use(express.json());
app.use(express.static('public'));
app.use('/auth', authRouter);
app.use('/upload', uploadRouter);

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB 연결 성공!');
    const exists = await Room.findOne({ name: DEFAULT_ROOM });
    if (!exists) await Room.create({ name: DEFAULT_ROOM, owner: 'system' });
  })
  .catch((err) => {
    console.error('MongoDB 연결 실패:', err);
    process.exit(1);
  });

// Socket.io 초기화
initSocket(io);

// 만료 파일 정리 시작
startCleanup();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
