
export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const SESSION_KEY = "malapote-auth";

let refreshTask = null;

/**
 * Get saved authentication session.
 */
function getStoredSession() {
  if (typeof window === "undefined") return null;

  try {
    const sessionData =
      window.sessionStorage.getItem(SESSION_KEY) ||
      window.localStorage.getItem(SESSION_KEY);

    return sessionData ? JSON.parse(sessionData) : null;
  } catch {
    clearStoredSession();
    return null;
  }
}

/**
 * Save authentication session.
 */
function saveStoredSession(session) {
  if (typeof window === "undefined") return;

  const sessionData = JSON.stringify(session);

  window.sessionStorage.setItem(SESSION_KEY, sessionData);
  window.localStorage.setItem(SESSION_KEY, sessionData);

  window.dispatchEvent(new Event("malapote-auth-change"));
}

/**
 * Clear authentication session.
 */
function clearStoredSession() {
  if (typeof window === "undefined") return;

  window.sessionStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SESSION_KEY);

  window.dispatchEvent(new Event("malapote-auth-change"));
}

/**
 * Normalize API endpoint.
 */
function buildApiUrl(path) {
  const cleanPath = String(path)
    .replace(/^\/+/, "")
    .replace(/^api\/backend\/?/i, "")
    .replace(/^api\/?/i, "");

  if (!cleanPath) {
    throw new ApiError("API endpoint is required.", 0);
  }

  return `/api/backend/${cleanPath}`;
}

/**
 * Read response payload safely.
 */
async function readPayload(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  return await response.text();
}

/**
 * Check if body is FormData.
 */
function isFormData(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

/**
 * Send HTTP request.
 *
 * JSON requests use application/json.
 * FormData requests automatically use multipart/form-data.
 */
async function sendRequest(path, method, token, body) {
  const headers = new Headers();

  headers.set("Accept", "application/json");

  let requestBody;

  if (body !== undefined) {
    if (isFormData(body)) {
      // IMPORTANT:
      // Do not manually set Content-Type for FormData.
      // Browser automatically adds the multipart boundary.
      requestBody = body;
    } else {
      headers.set("Content-Type", "application/json");
      requestBody = JSON.stringify(body);
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await fetch(buildApiUrl(path), {
      method,
      headers,
      body: requestBody,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Unable to connect to the AgriStock backend. Check if LavaLust is running on port 3000.",
      0
    );
  }
}

/**
 * Refresh expired access token.
 */
async function refreshAccessToken(expiredToken) {
  if (typeof window === "undefined") return null;

  const session = getStoredSession();

  if (!session?.refreshToken) return null;

  if (session.accessToken !== expiredToken) {
    return session.accessToken || null;
  }

  if (refreshTask) {
    return refreshTask;
  }

  refreshTask = (async () => {
    let response;

    try {
      response = await fetch("/api/backend/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          refresh_token: session.refreshToken,
        }),
        cache: "no-store",
      });
    } catch {
      throw new ApiError(
        "Could not connect to refresh your AgriStock session.",
        0
      );
    }

    const result = await readPayload(response);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearStoredSession();
      }

      return null;
    }

    const tokens = result?.tokens;

    const nextSession = {
      ...session,
      accessToken: tokens?.access_token,
      refreshToken: tokens?.refresh_token,
    };

    if (!nextSession.accessToken || !nextSession.refreshToken) {
      throw new ApiError(
        "The server returned an incomplete token response.",
        response.status
      );
    }

    saveStoredSession(nextSession);

    return nextSession.accessToken;
  })().finally(() => {
    refreshTask = null;
  });

  return refreshTask;
}

/**
 * Main API request function.
 *
 * JSON:
 * apiRequest("mill/inventory")
 *
 * FormData:
 * const formData = new FormData();
 * formData.append("product_name", "Rice");
 * formData.append("image", file);
 *
 * apiRequest("sales/products", {
 *   method: "POST",
 *   body: formData
 * });
 */
export async function apiRequest(
  path,
  { method = "GET", token, body } = {}
) {
  const session = getStoredSession();

  let accessToken = token || session?.accessToken || null;

  let response = await sendRequest(
    path,
    method,
    accessToken,
    body
  );

  // Automatically refresh expired access token.
  if (
    response.status === 401 &&
    accessToken &&
    path !== "auth/refresh"
  ) {
    const updatedToken = await refreshAccessToken(accessToken);

    if (updatedToken) {
      accessToken = updatedToken;

      response = await sendRequest(
        path,
        method,
        accessToken,
        body
      );
    } else {
      clearStoredSession();
    }
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null
        ? payload.error ||
          payload.message ||
          payload.detail
        : typeof payload === "string" && payload.trim()
          ? payload
          : `Request failed with status ${response.status}.`;

    throw new ApiError(message, response.status);
  }

  return payload;
}

/**
 * Optional helper for logging out.
 */
export function logout() {
  clearStoredSession();
}
