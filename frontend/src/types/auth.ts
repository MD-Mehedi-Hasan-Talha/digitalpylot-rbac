export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  level: number;
  permissions: string[];
  status: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
}
