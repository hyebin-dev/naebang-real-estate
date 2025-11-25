// js/api.js - 부동산 원본 JSON을 불러와 공통 포맷의 거래 데이터로 정규화하는 모듈

import { SEOUL_GU_MAP, DATA_SOURCES } from "./config.js";

/*
"115,000" 같은 문자열 가격을 숫자로 변환한다.
잘못된 값이나 null/undefined, NaN 등은 모두 0으로 처리한다.
*/
function parsePrice(str) {
  if (str == null) return 0;
  const n = Number(String(str).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/*
연/월/일 값을 받아 "YYYY-MM-DD" 형식의 날짜 문자열로 만든다.
세 값 중 하나라도 없으면 빈 문자열을 반환한다.
*/
function buildDateStr(year, month, day) {
  if (!year || !month || !day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

/*
레코드에서 서울 구 코드와 구 이름을 추출한다.
코드는 5자리 문자열로 패딩하고, 이름은 SEOUL_GU_MAP → sggNm 순으로 찾는다.
*/
function extractGuInfo(item) {
  let code = item.__LAWD_CD || item.lawdCd || item.LAWD_CD || item.sggCd;
  if (code != null) code = String(code).padStart(5, "0");

  const nameFromItem =
    typeof item.sggNm === "string"
      ? item.sggNm.split(" ").slice(-1)[0]
      : "";

  const name = SEOUL_GU_MAP[code] || nameFromItem;

  return { guCode: code || "", guName: name || "" };
}

/*
동 이름, 단지/건물명, 전용면적, 층수 등 공통 필드를 추출한다.
각 필드는 여러 키 후보 중 먼저 발견되는 값을 사용한다.
*/
function extractCommonFields(item) {
  const dong =
    item.umdNm || item["umdNm"] || item["법정동"] || item["법정동명"] || "";

  const name =
    item.aptNm ||
    item.offiNm ||
    item.bldgNm ||
    item["단지명"] ||
    item["건물명"] ||
    "";

  const areaRaw =
    item.excluUseAr ||
    item.exclUseAr ||
    item.exclArea ||
    item.flrArea ||
    item["연면적"] ||
    item["전용면적"] ||
    item["전용면적(㎡)"] ||
    null;

  const area =
    areaRaw != null && !Number.isNaN(Number(areaRaw))
      ? Number(areaRaw)
      : null;

  const floor = item.floor || item.flrNo || item["층"] || "";

  return { dong, name, area, floor };
}

/*
카테고리별 부동산 유형/거래 유형 매핑 설정
- propertyType: apartment / officetel / house / villa
- dealType: trade(매매) / rent(전월세)
*/
const CATEGORY_CONFIG = {
  aptTrade: { propertyType: "apartment", dealType: "trade" },
  aptRent: { propertyType: "apartment", dealType: "rent" },
  offiTrade: { propertyType: "officetel", dealType: "trade" },
  offiRent: { propertyType: "officetel", dealType: "rent" },
  dandiTrade: { propertyType: "house", dealType: "trade" }, // 단독/다가구 매매
  dandiRent: { propertyType: "house", dealType: "rent" },  // 단독/다가구 전월세
  rowTrade: { propertyType: "villa", dealType: "trade" },  // 연립다세대 매매
  rowRent: { propertyType: "villa", dealType: "rent" },    // 연립다세대 전월세
};

/*
원본 레코드를 화면/검색에서 쓰기 좋은 공통 포맷으로 정규화한다.
구/동, 단지명, 면적, 층, 가격, 날짜 등 공통 필드를 계산해 반환한다.
*/
function normalizeRecord(item, category) {
  const { guCode, guName } = extractGuInfo(item);
  const { dong, name, area, floor } = extractCommonFields(item);

  const dealYear = Number(item.dealYear || item["dealYear"]);
  const dealMonth = Number(item.dealMonth || item["dealMonth"]);
  const dealDay = Number(item.dealDay || item["dealDay"]);
  const dateStr = buildDateStr(dealYear, dealMonth, dealDay);

  const {
    propertyType = "apartment",
    dealType = "trade",
  } = CATEGORY_CONFIG[category] || {};

  let priceStr = "";
  let priceValue = 0;
  let tradeAmount = null;
  let deposit = null;
  let monthly = null;

  if (dealType === "trade") {
    // 매매: 거래금액만 존재
    const dealAmountStr =
      item.dealAmount || item["거래금액"] || item["거래금액(만원)"] || "";
    tradeAmount = parsePrice(dealAmountStr);
    priceStr = dealAmountStr;
    priceValue = tradeAmount;
  } else {
    // 전월세: 보증금 + 월세
    const depositStr =
      item.deposit ||
      item["보증금액"] ||
      item["보증금"] ||
      item["보증금(만원)"] ||
      "";
    const monthlyStr =
      item.monthlyRent ||
      item.rentFee ||
      item["월세금액"] ||
      item["월세"] ||
      "";
    deposit = parsePrice(depositStr);
    monthly = parsePrice(monthlyStr);

    if (monthly && monthly !== 0) {
      priceStr = `${depositStr || "-"} / ${monthlyStr}`;
    } else {
      priceStr = depositStr || "-";
    }

    // 정렬용 지표: 보증금 + 월세 * 100 (월세 비중을 크게 반영)
    priceValue = deposit + monthly * 100;
  }

  return {
    id: `${category}-${guCode}-${dateStr}-${name}-${dong}`,
    category,
    propertyType,
    dealType,
    guCode,
    guName,
    dong,
    name,
    area,
    floor,
    dealYear,
    dealMonth,
    dealDay,
    dateStr,
    priceStr,
    priceValue,
    tradeAmount,
    deposit,
    monthly,
    raw: item,
  };
}

/*
fetch로 개별 JSON 파일을 불러와 파싱한다.
HTTP 에러가 나면 예외를 던져 상위에서 처리하도록 한다.
*/
async function loadJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url} 요청 실패: ${res.status}`);
  }
  return res.json();
}

/*
배열 형태의 아이템들을 정규화해서 results 배열에 추가한다.
공통 반복 로직을 묶어 중복을 줄인다.
*/
function appendNormalized(items, category, results) {
  items.forEach((item) => {
    results.push(normalizeRecord(item, category));
  });
}

/*
DATA_SOURCES에 정의된 모든 원본 파일을 읽어
정규화된 거래 데이터 배열을 만들어 반환한다.
data/*.json 순회 중 에러가 나면 콘솔에만 로그를 남기고 다음 파일로 계속 진행한다.
*/
export async function loadAllDeals() {
  const results = [];

  for (const src of DATA_SOURCES) {
    const url = `data/${src.file}`;

    try {
      const raw = await loadJson(url);

      if (Array.isArray(raw)) {
        appendNormalized(raw, src.category, results);
      } else if (raw && Array.isArray(raw.items)) {
        appendNormalized(raw.items, src.category, results);
      } else if (raw?.response?.body?.items?.item) {
        const arr = Array.isArray(raw.response.body.items.item)
          ? raw.response.body.items.item
          : [raw.response.body.items.item];
        appendNormalized(arr, src.category, results);
      }
    } catch (err) {
      console.error("데이터 로딩 실패:", url, err);
    }
  }

  return results;
}

