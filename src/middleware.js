import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Define the paths you want to protect
const protectedPaths = ['/admin', '/attendance', '/student'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Check if the current path matches any protected path
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected) {
    const token = request.cookies.get('token')?.value;

    // 1. No Token? Redirect to Login
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123');
      const { payload } = await jwtVerify(token, secret);
      const userRole = payload.role; 

      // --- RULE 1: Admin Page Protection ---
      // Only Admin can access
      if (pathname.startsWith('/admin') && userRole !== 'Admin') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      // --- RULE 2: Attendance Page Protection ---
      // Students cannot access attendance
      if (pathname.startsWith('/attendance') && userRole === 'Student') {
        // Redirect Student to their own profile if they try to go to attendance
        return NextResponse.redirect(new URL(`/`, request.url));
      }

      // --- RULE 3: STUDENT PAGE PROTECTION ---
if (pathname.startsWith('/student/')) {
  const parts = pathname.split('/');
  const paramId = parts[2]; // student/[id] → "id"

 

  // if (userRole === 'Student') {
  //   if (payload.enrollmentNo !== paramId) {
  //     return NextResponse.redirect(new URL('/', request.url));
  //   }
  // }
}


      

      return NextResponse.next();

    } catch (error) {
      // Invalid Token
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};