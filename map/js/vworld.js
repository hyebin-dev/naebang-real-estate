// js/vworld.js
// 1. VWorld 행정구역 경계 조회 유틸 (JSONP 버전)

(function () {
  "use strict";
  /*
  전역 캐시 객체 보장
  - map.js 에서 사용하는 이름과 동일하게 맞춘다.
  - VWorld / 폴백 JSON 에서 얻은 경계 좌표를 이름별로 저장한다.
  */
  window.dongBoundaryByName = window.dongBoundaryByName || {};
  window.guBoundaryByName = window.guBoundaryByName || {};

  /*
  0. JSONP 공통 헬퍼
  - VWorld Data API(JSONP 모드) 호출용
  - callback 파라미터명은 기본 "callback" 사용
  */
  function vworldJsonp(url, callbackParam = "callback") {
    return new Promise((resolve, reject) => {
      const cbName =
        "__vworld_cb_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2);

      const sep = url.includes("?") ? "&" : "?";
      const scriptUrl = `${url}${sep}${callbackParam}=${cbName}`;

      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;

      let timeoutId = null;

      function cleanup() {
        if (timeoutId != null) clearTimeout(timeoutId);

        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }

        try {
          delete window[cbName];
        } catch {
          window[cbName] = undefined;
        }
      }

      window[cbName] = function onJsonpResponse(data) {
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        cleanup();
        reject(new Error("VWorld JSONP script load error"));
      };

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error("VWorld JSONP timeout"));
      }, 10000);

      document.head.appendChild(script);
    });
  }

  /*
  1. 실제 VWorld Data API 호출(fetchVworldBoundary)
  - level: "dong" | "sigungu"
  - sido / sigungu / dong 은
    - 인자로 넘어온 값 우선
    - 없으면 전역 currentSido / currentSigungu 사용
  */
  async function fetchVworldBoundary(params) {
    /*
    전역 시/구 기본값
    - config.js 의 전역 변수(currentSido/currentSigungu) 또는
      window.currentSido / window.currentSigungu 를 모두 지원한다.
    */
    const globalSido =
      (typeof currentSido !== "undefined" && currentSido) ||
      (typeof window.currentSido !== "undefined" && window.currentSido) ||
      null;

    const globalSigungu =
      (typeof currentSigungu !== "undefined" && currentSigungu) ||
      (typeof window.currentSigungu !== "undefined" &&
        window.currentSigungu) ||
      null;

    const {
      level,
      sido = globalSido,
      sigungu = globalSigungu,
      dong,
    } = params || {};

    if (level !== "dong" && level !== "sigungu") {
      console.warn("fetchVworldBoundary: 잘못된 level 값", level);
      return null;
    }

    let dataName;
    let attrFilter;

    if (level === "dong") {
      if (!sido || !sigungu || !dong) {
        console.warn("fetchVworldBoundary(dong): 시/구/동 정보 부족", {
          sido,
          sigungu,
          dong,
        });
        return null;
      }

      dataName = "LT_C_ADEMD_INFO";

      const fullName = `${sido} ${sigungu} ${dong}`;
      // VWorld 문법: full_nm:=:값 (eq 역할)
      attrFilter = `full_nm:=:${fullName}`;
    } else {
      if (!sido || !sigungu) {
        console.warn("fetchVworldBoundary(sigungu): 시/구 정보 부족", {
          sido,
          sigungu,
        });
        return null;
      }

      dataName = "LT_C_ADSIGG_INFO";

      const fullName = `${sido} ${sigungu}`;
      attrFilter = `full_nm:=:${fullName}`;
    }

    /*
    key / domain / baseUrl 설정
    - window.VWORLD_* 가 있으면 우선 사용
    - 없으면 config.js 에서 정의한 상수(VWORLD_KEY, VWORLD_DOMAIN, VWORLD_BASE_URL) 사용
    - 마지막 fallback 으로 location.hostname 사용
    */
    let key = "";

    if (
      typeof window.VWORLD_KEY === "string" &&
      window.VWORLD_KEY.trim()
    ) {
      key = window.VWORLD_KEY.trim();
    } else if (typeof VWORLD_KEY !== "undefined") {
      key = String(VWORLD_KEY).trim();
    }

    // 우선순위: window.VWORLD_DOMAIN → VWORLD_DOMAIN → location.hostname
    let domain = "";

    if (
      typeof window.VWORLD_DOMAIN === "string" &&
      window.VWORLD_DOMAIN.trim()
    ) {
      domain = window.VWORLD_DOMAIN.trim();
    } else if (typeof VWORLD_DOMAIN !== "undefined") {
      domain = String(VWORLD_DOMAIN).trim();
    } else {
      try {
        // 포트가 붙은 host 대신 hostname 만 사용 (VWorld 도메인 인증 문제 회피)
        domain = window.location.hostname || "";
      } catch {
        domain = "";
      }
    }

    if (!key) {
      console.error("VWorld API key(VWORLD_KEY)가 비어 있습니다.");
      return null;
    }

    if (!domain) {
      console.warn(
        "VWorld domain이 비어 있습니다. VWorld 콘솔에 등록된 도메인과 일치해야 합니다."
      );
    }

    // baseUrl: window.VWORLD_BASE_URL → VWORLD_BASE_URL → 기본값
    let baseUrl = "";

    if (
      typeof window.VWORLD_BASE_URL === "string" &&
      window.VWORLD_BASE_URL
    ) {
      baseUrl = window.VWORLD_BASE_URL;
    } else if (typeof VWORLD_BASE_URL !== "undefined") {
      baseUrl = VWORLD_BASE_URL;
    } else {
      baseUrl = "https://api.vworld.kr/req/data";
    }

    const searchParams = new URLSearchParams({
      service: "data",
      request: "GetFeature",
      version: "2.0",
      format: "json", // JSON + JSONP
      page: "1",
      size: "1000",
      geometry: "true",
      attribute: "false",
      key,
      domain,
      data: dataName,
      attrFilter,
    });

    const url = `${baseUrl}?${searchParams.toString()}`;

    let json;

    try {
      json = await vworldJsonp(url, "callback");
    } catch (error) {
      console.error("VWorld API 호출 중 에러(JSONP):", error);
      return null;
    }

    const featureCollection = json?.response?.result?.featureCollection;
    const features = featureCollection?.features;

    if (!Array.isArray(features) || features.length === 0) {
      console.warn(
        "VWorld 경계 결과 없음(도메인 미일치/행정명 불일치일 수 있음):",
        { level, sido, sigungu, dong, domain, url }
      );
      return null;
    }

    const geom = features[0].geometry;

    if (!geom || !geom.type || !geom.coordinates) {
      console.warn("VWorld geometry 형식이 예상과 다름:", geom);
      return null;
    }

    const ring = pickFirstRing(geom);

    if (!ring || !ring.length) {
      console.warn("VWorld ring 추출 실패:", geom);
      return null;
    }

    // [x(경도), y(위도)] → [lat, lng] 형태로 변환
    return ring.map(([x, y]) => [y, x]);
  }

  /*
  geometry에서 첫 번째 ring 추출
  - MultiPolygon: coordinates[0][0]
  - Polygon: coordinates[0]
  */
  function pickFirstRing(geometry) {
    const { type, coordinates } = geometry;

    if (!coordinates) return null;

    if (type === "MultiPolygon") {
      return coordinates[0]?.[0] || null;
    }

    if (type === "Polygon") {
      return coordinates[0] || null;
    }

    console.warn("지원하지 않는 geometry.type:", type);
    return null;
  }

  /*
  2. 동 / 구 경계 헬퍼 + 캐시
  - getDongBoundaryCoords(dongName)
  - getGuBoundaryCoords(sigunguName)
  - 한 번 받아온 좌표는 window.dongBoundaryByName / window.guBoundaryByName 에 캐시
  */
  async function getDongBoundaryCoords(dongName) {
    if (!dongName) return null;

    if (
      window.dongBoundaryByName &&
      window.dongBoundaryByName[dongName]
    ) {
      return window.dongBoundaryByName[dongName];
    }

    const coords = await fetchVworldBoundary({
      level: "dong",
      dong: dongName,
    });

    if (coords && coords.length) {
      window.dongBoundaryByName[dongName] = coords;
      return coords;
    }

    return null;
  }

  async function getGuBoundaryCoords(sigunguName) {
    if (!sigunguName) return null;

    if (
      window.guBoundaryByName &&
      window.guBoundaryByName[sigunguName]
    ) {
      return window.guBoundaryByName[sigunguName];
    }

    const coords = await fetchVworldBoundary({
      level: "sigungu",
      sigungu: sigunguName,
    });

    if (coords && coords.length) {
      window.guBoundaryByName[sigunguName] = coords;
      return coords;
    }

    return null;
  }

  /*
  전역 공개
  - vworldJsonp
  - fetchVworldBoundary
  - getDongBoundaryCoords
  - getGuBoundaryCoords
  */
  window.vworldJsonp = vworldJsonp;
  window.fetchVworldBoundary = fetchVworldBoundary;
  window.getDongBoundaryCoords = getDongBoundaryCoords;
  window.getGuBoundaryCoords = getGuBoundaryCoords;
})();
