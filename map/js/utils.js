// js/utils.js
"use strict";

/*
공통 유틸리티 모듈
- 숫자/문자열 파싱
- 방 데이터 파생 필드(enrichRoom)
- 현재 상태(지역/필터)에 맞는 매물 목록 계산
- 지역 경로 텍스트 및 지역 초기화
*/
/* 1) 숫자/문자열 파싱 유틸 */
/*
숫자값 파싱
- 숫자면 그대로 검증 후 반환
- 문자열이면 숫자/부호만 남기고 Number 로 변환
- 실패 시 null
*/
function numericValue(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isNaN(value) ? null : value;
  }

  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

/*
"2억", "2억 5000", "8000" 같은 보증금/매매가 문자열을
만원 단위 숫자로 변환
*/
function parseDepositToken(token) {
  if (!token && token !== 0) return null;

  const s = String(token).trim();

  if (s.includes("억")) {
    const [eokRaw, restRaw] = s.split("억");
    const eok = numericValue(eokRaw);
    const rest = numericValue(restRaw);

    let sum = 0;
    if (eok != null) sum += eok * 10000;
    if (rest != null) sum += rest;

    return sum || null;
  }

  return numericValue(s);
}

/*
면적(m²) 값 추출
- supplyArea / exclusiveArea / area / roomArea 순서로 직접 필드 우선
- 없으면 roomDesc 내에서 "숫자 + m²/㎡/m2" 패턴을 찾아서 사용
*/
function parseAreaM2(room) {
  if (!room) return null;

  const directSource =
    room.supplyArea ??
    room.exclusiveArea ??
    room.area ??
    room.roomArea;

  const m2direct = numericValue(directSource);
  if (m2direct != null) return m2direct;

  if (room.roomDesc) {
    const match = room.roomDesc.match(/([\d,.]+)\s*(?:m²|㎡|m2)/i);
    if (match && match[1]) {
      const fromDesc = numericValue(match[1]);
      if (fromDesc != null) return fromDesc;
    }
  }

  return null;
}

/*
방 타입 이름을 카테고리 코드로 변환
- room.roomTypeName 을 기준으로 문자열 매칭
*/
function getRoomCategory(room) {
  const typeName = (room && room.roomTypeName) || "";

  if (typeName.includes("오피스텔")) return "OFFICETEL";
  if (typeName.includes("아파트")) return "APT";
  if (typeName.match(/주택|빌라|다세대|연립/)) return "VILLA";
  if (typeName.match(/원룸|투룸|쓰리룸|3룸|4룸|룸/)) return "ONEROOM";

  return "ETC";
}

/*
2) 방 객체 파생 필드(enrichRoom)
- 가격 문자열 분석 → _dealType / _deposit / _rent
- 면적 분석 → _areaM2 / _areaPyeong
*/
/*
방 객체에 파생 필드를 채워 넣는다.
- _dealType: MONTHLY / JEONSE / TRADING / null
- _deposit: 보증금/매매가 (만원 단위)
- _rent: 월세 (만원 단위, 월세가 아닐 경우 null 또는 0)
- _areaM2: 면적(m²)
- _areaPyeong: 면적(평)
*/
function enrichRoom(room) {
  if (!room || typeof room !== "object") return room;

  const type = room.priceTypeName || "";
  const title = room.priceTitle || "";

  let dealType = null;
  let deposit = null;
  let rent = null;

  if (type.includes("월세")) {
    dealType = "MONTHLY";

    const [depToken, rentToken] = title.split("/");
    deposit = parseDepositToken(depToken);
    rent = numericValue(rentToken);
  } else if (type.includes("전세")) {
    dealType = "JEONSE";

    deposit = parseDepositToken(title);
    rent = 0;
  } else if (type.includes("매매")) {
    dealType = "TRADING";

    deposit = parseDepositToken(title);
  }

  room._dealType = dealType;
  room._deposit = deposit;
  room._rent = rent;

  const areaM2 = parseAreaM2(room);
  room._areaM2 = areaM2;
  room._areaPyeong = areaM2 != null ? +(areaM2 / 3.3).toFixed(1) : null;

  return room;
}

/* 파생 필드 getter 들 */
function getRoomDeposit(room) {
  return room?._deposit ?? null;
}

function getRoomRent(room) {
  return room?._rent ?? null;
}

function getRoomDealType(room) {
  return room?._dealType || null;
}

function getRoomAreaM2(room) {
  return room?._areaM2 ?? null;
}

function getRoomPyeong(room) {
  return room?._areaPyeong ?? null;
}

/*
3) 현재 상태(지역/필터)에 맞는 매물 목록 계산
- 지역(시/구/동)
- 방 종류
- 거래 유형
- 보증금 / 월세 / 면적
- 찜(즐겨찾기) 모드
*/
function getVisibleRooms() {
  if (!Array.isArray(rooms) || rooms.length === 0) return [];

  let result = rooms.slice();

  /* 지역 필터 */
  if (currentDong && currentDong !== "ALL") {
    result = result.filter((room) => room.dongName === currentDong);
  } else if (currentSigungu) {
    const sidoMap = REGION_TREE[currentSido] || {};
    const dongList = sidoMap[currentSigungu] || [];

    if (dongList.length > 0) {
      result = result.filter((room) => dongList.includes(room.dongName));
    }
  }

  /* 방 종류 필터 */
  if (currentCategory && currentCategory !== "ALL") {
    result = result.filter(
      (room) => getRoomCategory(room) === currentCategory
    );
  }

  /* 거래 유형 필터 */
  if (dealTypeId && dealTypeId !== "ALL") {
    result = result.filter((room) => {
      const dt = getRoomDealType(room);
      if (!dt) return true; // 거래 유형이 없으면 필터에서 제외하지 않음
      return dt === dealTypeId;
    });
  }

  /* 보증금 필터 */
  if (depositRangeId && depositRangeId !== "ALL") {
    const range = DEPOSIT_RANGES.find(
      (item) => item.id === depositRangeId
    );

    if (range) {
      result = result.filter((room) => {
        const depo = getRoomDeposit(room);
        if (depo == null) return true;

        if (range.minDeposit != null && depo < range.minDeposit) return false;
        if (range.maxDeposit != null && depo > range.maxDeposit) return false;

        return true;
      });
    }
  }

  /* 월세 필터 */
  if (rentRangeId && rentRangeId !== "ALL") {
    const range = RENT_RANGES.find((item) => item.id === rentRangeId);

    if (range) {
      result = result.filter((room) => {
        const dt = getRoomDealType(room);
        if (dt !== "MONTHLY") return true; // 전세/매매는 월세 필터 영향 X

        const rent = getRoomRent(room);
        if (rent == null) return true;

        if (range.minRent != null && rent < range.minRent) return false;
        if (range.maxRent != null && rent > range.maxRent) return false;

        return true;
      });
    }
  }

  /* 면적 필터 */
  if (areaRangeId && areaRangeId !== "ALL") {
    const range = AREA_RANGES.find((item) => item.id === areaRangeId);

    if (range) {
      result = result.filter((room) => {
        if (areaUnit === "M2") {
          const area = getRoomAreaM2(room);
          if (area == null) return true;

          if (range.minM2 != null && area < range.minM2) return false;
          if (range.maxM2 != null && area > range.maxM2) return false;

          return true;
        }

        const p = getRoomPyeong(room);
        if (p == null) return true;

        const minP = range.minM2 != null ? range.minM2 / 3.3 : null;
        const maxP = range.maxM2 != null ? range.maxM2 / 3.3 : null;

        if (minP != null && p < minP) return false;
        if (maxP != null && p > maxP) return false;

        return true;
      });
    }
  }

  /* 찜(즐겨찾기) 필터 */
  if (showFavoritesOnly && typeof window.isFavorite === "function") {
    result = result.filter((room) => window.isFavorite(room.id));
  }

  return result;
}

/* 4) 지역 관련 헬퍼 (경로 텍스트 / 초기화) */
/*
현재 지역 상태(sido / sigungu / dong)를
"서울특별시 > 서초구 > 잠원동" 형태 문자열로 엘리먼트에 반영
*/
function updateRegionPath() {
  const el = document.getElementById("regionPath");
  if (!el) return;

  const sido = currentSido || "전국";
  const sigungu = currentSigungu || "전체";
  const dong = currentDong && currentDong !== "ALL" ? currentDong : "전체";

  el.textContent = `${sido} > ${sigungu} > ${dong}`;
}

/*
지역/선택/지도 상태 초기화
- currentSido / currentSigungu / currentDong / selectedRoomId / selectedMapMarker 리셋
- 선택 핀 오버레이 제거
- 리스트/지도/폴리곤/경로 갱신
- 지도 중심/레벨 초기 좌표로 이동
*/
function resetRegion() {
  const sidoKeys = Object.keys(REGION_TREE || {});
  currentSido = sidoKeys.length > 0 ? sidoKeys[0] : "서울특별시";
  currentSigungu = null;
  currentDong = "ALL";
  selectedRoomId = null;
  selectedMapMarker = null;

  if (selectedMarkerOverlay) {
    selectedMarkerOverlay.setMap(null);
    selectedMarkerOverlay = null;
  }

  updateRegionPath();
  renderList();
  updateMapMarkersAndClusters();
  updateRegionPolygons();

  if (map && initialCenter) {
    map.setLevel(7);
    map.setCenter(initialCenter);
  }
}
