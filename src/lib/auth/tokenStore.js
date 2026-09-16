"use client";

// 경로: src/lib/auth/tokenStore.js

let memoryAccessToken = null;
let memoryUser = null;

const ACCESS_TOKEN_KEY = "accessToken";
const LEGACY_TOKEN_KEY = "token";
const USER_KEY = "user";
const USER_ID_KEY = "userId";

const isBrowser = () =>
  typeof window !== "undefined";


/* ==========================================
   사용자 정보 정규화
========================================== */

export const normalizeUser = (user) => {
  if (!user) return null;

  const rawId =
    user.id ??
    user.userId ??
    user.user_id ??
    user.sub ??
    null;

  const id =
    rawId !== null &&
    rawId !== undefined &&
    rawId !== ""
      ? String(rawId)
      : null;

  const numericUserId =
    rawId !== null &&
    rawId !== undefined &&
    rawId !== ""
      ? Number(rawId)
      : null;

  const email =
    user.email ?? "";

  const nickname =
    user.nickname ??
    user.name ??
    user.username ??
    (email
      ? email.split("@")[0]
      : "") ??
    "User";


  // USER / ADMIN
  const role =
    user.role === "ADMIN"
      ? "ADMIN"
      : "USER";


  return {
    id,

    userId:
      Number.isFinite(
        numericUserId,
      )
        ? numericUserId
        : null,

    email,

    nickname,

    name:
      user.name ??
      nickname,

    username:
      user.username ??
      nickname,

    profileImageUrl:
      user.profileImageUrl ??
      null,

    role,
  };
};


/* ==========================================
   Access Token
========================================== */

export const setAccessToken = (
  token,
) => {

  memoryAccessToken =
    token || null;


  if (!isBrowser()) {
    return;
  }


  if (token) {

    window.localStorage.setItem(
      ACCESS_TOKEN_KEY,
      token,
    );

    window.localStorage.setItem(
      LEGACY_TOKEN_KEY,
      token,
    );

    return;
  }


  window.localStorage.removeItem(
    ACCESS_TOKEN_KEY,
  );

  window.localStorage.removeItem(
    LEGACY_TOKEN_KEY,
  );

  window.localStorage.removeItem(
    "jwt",
  );

  window.localStorage.removeItem(
    "authToken",
  );

  window.localStorage.removeItem(
    "Authorization",
  );
};


/* ==========================================
   Access Token 조회
========================================== */

export const getAccessToken = () => {

  if (memoryAccessToken) {
    return memoryAccessToken;
  }


  if (!isBrowser()) {
    return null;
  }


  const token =
    window.localStorage.getItem(
      ACCESS_TOKEN_KEY,
    ) ||
    window.localStorage.getItem(
      LEGACY_TOKEN_KEY,
    ) ||
    window.localStorage.getItem(
      "jwt",
    ) ||
    window.localStorage.getItem(
      "authToken",
    ) ||
    window.localStorage.getItem(
      "Authorization",
    ) ||
    window.sessionStorage.getItem(
      ACCESS_TOKEN_KEY,
    ) ||
    window.sessionStorage.getItem(
      LEGACY_TOKEN_KEY,
    );


  memoryAccessToken =
    token || null;


  return memoryAccessToken;
};


/* ==========================================
   사용자 저장
========================================== */

export const setAuthUser = (
  user,
) => {

  const normalizedUser =
    normalizeUser(
      user,
    );


  memoryUser =
    normalizedUser;


  if (!isBrowser()) {
    return;
  }


  if (normalizedUser) {

    window.localStorage.setItem(
      USER_KEY,
      JSON.stringify(
        normalizedUser,
      ),
    );


    if (normalizedUser.id) {

      window.localStorage.setItem(
        USER_ID_KEY,
        String(
          normalizedUser.id,
        ),
      );

    }

    return;
  }


  window.localStorage.removeItem(
    USER_KEY,
  );

  window.localStorage.removeItem(
    USER_ID_KEY,
  );
};


/* ==========================================
   사용자 조회
========================================== */

export const getAuthUser = () => {

  if (memoryUser) {
    return memoryUser;
  }


  if (!isBrowser()) {
    return null;
  }


  try {

    const rawUser =
      window.localStorage.getItem(
        USER_KEY,
      );


    if (!rawUser) {
      return null;
    }


    memoryUser =
      normalizeUser(
        JSON.parse(
          rawUser,
        ),
      );


    return memoryUser;

  } catch {

    return null;
  }
};


/* ==========================================
   현재 사용자 ID
========================================== */

export const getCurrentUserId = () => {

  const user =
    getAuthUser();


  if (user?.id) {
    return String(
      user.id,
    );
  }


  if (!isBrowser()) {
    return null;
  }


  return window.localStorage.getItem(
    USER_ID_KEY,
  );
};


/* ==========================================
   인증 전체 저장
========================================== */

export const setAuthSnapshot = ({
  accessToken,
  token,
  user,
  userId,
}) => {

  const resolvedAccessToken =
    accessToken ||
    token ||
    null;


  setAccessToken(
    resolvedAccessToken,
  );


  const previousUser =
    getAuthUser();


  const resolvedUser =
    user ||
    (userId
      ? {
          ...(previousUser || {}),
          id: userId,
          userId,
        }
      : previousUser);


  if (resolvedUser) {

    setAuthUser(
      resolvedUser,
    );

  }
};


/* ==========================================
   인증 제거
========================================== */

export const clearAuth = () => {

  memoryAccessToken =
    null;

  memoryUser =
    null;


  if (!isBrowser()) {
    return;
  }


  window.localStorage.removeItem(
    ACCESS_TOKEN_KEY,
  );

  window.localStorage.removeItem(
    LEGACY_TOKEN_KEY,
  );

  window.localStorage.removeItem(
    "jwt",
  );

  window.localStorage.removeItem(
    "authToken",
  );

  window.localStorage.removeItem(
    "Authorization",
  );

  window.localStorage.removeItem(
    USER_KEY,
  );

  window.localStorage.removeItem(
    USER_ID_KEY,
  );
};