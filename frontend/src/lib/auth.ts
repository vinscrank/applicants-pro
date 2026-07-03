const TOKEN_KEY = "accessToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type AuthResponse = {
  accessToken: string;
  tokenType: string;
};

type UserResponse = {
  id: number;
  email: string;
  active: boolean;
};

const apiUrl = () => process.env.NEXT_PUBLIC_JAVA_API_URL!;

async function readAuthError(res: Response, fallback: string): Promise<string> {
  if (res.status === 409) {
    return "Email already registered";
  }
  if (res.status === 400) {
    return "Invalid email or password (min 8 characters)";
  }
  if (res.status === 401) {
    return "Invalid credentials";
  }
  return fallback;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${apiUrl()}/api/v2/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(await readAuthError(res, "Login failed"));
  }

  const data: AuthResponse = await res.json();
  setAccessToken(data.accessToken);
}

export async function register(email: string, password: string): Promise<void> {
  const res = await fetch(`${apiUrl()}/api/v2/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(await readAuthError(res, "Registration failed"));
  }

  const data: AuthResponse = await res.json();
  setAccessToken(data.accessToken);
}

export async function fetchCurrentUser(): Promise<UserResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${apiUrl()}/api/v2/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Session expired");
  }

  return res.json();
}