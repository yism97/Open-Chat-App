const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/zip',
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
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

module.exports = router;
