// 기본 FAQ 데이터 (xlsx 미업로드 시 사용) — 포세린 타일 시공 Q&A
const SAMPLE_FAQ_DATA = [
  {
    question: "야외 바닥용 석재와 타일의 가장 큰 차이점이 무엇인가요?",
    answer: "석재에 비해 타일은 두께가 얇아 경량구조가 가능하며, 흡수율이 1% 이하로 장기 내구성능이 탁월합니다.\n석재에 비해 휨강도 성능이 뛰어나 두께를 20mm로 경량화할 수 있습니다.",
    category: "포세린 타일"
  },
  {
    question: "습식으로 바닥 설치할때 보호모르타르(누름콘크리트·보호스크리드) 층의 두께는 어느정도가 적당한가요?",
    answer: "접착 모르타르: 25~40mm\n비접착 모르타르: 50mm 이상",
    category: "포세린 타일"
  },
  {
    question: "습식으로 바닥 공사할때 타일의 줄눈 간격 기준을 알려줘.",
    answer: "일반적인 외장 타일의 줄눈 간격은 1.5~3mm 사이입니다.\n심미적으로는 2mm 줄눈을 선호합니다.",
    category: "포세린 타일"
  },
  {
    question: "습식 보호모르타르의 압축강도는 어느정도가 적정한가요?",
    answer: "20~25MPa\n바탕고름용 레미탈 또는 무수축 그라우트를 추천합니다.",
    category: "포세린 타일"
  },
  {
    question: "배수구로의 구배는 어떻게 구성해야 하나요?",
    answer: "1미터에 10mm의 구배로 진행합니다. (기울기 1%)",
    category: "포세린 타일"
  },
  {
    question: "타일과 모르타르면을 습식으로 부착할때 사용하는 접착제는 어떤 것인가요?",
    answer: "모르타르 위에 타일 직접 부착은 절대 불가합니다. (흡수율이 낮아 부착력이 매우 떨어짐)\n전용 접착제를 사용해야 하며, 제품 등급 기준 C2TES1 이상을 권장합니다.",
    category: "포세린 타일"
  },
  {
    question: "접착제 부착 순서에 대해 알려줘요.",
    answer: "1. 모르타르 상부의 적정한 수분을 도포한 후 프라이머 도포\n2. 프라이머 도포 후 건조된 후 접착제 도포\n3. 접착제 도포 후 타일 부착",
    category: "포세린 타일"
  },
  {
    question: "접착제 교반, 믹싱에 대해 설명해줘요.",
    answer: "물 배합 비율: 중량 대비 약 20~30% 범위로 산정\n부피비 기준: 분말과 물을 3:1~4:1(분말:물)로 배합\n외기온도에 따라 물 배합량을 기준 내에서 조정하여 반죽 질기를 맞춥니다.\n1차 반죽 후 5분 정도 대기(화학반응 활성화)한 뒤 2차 교반을 진행합니다.",
    category: "포세린 타일"
  },
  {
    question: "작업 가능한 외기온도는 어떻게 되나요?",
    answer: "영상 5도 이하: 작업 불가\n영상 35도 이상: 현장 여건 확인 후 작업",
    category: "포세린 타일"
  },
  {
    question: "접착제 관련 주요 용어(오픈타임·조정시간·그라우팅·포트라이프)를 설명해줘요.",
    answer: "오픈타임: 도포 후 타일이 접착력을 유지하는 시간\n조정시간: 타일 부착 후 약간의 움직임이 가능한 시간\n그라우팅: 줄눈 작업 전에 대기하여야 하는 시간\n포트라이프: 믹싱버킷에 담긴 접착제의 최대 작업 시간",
    category: "포세린 타일"
  }
];

/**
 * xlsx 파일을 파싱하여 FAQ 배열로 변환
 * @param {File} file - .xlsx 파일 객체
 * @returns {Promise<Array>} - { question, answer, category } 배열
 */
function parseFAQFromXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (rows.length === 0) { resolve([]); return; }

        // 첫 행이 헤더인지 확인 (NO/카테고리/질문/답변 등)
        const firstRow = rows[0];
        const hasHeader =
          String(firstRow[0]).toLowerCase() === "no" ||
          firstRow[0] === "질문" || firstRow[0] === "카테고리" ||
          firstRow[0] === "question" || firstRow[0] === "Q";
        const startRow = hasHeader ? 1 : 0;

        const faqData = [];
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];

          // NO / 카테고리 / 질문 / 답변 / 관련제품 / 링크 형식 감지
          // (컬럼 수가 4개 이상이고 첫 열이 숫자면 이 형식으로 판단)
          let question, answer, category;
          if (row.length >= 4 && !isNaN(Number(row[0])) && row[0] !== "") {
            category = String(row[1] || "일반").trim();
            question  = String(row[2] || "").trim();
            answer    = String(row[3] || "").trim();
          } else {
            question  = String(row[0] || "").trim();
            answer    = String(row[1] || "").trim();
            category  = String(row[2] || "일반").trim();
          }

          if (question && answer) {
            faqData.push({ question, answer, category });
          }
        }
        resolve(faqData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * FAQ 데이터로 Claude system prompt 생성
 */
function buildSystemPrompt(faqData) {
  const faqText = faqData
    .map((item, i) => `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}`)
    .join("\n\n");

  return `당신은 포세린 타일 시공 전문 Q&A 어시스턴트입니다.
아래 FAQ 데이터를 기반으로 사용자 질문에 친절하고 정확하게 답변해 주세요.

## FAQ 데이터
${faqText}

## 답변 원칙
1. FAQ에 있는 내용을 기반으로 답변하세요. 내용을 자연스럽게 재구성해도 됩니다.
2. FAQ에 명확히 없는 내용이라면: "해당 내용은 담당자에게 직접 문의해 주세요."로 안내하세요.
3. 친절하고 전문적인 톤을 유지하세요.
4. 답변이 길어질 경우 번호 목록이나 단락으로 가독성을 높이세요.
5. 항상 한국어로 답변하세요.
6. 관련 제품명(IRIS tile, MIRAGE tile)이 언급될 경우 정확한 제품명을 사용하세요.`;
}

/**
 * FAQ 데이터에서 고유 카테고리 목록 추출
 */
function extractCategories(faqData) {
  const seen = new Set();
  return faqData
    .map((item) => item.category)
    .filter((cat) => cat && !seen.has(cat) && seen.add(cat));
}

/**
 * 특정 카테고리의 FAQ 질문 목록 반환
 */
function getQuestionsByCategory(faqData, category) {
  return faqData.filter((item) => item.category === category);
}
