const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  owner: {
    type: String,
    required: true, // 방장 닉네임
  },
  createdAt: {
    // createAt → createdAt 오타 수정
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Room', roomSchema);
