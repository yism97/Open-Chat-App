const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    default: '',
  },
  room: {
    type: String,
    required: true,
  },
  // 파일 관련 필드
  fileUrl: {
    type: String,
    default: null,
  },
  fileName: {
    type: String,
    default: null,
  },
  fileType: {
    type: String,
    default: null, // 'image' or 'file'
  },
  expiredAt: {
    type: Date,
    default: null,
  },
  time: {
    type: Date,
    default: Date.now,
  },
});

module.exports =
  mongoose.models.Message || mongoose.model('Message', messageSchema);
