import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // 1. Get the cookie store
    const cookieStore = await cookies();

    // 2. Delete the authentication token cookie
    // This effectively logs the user out on the server side
    cookieStore.delete('token');

    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Logout failed' },
      { status: 500 }
    );
  }
}