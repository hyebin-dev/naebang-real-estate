// js/ui.js - 지도/목록 방 리스트 UI(카테고리 탭, 찜, 페이지네이션, 지역 선택)을 관리하는 모듈
"use strict";

/*
좌측 카테고리 탭 / 찜 토글
목록 렌더링·페이지네이션
리스트 ↔ 지도 선택 동기화
지역 경로·요약 표시
공용 리렌더 엔트리(applyFiltersAndRender)
*/
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/*
0) 유틸 함수: 썸네일 선택 + 유형 라벨
- pickThumb(room): 방 데이터에서 썸네일 URL 하나 선택
- categoryLabelOf(room): 방 카테고리 코드 → 한글 라벨
*/
function pickThumb(room) {
  if (!room || typeof room !== "object") return null;

  if (Array.isArray(room.imgUrlList) && room.imgUrlList.length > 0) {
    const url = String(room.imgUrlList[0] || "").trim();
    if (url) {
      return url.startsWith("//") ? location.protocol + url : url;
    }
  }

  if (Array.isArray(room.images) && room.images.length > 0) {
    const url = String(room.images[0] || "").trim();
    if (url) {
      return url.startsWith("//") ? location.protocol + url : url;
    }
  }

  const candidates = [
    room.thumbnailUrl,
    room.thumbnail,
    room.imgUrl,
    room.imageUrl,
    room.image,
    room.thumb,
    room.image1,
    room.img1,
  ].filter(Boolean);

  for (const url of candidates) {
    const s = String(url || "").trim();
    if (s) {
      return s.startsWith("//") ? location.protocol + s : s;
    }
  }

  return null;
}

function categoryLabelOf(room) {
  const code =
    typeof getRoomCategory === "function" ? getRoomCategory(room) : "ETC";

  return (
    {
      ALL: "전체",
      ONEROOM: "원/투룸",
      APT: "아파트",
      VILLA: "주택/빌라",
      OFFICETEL: "오피스텔",
      ETC: "기타",
    }[code] || "기타"
  );
}

/*
1) 공용 리렌더 엔트리
- 필터/지역 상태가 바뀐 뒤 리스트/지도/찜 UI를 한 번에 다시 그린다.
*/
function applyFiltersAndRender(opts = {}) {
  try {
    renderList(opts);

    if (typeof window.hydrateHeartIcons === "function") {
      window.hydrateHeartIcons(document);
    }

    if (typeof window.attachFavoriteToggles === "function") {
      window.attachFavoriteToggles(document);
    }

    if (typeof updateMapMarkersAndClusters === "function") {
      updateMapMarkersAndClusters();
    }

    if (typeof updateRegionPolygons === "function") {
      updateRegionPolygons();
    }
  } catch (e) {
    console.error("[applyFiltersAndRender] error:", e);
  }
}

/*
2) 좌측 카테고리 탭 / 찜(즐겨찾기) 토글
- .room-type-tab 클릭 시 currentCategory / showFavoritesOnly 를 갱신
- FAVORITES 탭일 때는 카테고리 유지, 찜만 보기 토글
*/
function setupRoomTypeTabs(root = document) {
  const container = $("#roomTypeTabs", root);
  if (!container) return;

  container.addEventListener("click", (event) => {
    const btn = event.target.closest(".room-type-tab");
    if (!btn || !container.contains(btn)) return;

    event.preventDefault();

    const favMode = btn.dataset.category === "FAVORITES";

    if (favMode) {
      showFavoritesOnly = !showFavoritesOnly;
      updateFavoriteToggleButton();
      applyFiltersAndRender({ page: 1 });
      return;
    }

    const category = btn.dataset.category || "ALL";

    currentCategory = category;
    showFavoritesOnly = false;

    $$(".room-type-tab", container).forEach((el) => {
      el.classList.remove("active");
    });
    btn.classList.add("active");

    updateFavoriteToggleButton();
    applyFiltersAndRender({ page: 1 });
  });

  const initBtn = container.querySelector(
    `.room-type-tab[data-category="${currentCategory}"]`
  );

  if (initBtn) {
    $$(".room-type-tab", container).forEach((el) => {
      el.classList.remove("active");
    });
    initBtn.classList.add("active");
  }

  updateFavoriteToggleButton();
}

function setupFavoriteToggleButton() {
  updateFavoriteToggleButton();
}

/*
찜 버튼(상단 토글) 상태 동기화
- showFavoritesOnly 값에 따라 active 클래스와 아이콘을 조정
*/
function updateFavoriteToggleButton() {
  const favBtn = $("#favoriteToggleBtn");
  if (!favBtn) return;

  favBtn.classList.toggle("active", !!showFavoritesOnly);

  const useEl = favBtn.querySelector("use");
  if (!useEl) return;

  const target = showFavoritesOnly
    ? "#icon-heart-filled"
    : "#icon-heart-outline";

  useEl.setAttribute("href", target);
  useEl.setAttributeNS(
    "http://www.w3.org/1999/xlink",
    "xlink:href",
    target
  );
}

/*
3) 지역 경로/타이틀/요약 영역 갱신
- breadcrumb 경로(updateRegionPath)
- dongTitle (현재 선택된 시/구/동 기준 타이틀)
- summary (카테고리, 개수, 찜만 보기 여부 표시)
*/
function refreshRegionHeader(totalCount) {
  if (typeof updateRegionPath === "function") {
    updateRegionPath();
  }

  const dongTitle = $("#dongTitle");
  const summary = $("#summary");

  const sido = currentSido || "전국";
  const sigungu = currentSigungu || "전체";
  const dong = currentDong && currentDong !== "ALL" ? currentDong : "전체";

  if (dongTitle) {
    if (currentDong && currentDong !== "ALL") {
      dongTitle.textContent = `${dong} 매물`;
    } else if (currentSigungu) {
      dongTitle.textContent = `${sido} ${sigungu} 매물`;
    } else {
      dongTitle.textContent = `${sido} 매물`;
    }
  }

  if (summary) {
    const catNameMap = {
      ALL: "전체",
      ONEROOM: "원/투룸",
      APT: "아파트",
      VILLA: "주택/빌라",
      OFFICETEL: "오피스텔",
    };

    const catName = catNameMap[currentCategory || "ALL"] || "전체";
    const favLabel = showFavoritesOnly ? " · 찜만 보기" : "";

    summary.textContent = `${catName} ${totalCount.toLocaleString()}개${favLabel}`;
  }
}

/*
4) 리스트 + 페이지네이션
- 1페이지당 15개, 최대 50페이지까지
- getVisibleRooms() 결과 기준으로 현재 페이지에 해당하는 방만 렌더링
*/
const PAGE_SIZE = 15;
let currentPage = 1;

function renderList({ page } = {}) {
  const listEl = $("#roomList");
  const pagerEl = $("#pagination");

  if (!listEl || !pagerEl) return;

  const data =
    typeof getVisibleRooms === "function" ? getVisibleRooms() : rooms || [];

  const total = data.length;

  if (page) {
    currentPage = page;
  }

  const totalPagesRaw = Math.ceil(total / PAGE_SIZE) || 1;
  const maxPage = Math.min(50, Math.max(1, totalPagesRaw));

  if (currentPage > maxPage) currentPage = maxPage;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageData = data.slice(start, end);

  refreshRegionHeader(total);

  listEl.innerHTML = "";

  pageData.forEach((room) => {
    const li = document.createElement("li");

    li.className = `room-item${
      room.id === selectedRoomId ? " active" : ""
    }`;
    li.setAttribute("data-room-id", String(room.id));

    const priceTitle = room.priceTitle || "";
    const title =
      room.itemTitle ||
      room.roomTitle ||
      room.roomTypeName ||
      "제목 없음";

    const metaLeft = [
      room.sigunguName || "",
      room.dongName || "",
      room.roomFloorName || room.floor || "",
    ]
      .filter(Boolean)
      .join(" · ");

    const desc = (room.roomDesc || "").slice(0, 80);
    const thumb = pickThumb(room);
    const catLabel = categoryLabelOf(room);

    li.innerHTML = `
      <div class="room-item-inner">
        <div class="room-thumb-wrap">
          ${
            thumb
              ? `<img class="room-thumb" src="${thumb}" alt="${title}">`
              : `<div class="room-thumb" style="background:#eee"></div>`
          }
          <button
            class="fav-btn"
            type="button"
            data-room-id="${room.id}"
            aria-pressed="false"
            title="찜하기"
          >
            <svg width="22" height="22" viewBox="0 0 40 40" aria-hidden="true">
              <use href="#icon-heart-outline"></use>
            </svg>
          </button>
        </div>
        <div class="room-info">
          <div class="room-price">${priceTitle}</div>
          <div class="room-title">${title}</div>
          <div class="room-meta">
            <span class="room-badge">${catLabel}</span>
            <span>${metaLeft}</span>
          </div>
          <div class="room-desc">${desc}</div>
        </div>
      </div>
    `;

    // 리스트 전체 클릭 시 선택, 찜 버튼 클릭은 제외
    li.addEventListener("click", (event) => {
      if (event.target.closest(".fav-btn")) return;
      onRoomSelected(room);
    });

    listEl.appendChild(li);
  });

  pagerEl.innerHTML = "";
  pagerEl.classList.add("nb-pager");

  const makeBtn = (
    label,
    targetPage,
    { disabled = false, current = false, arrow = false } = {}
  ) => {
    const button = document.createElement("button");
    button.textContent = label;

    if (disabled) button.disabled = true;
    if (current) button.classList.add("current");
    if (arrow) button.classList.add("pager-arrow");

    button.addEventListener("click", () => {
      if (disabled || targetPage === currentPage) return;

      currentPage = targetPage;
      renderList();

      if (typeof window.hydrateHeartIcons === "function") {
        window.hydrateHeartIcons(document);
      }
      if (typeof window.attachFavoriteToggles === "function") {
        window.attachFavoriteToggles(document);
      }
    });

    return button;
  };

  const firstPage = 1;
  const lastPage = maxPage;

  pagerEl.appendChild(
    makeBtn("≪", firstPage, {
      disabled: currentPage === firstPage,
      arrow: true,
    })
  );
  pagerEl.appendChild(
    makeBtn("〈", Math.max(firstPage, currentPage - 1), {
      disabled: currentPage === firstPage,
      arrow: true,
    })
  );

  const windowSize = 5;
  let startPage = Math.max(firstPage, currentPage - Math.floor(windowSize / 2));
  let endPage = startPage + windowSize - 1;

  if (endPage > lastPage) {
    endPage = lastPage;
    startPage = Math.max(firstPage, endPage - windowSize + 1);
  }

  for (let p = startPage; p <= endPage; p += 1) {
    pagerEl.appendChild(
      makeBtn(String(p), p, { current: p === currentPage })
    );
  }

  pagerEl.appendChild(
    makeBtn("〉", Math.min(lastPage, currentPage + 1), {
      disabled: currentPage === lastPage,
      arrow: true,
    })
  );
  pagerEl.appendChild(
    makeBtn("≫", lastPage, {
      disabled: currentPage === lastPage,
      arrow: true,
    })
  );
}

/*
5) 선택 동기화 (지도 ↔ 목록)
- 리스트에서 선택 시 : 지도 마커/핀 이동
- 지도/클러스터에서 선택 시 : 리스트 활성화 및 사이드바 스크롤 조정
*/
function onRoomSelected(roomOrId) {
  if (!roomOrId) return;

  const id =
    typeof roomOrId === "object" && roomOrId !== null
      ? roomOrId.id
      : roomOrId;

  if (id == null) return;

  selectedRoomId = id;

  const data =
    typeof getVisibleRooms === "function" ? getVisibleRooms() : rooms || [];

  const idx = data.findIndex((room) => String(room.id) === String(id));

  if (idx >= 0) {
    const targetPage = Math.floor(idx / PAGE_SIZE) + 1;
    if (targetPage !== currentPage) {
      currentPage = targetPage;
      renderList();
    }
  }

  $$("#roomList .room-item").forEach((li) => {
    li.classList.toggle(
      "active",
      li.getAttribute("data-room-id") === String(id)
    );
  });

  const marker =
    typeof markerById !== "undefined" ? markerById[id] : null;

  if (marker && window.map && typeof kakao !== "undefined") {
    selectedMapMarker = marker;

    if (selectedMarkerOverlay) {
      selectedMarkerOverlay.setMap(null);
    }

    const pin = document.createElement("div");
    pin.className = "selected-room-pin";

    const tail = document.createElement("div");
    tail.className = "selected-room-pin-tail";

    pin.appendChild(tail);

    selectedMarkerOverlay = new kakao.maps.CustomOverlay({
      position: marker.getPosition(),
      content: pin,
      yAnchor: 1,
      zIndex: 9999,
    });

    selectedMarkerOverlay.setMap(map);

    map.setLevel(3);
    map.panTo(marker.getPosition());
  }

  if (typeof updateMapMarkersAndClusters === "function") {
    updateMapMarkersAndClusters();
  }
  if (typeof updateRegionPolygons === "function") {
    updateRegionPolygons();
  }

  const activeEl = $("#roomList .room-item.active");
  const sidebar = document.getElementById("sidebar");

  if (activeEl && sidebar) {
    const sidebarRect = sidebar.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();

    const currentScroll = sidebar.scrollTop;
    const offset =
      itemRect.top -
      sidebarRect.top -
      (sidebarRect.height / 2 - itemRect.height / 2);

    sidebar.scrollTop = currentScroll + offset;
  }
}

/*
6) 지역 변경 API (지도/오버레이에서 호출)
- setCurrentDong(dong): 특정 동 선택
- setCurrentSigungu(gu): 구 선택, 동은 ALL 로 리셋
*/
function setCurrentDong(dong) {
  currentDong = dong || "ALL";
  applyFiltersAndRender({ page: 1 });

  if (typeof updateRegionPath === "function") {
    updateRegionPath();
  }
}

function setCurrentSigungu(gu) {
  currentSigungu = gu || null;
  currentDong = "ALL";

  applyFiltersAndRender({ page: 1 });

  if (typeof updateRegionPath === "function") {
    updateRegionPath();
  }
}

/*
7) 지역 리셋 버튼
- resetRegion() 커스텀 함수를 우선 사용
- 없으면 REGION_TREE 첫 번째 시/도로 초기화
- 지도 중심/레벨도 기본값으로 되돌림
*/
function setupRegionResetButton() {
  const btn = $("#regionResetBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (typeof resetRegion === "function") {
      resetRegion();
      return;
    }

    const sidoKeys = Object.keys(window.REGION_TREE || {});
    currentSido = sidoKeys.length > 0 ? sidoKeys[0] : "서울특별시";
    currentSigungu = null;
    currentDong = "ALL";

    applyFiltersAndRender({ page: 1 });

    if (map && window.initialCenter) {
      map.setLevel(7);
      map.setCenter(window.initialCenter);
    }
  });
}

/*
8) 지역 모달
- 현재는 사용하지 않음 (no-op)
*/
function setupRegionModal() {}

/*
9) 찜 상태 변경 이벤트 처리
- 찜만 보기 모드: 리스트를 다시 그린다.
- 일반 모드: 하트 아이콘만 재하이드레이션한다.
*/
document.addEventListener("favorites:changed", () => {
  if (showFavoritesOnly) {
    applyFiltersAndRender({ page: 1 });
    return;
  }

  if (typeof window.hydrateHeartIcons === "function") {
    window.hydrateHeartIcons(document);
  }
});

/*
10) 전역 공개
- 초기화 함수는 main.js 에서만 호출
*/
window.applyFiltersAndRender = applyFiltersAndRender;
window.setupRoomTypeTabs = setupRoomTypeTabs;
window.setupFavoriteToggleButton = setupFavoriteToggleButton;
window.setupRegionResetButton = setupRegionResetButton;
window.setupRegionModal = setupRegionModal;
window.renderList = renderList;
window.onRoomSelected = onRoomSelected;
window.setCurrentDong = setCurrentDong;
window.setCurrentSigungu = setCurrentSigungu;
