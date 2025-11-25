// js/config.js - 서울 구 코드·데이터 소스·단위 변환 등 전역 설정을 관리하는 모듈

/*
서울 25개 구 코드 → 이름 매핑
공공데이터의 LAWD_CD/sggCd 값을 사람이 읽기 쉬운 구 이름으로 바꿀 때 사용한다.
*/
export const SEOUL_GU_MAP = {
  "11110": "종로구",
  "11140": "중구",
  "11170": "용산구",
  "11200": "성동구",
  "11215": "광진구",
  "11230": "동대문구",
  "11260": "중랑구",
  "11290": "성북구",
  "11305": "강북구",
  "11320": "도봉구",
  "11350": "노원구",
  "11380": "은평구",
  "11410": "서대문구",
  "11440": "마포구",
  "11470": "양천구",
  "11500": "강서구",
  "11530": "구로구",
  "11545": "금천구",
  "11560": "영등포구",
  "11590": "동작구",
  "11620": "관악구",
  "11650": "서초구",
  "11680": "강남구",
  "11710": "송파구",
  "11740": "강동구",
};

/*
구 선택 드롭다운 등에 바로 사용할 수 있는 옵션 배열
예: [{ code: "11110", name: "종로구" }, ...]
*/
export const GU_OPTIONS = Object.entries(SEOUL_GU_MAP).map(
  ([code, name]) => ({ code, name })
);

/*
부동산 원본 JSON 데이터 파일 목록
file: estateData/data 디렉터리 기준 파일명
category: 데이터 종류 식별용 키 (api.js의 CATEGORY_CONFIG와 연동된다)
*/
export const DATA_SOURCES = [
  { file: "aptTrade_seoul_last3years.json", category: "aptTrade" },
  { file: "aptRent_seoul_last3years.json", category: "aptRent" },
  { file: "offiTrade_seoul_last3years.json", category: "offiTrade" },
  { file: "offiRent_seoul_last3years.json", category: "offiRent" },
  { file: "dandiTrade_seoul_last3years.json", category: "dandiTrade" },
  { file: "dandiRent_seoul_last3years.json", category: "dandiRent" },
  { file: "rowTrade_seoul_last3years.json", category: "rowTrade" },
  { file: "rowRent_seoul_last3years.json", category: "rowRent" },
];

/*
제곱미터(㎡) → 평 변환 계수
1평 ≒ 3.3058㎡ 이므로, 평수 = m2 * M2_TO_PYEONG 으로 계산한다.
*/
export const M2_TO_PYEONG = 1 / 3.3058;
