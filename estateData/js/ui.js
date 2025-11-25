// js/ui.js
// 거래 데이터 필터 UI 설정과 테이블/페이지네이션 렌더링을 담당하는 모듈

import { GU_OPTIONS, M2_TO_PYEONG } from "./config.js";

const guSelect = document.getElementById("guFilter");
const dongSelect = document.getElementById("dongFilter");
const yearSelect = document.getElementById("yearFilter");
const resultCountEl = document.getElementById("resultCount");
const tableBody = document.getElementById("dealTableBody");
const paginationEl = document.getElementById("pagination");
const areaHeaderEl = document.getElementById("areaHeader");

// 동 목록: key = guCode 또는 "all" → Set(dong)
let DONG_MAP = new Map();

/** 필터 옵션 세팅 (구, 동, 연도) */
export function setupFilterOptions(allDeals) {
  // 구 옵션
  const usedGuCodes = new Set(
    allDeals.map((d) => d.guCode).filter((c) => !!c)
  );

  GU_OPTIONS.forEach(({ code, name }) => {
    if (!usedGuCodes.has(code)) return;
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = name;
    guSelect.appendChild(opt);
  });

  // 동 맵 구성
  DONG_MAP = new Map();
  DONG_MAP.set("all", new Set());

  allDeals.forEach((d) => {
    if (!d.dong) return;
    if (!DONG_MAP.has(d.guCode)) {
      DONG_MAP.set(d.guCode, new Set());
    }
    DONG_MAP.get(d.guCode).add(d.dong);
    DONG_MAP.get("all").add(d.dong);
  });

  // 초기 동 옵션 (서울 전체)
  updateDongOptions("all");

  // 연도 옵션
  const yearSet = new Set(
    allDeals.map((d) => d.dealYear).filter((y) => Number.isFinite(y))
  );
  const years = Array.from(yearSet).sort((a, b) => b - a);

  years.forEach((year) => {
    const opt = document.createElement("option");
    opt.value = String(year);
    opt.textContent = `${year}년`;
    yearSelect.appendChild(opt);
  });
}

/** 선택된 구에 따라 동 선택 옵션 업데이트 */
export function updateDongOptions(guCode) {
  dongSelect.innerHTML = "";

  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = guCode === "all" ? "전체 동" : "구 전체";
  dongSelect.appendChild(optAll);

  const key = guCode === "all" ? "all" : guCode;
  const set = DONG_MAP.get(key);
  if (!set) return;

  const dongs = Array.from(set).sort((a, b) => a.localeCompare(b, "ko-KR"));
  dongs.forEach((dong) => {
    const opt = document.createElement("option");
    opt.value = dong;
    opt.textContent = dong;
    dongSelect.appendChild(opt);
  });
}

/** 현재 필터 값 읽기 */
export function getCurrentFilters() {
  const propertyType = document.getElementById("propertyTypeFilter").value;
  const dealType = document.getElementById("dealTypeFilter").value;
  const guCode = guSelect.value;
  const dong = dongSelect.value;
  const year = yearSelect.value;

  const minPrice = document.getElementById("minPriceFilter").value;
  const maxPrice = document.getElementById("maxPriceFilter").value;
  const minArea = document.getElementById("minAreaFilter").value;
  const maxArea = document.getElementById("maxAreaFilter").value;

  const keyword = document
    .getElementById("keywordFilter")
    .value
    .trim()
    .toLowerCase();

  const sortField = document.getElementById("sortField").value;

  return {
    propertyType,
    dealType,
    guCode,
    dong,
    year,
    minPrice: minPrice ? Number(minPrice) : null,
    maxPrice: maxPrice ? Number(maxPrice) : null,
    minArea: minArea ? Number(minArea) : null,
    maxArea: maxArea ? Number(maxArea) : null,
    keyword,
    sortField,
    pageSize: 100, // 한 페이지 100건 고정
  };
}

/** 필터 초기화 */
export function resetFilters() {
  document.getElementById("propertyTypeFilter").value = "all";
  document.getElementById("dealTypeFilter").value = "all";
  guSelect.value = "all";
  yearSelect.value = "all";
  updateDongOptions("all");
  dongSelect.value = "all";

  document.getElementById("minPriceFilter").value = "";
  document.getElementById("maxPriceFilter").value = "";
  document.getElementById("minAreaFilter").value = "";
  document.getElementById("maxAreaFilter").value = "";
  document.getElementById("keywordFilter").value = "";
  document.getElementById("sortField").value = "priceDesc";
}

/** 결과 개수 텍스트 */
export function updateResultCount(
  total,
  displayed,
  page,
  totalPages,
  limited
) {
  if (!total) {
    resultCountEl.textContent = "조건에 맞는 데이터가 없습니다.";
    return;
  }

  let text = `총 ${total.toLocaleString(
    "ko-KR"
  )}건 중 ${displayed.toLocaleString(
    "ko-KR"
  )}건 표시 (페이지 ${page} / ${totalPages})`;

  if (limited && page === totalPages) {
    text +=
      "  ※ 데이터량이 많아 최대 100페이지까지만 제공됩니다. 필터를 더 좁혀서 조회해 주세요.";
  }

  resultCountEl.textContent = text;
}

/** 유형 라벨 */
function getTypeLabel(item) {
  if (item.propertyType === "apartment" && item.dealType === "trade") {
    return "아파트 매매";
  }
  if (item.propertyType === "apartment" && item.dealType === "rent") {
    return "아파트 전월세";
  }
  if (item.propertyType === "officetel" && item.dealType === "trade") {
    return "오피스텔 매매";
  }
  if (item.propertyType === "officetel" && item.dealType === "rent") {
    return "오피스텔 전월세";
  }
  if (item.propertyType === "house" && item.dealType === "trade") {
    return "단독/다가구 매매";
  }
  if (item.propertyType === "house" && item.dealType === "rent") {
    return "단독/다가구 전월세";
  }
  if (item.propertyType === "villa" && item.dealType === "trade") {
    return "연립다세대 매매";
  }
  if (item.propertyType === "villa" && item.dealType === "rent") {
    return "연립다세대 전월세";
  }
  return "";
}

/** 면적 포맷 (㎡ 또는 평, 없으면 "-") */
function formatArea(area, unit) {
  if (area == null) return "-";
  if (unit === "py") {
    const py = area * M2_TO_PYEONG;
    return py.toFixed(1);
  }
  return area.toFixed(1);
}

/** 층 포맷: -2 → 지하 2층, 4 → 4층, 없으면 "-" */
function formatFloor(floor) {
  if (floor == null || floor === "") return "-";
  const n = Number(floor);
  if (!Number.isFinite(n)) return String(floor);

  if (n < 0) return `지하 ${Math.abs(n)}층`;
  if (n === 0) return "지상층";
  return `${n}층`;
}

/** 건물명 포맷: 없을 때 유형별 기본 라벨 */
function formatName(item) {
  const name = (item.name || "").trim();
  if (name) return name;

  if (item.propertyType === "house") return "단독주택";
  if (item.propertyType === "villa") return "연립다세대";
  return "-";
}

/** 금액 포맷
 *  - 매매: "3,250,000" → "325억" 등 억/만 단위 변환
 *  - 전월세: 기존 "보증금 / 월세" 문자열 유지
 */
function formatPrice(item) {
  const raw = (item.priceStr || "").trim();
  if (!raw) return "-";

  if (item.dealType === "rent") {
    return raw;
  }

  const num = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(num)) return raw;

  const eok = Math.floor(num / 10000); // 1억 = 10,000(만원)
  const man = num % 10000;

  if (eok > 0 && man > 0) {
    return `${eok}억 ${man.toLocaleString("ko-KR")}만`;
  }
  if (eok > 0) {
    return `${eok}억`;
  }
  return `${num.toLocaleString("ko-KR")}만`;
}

/** 테이블 렌더링
 *  startRank: 현재 페이지의 첫 번째 순위 번호 (1, 101, 201, ...)
 */
export function renderTable(deals, areaUnit, startRank = 1) {
  tableBody.innerHTML = "";

  areaHeaderEl.textContent =
    areaUnit === "py" ? "전용면적(평)" : "전용면적(㎡)";

  deals.forEach((item, idx) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="col-rank">${startRank + idx}</td>
      <td class="col-type">${getTypeLabel(item)}</td>
      <td class="col-date">${item.dateStr}</td>
      <td class="col-gu">${item.guName}</td>
      <td class="col-dong">${item.dong}</td>
      <td class="col-name">${formatName(item)}</td>
      <td class="col-area">${formatArea(item.area, areaUnit)}</td>
      <td class="col-floor">${formatFloor(item.floor)}</td>
      <td class="col-price">${formatPrice(item)}</td>
    `;

    tableBody.appendChild(tr);
  });
}

/** 페이지네이션 렌더링 (10페이지 단위 블록) */
export function renderPagination(page, totalPages) {
  if (!totalPages || totalPages <= 1) {
    paginationEl.innerHTML = "";
    return;
  }

  const PAGES_PER_BLOCK = 10;

  const blockIndex = Math.floor((page - 1) / PAGES_PER_BLOCK);
  const blockStart = blockIndex * PAGES_PER_BLOCK + 1;
  const blockEnd = Math.min(blockStart + PAGES_PER_BLOCK - 1, totalPages);

  const isFirst = page === 1;
  const isLast = page === totalPages;

  let html = "";

  // << (첫 페이지)
  html += `<button class="page-btn" data-page="1" ${
    isFirst ? "disabled" : ""
  }>&laquo;</button>`;

  // < (이전 페이지)
  html += `<button class="page-btn" data-page="${page - 1}" ${
    isFirst ? "disabled" : ""
  }>&lsaquo;</button>`;

  // 번호들
  for (let p = blockStart; p <= blockEnd; p++) {
    const active = p === page ? "active" : "";
    html += `<button class="page-btn ${active}" data-page="${p}">${p}</button>`;
  }

  // > (다음 페이지)
  html += `<button class="page-btn" data-page="${page + 1}" ${
    isLast ? "disabled" : ""
  }>&rsaquo;</button>`;

  // >> (마지막 페이지)
  html += `<button class="page-btn" data-page="${totalPages}" ${
    isLast ? "disabled" : ""
  }>&raquo;</button>`;

  paginationEl.innerHTML = html;
}
