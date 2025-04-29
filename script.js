// DOM 요소
const csvInput = document.getElementById('csvFileInput');
const calculateBtn = document.getElementById('calculateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const downloadXlsxBtn = document.getElementById('downloadXlsxBtn');
const resultsTableBody = document.querySelector('#resultsTable tbody');
const resultsSection = document.getElementById('results-section');

// 데이터 저장용
let rawData = [];
let results = [];

// 파일 업로드 → CSV 파싱
csvInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === "text/csv") {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (resultsParsed) {
        const parsed = resultsParsed.data;
        rawData = cleanData(parsed);
        alert(`총 ${rawData.length}명의 인플루언서가 업로드되었습니다.`);
        console.log("업로드된 데이터:", rawData);
        calculateBtn.disabled = false;
        downloadBtn.disabled = false;
        downloadXlsxBtn.disabled = false;
      },
      error: function (err) {
        alert("CSV 파싱 중 오류 발생: " + err.message);
      }
    });
  } else {
    alert("CSV 파일만 업로드 가능합니다.");
  }
});

// 데이터 정제 함수
function cleanData(data) {
  return data.map(row => ({
    Handle: row['2. Tiktok Handle'] || '',
    Followers: parseInt((row['Followers'] || '0').replace(/,/g, '')),
    Likes: parseInt((row['좋아요 수'] || '0').replace(/,/g, '')),
    Views: parseInt((row['Ave. View'] || '0').replace(/,/g, ''))
  }));
}

// 점수 계산 로직
function calculateEngageScores() {
  results = rawData.map(item => {
    const followers = item.Followers || 0;
    const likes = item.Likes || 0;
    const views = item.Views || 1; // 0 방지

    // Followers 점수 (50점 만점)
    const followerScore =
      followers < 1000 ? 35 :
      followers < 5000 ? 40 :
      followers < 10000 ? 45 : 50;

    // Likes 점수 (20점 만점)
    const likeScore =
      likes < 100 ? 10 :
      likes < 1000 ? 15 : 20;

    // EPR (Engagement Performance Ratio) 점수 (30점 만점)
    const epr = (likes / views) * 100; // %로 환산
    const eprScore =
      epr < 10 ? 15 :
      epr < 20 ? 20 :
      epr < 30 ? 25 : 30;

    const totalScore = followerScore + likeScore + eprScore;

    return {
      Handle: item.Handle,
      EngageScore: totalScore
    };
  });

  alert(`총 ${results.length}건의 점수가 계산되었습니다.`);
  console.log("계산된 결과:", results);
}

function renderTable() {
  resultsTableBody.innerHTML = ''; // 기존 내용 초기화
  resultsSection.style.display = 'block'; // 섹션 보이기

  if (results.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 2;
    cell.textContent = '결과가 없습니다.';
    row.appendChild(cell);
    resultsTableBody.appendChild(row);
    return;
  }

  results.forEach(item => {
    const row = document.createElement('tr');

    const handleCell = document.createElement('td');
    handleCell.textContent = item.Handle;

    const scoreCell = document.createElement('td');
    scoreCell.textContent = item.EngageScore.toFixed(1); // 소수점 1자리

    row.appendChild(handleCell);
    row.appendChild(scoreCell);
    resultsTableBody.appendChild(row);
  });
}

calculateBtn.addEventListener('click', () => {
  calculateBtn.disabled = true;
  calculateBtn.textContent = 'Calculating...';

  setTimeout(() => {
    calculateEngageScores();
    renderTable();

    calculateBtn.disabled = false;
    calculateBtn.textContent = 'Calculate Scores';
  }, 100); // UX용 약간의 딜레이
});

function downloadCSV() {
  if (results.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const baseName = csvInput.files[0]?.name?.replace(/\.[^/.]+$/, '') || 'engage_scores';
  const fileName = `${baseName}_${timestamp}.csv`;

  const headers = ['TikTok Handle', 'ENGAGE+ Score'];
  const rows = results.map(item => [item.Handle, item.EngageScore.toFixed(1)]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadXLSX() {
  if (results.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const dataForXLSX = results.map(item => ({
    "TikTok Handle": item.Handle,
    "ENGAGE+ Score": item.EngageScore.toFixed(1)
  }));

  const ws = XLSX.utils.json_to_sheet(dataForXLSX);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Engage+ Scores");

  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const baseName = csvInput.files[0]?.name?.replace(/\.[^/.]+$/, '') || 'engage_scores';
  const fileName = `${baseName}_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

downloadBtn.addEventListener('click', downloadCSV);
downloadXlsxBtn.addEventListener('click', downloadXLSX);

csvInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith(".csv")) {
    alert("CSV 파일만 업로드 가능합니다.");
    csvInput.value = "";
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (resultsParsed) {
      const parsed = resultsParsed.data;
      if (!parsed || parsed.length === 0 || !parsed[0]['2. Tiktok Handle']) {
        alert("유효한 데이터가 아닙니다. 필수 컬럼이 없습니다.");
        return;
      }

      rawData = cleanData(parsed);
      alert(`총 ${rawData.length}명의 인플루언서가 업로드되었습니다.`);
      console.log("업로드된 데이터:", rawData);
      calculateBtn.disabled = false;
      downloadBtn.disabled = false;
      downloadXlsxBtn.disabled = false;
    },
    error: function (err) {
      alert("CSV 파싱 중 오류 발생: " + err.message);
    }
  });
});

function cleanData(data) {
  return data.map(row => ({
    Handle: row['2. Tiktok Handle'] || '(빈 핸들)',
    Followers: parseInt((row['Followers'] || '0').replace(/,/g, '')) || 0,
    Likes: parseInt((row['좋아요 수'] || '0').replace(/,/g, '')) || 0,
    Views: parseInt((row['Ave. View'] || '0').replace(/,/g, '')) || 1 // 0 방지
  }));
}

if (results.length === 0) {
  alert("다운로드할 데이터가 없습니다.");
  return;
}
