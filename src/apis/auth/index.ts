import { api, type User } from "@/lib/api";

export interface LoginResponse {
  accessToken: string;
  user: User;
}

/** POST /auth/login — the one endpoint that does not require a token. */
export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}
