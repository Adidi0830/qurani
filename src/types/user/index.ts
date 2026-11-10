export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  isBlocked: boolean;
  role: "admin" | "member";
  avatar: string;
}
