const allowedRoots = new Set(["auth", "farm", "mill", "office", "sales", "seasons", "shipping-rates", "shop"]);
const singleSegmentRoots = new Set(["seasons", "shipping-rates"]);
const allowedMethods = ["GET", "POST", "PUT", "DELETE"];

function getBackendBaseUrl() {
  const configuredUrl = process.env.BACKEND_API_URL;

  if (configuredUrl && configuredUrl.trim()) {
    return new URL(configuredUrl);
  }

  if (process.env.NODE_ENV !== "production") {
    return new URL("http://127.0.0.1:3000");
  }

  throw new Error("BACKEND_API_URL is not configured for this deployment.");
}

async function forwardRequest(request, context) {
  const { path } = await context.params;

  if (
    !Array.isArray(path) ||
    path.length < (singleSegmentRoots.has(path[0]) ? 1 : 2) ||
    !allowedRoots.has(path[0]) ||
    path.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment))
  ) {
    return Response.json({ error: "Unknown API route." }, { status: 404 });
  }

  let baseUrl;
  try {
    baseUrl = getBackendBaseUrl();
    if (!["http:", "https:"].includes(baseUrl.protocol)) {
      throw new Error("The backend API URL must use HTTP or HTTPS.");
    }
  } catch (error) {
    console.error("Invalid backend API URL:", error);
    return Response.json(
      {
        error: process.env.NODE_ENV === "production"
          ? "The app is missing BACKEND_API_URL. Set it to your PHP API domain in Vercel."
          : "Backend API URL is not configured correctly.",
      },
      { status: 500 }
    );
  }

  const backendUrl = new URL(
    `api/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`,
    baseUrl.href.endsWith("/") ? baseUrl : `${baseUrl.href}/`,
  );
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");

  if (authorization) {
    headers.set("Authorization", authorization);
  }
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  let body;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
  }

  try {
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    const responseHeaders = new Headers();
    const backendContentType = backendResponse.headers.get("content-type");
    if (backendContentType) {
      responseHeaders.set("Content-Type", backendContentType);
    }

    return new Response(await backendResponse.text(), {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Backend API request failed:", error);
    return Response.json(
      { error: "Could not reach the backend API on port 3000. Check that the backend server is running." },
      { status: 502 },
    );
  }
}

export const GET = forwardRequest;
export const POST = forwardRequest;
export const PUT = forwardRequest;
export const DELETE = forwardRequest;

export function OPTIONS() {
  return Response.json({ error: "Method not allowed." }, { status: 405 });
}

export function PATCH() {
  return Response.json({ error: "Method not allowed." }, { status: 405 });
}
