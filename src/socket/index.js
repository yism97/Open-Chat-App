const jwt = require('jsonwebtoken');
const Room = require('../models/Room.js');
const roomHandler = require('./handlers/roomHandler.js');
const messageHandler = require('./handlers/messageHandler.js');

const users = {};

module.exports = (io) => {
  // JWT 검증 미들웨어
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('로그인이 필요해요.'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.username = decoded.name;
      next();
    } catch {
      return next(new Error('토큰이 유효하지 않아요.'));
    }
  });

  io.on('connection', async (socket) => {
    console.log('유저 접속:', socket.username);

    // 중복 접속 체크
    const isDuplicate = Object.values(users).some(
      (u) => u.name === socket.username,
    );
    if (isDuplicate) {
      socket.emit('join_error', '이미 접속 중인 계정이에요!');
      socket.disconnect();
      return;
    }

    users[socket.id] = { name: socket.username, room: null };

    // 초기 데이터 전송
    try {
      const rooms = await Room.find().sort({ createdAt: 1 });
      socket.emit('update_rooms', rooms);
      socket.emit(
        'notice',
        `${socket.username}님, 환영합니다! 채팅방을 선택하세요.`,
      );
    } catch (err) {
      console.error('초기화 실패:', err);
    }

    // 이벤트 핸들러 등록
    roomHandler(io, socket, users);
    messageHandler(io, socket, users);

    // 퇴장
    socket.on('disconnect', () => {
      const user = users[socket.id];
      if (user) {
        const { name, room } = user;
        delete users[socket.id];
        if (room) {
          const getRoomUsers = (roomName) =>
            Object.values(users)
              .filter((u) => u.room === roomName)
              .map((u) => u.name);
          io.to(room).emit('notice', `${name}님이 퇴장했습니다.`);
          io.to(room).emit('update_users', getRoomUsers(room));
        }
      }
      console.log('유저 퇴장:', socket.username);
    });
  });
};
