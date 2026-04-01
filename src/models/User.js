const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // 닉네임 중복 방지
  },
});

module.exports = mongoose.model('User', userSchema);
