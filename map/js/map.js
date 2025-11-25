// js/map.js
"use strict";

/*
지도 / 마커 / 클러스터 / 폴리곤 관리
- 카카오 지도 초기화
- 매물 마커 + 클러스터
- 동/구 그룹화 및 클러스터 오버레이
- 선택된 지역(구/동)에 따라 폴리곤 표시 (VWorld 경계 활용)
*/
/* 1. 지도 / 클러스터 / 폴리곤 공통 상수 */
// 지도 기본 중심 (강남역 근처)
const DEFAULT_CENTER_LAT = 37.498;
const DEFAULT_CENTER_LNG = 127.027;
const DEFAULT_MAP_LEVEL = 7;

// 줌 레벨 기준값 (Kakao: 숫자 작을수록 확대)
const ZOOM_SHOW_GU_CLUSTER = 8; // level ≥ 8  → 구 칩
const ZOOM_SHOW_DONG_CLUSTER = 6; // 6 ≤ level < 8 → 동 칩

// 폴리곤 노출 범위
const ZOOM_HIDE_DONG_POLY_MIN = 4; // 너무 확대하면 동 폴리곤 숨김
const ZOOM_HIDE_DONG_POLY_MAX = 10;// 너무 축소해도 동 폴리곤 숨김

const ZOOM_HIDE_GU_POLY_MIN = 6; // 너무 확대하면 구 폴리곤 숨김
const ZOOM_HIDE_GU_POLY_MAX = 12; // 너무 축소해도 구 폴리곤 숨김

// 동/구 폴리곤 스타일
const DONG_POLYGON_OPTIONS = {
  strokeWeight: 3,
  strokeColor: "#ff5722",
  strokeOpacity: 0.95,
  strokeStyle: "solid",
  fillColor: "#ffccbc",
  fillOpacity: 0.35,
};

const GU_POLYGON_OPTIONS = {
  strokeWeight: 3,
  strokeColor: "#1b5e20",
  strokeOpacity: 0.9,
  strokeStyle: "solid",
  fillColor: "#c8e6c9",
  fillOpacity: 0.28,
};

/*
VWorld 경계 데이터 캐시 및 폴리곤 목록
- VWorld / 폴백 JSON 에서 가져온 동/구 경계 좌표를 이름별로 캐싱
- 화면에 그려진 모든 폴리곤은 window._regionPolygons 에 모아둔다.
*/
window.dongBoundaryByName = window.dongBoundaryByName || {};
window.guBoundaryByName = window.guBoundaryByName || {};
window._regionPolygons = window._regionPolygons || [];

/*
모든 구/동 폴리곤 제거
- 경계 갱신 전 항상 호출해서 화면에 남아 있는 폴리곤을 정리한다.
*/
function clearAllRegionPolygons() {
  (window._regionPolygons || []).forEach((polygon) => {
    if (polygon && typeof polygon.setMap === "function") {
      polygon.setMap(null);
    }
  });

  window._regionPolygons = [];
  dongAreaPolygon = null;
  guAreaPolygon = null;
}

window.clearAllRegionPolygons = clearAllRegionPolygons;

/* 2. 카카오 지도 + 마커 클러스터러 초기화 */
function initMap() {
  const container = document.getElementById("map");
  if (!container) {
    console.error("#map 엘리먼트를 찾을 수 없습니다.");
    return;
  }

  // 첫 매물의 위치가 있으면 그 근처를 기본 중심으로 사용
  const roomWithLocation = rooms.find((room) => room.randomLocation);

  const defaultCenter = roomWithLocation
    ? new kakao.maps.LatLng(
        roomWithLocation.randomLocation.lat,
        roomWithLocation.randomLocation.lng
      )
    : new kakao.maps.LatLng(DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG);

  initialCenter = defaultCenter;

  map = new kakao.maps.Map(container, {
    center: defaultCenter,
    level: DEFAULT_MAP_LEVEL,
  });

  clusterer = new kakao.maps.MarkerClusterer({
    map,
    averageCenter: true,
    minLevel: 4,
    calculator: [10, 30, 50, 100],
    styles: [
      {
        width: "34px",
        height: "34px",
        background: "rgba(255, 122, 42, 0.95)",
        borderRadius: "50%",
        color: "#ffffff",
        fontSize: "13px",
        fontWeight: "700",
        textAlign: "center",
        lineHeight: "34px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.25)",
      },
      {
        width: "44px",
        height: "44px",
        background: "rgba(255, 122, 42, 0.95)",
        borderRadius: "50%",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: "700",
        textAlign: "center",
        lineHeight: "44px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
      },
      {
        width: "56px",
        height: "56px",
        background: "rgba(255, 122, 42, 0.95)",
        borderRadius: "50%",
        color: "#ffffff",
        fontSize: "15px",
        fontWeight: "700",
        textAlign: "center",
        lineHeight: "56px",
        boxShadow: "0 3px 6px rgba(0,0,0,0.30)",
      },
      {
        width: "70px",
        height: "70px",
        background: "rgba(255, 122, 42, 0.95)",
        borderRadius: "50%",
        color: "#ffffff",
        fontSize: "16px",
        fontWeight: "700",
        textAlign: "center",
        lineHeight: "70px",
        boxShadow: "0 4px 8px rgba(0,0,0,0.35)",
      },
    ],
  });

  kakao.maps.event.addListener(map, "zoom_changed", onMapZoomChanged);

  // 초기 로딩 시 한번 폴리곤/오버레이 상태 동기화
  updateMapMarkersAndClusters();
  updateRegionPolygons();
}

function onMapZoomChanged() {
  updateMapMarkersAndClusters();
  updateRegionPolygons();
}

/* 3. 매물 마커 생성 / 동·구 그룹화 / 오버레이 생성 */
/*
매물 마커 준비
- rooms 배열을 순회하며 randomLocation 이 있는 매물만 지도에 마커로 올린다.
- markerById 에 room.id → marker 매핑을 저장한다.
- 클러스터러에 마커 목록을 등록한다.
*/
function prepareMarkers() {
  markers = [];
  markerById = {};

  rooms.forEach((room) => {
    if (!room.randomLocation) return;

    const position = new kakao.maps.LatLng(
      room.randomLocation.lat,
      room.randomLocation.lng
    );

    const marker = new kakao.maps.Marker({ position });

    markerById[room.id] = marker;
    markers.push(marker);

    kakao.maps.event.addListener(marker, "click", () => {
      if (typeof onRoomSelected === "function") {
        onRoomSelected(room);
      }
    });
  });

  if (clusterer) {
    clusterer.clear();
    clusterer.addMarkers(markers);
  }
}

/*
동 단위 그룹화
- room.dongName 기준으로 매물을 묶는다.
- 각 동 그룹에 rooms, center(평균 좌표), overlay 참조를 보관한다.
*/
function groupByDong() {
  dongGroups = {};

  rooms.forEach((room) => {
    const dong = room.dongName || "기타";

    if (!dongGroups[dong]) {
      dongGroups[dong] = {
        rooms: [],
        center: null,
        overlay: null,
      };
    }

    dongGroups[dong].rooms.push(room);
  });

  Object.values(dongGroups).forEach((group) => {
    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    group.rooms.forEach((room) => {
      if (!room.randomLocation) return;
      sumLat += room.randomLocation.lat;
      sumLng += room.randomLocation.lng;
      count += 1;
    });

    if (count > 0) {
      group.center = new kakao.maps.LatLng(
        sumLat / count,
        sumLng / count
      );
    }
  });
}

/*
구 단위 그룹화
- REGION_TREE[currentSido] 기준으로 구 → 동 목록을 얻는다.
- 각 구에 속한 동 그룹(dongGroups)을 모아서 rooms, center, overlay 를 만든다.
*/
function groupByGu() {
  guGroups = {};

  if (!REGION_TREE || !currentSido) return;

  const sidoMap = REGION_TREE[currentSido] || {};

  Object.entries(sidoMap).forEach(([sigungu, dongList]) => {
    let roomsInGu = [];
    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    dongList.forEach((dong) => {
      const dGroup = dongGroups[dong];
      if (!dGroup) return;

      roomsInGu = roomsInGu.concat(dGroup.rooms);

      if (dGroup.center) {
        sumLat += dGroup.center.getLat();
        sumLng += dGroup.center.getLng();
        count += 1;
      }
    });

    if (!roomsInGu.length || !count) return;

    const center = new kakao.maps.LatLng(sumLat / count, sumLng / count);

    guGroups[sigungu] = {
      rooms: roomsInGu,
      center,
      overlay: null,
    };
  });
}

/*
현재 시/도에서 특정 동이 속한 구 찾기
- 동 클러스터 클릭 시, 자동으로 currentSigungu 를 세팅하기 위해 사용
*/
function findGuForDongInSido(sido, dongName) {
  if (!REGION_TREE || !sido || !dongName) return null;

  const sidoMap = REGION_TREE[sido] || {};

  for (const [gu, list] of Object.entries(sidoMap)) {
    if (Array.isArray(list) && list.includes(dongName)) {
      return gu;
    }
  }

  return null;
}

/*
동 클러스터 오버레이 생성
- 각 동 그룹 center 에 "동 이름 + 개수" 오버레이를 올린다.
- 클릭 시 해당 동을 선택하고, 지도의 레벨/중심을 이동시킨다.
*/
function createDongOverlays() {
  dongOverlays = [];

  Object.entries(dongGroups).forEach(([dong, group]) => {
    if (!group.center) return;

    const div = document.createElement("div");
    div.className = "dong-cluster";
    div.innerHTML = `
      <span class="dong-cluster-name">${dong}</span>
      <span class="dong-cluster-count">${group.rooms.length}개</span>
    `;

    const overlay = new kakao.maps.CustomOverlay({
      position: group.center,
      content: div,
      yAnchor: 1,
    });

    group.overlay = overlay;
    dongOverlays.push(overlay);

    div.addEventListener("click", () => {
      // 동만 눌러도 폴리곤이 나오도록, 해당 동이 속한 구를 자동으로 세팅
      const autoGu = findGuForDongInSido(currentSido, dong);
      if (autoGu) {
        currentSigungu = autoGu;
      }

      if (typeof setCurrentDong === "function") {
        setCurrentDong(dong);
      } else {
        currentDong = dong;

        if (typeof updateRegionPath === "function") {
          updateRegionPath();
        }
        if (typeof renderList === "function") {
          renderList();
        }

        updateMapMarkersAndClusters();
        updateRegionPolygons();
      }

      if (group.center && map) {
        map.setLevel(5);
        map.panTo(group.center);
      }
    });
  });
}

/*
구 클러스터 오버레이 생성
- 각 구 그룹 center 에 "구 이름 + 개수" 오버레이를 올린다.
- 클릭 시 해당 구를 선택하고, 동은 ALL 로 두며 지도의 레벨/중심을 이동시킨다.
*/
function createGuOverlays() {
  guOverlays = [];

  Object.entries(guGroups).forEach(([sigungu, group]) => {
    if (!group.center) return;

    const div = document.createElement("div");
    div.className = "gu-cluster";
    div.innerHTML = `
      <span class="gu-cluster-name">${sigungu}</span>
      <span class="gu-cluster-count">${group.rooms.length}개</span>
    `;

    const overlay = new kakao.maps.CustomOverlay({
      position: group.center,
      content: div,
      yAnchor: 1,
    });

    group.overlay = overlay;
    guOverlays.push(overlay);

    div.addEventListener("click", () => {
      if (typeof setCurrentSigungu === "function") {
        setCurrentSigungu(sigungu);
      } else {
        currentSigungu = sigungu;
        currentDong = "ALL";

        if (typeof updateRegionPath === "function") {
          updateRegionPath();
        }
        if (typeof renderList === "function") {
          renderList();
        }

        updateMapMarkersAndClusters();
        updateRegionPolygons();
      }

      if (group.center && map) {
        map.setLevel(7);
        map.panTo(group.center);
      }
    });
  });
}

/* 4. 줌/필터에 따른 마커 / 구·동 클러스터 표시 제어 */
/*
선택된 구에 동이 포함되는지 여부
- currentSigungu 가 설정되어 있으면 해당 구에 속한 동만 true
*/
function dongBelongsToSelectedGu(dongName) {
  if (!REGION_TREE || !currentSido || !currentSigungu) return true;

  const sidoMap = REGION_TREE[currentSido] || {};
  const dongList = sidoMap[currentSigungu];
  if (!dongList) return true;

  return dongList.indexOf(dongName) !== -1;
}

/*
줌 레벨 및 필터에 따라
- 구/동 오버레이를 보여줄지
- 개별 매물 마커 클러스터를 보여줄지 결정한다.
*/
function updateMapMarkersAndClusters() {
  if (!clusterer || !map) return;

  const level = map.getLevel();

  // 기존 동/구 오버레이 숨기기
  Object.values(dongGroups || {}).forEach((group) => {
    if (group.overlay) {
      group.overlay.setMap(null);
    }
  });

  (guOverlays || []).forEach((overlay) => {
    if (overlay) {
      overlay.setMap(null);
    }
  });

  clusterer.clear();

  // A. currentDong === "ALL" 인 상태의 구/동 칩 정책
  if (currentDong === "ALL") {
    // A-1) 가장 멀리: 구 칩만
    if (level >= ZOOM_SHOW_GU_CLUSTER) {
      Object.values(guGroups || {}).forEach((group) => {
        if (group.overlay) {
          group.overlay.setMap(map);
        }
      });

      if (selectedMarkerOverlay) {
        selectedMarkerOverlay.setMap(null);
      }
      return;
    }

    // A-2) 조금 더 가까이: 동 칩
    if (level >= ZOOM_SHOW_DONG_CLUSTER) {
      Object.entries(dongGroups || {}).forEach(([dong, group]) => {
        if (!group.overlay) return;
        if (!dongBelongsToSelectedGu(dong)) return;
        group.overlay.setMap(map);
      });

      if (selectedMarkerOverlay) {
        selectedMarkerOverlay.setMap(null);
      }
      return;
    }
    // A-3) level < ZOOM_SHOW_DONG_CLUSTER → 아래 B로 진행
  }

  // B. 개별 매물 클러스터 + 선택 핀
  if (selectedMarkerOverlay) {
    if (level <= ZOOM_SHOW_DONG_CLUSTER) {
      selectedMarkerOverlay.setMap(map);
    } else {
      selectedMarkerOverlay.setMap(null);
    }
  }

  const visibleRooms =
    typeof getVisibleRooms === "function" ? getVisibleRooms() : rooms;

  let targetMarkers = visibleRooms
    .map((room) => markerById[room.id])
    .filter(Boolean);

  // 선택된 마커와 정확히 같은 위치의 마커는 클러스터에서 제외 (겹침 방지)
  if (selectedMapMarker) {
    const selPos = selectedMapMarker.getPosition();
    const selLat = selPos.getLat();
    const selLng = selPos.getLng();

    targetMarkers = targetMarkers.filter((marker) => {
      const p = marker.getPosition();
      const dLat = Math.abs(p.getLat() - selLat);
      const dLng = Math.abs(p.getLng() - selLng);
      const sameSpot = dLat < 0.00001 && dLng < 0.00001;
      return !sameSpot;
    });
  }

  if (targetMarkers.length > 0) {
    clusterer.addMarkers(targetMarkers);
  }
}

/* 5. 구/동 폴리곤 표시 (VWorld 경계 활용) */
/*
폴리곤이 현재 화면보다 너무 큰지 검사
- 지도 투영(projection)을 사용해 좌표를 픽셀 좌표로 변환
- 폴리곤의 bounding box 가 지도 영역보다 margin 배 이상 크면 true
*/
function isPolygonTooBigForView(coordPairs) {
  if (!map || !coordPairs || !coordPairs.length) return false;

  const proj = map.getProjection();
  if (!proj || typeof proj.pointFromCoords !== "function") return false;

  const container = document.getElementById("map");
  if (!container) return false;

  const mapWidth = container.clientWidth || container.offsetWidth || 0;
  const mapHeight = container.clientHeight || container.offsetHeight || 0;
  if (!mapWidth || !mapHeight) return false;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  coordPairs.forEach(([lat, lng]) => {
    const pt = proj.pointFromCoords(new kakao.maps.LatLng(lat, lng));
    if (!pt) return;

    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  });

  if (
    !isFinite(minX) ||
    !isFinite(minY) ||
    !isFinite(maxX) ||
    !isFinite(maxY)
  ) {
    return false;
  }

  const width = maxX - minX;
  const height = maxY - minY;

  // 약간 여유 (1.2배)까지는 허용
  const margin = 1.2;
  return width > mapWidth * margin || height > mapHeight * margin;
}

/*
선택된 구/동에 맞게 폴리곤 갱신
- currentDong 이 특정 동이면 동 폴리곤만
- currentDong 이 ALL 이고 currentSigungu 만 있으면 구 폴리곤만
- 각 단계에서 줌 레벨, 화면 크기 조건을 검사해 너무 크면 그리지 않는다.
*/
function updateRegionPolygons() {
  if (!map) return;

  // 지금까지 그렸던 모든 구/동 폴리곤 싹 제거 (겹침 방지)
  clearAllRegionPolygons();

  const level = map.getLevel();

  // 1) 동이 선택된 경우 → 동 폴리곤만 표시
  if (currentDong && currentDong !== "ALL") {
    // 줌 레벨이 너무 크거나 작으면 표시 안 함
    if (level <= ZOOM_HIDE_DONG_POLY_MIN || level >= ZOOM_HIDE_DONG_POLY_MAX) {
      return;
    }

    const cached = window.dongBoundaryByName[currentDong];

    // 캐시가 있으면 바로 그리기
    if (cached && cached.length) {
      // 화면보다 크면 표시하지 않음
      if (isPolygonTooBigForView(cached)) return;

      const path = cached.map(
        (pair) => new kakao.maps.LatLng(pair[0], pair[1]) // [lat, lng] 가정
      );

      dongAreaPolygon = new kakao.maps.Polygon(
        Object.assign({ path }, DONG_POLYGON_OPTIONS)
      );

      dongAreaPolygon.setMap(map);
      window._regionPolygons.push(dongAreaPolygon);

      if (typeof window.nbTunePolygon === "function") {
        window.nbTunePolygon(dongAreaPolygon);
      }
      return; // 동을 그렸으면 구는 그리지 않음
    }

    // 캐시가 없으면 비동기 로드 후 바로 그리기
    const targetDong = currentDong;

    getDongBoundaryCoords(targetDong)
      .then((coords) => {
        if (!coords || !coords.length) {
          console.warn(`[폴리곤] 동 '${targetDong}' 경계 로드 실패`);
          return;
        }

        // 그 사이에 선택 동이 바뀌었으면 그리지 않음
        if (targetDong !== currentDong) return;

        // 화면보다 크면 표시하지 않음
        if (isPolygonTooBigForView(coords)) return;

        // 캐시에 저장
        window.dongBoundaryByName[targetDong] = coords;

        const curLevel = map.getLevel();
        if (
          curLevel <= ZOOM_HIDE_DONG_POLY_MIN ||
          curLevel >= ZOOM_HIDE_DONG_POLY_MAX
        ) {
          return;
        }

        const path = coords.map(
          (pair) => new kakao.maps.LatLng(pair[0], pair[1])
        );

        dongAreaPolygon = new kakao.maps.Polygon(
          Object.assign({ path }, DONG_POLYGON_OPTIONS)
        );

        dongAreaPolygon.setMap(map);
        window._regionPolygons.push(dongAreaPolygon);

        if (typeof window.nbTunePolygon === "function") {
          window.nbTunePolygon(dongAreaPolygon);
        }
      })
      .catch((error) => {
        console.error("동 경계 로딩 실패:", error);
      });

    return; // 동 처리 후에는 구 처리 안 함
  }

  // 2) 동은 ALL, 구만 선택된 경우 → 구 폴리곤만
  if (currentSigungu) {
    if (level <= ZOOM_HIDE_GU_POLY_MIN || level >= ZOOM_HIDE_GU_POLY_MAX) {
      return;
    }

    const cachedGu = window.guBoundaryByName[currentSigungu];

    if (cachedGu && cachedGu.length) {
      // 화면보다 크면 표시하지 않음
      if (isPolygonTooBigForView(cachedGu)) return;

      const pathGu = cachedGu.map(
        (pair) => new kakao.maps.LatLng(pair[0], pair[1])
      );

      guAreaPolygon = new kakao.maps.Polygon(
        Object.assign({ path: pathGu }, GU_POLYGON_OPTIONS)
      );

      guAreaPolygon.setMap(map);
      window._regionPolygons.push(guAreaPolygon);

      if (typeof window.nbTunePolygon === "function") {
        window.nbTunePolygon(guAreaPolygon);
      }
      return;
    }

    const targetGu = currentSigungu;

    getGuBoundaryCoords(targetGu)
      .then((coords) => {
        if (!coords || !coords.length) {
          console.warn(`[폴리곤] 구 '${targetGu}' 경계 로드 실패`);
          return;
        }

        // 비동기 로딩 사이에 동이 선택되면(ALL 아님) 구 폴리곤은 그리지 않음 → 겹침 방지
        if (currentDong && currentDong !== "ALL") return;

        if (targetGu !== currentSigungu) return;

        // 화면보다 크면 표시하지 않음
        if (isPolygonTooBigForView(coords)) return;

        window.guBoundaryByName[targetGu] = coords;

        const curLevel = map.getLevel();
        if (
          curLevel <= ZOOM_HIDE_GU_POLY_MIN ||
          curLevel >= ZOOM_HIDE_GU_POLY_MAX
        ) {
          return;
        }

        const pathGu = coords.map(
          (pair) => new kakao.maps.LatLng(pair[0], pair[1])
        );

        guAreaPolygon = new kakao.maps.Polygon(
          Object.assign({ path: pathGu }, GU_POLYGON_OPTIONS)
        );

        guAreaPolygon.setMap(map);
        window._regionPolygons.push(guAreaPolygon);

        if (typeof window.nbTunePolygon === "function") {
          window.nbTunePolygon(guAreaPolygon);
        }
      })
      .catch((error) => {
        console.error("구 경계 로딩 실패:", error);
      });
  }
}

/* 6. 목록 → 지도 포커스 헬퍼 */
/*
특정 방에 지도 포커스를 맞추는 헬퍼
- room 객체 또는 room.id 를 받아서 해당 마커 위치로 지도 이동
- options.level 이 있으면 줌 레벨도 함께 변경
*/
function focusRoomOnMap(roomOrId, options = {}) {
  if (!map) return;

  const id = typeof roomOrId === "object" ? roomOrId.id : roomOrId;
  if (id == null) return;

  const marker = markerById[id];
  if (!marker) return;

  const position = marker.getPosition();
  const { level = null, pan = true } = options;

  if (typeof level === "number") {
    map.setLevel(level);
  }

  if (pan) {
    map.panTo(position);
  }
}

// 필요하면 다른 스크립트에서 바로 쓸 수 있도록 전역 노출
window.focusRoomOnMap = focusRoomOnMap;
