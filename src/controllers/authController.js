const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

const SALT_ROUNDS = 10;

// 회원가입
exports.register = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res
        .status(400)
        .json({ error: '닉네임과 비밀번호를 입력해주세요.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: '비밀번호는 4자 이상이어야 해요.' });
    }

    const exists = await User.findOne({ name });
    if (exists) {
      return res.status(409).json({ error: '이미 사용 중인 닉네임이에요.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await User.create({ name, password: hashedPassword });

    res.status(201).json({ message: '회원가입 성공!' });
  } catch (err) {
    console.error('회원가입 실패:', err);
    res.status(500).json({ error: '서버 오류가 발생했어요.' });
  }
};

// 로그인
exports.login = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res
        .status(400)
        .json({ error: '닉네임과 비밀번호를 입력해주세요.' });
    }

    const user = await User.findOne({ name });
    if (!user) {
      return res
        .status(401)
        .json({ error: '닉네임 또는 비밀번호가 틀렸어요.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ error: '닉네임 또는 비밀번호가 틀렸어요.' });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({ token, name: user.name });
  } catch (err) {
    console.error('로그인 실패:', err);
    res.status(500).json({ error: '서버 오류가 발생했어요.' });
  }
};
