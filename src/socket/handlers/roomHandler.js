const Room = require('../../models/Room.js');
const Message = require('../../models/Message.js');

module.exports = (io, socket, users) => {
  // 방 만들기
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

  // 방 삭제
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

  // 방 퇴장
  socket.on('leave_room', async (roomName) => {
    try {
      socket.leave(roomName);
      users[socket.id].room = null;
      io.to(roomName).emit('notice', `${socket.username}님이 퇴장했습니다.`);
      io.to(roomName).emit('update_users', getRoomUsers(users, roomName));
      socket.emit('notice', `[${roomName}] 방에서 나왔습니다.`);
    } catch (err) {
      console.error('방 퇴장 실패:', err);
    }
  });

  // 방 입장
  socket.on('join_room', async (roomName) => {
    try {
      const prevRoom = users[socket.id]?.room;
      if (prevRoom) {
        socket.leave(prevRoom);
        users[socket.id].room = null;
        io.to(prevRoom).emit('notice', `${socket.username}님이 퇴장했습니다.`);
        io.to(prevRoom).emit('update_users', getRoomUsers(users, prevRoom));
      }

      socket.join(roomName);
      users[socket.id].room = roomName;

      socket.emit('notice', `[${roomName}] 방에 입장했습니다.`);
      io.to(roomName).emit('notice', `${socket.username}님이 입장했습니다.`);
      io.to(roomName).emit('update_users', getRoomUsers(users, roomName));

      const room = await Room.findOne({ name: roomName });
      socket.emit('room_info', { owner: room.owner });
    } catch (err) {
      console.error('방 입장 실패:', err);
    }
  });
};

function getRoomUsers(users, roomName) {
  return Object.values(users)
    .filter((u) => u.room === roomName)
    .map((u) => u.name);
}
