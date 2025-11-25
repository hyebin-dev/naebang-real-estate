// js/filter-modal.js
"use strict";

/*
필터 모달 관리
- 지역(시/구/동) + 거래유형 + 보증금 + 월세 + 면적 필터를 한 번에 설정
- setupFilterModal() 이 main.js 에서 한 번 호출된다.
- 모달 내부에 임시 상태(temp*)를 유지했다가 "적용" 시 전역 상태에 반영한다.
*/
function setupFilterModal() {
  const modal = document.getElementById("filterModal");
  if (!modal) return;

  /*
  DOM 요소 참조
  */
  const openBtn = document.getElementById("filterOpenBtn");
  const closeBtn = document.getElementById("filterCloseBtn");
  const backdrop = modal.querySelector(".filter-modal-backdrop");
  const resetBtn = document.getElementById("filterResetBtn");
  const applyBtn = document.getElementById("filterApplyBtn");

  const sidoChipsEl = document.getElementById("filterSidoChips");
  const sigunguChipsEl = document.getElementById("filterSigunguChips");
  const dongChipsEl = document.getElementById("filterDongChips");
  const sigunguRowEl = document.getElementById("filterSigunguRow");
  const dongRowEl = document.getElementById("filterDongRow");

  const dealTypeChipsEl = document.getElementById("dealTypeFilterChips");
  const depositChipsEl = document.getElementById("depositFilterChips");
  const rentChipsEl = document.getElementById("rentFilterChips");
  const areaChipsEl = document.getElementById("areaFilterChips");
  const areaUnitToggleBtn = document.getElementById("areaUnitToggle");

  /*
  모달 내부 임시 상태
  - 전역 상태를 직접 바꾸지 않고, 모달 안에서 temp* 값을 먼저 바꾼 뒤
    "적용" 버튼을 눌렀을 때만 전역 상태에 반영한다.
  */
  let tempSido = currentSido || (Object.keys(REGION_TREE)[0] || null);
  let tempSigungu = currentSigungu || null;
  let tempDong = currentDong === "ALL" ? null : currentDong;

  let tempDealTypeId = dealTypeId;
  let tempDepositRangeId = depositRangeId;
  let tempRentRangeId = rentRangeId;
  let tempAreaRangeId = areaRangeId;
  let tempAreaUnit = areaUnit;

  /*
  공통 chip 생성 헬퍼
  - 지역 선택용(region-chip)
  - 필터 선택용(filter-chip)
  */
  function createRegionChip(label, active, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "region-chip";
    btn.textContent = label;

    if (active) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", onClick);
    return btn;
  }

  function createFilterChip(label, active, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-chip";
    btn.textContent = label;

    if (active) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", onClick);
    return btn;
  }

  /*
  지역(시/구/동) chip 렌더링
  - REGION_TREE 를 기준으로 시 → 구 → 동 계층을 렌더링한다.
  - 상위가 바뀌면 하위 선택(tempSigungu, tempDong)은 초기화한다.
  */
  function renderRegionChips() {
    /* 시/도 chips */
    if (sidoChipsEl) {
      sidoChipsEl.innerHTML = "";
      const sidoKeys = Object.keys(REGION_TREE || {});

      if (!tempSido && sidoKeys.length > 0) {
        tempSido = sidoKeys[0];
      }

      sidoKeys.forEach((sido) => {
        const chip = createRegionChip(
          sido,
          tempSido === sido,
          () => {
            tempSido = sido;
            tempSigungu = null;
            tempDong = null;
            renderRegionChips();
          }
        );
        sidoChipsEl.appendChild(chip);
      });
    }

    const guMap = tempSido ? REGION_TREE[tempSido] || {} : {};

    /* 구 chips */
    if (sigunguChipsEl) {
      sigunguChipsEl.innerHTML = "";
      const guNames = Object.keys(guMap);

      if (sigunguRowEl) {
        sigunguRowEl.style.display = guNames.length ? "block" : "none";
      }

      if (guNames.length) {
        const allChip = createRegionChip(
          "전체",
          !tempSigungu,
          () => {
            tempSigungu = null;
            tempDong = null;
            renderRegionChips();
          }
        );
        sigunguChipsEl.appendChild(allChip);

        guNames.forEach((gu) => {
          const chip = createRegionChip(
            gu,
            tempSigungu === gu,
            () => {
              tempSigungu = gu;
              tempDong = null;
              renderRegionChips();
            }
          );
          sigunguChipsEl.appendChild(chip);
        });
      }
    }

    /* 동 chips */
    if (dongChipsEl) {
      dongChipsEl.innerHTML = "";
      const dongList =
        tempSido && tempSigungu ? guMap[tempSigungu] || [] : [];

      if (dongRowEl) {
        dongRowEl.style.display = dongList.length ? "block" : "none";
      }

      if (dongList.length) {
        const allChip = createRegionChip(
          "전체",
          !tempDong,
          () => {
            tempDong = null;
            renderRegionChips();
          }
        );
        dongChipsEl.appendChild(allChip);

        dongList.forEach((dong) => {
          const chip = createRegionChip(
            dong,
            tempDong === dong,
            () => {
              tempDong = dong;
              renderRegionChips();
            }
          );
          dongChipsEl.appendChild(chip);
        });
      }
    }
  }

  /*
  금액/거래유형/면적 필터 chips 렌더링
  */
  function renderDealTypeChips() {
    if (!dealTypeChipsEl) return;

    dealTypeChipsEl.innerHTML = "";

    DEAL_TYPES.forEach((opt) => {
      const chip = createFilterChip(
        opt.label,
        tempDealTypeId === opt.id,
        () => {
          tempDealTypeId = opt.id;
          renderDealTypeChips();
        }
      );
      dealTypeChipsEl.appendChild(chip);
    });
  }

  function renderDepositChips() {
    if (!depositChipsEl) return;

    depositChipsEl.innerHTML = "";

    DEPOSIT_RANGES.forEach((opt) => {
      const chip = createFilterChip(
        opt.label,
        tempDepositRangeId === opt.id,
        () => {
          tempDepositRangeId = opt.id;
          renderDepositChips();
        }
      );
      depositChipsEl.appendChild(chip);
    });
  }

  function renderRentChips() {
    if (!rentChipsEl) return;

    rentChipsEl.innerHTML = "";

    RENT_RANGES.forEach((opt) => {
      const chip = createFilterChip(
        opt.label,
        tempRentRangeId === opt.id,
        () => {
          tempRentRangeId = opt.id;
          renderRentChips();
        }
      );
      rentChipsEl.appendChild(chip);
    });
  }

  /*
  면적 범위 라벨 포맷터
  - unit: "M2" | "PYEONG"
  - AREA_RANGES 의 minM2, maxM2 를 기준으로 표시 문자열을 만든다.
  */
  function formatAreaRangeLabel(range, unit) {
    if (range.id === "ALL") return "전체";

    if (unit === "M2") {
      const min = range.minM2 != null ? Math.round(range.minM2) : null;
      const max = range.maxM2 != null ? Math.round(range.maxM2) : null;

      if (min == null && max != null) return `${max}m² 이하`;
      if (min != null && max == null) return `${min}m² 이상`;
      return `${min}~${max}m²`;
    }

    const toPyeong = (m2) =>
      m2 != null ? Math.round((m2 / 3.3) * 10) / 10 : null;

    const minP = toPyeong(range.minM2);
    const maxP = toPyeong(range.maxM2);

    if (minP == null && maxP != null) return `${maxP}평 이하`;
    if (minP != null && maxP == null) return `${minP}평 이상`;
    return `${minP}~${maxP}평`;
  }

  /*
  면적 단위 토글 버튼 표시
  - 텍스트: m² / 평
  - active 클래스: 평(PYEONG) 선택 시 강조
  */
  function renderAreaUnitToggle() {
    if (!areaUnitToggleBtn) return;

    areaUnitToggleBtn.textContent =
      tempAreaUnit === "M2" ? "m²" : "평";

    areaUnitToggleBtn.classList.toggle(
      "active",
      tempAreaUnit === "PYEONG"
    );
  }

  function renderAreaChips() {
    if (!areaChipsEl) return;

    areaChipsEl.innerHTML = "";

    AREA_RANGES.forEach((range) => {
      const label = formatAreaRangeLabel(range, tempAreaUnit);
      const chip = createFilterChip(
        label,
        tempAreaRangeId === range.id,
        () => {
          tempAreaRangeId = range.id;
          renderAreaChips();
        }
      );
      areaChipsEl.appendChild(chip);
    });
  }

  /*
  전체 필터 chips 렌더링 트리거
  */
  function renderFilterChips() {
    renderDealTypeChips();
    renderDepositChips();
    renderRentChips();
    renderAreaUnitToggle();
    renderAreaChips();
  }

  /*
  모달 열기/닫기
  - open() 시 현재 전역 상태를 temp* 로 복사 후 UI 렌더링
  - close() 는 단순히 hidden 클래스를 토글한다.
  */
  function open() {
    tempSido = currentSido || (Object.keys(REGION_TREE)[0] || null);
    tempSigungu = currentSigungu || null;
    tempDong = currentDong && currentDong !== "ALL" ? currentDong : null;

    tempDealTypeId = dealTypeId;
    tempDepositRangeId = depositRangeId;
    tempRentRangeId = rentRangeId;
    tempAreaRangeId = areaRangeId;
    tempAreaUnit = areaUnit;

    renderRegionChips();
    renderFilterChips();

    modal.classList.remove("hidden");
  }

  function close() {
    modal.classList.add("hidden");
  }

  /*
  모달 버튼 이벤트 바인딩
  */
  if (openBtn) {
    openBtn.addEventListener("click", open);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", close);
  }

  if (backdrop) {
    backdrop.addEventListener("click", close);
  }

  /*
  필터 리셋 버튼
  - REGION_TREE 첫 번째 시/도로 초기화
  - 거래/금액/면적 필터를 ALL, M2 로 초기화
  */
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const sidoKeys = Object.keys(REGION_TREE || {});
      const defaultSido = sidoKeys.length > 0 ? sidoKeys[0] : "서울특별시";

      tempSido = defaultSido;
      tempSigungu = null;
      tempDong = null;

      tempDealTypeId = "ALL";
      tempDepositRangeId = "ALL";
      tempRentRangeId = "ALL";
      tempAreaRangeId = "ALL";
      tempAreaUnit = "M2";

      renderRegionChips();
      renderFilterChips();
    });
  }

  /*
  면적 단위 토글 버튼
  - m² ↔ 평 전환
  - 토글 후 chips 라벨도 다시 렌더링
  */
  if (areaUnitToggleBtn) {
    areaUnitToggleBtn.addEventListener("click", () => {
      tempAreaUnit = tempAreaUnit === "M2" ? "PYEONG" : "M2";
      renderAreaUnitToggle();
      renderAreaChips();
    });
  }

  /*
  필터 적용 버튼
  1) 모달 임시 상태를 전역 상태에 반영
  2) 지역 그룹/오버레이 재계산
  3) 목록/지도/폴리곤/찜 버튼 UI 갱신
  4) 지역 선택에 맞게 지도 중심/레벨 재조정
  */
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      /* 1) 필터 상태 전역 반영 */
      dealTypeId = tempDealTypeId;
      depositRangeId = tempDepositRangeId;
      rentRangeId = tempRentRangeId;
      areaRangeId = tempAreaRangeId;
      areaUnit = tempAreaUnit;

      /* 2) 지역 상태 전역 반영 */
      const sidoKeys = Object.keys(REGION_TREE || {});
      const defaultSido = sidoKeys.length > 0 ? sidoKeys[0] : "서울특별시";

      currentSido = tempSido || defaultSido;
      currentSigungu = tempSigungu || null;
      currentDong = tempDong || "ALL";

      /* 3) 그룹/오버레이 재계산 */
      if (typeof groupByDong === "function") groupByDong();
      if (typeof groupByGu === "function") groupByGu();
      if (typeof createDongOverlays === "function") createDongOverlays();
      if (typeof createGuOverlays === "function") createGuOverlays();

      /* 4) UI / 지도 / 폴리곤 갱신 */
      applyFiltersAndRender({ page: 1 });

      if (typeof updateRegionPath === "function") {
        updateRegionPath();
      }

      if (typeof updateRegionPolygons === "function") {
        updateRegionPolygons();
      }

      /* 5) 지도 중심/레벨 조정 */
      if (map) {
        let center = initialCenter || null;
        let level = 7;

        if (
          currentDong !== "ALL" &&
          dongGroups[currentDong] &&
          dongGroups[currentDong].center
        ) {
          center = dongGroups[currentDong].center;
          level = 5;
        } else if (
          currentSigungu &&
          currentSido &&
          REGION_TREE[currentSido]
        ) {
          const sidoMap = REGION_TREE[currentSido] || {};
          const dongList = (sidoMap[currentSigungu] || []).filter(
            (dong) => dongGroups[dong]?.center
          );

          if (dongList.length > 0) {
            let sumLat = 0;
            let sumLng = 0;

            dongList.forEach((dong) => {
              const c = dongGroups[dong].center;
              sumLat += c.getLat();
              sumLng += c.getLng();
            });

            center = new kakao.maps.LatLng(
              sumLat / dongList.length,
              sumLng / dongList.length
            );
            level = 7;
          }
        }

        if (center) {
          map.setLevel(level);
          map.panTo(center);
        }
      }

      /* 찜(하트) 버튼 다시 바인딩 및 상태 동기화 */
      if (typeof window.attachFavoriteToggles === "function") {
        window.attachFavoriteToggles(document);
      }
      if (typeof window.hydrateHeartIcons === "function") {
        window.hydrateHeartIcons(document);
      }

      close();
    });
  }
}
