import { apiFetch } from "@/lib/api/apiClient";

async function parseAccountResponse(response: Response) {
  const text = await response.text().catch(() => "");

  if (!response.ok) {
    let message = "요청 처리 중 오류가 발생했습니다.";

    if (text) {
      try {
        const json = JSON.parse(text);
        message = json.message ?? json.error ?? text;
      } catch {
        message = text;
      }
    }

    console.error("[account api] request failed:", {
      status: response.status,
      statusText: response.statusText,
      message,
    });

    throw new Error(message);
  }

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function accountRequest(url: string, options: RequestInit = {}) {
  try {
    const response = await apiFetch(url, {
      ...options,
      cache: "no-store",
    });

    return await parseAccountResponse(response);
  } catch (error) {
    console.error("[account api] request error:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("알 수 없는 오류가 발생했습니다.");
  }
}

export async function changeMyEmailApi(email: string) {
  try {
    return await accountRequest("/api/users/me/email", {
      method: "PATCH",
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    console.error("[account api] changeMyEmailApi failed:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("이메일 변경에 실패했습니다.");
  }
}

export async function changeMyPasswordApi(
  currentPassword: string,
  newPassword: string,
) {
  try {
    return await accountRequest("/api/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
  } catch (error) {
    console.error("[account api] changeMyPasswordApi failed:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("비밀번호 변경에 실패했습니다.");
  }
}

export async function deleteMyAccountApi() {
  try {
    return await accountRequest("/api/users/me", {
      method: "DELETE",
    });
  } catch (error) {
    console.error("[account api] deleteMyAccountApi failed:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("회원 탈퇴에 실패했습니다.");
  }
}