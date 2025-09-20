// 변경 전과 비교: walletAddr 필드 추가 + 서버에 함께 전송
import { api } from "./axios";

export type SignupBody = {
  name: string;
  email: string;
  username: string;
  password: string;
  passwordConfirm: string;
  walletAddr?: string | null; // ✅ 추가
};

export type LoginBody = { username: string; password: string };

export async function signup(body: SignupBody) {
  const res = await api.post("/auth/signup", {
    name: body.name,
    username: body.username,
    password: body.password,
    passwordConfirm: body.passwordConfirm,
    email: body.email ?? "",
    walletAddr: body.walletAddr ?? null, // ✅ 함께 전송
  });
  return res.data.user as {
    id: string;
    username: string;
    email?: string | null;
    walletAddr?: string | null;
  };
}

export async function login(body: LoginBody) {
  const res = await api.post("/auth/login", body);
  return res.data as {
    token: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      username: string;
      email?: string | null;
      walletAddr?: string | null;
    };
  };
}
