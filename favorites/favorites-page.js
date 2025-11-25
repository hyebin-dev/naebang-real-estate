// estateData/favorites/favorites-page.js
// favorites.html에서 rooms-all.json을 로드해 찜한 매물 목록을 필터/하트 상태에 맞게 렌더링하는 스크립트입니다.

"use strict";

// favorites.html 기준 rooms-all.json 경로
const ROOMS_DATA_URL = "../map/rooms-all.json";

// 페이지 상태
let ALL_ROOMS = [];
let FAVORITE_IDS = [];
let CURRENT_FILTER = "all";
let ROOMS_LOADED = false;
let DOM_READY = false;

// rooms-all.json을 로드해서 ALL_ROOMS에 저장
async function loadAllRooms() {
  try {
    const res = await fetch(ROOMS_DATA_URL);
    if (!res.ok) {
      throw new Error("rooms-all.json 불러오기 실패");
    }

    const data = await res.json();
    ALL_ROOMS = Array.isArray(data) ? data : data.rooms || [];
  } catch (error) {
    console.error("[favorites-page] 매물 데이터 로드 실패", error);
    ALL_ROOMS = [];
  }
}

// 매물 객체에서 썸네일로 사용할 이미지 URL 하나를 추출
function pickThumb(room) {
  if (!room || typeof room !== "object") return null;

  const normalize = (url) => {
    const trimmed = String(url || "").trim();
    if (!trimmed) return null;
    return trimmed.startsWith("//") ? location.protocol + trimmed : trimmed;
  };

  if (Array.isArray(room.imgUrlList) && room.imgUrlList.length > 0) {
    const normalized = normalize(room.imgUrlList[0]);
    if (normalized) return normalized;
  }

  if (Array.isArray(room.images) && room.images.length > 0) {
    const normalized = normalize(room.images[0]);
    if (normalized) return normalized;
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
  ];

  for (const url of candidates) {
    const normalized = normalize(url);
    if (normalized) return normalized;
  }

  return null;
}

// roomTypeName 기준으로 매물 카테고리 코드 계산
function getCategoryFromRoom(room) {
  const t = (room.roomTypeName || "").toString();

  if (t.includes("오피스텔")) return "OFFICETEL";
  if (t.includes("아파트")) return "APT";
  if (
    t.includes("주택") ||
    t.includes("다가구") ||
    t.includes("빌라") ||
    t.includes("연립") ||
    t.includes("다세대")
  ) {
    return "VILLA";
  }
  if (t.includes("원룸") || t.includes("투룸")) return "ONEROOM";

  return "ETC";
}

// 카테고리 코드에 대응하는 화면 표시용 라벨 반환
function categoryLabelOf(room) {
  const code = getCategoryFromRoom(room);

  const labelMap = {
    ALL: "전체",
    ONEROOM: "원/투룸",
    APT: "아파트",
    VILLA: "주택/빌라",
    OFFICETEL: "오피스텔",
    ETC: "기타",
  };

  return labelMap[code] || "기타";
}

// 현재 필터 키와 매물 카테고리가 일치하는지 여부
function matchFilter(room, filterKey) {
  if (!filterKey || filterKey === "all") return true;

  const code = getCategoryFromRoom(room);

  switch (filterKey) {
    case "one_two":
      return code === "ONEROOM";
    case "apt":
      return code === "APT";
    case "villa":
      return code === "VILLA";
    case "officetel":
      return code === "OFFICETEL";
    default:
      return true;
  }
}

// 매물 객체에서 고유 id 값 추출
function getRoomId(room) {
  return room.id ?? room.seq;
}

// 개별 매물 카드를 생성해 article 요소로 반환
function createRoomCardElement(room) {
  const id = getRoomId(room);
  const title = room.roomTitle || room.complexName || "제목 없음";

  const metaLeft = [room.sigunguName || "", room.dongName || ""]
    .filter(Boolean)
    .join(" · ");

  const typeLabel = categoryLabelOf(room);
  const desc = room.roomDesc || "";

  let priceStr = "";
  if (room.priceTitle) {
    priceStr = `${room.priceTypeName || ""} ${room.priceTitle}`.trim();
  }
  if (!priceStr) priceStr = "가격 정보 없음";

  const imgUrl =
    pickThumb(room) ||
    "https://via.placeholder.com/400x260?text=No+Image";

  const card = document.createElement("article");
  card.className = "fav-card";
  card.dataset.roomId = id;

  card.innerHTML = `
    <div class="fav-card-img-wrap">
      <img src="${imgUrl}" alt="${title}" class="fav-card-img" />
      <button
        class="fav-card-heart fav-btn"
        type="button"
        aria-label="찜하기"
        data-room-id="${id}"
      >
        <svg width="28" height="28" viewBox="0 0 40 40">
          <use href="#icon-heart-outline"></use>
        </svg>
      </button>
    </div>
    <div class="fav-card-body">
      <div class="fav-card-price">${priceStr}</div>
      <div class="fav-card-title">${title}</div>
      <div class="fav-card-meta">
        <span class="fav-card-badge">${typeLabel}</span>
        <span>${metaLeft || "위치 정보 없음"}</span>
      </div>
      <div class="fav-card-desc">${desc}</div>
    </div>
  `;

  card.addEventListener("click", (event) => {
    if (event.target.closest(".fav-btn")) return;
    // 카드 클릭 시 상세 페이지 이동이 필요하면 이 위치에서 location.href 처리를 추가
  });

  return card;
}

// 찜한 매물 id와 필터 상태를 기준으로 리스트 영역을 다시 렌더링
function renderFavoriteList() {
  if (!DOM_READY || !ROOMS_LOADED) return;

  const container = document.getElementById("fav-list");
  const emptyMsg = document.getElementById("fav-empty");
  if (!container) return;

  const idSet = new Set(FAVORITE_IDS.map(String));

  const matched = ALL_ROOMS.filter((room) => {
    const rid = String(getRoomId(room));
    if (!idSet.has(rid)) return false;
    return matchFilter(room, CURRENT_FILTER);
  });

  container.innerHTML = "";

  if (!matched.length) {
    if (emptyMsg) emptyMsg.removeAttribute("hidden");
    return;
  }

  if (emptyMsg) {
    emptyMsg.setAttribute("hidden", "hidden");
  }

  const frag = document.createDocumentFragment();
  matched.forEach((room) => {
    const card = createRoomCardElement(room);
    frag.appendChild(card);
  });
  container.appendChild(frag);

  if (window.attachFavoriteToggles) {
    window.attachFavoriteToggles(container);
  }
  if (window.hydrateHeartIcons) {
    window.hydrateHeartIcons(container);
  }
}

// 상단 필터 버튼(.fav-filter-btn) 클릭 동작과 활성 상태 토글 설정
function setupFilterButtons() {
  const buttons = document.querySelectorAll(".fav-filter-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-filter");
      if (!key || key === CURRENT_FILTER) return;

      CURRENT_FILTER = key;

      buttons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      renderFavoriteList();
    });
  });
}

// favorites 관련 커스텀 이벤트에서 찜 id 배열을 갱신
function handleFavoritesEvent(event) {
  const list = event.detail && event.detail.list;
  FAVORITE_IDS = Array.isArray(list) ? list : [];
  renderFavoriteList();
}

document.addEventListener("favorites:ready", handleFavoritesEvent);
document.addEventListener("favorites:changed", handleFavoritesEvent);

// DOM이 준비되면 필터 버튼/데이터 로드/초기 렌더링을 처리
document.addEventListener("DOMContentLoaded", async () => {
  DOM_READY = true;

  setupFilterButtons();
  await loadAllRooms();
  ROOMS_LOADED = true;

  if (window.getFavoriteIdList) {
    FAVORITE_IDS = window.getFavoriteIdList() || [];
  }

  renderFavoriteList();
});
