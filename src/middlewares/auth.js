const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Authorization: Bearer <token> 형식으로 전달돼요
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '로그인이 필요해요.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 이후 라우터에서 req.user로 접근 가능
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: '토큰이 만료되었거나 유효하지 않아요.' });
  }
};
