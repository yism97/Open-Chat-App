const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Message = require('./src/models/message.js');
const Room = require('./src/models/Room.js');
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
  .then(async () => {
    console.log('MongoDB 연결 성공!');
    // 서버 시작할 때 기본방 없으면 자동 생성
    const exists = await Room.findOne({ name: '일반' });
    if (!exists) await Room.create({ name: '일반' });
  })
  .catch((err) => console.error('MongoDB 연결 실패:', err));

//socket.io 연결 처리
io.on('connection', (socket) => {
  console.log('유저 접속:', socket.id);

  socket.on('user_join', async (name) => {
    // 닉네임 중복 체크 — name 필드만 꺼내서 비교해요
    const isDuplicate = Object.values(users).some((u) => u.name === name);
    if (isDuplicate) {
      socket.emit('notice', '이미 사용 중인 닉네임이에요!');
      return;
    }

    socket.username = name;
    users[socket.id] = { name, room: null };

    // 채팅방 목록 전송
    const rooms = await Room.find().sort({ createdAt: 1 });
    socket.emit('update_rooms', rooms);
    socket.emit('notice', `${name}님, 환영합니다! 채팅방을 선택하세요.`);
  });

  // 방 만들기
  socket.on('create_room', async (roomName) => {
    try {
      const exists = await Room.findOne({ name: roomName });
      if (exists) {
        socket.emit('notice', '이미 존재하는 방 이름이에요!');
        return;
      }
      await Room.create({ name: roomName });
      const rooms = await Room.find().sort({ createdAt: 1 });

      // 모든 유저에게 업데이트된 방 목록 전송
      io.emit('update_rooms', rooms);
    } catch (err) {
      console.error('방 생성 실패:', err);
    }
  });

  // 방 입장
  socket.on('join_room', async (roomName) => {
    // 이전 방에서 퇴장
    const prevRoom = users[socket.id]?.room;
    if (prevRoom) {
      socket.leave(prevRoom);
      io.to(prevRoom).emit('notice', `${socket.username}님이 퇴장했습니다.`);
      io.to(prevRoom).emit('update_users', getRoomUsers(prevRoom));
    }

    // 새 방 입장
    socket.join(roomName);
    users[socket.id].room = roomName;

    // 해당 방 이전 메시지 50개 불러오기
    const prevMessages = await Message.find({ room: roomName })
      .sort({ time: 1 })
      .limit(50);

    socket.emit('load_messages', prevMessages);
    socket.emit('notice', `[${roomName}] 방에 입장했습니다.`);
    socket.emit('update_users', getRoomUsers(roomName));

    io.to(roomName).emit('notice', `${socket.username}님이 입장했습니다.`);
    io.to(roomName).emit('update_users', getRoomUsers(roomName));
  });

  // 메시지 전송
  socket.on('send_message', async (data) => {
    try {
      const room = users[socket.id]?.room;
      if (!room) return;

      const saved = await Message.create({
        sender: data.sender,
        message: data.message,
        room, // 어느 방의 메시지인지 저장
      });

      io.to(room).emit('receive_message', {
        sender: saved.sender,
        message: saved.message,
        time: saved.time.toLocaleTimeString('ko-KR'),
      });
    } catch (err) {
      console.error('메시지 저장 실패:', err);
      socket.emit('notice', '메시지 전송에 실패했습니다.');
    }
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      const { name, room } = user;
      delete users[socket.id];
      if (room) {
        io.to(room).emit('notice', `${name}님이 퇴장했습니다.`);
        io.to(room).emit('update_users', getRoomUsers(room));
      }
    }
    console.log('유저 퇴장:', socket.id);
  });
});

// 특정 방에 있는 유저 목록 반환
function getRoomUsers(roomName) {
  return Object.values(users)
    .filter((u) => u.room === roomName)
    .map((u) => u.name);
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
