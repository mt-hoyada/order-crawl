// 📦 Puppeteer 기반 24시콜화물 '합계' 건수 추출 + 누적 저장 (헤더 포함)
const puppeteer = require('puppeteer');
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GCP_CREDENTIALS_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = '1b1Ix6nv-dfM7beM4fI5vDww8jPe9IoLqVob6H3DVXic';
const SHEET_NAME = '합계수집';

// ✅ 1. '합계 : xxxx건' 텍스트 추출
async function fetchTotalCount() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'], // 중요!
  });
  const page = await browser.newPage();
  await page.goto('https://www.15887924.com/main.do', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  const text = await page.evaluate(() => document.body.innerText);
  await browser.close();

  const match = text.match(/합계\s*[:：]\s*([\d,]+)건/);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''));
  }
  return null;
}

// ✅ 2. 시트에서 마지막 데이터 행 불러오기
async function getLastRow(authClient) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:C`,
  });
  const rows = res.data.values;
  return rows && rows.length > 1 ? rows[rows.length - 1] : null;
}

// ✅ 3. 첫 실행 시 헤더 추가
async function ensureHeaderExists(authClient) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A1:C1`,
  });
  const firstRow = res.data.values?.[0] || [];

  if (firstRow.length === 0 || firstRow[0] !== '수집시간') {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A1:C1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['수집시간', '최근합계', '누적합계']],
      },
    });
    console.log('📝 헤더 추가 완료');
  }
}

// ✅ 4. 구글 시트에 저장
async function saveToSheet(count) {
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const now = new Date().toLocaleString('sv-SE', {
    timeZone: 'Asia/Seoul',
  }).replace(' ', 'T');

  await ensureHeaderExists(authClient);

  const lastRow = await getLastRow(authClient);
  const prevCount = lastRow ? parseInt(lastRow[1]) : 0;
  const prevTotal = lastRow ? parseInt(lastRow[2]) : 0;
  const diff = Math.max(count - prevCount, 0);
  const total = prevTotal + diff;

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:C`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[now, count, total]],
    },
  });

  console.log(`✅ 저장 완료: ${now} - 현재: ${count}건, 누적: ${total}건`);
}

// ✅ 실행
(async () => {
  const count = await fetchTotalCount();
  if (count === null) {
    throw new Error('❗ 합계 건수를 추출하지 못했습니다.');
  }
  console.log('📦 합계:', count);
  await saveToSheet(count);
})();
