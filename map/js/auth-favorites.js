// map/js/auth-favorites.js
"use strict";

/*
즐겨찾기(찜) 상태 관리 모듈

- LocalStorage 에 사용자별 favorites 배열을 저장한다.
- 로그인 정보는 SESSION_KEY 를 통해 읽어오며, 문자열/객체 모두 지원한다.
- USERS_KEY 구조(맵/배열/단일 객체)에 상관없이 favorites 필드를 붙여 사용한다.

공개 함수(window.*)
  initFavoritesFromUser()
  isFavorite(id)
  toggleFavorite(roomOrId)
  getFavoriteIdList()
  hydrateHeartIcons(root?)
  attachFavoriteToggles(root?)

커스텀 이벤트
  "favorites:ready"          { list }
  "favorites:changed"        { id, added, list }
  "favorites:require-login"
*/
(function () {
  const USERS_KEY =
    typeof window.USERS_KEY === "string" ? window.USERS_KEY : "user_Data";
  const SESSION_KEY =
    typeof window.SESSION_KEY === "string" ? window.SESSION_KEY : "status";

  // user 식별자로 쓸 수 있는 필드 후보
  const USER_ID_KEYS = ["email", "loginId", "userId", "id"];

  // JSON.parse 실패 시 fallback 반환
  const safeParse = (raw, fallback) => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  // 사용자 정의 헬퍼가 있으면 우선 사용
  const loadUsers =
    typeof window.loadUsers === "function"
      ? window.loadUsers
      : () => safeParse(localStorage.getItem(USERS_KEY), {});

  const saveUsers =
    typeof window.saveUsers === "function"
      ? window.saveUsers
      : (users) => {
          try {
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
          } catch (e) {
            console.error("[favorites] saveUsers error", e);
          }
        };

  /*
  세션 정보 로드
  - JSON 객체 또는 순수 문자열 모두 허용
    예) "user01", { loginId: "user01" }, { user: { loginId: "user01" } }
  */
  const loadSession =
    typeof window.loadSession === "function"
      ? window.loadSession
      : () => {
          const raw = localStorage.getItem(SESSION_KEY);
          if (!raw) return null;

          try {
            return JSON.parse(raw);
          } catch {
            // JSON 이 아니면 문자열 그대로 사용
            return raw;
          }
        };

  // 객체에서 로그인 식별자 후보를 하나 찾는다.
  function pickIdFromObject(obj) {
    if (!obj || typeof obj !== "object") return null;

    for (const key of USER_ID_KEYS) {
      if (obj[key]) return obj[key];
    }
    return null;
  }

  // 현재 로그인한 사용자 ID 문자열 리턴 (없으면 null)
  function getCurrentUserId() {
    const session = loadSession();
    if (!session) return null;

    if (typeof session === "string") return session;

    if (typeof session === "object") {
      const direct = pickIdFromObject(session);
      if (direct) return direct;

      // { user: {...} } 같은 중첩 구조
      if (session.user && typeof session.user === "object") {
        return pickIdFromObject(session.user);
      }
    }

    return null;
  }

  /*
  LocalStorage 의 user_Data 를 공통 포맷으로 읽기
  - kind: "map" | "array" | "single"
  */
  function readUserStore() {
    const raw = loadUsers();

    if (Array.isArray(raw)) {
      return { store: raw, kind: "array" };
    }

    if (raw && typeof raw === "object") {
      const hasNestedObj = Object.keys(raw).some(
        (k) => raw[k] && typeof raw[k] === "object"
      );
      return { store: raw, kind: hasNestedObj ? "map" : "single" };
    }

    // 비어 있으면 맵 형태로 시작
    return { store: {}, kind: "map" };
  }

  // user 객체 하나가 uid 에 해당하는지 검사
  function isSameUser(user, uid) {
    if (!user || !uid) return false;
    return USER_ID_KEYS.some((key) => user[key] === uid);
  }

  /*
  uid 에 해당하는 사용자 레코드를 찾는다.
  - kind 에 따라 찾는 방법이 달라진다.
  */
  function getUserRecordFor(uid) {
    const { store, kind } = readUserStore();

    if (!uid) {
      return { store, kind, user: null, index: -1, key: null };
    }

    if (kind === "map") {
      return {
        store,
        kind,
        user: store[uid] || null,
        index: -1,
        key: uid,
      };
    }

    if (kind === "array") {
      const index = store.findIndex((u) => isSameUser(u, uid));
      return {
        store,
        kind,
        user: index >= 0 ? store[index] : null,
        index,
        key: null,
      };
    }

    // single
    return { store, kind, user: store, index: -1, key: null };
  }

  /*
  uid 에 해당하는 사용자 레코드를 수정 후 저장한다.
  updater 는 기존 user 객체 복사본을 받고 수정된 객체를 리턴한다.
  */
  function setUserRecordFor(uid, updater) {
    const { store, kind } = readUserStore();

    if (kind === "map") {
      const base = store[uid] || { email: uid };
      const next = updater({ ...base }) || base;
      store[uid] = next;
      saveUsers(store);
      return next;
    }

    if (kind === "array") {
      const index = store.findIndex((u) => isSameUser(u, uid));

      if (index >= 0) {
        const base = store[index];
        const next = updater({ ...base }) || base;
        store[index] = next;
        saveUsers(store);
        return next;
      }

      const base = { email: uid };
      const next = updater(base) || base;
      store.push(next);
      saveUsers(store);
      return next;
    }

    // single
    const base = typeof store === "object" && store !== null ? store : {};
    const next = updater({ ...base }) || base;
    saveUsers(next);
    return next;
  }

  // 메모리 상 favorites 상태 (중복 방지용 Set 포함)
  const state = {
    list: [],
    set: new Set(),
  };

  // 현재 로그인한 사용자의 favorites 배열을 로드한다.
  function loadFavoritesForCurrentUser() {
    const uid = getCurrentUserId();
    if (!uid) return [];

    const { user } = getUserRecordFor(uid);
    if (!user) return [];

    const arr = Array.isArray(user.favorites) ? user.favorites : [];
    return arr.map(String);
  }

  // 현재 로그인한 사용자의 favorites 배열을 저장한다.
  function saveFavoritesForCurrentUser(nextList) {
    const uid = getCurrentUserId();
    if (!uid) {
      dispatch("favorites:require-login");
      alert("로그인 후 이용해 주세요.");
      return;
    }

    setUserRecordFor(uid, (user) => {
      user.favorites = Array.isArray(nextList) ? nextList.slice() : [];
      return user;
    });
  }

  // 커스텀 이벤트 디스패치 헬퍼
  function dispatch(name, detail) {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {
      // 옛 브라우저는 지원하지 않아도 무방
    }
  }

  // LocalStorage 기준으로 state 를 초기화하고 UI 와 동기화한다.
  function initFavoritesFromUser() {
    const favorites = loadFavoritesForCurrentUser();
    state.list = favorites.slice();
    state.set = new Set(favorites);

    hydrateHeartIcons();
    dispatch("favorites:ready", { list: state.list.slice() });
  }

  // 주어진 id 가 현재 favorites 에 포함되어 있는지 여부
  function isFavorite(id) {
    if (id == null) return false;
    return state.set.has(String(id));
  }

  /*
  즐겨찾기 토글
  - room 객체 또는 id 문자열/숫자 모두 허용
  - true: 추가됨, false: 제거됨
  */
  function toggleFavorite(roomOrId) {
    const uid = getCurrentUserId();
    if (!uid) {
      dispatch("favorites:require-login");
      alert("로그인 후 이용해 주세요.");
      return false;
    }

    const id = typeof roomOrId === "object" ? roomOrId?.id : roomOrId;
    if (id == null) return false;

    const key = String(id);
    let added;

    if (state.set.has(key)) {
      state.set.delete(key);
      added = false;
    } else {
      state.set.add(key);
      added = true;
    }

    state.list = Array.from(state.set);
    saveFavoritesForCurrentUser(state.list);

    hydrateHeartIcons();
    dispatch("favorites:changed", {
      id: key,
      added,
      list: state.list.slice(),
    });

    return added;
  }

  // favorites id 배열을 복사해서 반환
  function getFavoriteIdList() {
    return state.list.slice();
  }

  /*
  .fav-btn[data-room-id] 버튼들의 시각적 상태를
  현재 favorites 기준으로 다시 맞춰 준다.
  */
  function hydrateHeartIcons(root = document) {
    try {
      const buttons = root.querySelectorAll(".fav-btn[data-room-id]");

      buttons.forEach((btn) => {
        const id = btn.getAttribute("data-room-id");
        const on = isFavorite(id);

        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", String(on));

        const useEl = btn.querySelector("use");
        if (!useEl) return;

        const target = on ? "#icon-heart-filled" : "#icon-heart-outline";
        useEl.setAttribute("href", target);
        useEl.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          target
        );
      });
    } catch (e) {
      console.warn("[favorites] hydrateHeartIcons error", e);
    }
  }

  /*
  .fav-btn[data-room-id] 버튼에 클릭 핸들러를 연결한다.
  - 중복 연결을 막기 위해 __favBound 플래그를 사용한다.
  */
  function attachFavoriteToggles(root = document) {
    const buttons = root.querySelectorAll(".fav-btn[data-room-id]");

    buttons.forEach((btn) => {
      if (btn.__favBound) return;

      btn.__favBound = true;
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const id = btn.getAttribute("data-room-id");
        toggleFavorite(id);
      });
    });
  }

  // 전역 공개
  window.initFavoritesFromUser = initFavoritesFromUser;
  window.isFavorite = isFavorite;
  window.toggleFavorite = toggleFavorite;
  window.getFavoriteIdList = getFavoriteIdList;
  window.hydrateHeartIcons = hydrateHeartIcons;
  window.attachFavoriteToggles = attachFavoriteToggles;

  // DOM 로드 시 현재 사용자 favorites 를 반영
  document.addEventListener("DOMContentLoaded", () => {
    try {
      initFavoritesFromUser();
      attachFavoriteToggles();
    } catch (e) {
      console.warn("[favorites] DOMContentLoaded init error", e);
    }
  });
})();
