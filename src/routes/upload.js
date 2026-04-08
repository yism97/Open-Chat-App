const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Message = require('../models/message');

const router = express.Router();

// 파일 저장 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/'); // 저장 경로
  },
  filename: (req, file, cb) => {
    // 파일명 중복 방지 — uuid + 원본 확장자
    const ext = path.extname(file.originalname);
    cb(null, uuidv4() + ext);
  },
});

// 파일 필터 — 허용 파일 타입
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.pdf',
    '.zip',
    '.txt',
  ];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('지원하지 않는 파일 형식이에요!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
});

// POST /upload
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일 업로드 실패' });
  }

  res.json({
    url: `/uploads/${req.file.filename}`, // 파일 접근 URL
    originalName: req.file.originalname, // 원본 파일명
    mimetype: req.file.mimetype, // 파일 타입
    size: req.file.size, // 파일 크기
  });
});

// GET /upload/download/:filename — 만료 체크 후 다운로드
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    // DB에서 해당 파일 메시지 찾기
    const message = await Message.findOne({ fileUrl: `/uploads/${filename}` });

    if (!message) {
      return res.status(404).json({ error: '파일을 찾을 수 없어요.' });
    }

    // 만료 체크
    if (message.expiredAt && new Date() > message.expiredAt) {
      // 만료된 파일 서버에서도 삭제
      const filePath = path.join(__dirname, '../../public/uploads', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      return res.status(410).json({ error: '파일이 만료되었어요.' });
    }

    // 파일 전송
    const filePath = path.join(__dirname, '../../public/uploads', filename);
    res.download(filePath, message.fileName);
  } catch (err) {
    console.error('다운로드 실패:', err);
    res.status(500).json({ error: '다운로드에 실패했어요.' });
  }
});

module.exports = router;
