const Message = require('../../models/Message.js');
const { FILE_EXPIRE_HOURS } = require('../../constants/index.js');

module.exports = (io, socket, users) => {
  socket.on('send_message', async (data) => {
    try {
      const room = users[socket.id]?.room;
      if (!room) return;

      const expiredAt = data.fileType
        ? new Date(Date.now() + FILE_EXPIRE_HOURS * 60 * 60 * 1000)
        : null;

      const saved = await Message.create({
        sender: socket.username,
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
};
