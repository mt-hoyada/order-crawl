const express = require('express');
const app = express();
const run = require('./crawl'); // 직접 함수로 가져옴

app.get('/', async (req, res) => {
  try {
    await run(); // 크롤링 실행
    res.send('✅ 크롤링 및 시트 저장 완료');
  } catch (e) {
    console.error('❌ 실행 오류:', e);
    res.status(500).send('❌ 크롤링 실패');
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Cloud Run 서비스 수신 중: ${PORT}`);
});
