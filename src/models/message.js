const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  room: {
    type: String,
    required: true, // 어느 방의 메시지인지 필수로 저장
  },
  time: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Message', messageSchema);
