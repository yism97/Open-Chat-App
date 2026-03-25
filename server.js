const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Message = require('./src/models/message.js');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

// JSON 요청 파싱
app.use(express.json());
app.use(express.static('public'));

// 현재 접속 유저 관리 (소켓ID: 이름)
const users = {};

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB 연결 성공!');
  })
  .catch((err) => {
    console.error('MongoDB 연결 실패:', err);
  });

//socket.io 연결 처리
io.on('connection', (socket) => {
  console.log('유저 접속:', socket.id);

  socket.on('user_join', async (name) => {
    socket.username = name;
    users[socket.id] = name;

    // 이전 메시지 50개 불러와서 입장한 유저에게만 전송
    const prevMessages = await Message.find().sort({ time: 1 }).limit(50);

    socket.emit('load_messages', prevMessages);
    socket.emit('notice', `${name}님이 입장하셨습니다.`);
    socket.emit('update_users', Object.values(users));

    socket.broadcast.emit('notice', `${name}님이 입장하셨습니다.`);
    socket.broadcast.emit('update_users', Object.values(users));
  });

  // 클라이언트가 'send_message' 이벤트를 보내면 실행
  socket.on('send_message', async (data) => {
    // DB에 메시지 저장
    try {
      const saved = await Message.create({
        sender: data.sender,
        message: data.message,
      });

      // 저장된 데이터 기준으로 전송 (time을 DB 저장값 그대로 사용)
      io.emit('receive_message', {
        sender: saved.sender,
        message: saved.message,
        time: saved.time.toLocaleTimeString('ko-KR'),
      });
    } catch (error) {
      console.error('메시지 저장 실패:', error);
      socket.emit('notice', '메시지 저장에 실패했습니다.');
    }
  });

  socket.on('disconnect', () => {
    const name = socket.username;
    if (name) {
      delete users[socket.id];
      socket.broadcast.emit('notice', `${name}님이 퇴장하셨습니다.`);
      socket.broadcast.emit('update_users', Object.values(users));
    }
    console.log('유저 접속 해제:', socket.id);
  });
});

const PORT = process.env.PORT;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
