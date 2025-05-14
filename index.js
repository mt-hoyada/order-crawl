// index.js
const express = require('express');
const app = express();
const { exec } = require('child_process');

app.get('/', (req, res) => {
  exec('node crawl.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`실행 오류: ${error.message}`);
      return res.status(500).send('❌ 크롤링 실패');
    }
    console.log(`✅ 결과: ${stdout}`);
    res.send('✅ 크롤링 및 시트 저장 완료');
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
