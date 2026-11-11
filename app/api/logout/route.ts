import { NextRequest, NextResponse } from "next/server";
import { revokeSessionToken, clearAuthCookies } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  await revokeSessionToken(request);

  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  clearAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  return POST(request);
}

