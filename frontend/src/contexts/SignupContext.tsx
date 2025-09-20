// src/contexts/SignupContext.tsx
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type ChangeEvent,
} from "react";

export type SignupState = {
  name: string;
  email: string;
  username: string;
  password: string;
  passwordConfirm: string;
  walletAddr: string;
  userSeed: string; // ⚠️ 데모용(운영 금지)
};

export type UserState = {
  walletAddr: string;
  userSeed: string; // ⚠️ 데모용(운영 금지)
};

const defaultState: SignupState = {
  name: "",
  email: "",
  username: "",
  password: "",
  passwordConfirm: "",
  walletAddr: "",
  userSeed: "",
};

const defaultUserState: UserState = {
  walletAddr: "",
  userSeed: "",
};

type Ctx = {
  state: SignupState;
  setState: React.Dispatch<React.SetStateAction<SignupState>>;

  user: UserState;
  setUser: React.Dispatch<React.SetStateAction<UserState>>;
  /** 단일 키 세터 */
  set<K extends keyof SignupState>(k: K, v: SignupState[K]): void;
  /** 초기화 */
  reset(): void;
};

const SignupContext = createContext<Ctx | null>(null);

export function SignupProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SignupState>(defaultState);
  const [user, setUser] = useState<UserState>(defaultUserState);

  const set = <K extends keyof SignupState>(k: K, v: SignupState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const reset = () => setState(defaultState);

  return (
    <SignupContext.Provider
      value={{ state, setState, set, reset, user, setUser }}
    >
      {children}
    </SignupContext.Provider>
  );
}

export function useSignup() {
  const ctx = useContext(SignupContext);
  if (!ctx) throw new Error("useSignup must be used within <SignupProvider>");
  return ctx;
}

/** 🔹 특정 키만 value/setter로 다루고 싶을 때 */
export function useSignupField<K extends keyof SignupState>(
  key: K
): [SignupState[K], (v: SignupState[K]) => void] {
  const { state, set } = useSignup();
  return [state[key], (v) => set(key, v)];
}

/** 🔹 인풋에 바로 바인딩할 때 (Input/Textarea 공용) */
export function useSignupInput<K extends keyof SignupState>(key: K) {
  const [value, setValue] = useSignupField(key);
  const onChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValue(e.target.value as SignupState[K]);
  return { value, onChange };
}
