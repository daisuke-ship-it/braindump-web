import { cookies } from "next/headers";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");
  return token?.value === process.env.ADMIN_PASSWORD;
}
