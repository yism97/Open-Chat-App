const fs = require('fs');
const path = require('path');
const Message = require('../models/Message.js');
const { CLEAN_INTERVAL_MS } = require('../constants/index.js');

const cleanExpiredFiles = async () => {
  try {
    const expiredMessages = await Message.find({
      expiredAt: { $lt: new Date() },
      fileUrl: { $ne: null },
    });

    for (const msg of expiredMessages) {
      const filename = msg.fileUrl.split('/').pop();
      const filePath = path.join(__dirname, '../../public/uploads', filename);

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      await Message.findByIdAndUpdate(msg._id, {
        fileUrl: null,
        fileName: null,
        fileType: null,
      });
    }

    if (expiredMessages.length > 0) {
      console.log(`만료 파일 ${expiredMessages.length}개 삭제 완료`);
    }
  } catch (err) {
    console.error('만료 파일 정리 실패:', err);
  }
};

module.exports = () => setInterval(cleanExpiredFiles, CLEAN_INTERVAL_MS);
