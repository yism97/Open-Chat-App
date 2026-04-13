const path = require('path');
const fs = require('fs');
const Message = require('../models/Message.js');

// 파일 업로드
exports.uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일 업로드 실패' });
  }

  res.json({
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
};

// 파일 다운로드 (만료 체크)
exports.downloadFile = async (req, res) => {
  try {
    const { filename } = req.params;

    const message = await Message.findOne({ fileUrl: `/uploads/${filename}` });

    if (!message) {
      return res.status(404).json({ error: '파일을 찾을 수 없어요.' });
    }

    if (message.expiredAt && new Date() > message.expiredAt) {
      const filePath = path.join(__dirname, '../../public/uploads', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(410).json({ error: '파일이 만료되었어요.' });
    }

    const filePath = path.join(__dirname, '../../public/uploads', filename);
    res.download(filePath, message.fileName);
  } catch (err) {
    console.error('다운로드 실패:', err);
    res.status(500).json({ error: '다운로드에 실패했어요.' });
  }
};
