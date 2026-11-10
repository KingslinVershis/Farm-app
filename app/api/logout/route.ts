import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  );

  response.cookies.set({
    name: "farmhub_token",
    value: "",
    httpOnly: false,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set({
    name: "agripulse_token",
    value: "",
    httpOnly: false,
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function GET() {
  return POST();
}

