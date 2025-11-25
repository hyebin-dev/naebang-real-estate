// js/main.js - 부동산 거래 데이터 필터링·정렬·페이지네이션과 UI 초기화를 담당하는 메인 스크립트

import { loadAllDeals } from "./api.js";
import {
  setupFilterOptions,
  updateDongOptions,
  getCurrentFilters,
  resetFilters,
  updateResultCount,
  renderTable,
  renderPagination,
} from "./ui.js";

/*
전체 상태를 보관하는 전역 객체
- allDeals: 정규화된 전체 거래 목록
- page: 현재 페이지 번호
- pageSize: 한 페이지당 표기할 행 수
- areaUnit: 면적 표기 단위 ("m2" 또는 "py")
*/
const state = {
  allDeals: [],
  page: 1,
  pageSize: 100, // 기본 페이지 크기
  areaUnit: "m2", // "m2" | "py"
};

/*
페이지네이션 상한(실제 페이지 수가 이 값을 넘으면 잘라서 표시)
API/데이터는 많아도 UI는 최대 MAX_PAGES까지만 노출한다.
*/
const MAX_PAGES = 100;

/*
현재 필터/정렬 값을 기준으로:
1) 전체 거래 배열에 필터를 적용하고
2) 정렬을 수행한 뒤
3) 페이지네이션을 거쳐
4) 테이블과 페이지네이션 UI를 렌더링한다.
resetPage가 true면 필터 변경 후 1페이지로 이동한다.
*/
function applyFiltersAndRender(resetPage = true) {
  if (!state.allDeals.length) return;

  const filters = getCurrentFilters();
  state.pageSize = filters.pageSize;

  if (resetPage) state.page = 1;

  // 1) 필터링
  const filtered = state.allDeals.filter((d) => {
    if (filters.propertyType !== "all" && d.propertyType !== filters.propertyType) return false;
    if (filters.dealType !== "all" && d.dealType !== filters.dealType) return false;
    if (filters.guCode !== "all" && d.guCode !== filters.guCode) return false;
    if (filters.dong !== "all" && d.dong !== filters.dong) return false;
    if (filters.year !== "all" && String(d.dealYear) !== filters.year) return false;

    if (filters.minPrice != null && d.priceValue < filters.minPrice) return false;
    if (filters.maxPrice != null && d.priceValue > filters.maxPrice) return false;

    if (filters.minArea != null && d.area != null && d.area < filters.minArea) return false;
    if (filters.maxArea != null && d.area != null && d.area > filters.maxArea) return false;

    if (filters.keyword) {
      const keyword = filters.keyword;
      const haystack = `${d.name} ${d.dong} ${d.guName}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });

  // 2) 정렬
  const sortField = filters.sortField || "priceDesc";

  filtered.sort((a, b) => {
    if (sortField === "dateDesc") {
      if (a.dateStr < b.dateStr) return 1;
      if (a.dateStr > b.dateStr) return -1;
      return b.priceValue - a.priceValue;
    }

    if (sortField === "areaDesc") {
      const areaA = a.area ?? -1;
      const areaB = b.area ?? -1;
      if (areaA === areaB) return b.priceValue - a.priceValue;
      return areaB - areaA;
    }

    const diff = b.priceValue - a.priceValue;
    if (diff !== 0) return diff;
    if (a.dateStr < b.dateStr) return 1;
    if (a.dateStr > b.dateStr) return -1;
    return 0;
  });

  const total = filtered.length;
  const realTotalPages = total ? Math.max(1, Math.ceil(total / state.pageSize)) : 1;
  const limitedTotalPages = Math.min(realTotalPages, MAX_PAGES);
  const isLimited = realTotalPages > MAX_PAGES;

  if (state.page > limitedTotalPages) state.page = limitedTotalPages;

  const start = (state.page - 1) * state.pageSize;
  const end = start + state.pageSize;
  const pageDeals = filtered.slice(start, end);

  updateResultCount(total, pageDeals.length, state.page, limitedTotalPages, isLimited);
  renderTable(pageDeals, state.areaUnit, start + 1);
  renderPagination(state.page, limitedTotalPages);
}

/*
상단의 "빠른 카테고리" 버튼들에 클릭 이벤트를 연결한다.
버튼 클릭 시 propertyType/dealType 셀렉트를 함께 변경하고
해당 버튼을 active 상태로 표시한 뒤 필터를 적용한다.
*/
function setupQuickFilterButtons() {
  const buttons = document.querySelectorAll(".quick-filter-btn");
  const propertySelect = document.getElementById("propertyTypeFilter");
  const dealSelect = document.getElementById("dealTypeFilter");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-property");
      const d = btn.getAttribute("data-deal");

      propertySelect.value = p;
      dealSelect.value = d;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      applyFiltersAndRender(true);
    });
  });
}

/*
페이지네이션 영역에 클릭 핸들러를 연결한다.
.page-btn 버튼을 클릭하면 해당 페이지로 이동하고 리스트를 다시 그린다.
*/
function setupPaginationHandler() {
  const paginationEl = document.getElementById("pagination");

  paginationEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".page-btn");
    if (!btn || btn.disabled) return;

    const page = Number(btn.dataset.page);
    if (!page || page === state.page) return;

    state.page = page;
    applyFiltersAndRender(false);
  });
}

/*
면적 단위 토글 버튼(m2 / 평)에 클릭 이벤트를 연결한다.
단위를 변경하면 상태를 갱신하고 테이블을 다시 렌더링한다.
*/
function setupAreaUnitToggle() {
  const buttons = document.querySelectorAll(".area-unit-toggle");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const unit = btn.dataset.unit;
      if (!unit || state.areaUnit === unit) return;

      state.areaUnit = unit;

      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      applyFiltersAndRender(false);
    });
  });
}

/*
구 선택이 변경되었을 때 동 옵션을 새로 채우고,
동 필터를 "all"로 초기화한 뒤 필터를 다시 적용한다.
*/
function setupGuChangeHandler() {
  const guSelect = document.getElementById("guFilter");

  guSelect.addEventListener("change", (e) => {
    const code = e.target.value;
    updateDongOptions(code);
    document.getElementById("dongFilter").value = "all";
    applyFiltersAndRender(true);
  });
}

/*
초기 진입점:
1) 모든 거래 데이터를 로딩하고
2) 필터/버튼/이벤트를 셋업한 뒤
3) 첫 화면을 렌더링한다.
데이터 로딩이나 초기화 중 오류가 나면 콘솔에만 기록하고 카운트는 0으로 표시한다.
*/
async function init() {
  try {
    const deals = await loadAllDeals();
    state.allDeals = deals;

    if (!state.allDeals.length) {
      updateResultCount(0, 0, 1, 1, false);
      return;
    }

    setupFilterOptions(state.allDeals);
    setupQuickFilterButtons();
    setupPaginationHandler();
    setupAreaUnitToggle();
    setupGuChangeHandler();

    // 초기 렌더
    applyFiltersAndRender(true);

    // 필터 적용 버튼
    document
      .getElementById("applyFilterBtn")
      .addEventListener("click", () => applyFiltersAndRender(true));

    // 필터 리셋 버튼
    document
      .getElementById("resetFilterBtn")
      .addEventListener("click", () => {
        resetFilters();

        document
          .querySelectorAll(".quick-filter-btn")
          .forEach((b) => b.classList.remove("active"));

        document
          .querySelector('.quick-filter-btn[data-property="all"][data-deal="all"]')
          .classList.add("active");

        state.areaUnit = "m2";
        document
          .querySelectorAll(".area-unit-toggle")
          .forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.unit === "m2");
          });

        applyFiltersAndRender(true);
      });

    // 검색창 엔터
    document
      .getElementById("keywordFilter")
      .addEventListener("keyup", (e) => {
        if (e.key === "Enter") applyFiltersAndRender(true);
      });
  } catch (err) {
    console.error("초기화 오류:", err);
    updateResultCount(0, 0, 1, 1, false);
  }
}

/*
DOM이 준비되면 init을 호출해 전체 화면을 초기화한다.
*/
document.addEventListener("DOMContentLoaded", init);
