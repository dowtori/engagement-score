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

// 데이터 정제 함수
function cleanData(data) {
  return data.map(row => ({
    Handle: row['2. Tiktok Handle'] || '(빈 핸들)',
    Followers: parseInt((row['Followers'] || '0').replace(/,/g, '')) || 0,
    Likes: parseInt((row['좋아요 수'] || '0').replace(/,/g, '')) || 0,
    Views: parseInt((row['Ave. View'] || '0').replace(/,/g, '')) || 1
  }));
}

function getMergedResults() {
  return rawData.map((item, index) => {
    const result = results[index] || {};
    return {
      ...item, // 원본 CSV 필드 전체 포함
      'ENGAGE+ Score': result.EngageScore?.toFixed(1) ?? '',
      'ENGAGE+ Grade': result.EngageGrade ?? ''
    };
  });
}

// 점수 계산 로직
function getEngageGrade(score) {
  if (score >= 91) return "ENGAGE ++";
  if (score >= 81) return "ENGAGE +";
  if (score >= 71) return "ENGAGE";
  return "Low";
}

function calculateEngageScores() {
  results = rawData.map(item => {
    const followers = item.Followers;
    const likes = item.Likes;
    const views = item.Views;

    // Followers 점수 (50점 만점)
    const followerScore =
      followers < 1000 ? 35 :
      followers < 5000 ? 40 :
      followers < 10000 ? 45 : 50;

    // Likes 점수 (20점 만점)
    const likeScore =
      likes < 100 ? 10 :
      likes < 1000 ? 15 : 20;

    // EPR 점수 (30점 만점)
    const epr = (likes / views) * 100;
    const eprScore =
      epr < 10 ? 15 :
      epr < 20 ? 20 :
      epr < 30 ? 25 : 30;

    const totalScore = followerScore + likeScore + eprScore;

    return {
      Handle: item.Handle,
      EngageScore: totalScore
      EngageGrade: getEngageGrade(totalScore)
    };
  });

  alert(`총 ${results.length}건의 점수가 계산되었습니다.`);
  console.log("계산된 결과:", results);
}

// 테이블 렌더링
function renderTable() {
  resultsTableBody.innerHTML = '';
  resultsSection.style.display = 'block';

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

    const gradeCell = document.createElement('td');
    gradeCell.textContent = item.EngageGrade; // ✅ 점수 대신 등급

    row.appendChild(handleCell);
    row.appendChild(gradeCell);
    resultsTableBody.appendChild(row);
  });
}


// 버튼 이벤트
calculateBtn.addEventListener('click', () => {
  calculateBtn.disabled = true;
  calculateBtn.textContent = 'Calculating...';

  setTimeout(() => {
    calculateEngageScores();
    renderTable();
    calculateBtn.disabled = false;
    calculateBtn.textContent = 'Calculate Scores';
  }, 100);
});

downloadBtn.addEventListener('click', downloadCSV);
downloadXlsxBtn.addEventListener('click', downloadXLSX);

// CSV 다운로드
function downloadCSV() {
  const merged = getMergedResults();
  if (merged.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const baseName = csvInput.files[0]?.name?.replace(/\.[^/.]+$/, '') || 'engage_scores';
  const fileName = `${baseName}_${timestamp}.csv`;

  const headers = Object.keys(merged[0]);
  const rows = merged.map(obj => headers.map(h => obj[h]));

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

// XLSX 다운로드
function downloadXLSX() {
  const merged = getMergedResults();
  if (merged.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(merged);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Engage+ Results");

  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
  const baseName = csvInput.files[0]?.name?.replace(/\.[^/.]+$/, '') || 'engage_scores';
  const fileName = `${baseName}_${timestamp}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

