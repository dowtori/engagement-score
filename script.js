// DOM 요소
const csvInput = document.getElementById('csvFileInput');
const genderSelect = document.getElementById('gender');
const ageSelect = document.getElementById('age');
const countrySelect = document.getElementById('country');
const contentTypeSelect = document.getElementById('contentType');
const calculateBtn = document.getElementById('calculateBtn');
const resultsTableBody = document.querySelector('#resultsTable tbody');
const downloadBtn = document.getElementById('downloadBtn');

// 상태 변수
let rawData = [];
let filteredData = [];
let results = [];

// CSV 파일 업로드 & 파싱
csvInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    parseCSV(file);
  }
});

function parseCSV(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      const parsed = results.data;
      rawData = cleanRawData(parsed);
      alert(`총 ${rawData.length}명의 인플루언서가 업로드되었습니다.`);
      console.log('정제된 데이터:', rawData);
    },
    error: function (err) {
      alert('CSV 파싱 중 오류 발생: ' + err.message);
    }
  });
}

// CSV 필드 정제 함수
function cleanRawData(data) {
  return data.map(row => ({
    Handle: row['2. Tiktok Handle'] || '',
    Gender: row['F/M'] || '',
    Age: row['Ages'] || '',
    Country: row['4. Country/ Location'] || '',
    ContentType: row['콘텐츠 타입'] || '',
    Followers: parseInt((row['Followers'] || '0').toString().replace(/,/g, '')),
    AvgViews: parseInt((row['Ave. View'] || '0').toString().replace(/,/g, '')),
    Likes: parseInt((row['좋아요 수'] || '0').toString().replace(/,/g, ''))
  }));
}

// 필터 적용 함수
function applyFilters() {
  const selectedGender = genderSelect.value;
  const selectedAge = ageSelect.value;
  const selectedCountry = countrySelect.value;
  const selectedContentType = contentTypeSelect.value;

  filteredData = rawData.filter(item => {
    const genderMatch = selectedGender === '무관' || item.Gender === selectedGender;
    const ageMatch = selectedAge === '무관' || item.Age === selectedAge;
    const countryMatch = selectedCountry === '무관' || item.Country === selectedCountry;
    const contentMatch = selectedContentType === '무관' || item.ContentType === selectedContentType;

    return genderMatch && ageMatch && countryMatch && contentMatch;
  });

  alert(`필터 적용 후 ${filteredData.length}명 남았습니다.`);
  console.log('필터링된 데이터:', filteredData);
}

// 점수 계산 함수
function calculateScores() {
  results = rawData.map(item => {
    // Classic 점수
    const followerScore =
      item.Followers < 1000 ? 30 :
      item.Followers < 3000 ? 35 :
      item.Followers < 10000 ? 40 :
      item.Followers < 30000 ? 45 : 50;

    const viewScore =
      item.AvgViews < 100 ? 30 :
      item.AvgViews < 500 ? 35 :
      item.AvgViews < 1000 ? 40 :
      item.AvgViews < 2000 ? 45 : 50;

    const classicScore = followerScore + viewScore;

    let classicGrade = '';
    if (classicScore >= 95) classicGrade = 'Classic++';
    else if (classicScore >= 85) classicGrade = 'Classic+';
    else if (classicScore >= 70) classicGrade = 'Classic';
    else classicGrade = 'Low';

    // 필터값 가져오기
    const g = genderSelect.value;
    const a = ageSelect.value;
    const c = countrySelect.value;
    const ct = contentTypeSelect.value;

    // 브랜드 커스텀 점수
    let customScore = 0;
    customScore += (g === '무관' || item.Gender === g) ? 15 : 0;
    customScore += (a === '무관' || item.Age === a) ? 15 : 0;
    customScore += (c === '무관' || item.Country === c) ? 15 : 0;
    customScore += (ct === '무관' || item.ContentType === ct) ? 15 : 0;

    const likeRate = item.Followers > 0 ? (item.Likes / item.Followers) * 100 : 0;

    let likeScore = 0;
    if (likeRate < 100) likeScore = 10;
    else if (likeRate < 200) likeScore = 20;
    else if (likeRate < 300) likeScore = 30;
    else likeScore = 40;

    const conversionScore = customScore + likeScore;

    let conversionGrade = '';
    if (conversionScore >= 95) conversionGrade = 'Conversion++';
    else if (conversionScore >= 85) conversionGrade = 'Conversion+';
    else if (conversionScore >= 70) conversionGrade = 'Conversion';
    else conversionGrade = 'Low';

    return {
      Handle: item.Handle,
      ClassicScore: classicScore,
      ClassicGrade: classicGrade,
      ConversionScore: conversionScore,
      ConversionGrade: conversionGrade
    };
  });

  alert(`총 ${results.length}건의 점수가 계산되었습니다.`);
  console.log('점수 계산 결과:', results);
}


// 결과 테이블 출력 함수
function renderTable() {
  resultsTableBody.innerHTML = '';

  if (results.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = '결과가 없습니다.';
    row.appendChild(cell);
    resultsTableBody.appendChild(row);
    return;
  }

  results.forEach(result => {
    const row = document.createElement('tr');

    const handleCell = document.createElement('td');
    handleCell.textContent = result.Handle;

    const classicScoreCell = document.createElement('td');
    classicScoreCell.textContent = result.ClassicScore;

    const classicGradeCell = document.createElement('td');
    classicGradeCell.textContent = result.ClassicGrade;

    const convScoreCell = document.createElement('td');
    convScoreCell.textContent = result.ConversionScore;

    const convGradeCell = document.createElement('td');
    convGradeCell.textContent = result.ConversionGrade;

    row.appendChild(handleCell);
    row.appendChild(classicScoreCell);
    row.appendChild(classicGradeCell);
    row.appendChild(convScoreCell);
    row.appendChild(convGradeCell);

    resultsTableBody.appendChild(row);
  });
}

// CSV 다운로드 함수
function downloadCSV() {
  if (results.length === 0) {
    alert("다운로드할 데이터가 없습니다.");
    return;
  }

  const header = ['TikTok Handle', 'Classic Score', 'Classic Grade', 'Conversion Score', 'Conversion Grade'];
  const rows = results.map(r => [
    r.Handle,
    r.ClassicScore,
    r.ClassicGrade,
    r.ConversionScore,
    r.ConversionGrade
  ]);

  const csvContent = [header, ...rows]
    .map(e => e.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', 'engagement_scores.csv');
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 이벤트 바인딩
calculateBtn.addEventListener('click', () => {
  calculateScores();  // 전체 rawData 대상으로 점수 계산
  renderTable();      // 전체 결과 출력
});


downloadBtn.addEventListener('click', downloadCSV);
