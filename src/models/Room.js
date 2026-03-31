const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // 방 이름 중복 방지
  },
  createAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Room', roomSchema);
