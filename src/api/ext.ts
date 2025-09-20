// src/api/ext.ts
import axios, { AxiosHeaders } from "axios";

export const ext = axios.create({ baseURL: "http://localhost:3000/ext" });

let sessionToken: string | null = localStorage.getItem("session_token") || null;

export function setSessionToken(tok: string | null) {
  sessionToken = tok;
  if (tok) localStorage.setItem("session_token", tok);
  else localStorage.removeItem("session_token");
}

ext.interceptors.request.use((cfg) => {
  if (!sessionToken) return cfg;

  // headers가 AxiosHeaders or plain object일 수 있음
  if (!cfg.headers) {
    cfg.headers = new AxiosHeaders();
  }

  if (cfg.headers instanceof AxiosHeaders) {
    cfg.headers.set("X-Session-Token", sessionToken);
  } else {
    // plain object인 경우 안전하게 덮어쓰기
    (cfg.headers as Record<string, string>)["X-Session-Token"] = sessionToken;
  }

  return cfg;
});
