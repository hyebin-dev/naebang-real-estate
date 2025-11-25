// js/config.js
"use strict";

/*
0. 전역 설정 & 기본 상태
- 데이터/지역 트리/경계 데이터 파일 경로
- VWorld API 설정
*/
const DATA_URL = "./rooms-all.json"; // 매물 데이터(JSON)
const REGION_TREE_URL = "./region-tree-seoul.json"; // 시/도 → 구 → 동 구조 (서울)

// VWorld 실패 시 사용할 로컬 경계 데이터 폴백
const DONG_BOUNDARY_URL = "./dong-boundaries.json";
const GU_BOUNDARY_URL = "./gu-boundaries.json";

/*
0-2. VWorld 행정구역 경계 API 설정
- 공개 레포에서는 실제 키를 넣지 않고,
  window.VWORLD_KEY 값이나 플레이스홀더를 사용한다.
*/
const VWORLD_KEY =
  (typeof window !== "undefined" && window.VWORLD_KEY) ||
  "__VWORLD_KEY__"; // 로컬에서는 vworld.local.js에서 window.VWORLD_KEY를 세팅

const VWORLD_DOMAIN = window.location.hostname || "";
const VWORLD_BASE_URL = "https://api.vworld.kr/req/data";

// region-tree-seoul.json 로드 후 채워지는 시/도 → 구 → 동 트리 구조
let REGION_TREE = {};

/* 1. 현재 선택 상태 (지역 / 카테고리 / 필터) */
/* 지역 선택 상태 */
let currentSido = "서울특별시";
let currentSigungu = null;
let currentDong = "ALL";

/* 방 종류 (ALL, ONEROOM, APT, VILLA, OFFICETEL) */
let currentCategory = "ALL";

/* 거래 / 금액 / 면적 필터 상태 */
let dealTypeId = "ALL"; // ALL, MONTHLY, JEONSE, TRADING
let depositRangeId = "ALL";
let rentRangeId = "ALL";
let areaRangeId = "ALL";

/* 면적 단위: "M2"(㎡), "PYEONG"(평) - UI 표기 기준 */
let areaUnit = "M2";

/* 찜(즐겨찾기) 필터 상태 */
let showFavoritesOnly = false;

/*
2. 필터 옵션 정의
- 화면에서 사용하는 드롭다운/버튼 옵션 목록
- 실제 필터링 로직에서는 id 값을 기준으로 매칭
*/
/* 거래 유형 */
const DEAL_TYPES = [
  { id: "ALL", label: "전체" },
  { id: "MONTHLY", label: "월세" },
  { id: "JEONSE", label: "전세" },
  { id: "TRADING", label: "매매" },
];

/* 보증금 범위 (단위: 만원) */
const DEPOSIT_RANGES = [
  { id: "ALL", label: "전체" },
  { id: "D1", label: "5,000 이하", maxDeposit: 5000 },
  { id: "D2", label: "5,000 ~ 1만", minDeposit: 5000, maxDeposit: 10000 },
  { id: "D3", label: "1만 ~ 2만", minDeposit: 10000, maxDeposit: 20000 },
  { id: "D4", label: "2만 이상", minDeposit: 20000 },
];

/* 월세 범위 (단위: 만원) */
const RENT_RANGES = [
  { id: "ALL", label: "전체" },
  { id: "R1", label: "30 이하", maxRent: 30 },
  { id: "R2", label: "30 ~ 50", minRent: 30, maxRent: 50 },
  { id: "R3", label: "50 ~ 80", minRent: 50, maxRent: 80 },
  { id: "R4", label: "80 이상", minRent: 80 },
];

/* 면적 범위 (기준 단위: m²) */
const AREA_RANGES = [
  { id: "ALL", minM2: null, maxM2: null },
  { id: "A1", minM2: null, maxM2: 33 },
  { id: "A2", minM2: 33, maxM2: 66 },
  { id: "A3", minM2: 66, maxM2: 99 },
  { id: "A4", minM2: 99, maxM2: 132 },
  { id: "A5", minM2: 132, maxM2: 165 },
  { id: "A6", minM2: 165, maxM2: 198 },
  { id: "A7", minM2: 198, maxM2: 231 },
  { id: "A8", minM2: 231, maxM2: null },
];

/*
3. 지도 / 마커 / 클러스터 관련 전역 상태
- 지도 인스턴스와 마커들
- 동/구 단위 그룹 정보
- 선택된 방/마커 상태
*/
let map = null;
let initialCenter = null;

let rooms = []; // 전체 매물 데이터
let markers = []; // 지도 위 마커 목록
let markerById = {}; // room.id → marker 매핑

// "잠원동" → { rooms:[...], center:LatLng, overlay:CustomOverlay }
let dongGroups = {};
// "서초구" → { rooms:[...], center:LatLng, overlay:CustomOverlay }
let guGroups = {};

let clusterer = null;
let dongOverlays = [];
let guOverlays = [];

// 현재 선택된 방/마커 상태
let selectedRoomId = null;
let selectedMapMarker = null;
let selectedMarkerOverlay = null;

/*
4. VWorld 경계 데이터 캐시
- 동/구 이름별 경계 좌표(폴리곤)를 캐싱
- 지도에 표시된 현재 폴리곤 레퍼런스 보관
*/
let dongBoundaryByName = {};
let guBoundaryByName = {};
let dongAreaPolygon = null;
let guAreaPolygon = null;

/*
5. VWorld 설정을 전역으로 노출
- vworld.js 등 다른 스크립트에서 window.VWORLD_* 로 접근
*/
window.VWORLD_KEY = VWORLD_KEY;
window.VWORLD_DOMAIN = VWORLD_DOMAIN;
window.VWORLD_BASE_URL = VWORLD_BASE_URL;
