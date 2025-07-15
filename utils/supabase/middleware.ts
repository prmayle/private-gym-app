import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {

    // IMPORTANT: Avoid using `supabase.auth.getSession()` here as it would be unreliable
    // session is refreshed by middleware, so no need to check it again
    // Add timeout to prevent hanging
    const userPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), 3000)
    )
    
    const {
      data: { user },
    } = await Promise.race([userPromise, timeoutPromise]) as any

    const { pathname } = request.nextUrl
    
    // Define public routes
    const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/', '/bootstrap']
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))
    
    // Allow API routes and static files to pass through
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.includes('.')) {
      return supabaseResponse
    }
    
    // If no user and trying to access protected route, redirect to login
    if (!user && !isPublicRoute) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    
    // If user is authenticated and on login page, redirect to appropriate dashboard
    if (user && pathname === '/login') {
      // Use JWT metadata for role checking (best practice - no database queries)
      const role = user.user_metadata?.role || user.app_metadata?.role
      
      let dashboardPath = '/member/dashboard' // default for members
      if (role === 'admin') {
        dashboardPath = '/admin/dashboard'
      } else if (role === 'trainer') {
        dashboardPath = '/trainer/dashboard'
      }
      
      const dashboardUrl = new URL(dashboardPath, request.url)
      return NextResponse.redirect(dashboardUrl)
    }
    
    // Role-based route protection using JWT metadata (no database queries)
    if (user) {
      const role = user.user_metadata?.role || user.app_metadata?.role
      
      // Protect admin routes
      if (pathname.startsWith('/admin') && role !== 'admin') {
        const redirectUrl = new URL('/member/dashboard', request.url)
        return NextResponse.redirect(redirectUrl)
      }
      
      // Protect member routes (allow admin access)
      if (pathname.startsWith('/member') && !['member', 'admin'].includes(role)) {
        const redirectUrl = new URL('/login', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }
    
    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow the request to continue to avoid blocking
    return supabaseResponse
  }
}