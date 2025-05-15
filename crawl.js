const puppeteer = require('puppeteer');
const { google } = require('googleapis');

// 🔐 Google 인증 - 환경변수 기반
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const SPREADSHEET_ID = '1b1Ix6nv-dfM7beM4fI5vDww8jPe9IoLqVob6H3DVXic';
const SHEET_NAME = '합계수집';

// ✅ 1. '합계 : xxxx건' 텍스트 추출
async function fetchTotalCount() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 👇 User-Agent 설정 (사이트 차단 회피 목적)
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
  );

  try {
    await page.goto('https://www.15887924.com/main.do', {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });

    const text = await page.evaluate(() => document.body.innerText);
    await browser.close();

    const match = text.match(/합계\s*[:：]\s*([\d,]+)건/);
    return match ? parseInt(match[1].replace(/,/g, '')) : null;

  } catch (err) {
    console.error('❌ 페이지 로딩 실패:', err.message);
    await browser.close();
    return null;
  }
}

// ✅ 2. 시트에서 마지막 데이터 행 가져오기
async function getLastRow(authClient) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:C`,
  });
  const rows = res.data.values;
  return rows && rows.length > 1 ? rows[rows.length - 1] : null;
}

// ✅ 3. 헤더 확인 및 생성
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

// ✅ 4. 시트에 저장
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

// ✅ 5. 실행
(async () => {
  try {
    const count = await fetchTotalCount();
    if (count === null) {
      console.error('❗ 합계 건수를 추출하지 못했습니다.');
      return;
    }
    console.log('📦 합계:', count);
    await saveToSheet(count);
  } catch (err) {
    console.error('❌ 전체 실행 오류:', err.message);
  }
})();
