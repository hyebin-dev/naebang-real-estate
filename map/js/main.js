// js/main.js
"use strict";

/*
앱 진입점
- DOMContentLoaded 시 init() 실행
- 데이터 로드 → 지도/마커 준비 → UI 이벤트 바인딩 → 초기 상태 세팅 순으로 진행
*/
document.addEventListener("DOMContentLoaded", init);

/*
앱 전체 초기화
- 매물/지역 트리 JSON 로드
- VWorld 경계 캐시 초기화
- 로그인 회원 찜 목록 로드
- 지도/마커/오버레이 준비
- 필터/지역/찜 관련 UI 이벤트 바인딩
- 초기 지역 상태 및 경로 표시
*/
async function init() {
  try {
    // 1) 데이터 로드 (매물 + 지역 트리)
    await Promise.all([loadRooms(), loadRegionTree()]);

    // 2) 경계 캐시 초기화
    loadBoundaries();

    // 3) 로그인한 회원의 찜 목록(localStorage) 로드
    if (typeof initFavoritesFromUser === "function") {
      initFavoritesFromUser();
    }

    // 4) 지도 / 마커 / 동·구 그룹 / 오버레이 생성
    initMap();
    prepareMarkers();
    groupByDong();
    groupByGu();
    createDongOverlays();
    createGuOverlays();

    // 5) UI 이벤트 / 컴포넌트 초기화
    setupRoomTypeTabs();
    setupRegionModal();
    setupRegionResetButton();
    setupFilterModal();
    setupFavoriteToggleButton();

    // 6) 초기 선택 상태 (동 전체) 및 경로 표시
    setCurrentDong("ALL");
    updateRegionPath();
  } catch (err) {
    console.error("초기화 에러:", err);
    alert("데이터를 불러오는 중 문제가 발생했습니다.");
  }
}

/*
매물 데이터 로드 (rooms-all.json)
- DATA_URL 에서 JSON 을 가져온 뒤 rooms 배열로 정규화
- enrichRoom() 으로 후처리하여 전역 rooms 에 저장
- 실패 시 예외를 던져 init()에서 한 번에 처리
*/
async function loadRooms() {
  try {
    const res = await fetch(DATA_URL);

    if (!res.ok) {
      throw new Error(`rooms-all.json 로드 실패 (status: ${res.status})`);
    }

    const data = await res.json();
    const rawRooms = Array.isArray(data) ? data : data.rooms ?? [];

    rooms = rawRooms.map((room) => enrichRoom(room));
    console.log("로드된 매물 수:", rooms.length);
  } catch (e) {
    console.error("매물 데이터 로드 에러:", e);
    throw e;
  }
}

/*
지역 트리 데이터 로드 (region-tree-seoul.json)
- REGION_TREE_URL 에서 시/구/동 트리 구조를 가져와 REGION_TREE 에 저장
- currentSido 가 비어 있으면 첫 번째 시/도로 기본값 설정
- 치명적인 실패이므로 알림 후 예외를 다시 던진다.
*/
async function loadRegionTree() {
  try {
    const res = await fetch(REGION_TREE_URL);

    if (!res.ok) {
      throw new Error(
        `REGION_TREE JSON 로드 실패 (status: ${res.status})`
      );
    }

    REGION_TREE = await res.json();

    if (!currentSido) {
      currentSido = Object.keys(REGION_TREE)[0] || "서울특별시";
    }

    console.log("REGION_TREE 로드 완료:", REGION_TREE);
  } catch (e) {
    console.error("지역 트리 로드 중 오류:", e);
    alert(
      "지역 정보(region-tree-seoul.json)를 불러오는 중 문제가 발생했습니다."
    );
    throw e;
  }
}

/*
경계 캐시 초기화
- VWorld 또는 폴백 JSON으로 채우기 전에
  이름별 동/구 경계 캐시를 깨끗하게 비운다.
*/
function loadBoundaries() {
  dongBoundaryByName = {};
  guBoundaryByName = {};
}
