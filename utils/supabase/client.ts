import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase'

// Create a singleton client to avoid multiple connections
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          // Prevent hanging connections
          headers: {
            'connection': 'keep-alive',
            'cache-control': 'no-cache'
          }
        },
        db: {
          // Set connection timeout
          schema: 'public'
        }
      }
    )
  }
  return client
} 