const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const Message = require('./src/models/Message.js');
const Room = require('./src/models/Room.js');
const User = require('./src/models/User.js');
const uploadRouter = require('./src/routes/upload.js');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

app.use(express.json());
app.use(express.static('public'));
app.use('/upload', uploadRouter);

const users = {};

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB 연결 성공!');
    const exists = await Room.findOne({ name: '일반' });
    if (!exists) await Room.create({ name: '일반', owner: 'system' });
  })
  .catch((err) => console.error('MongoDB 연결 실패:', err));

// 1시간마다 만료 파일 정리
setInterval(
  async () => {
    try {
      const expiredMessages = await Message.find({
        expiredAt: { $lt: new Date() }, // 만료시간이 현재보다 이전
        fileUrl: { $ne: null },
      });

      for (const msg of expiredMessages) {
        const filename = msg.fileUrl.split('/').pop();
        const filePath = path.join(__dirname, 'public/uploads', filename);

        // 파일 삭제
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        // fileUrl 초기화 (메시지는 남겨둬요)
        await Message.findByIdAndUpdate(msg._id, {
          fileUrl: null,
          fileName: null,
          fileType: null,
        });
      }

      if (expiredMessages.length > 0) {
        console.log(`만료 파일 ${expiredMessages.length}개 삭제 완료`);
      }
    } catch (err) {
      console.error('만료 파일 정리 실패:', err);
    }
  },
  60 * 60 * 1000,
); // 1시간마다 실행

io.on('connection', (socket) => {
  console.log('유저 접속:', socket.id);

  socket.on('user_join', async (name) => {
    try {
      // users 객체에서 현재 접속 중인 닉네임 체크
      const isDuplicate = Object.values(users).some((u) => u.name === name);
      if (isDuplicate) {
        socket.emit('join_error', '이미 접속 중인 닉네임이에요!');
        return;
      }

      await User.findOneAndUpdate(
        { name },
        { name },
        { upsert: true, returnDocument: 'after' },
      );

      socket.username = name;
      users[socket.id] = { name, room: null };

      const rooms = await Room.find().sort({ createdAt: 1 });
      socket.emit('update_rooms', rooms);
      socket.emit('notice', `${name}님, 환영합니다! 채팅방을 선택하세요.`);
    } catch (err) {
      console.error('유저 입장 실패:', err);
    }
  });

  socket.on('create_room', async (roomName) => {
    try {
      const exists = await Room.findOne({ name: roomName });
      if (exists) {
        socket.emit('notice', '이미 존재하는 방 이름이에요!');
        return;
      }
      await Room.create({ name: roomName, owner: socket.username });
      const rooms = await Room.find().sort({ createdAt: 1 });
      io.emit('update_rooms', rooms);
    } catch (err) {
      console.error('방 생성 실패:', err);
    }
  });

  socket.on('delete_room', async (roomName) => {
    try {
      const room = await Room.findOne({ name: roomName });
      if (!room) return;
      if (room.owner !== socket.username) {
        socket.emit('notice', '방장만 삭제할 수 있어요!');
        return;
      }
      await Room.deleteOne({ name: roomName });
      await Message.deleteMany({ room: roomName });
      io.to(roomName).emit('room_deleted', roomName);
      const rooms = await Room.find().sort({ createdAt: 1 });
      io.emit('update_rooms', rooms);
    } catch (err) {
      console.error('방 삭제 실패:', err);
    }
  });

  socket.on('join_room', async (roomName) => {
    try {
      const prevRoom = users[socket.id]?.room;
      if (prevRoom) {
        // leave 먼저, 그 다음 업데이트
        socket.leave(prevRoom);
        users[socket.id].room = null;
        io.to(prevRoom).emit('notice', `${socket.username}님이 퇴장했습니다.`);
        io.to(prevRoom).emit('update_users', getRoomUsers(prevRoom));
      }

      socket.join(roomName);
      users[socket.id].room = roomName;

      const prevMessages = await Message.find({ room: roomName })
        .sort({ time: 1 })
        .limit(50);

      socket.emit('load_messages', prevMessages);
      socket.emit('notice', `[${roomName}] 방에 입장했습니다.`);
      io.to(roomName).emit('notice', `${socket.username}님이 입장했습니다.`);
      io.to(roomName).emit('update_users', getRoomUsers(roomName));

      const room = await Room.findOne({ name: roomName });
      socket.emit('room_info', { owner: room.owner });
    } catch (err) {
      console.error('방 입장 실패:', err);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      const room = users[socket.id]?.room;
      if (!room) return;

      const expiredAt = data.fileType
        ? new Date(Date.now() + 24 * 60 * 60 * 1000)
        : null;

      const saved = await Message.create({
        sender: data.sender,
        message: data.message || '',
        room,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        fileType: data.fileType || null,
        expiredAt,
      });

      io.to(room).emit('receive_message', {
        sender: saved.sender,
        message: saved.message,
        fileUrl: saved.fileUrl,
        fileName: saved.fileName,
        fileType: saved.fileType,
        expiredAt: saved.expiredAt,
        time: saved.time.toLocaleTimeString('ko-KR'),
      });
    } catch (err) {
      console.error('메시지 저장 실패:', err);
      socket.emit('notice', '메시지 전송에 실패했습니다.');
    }
  });

  socket.on('disconnect', async () => {
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
