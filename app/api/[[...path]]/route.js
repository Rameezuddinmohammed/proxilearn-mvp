import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Supabase server client
function createSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handle cookie setting errors
          }
        },
      },
    }
  )
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint - GET /api/root (since /api/ is not accessible with catch-all)
    if (route === '/root' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "Hello World" }))
    }
    // Root endpoint - GET /api/root (since /api/ is not accessible with catch-all)
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "Hello World" }))
    }

    // Supabase test endpoint - GET /api/supabase-test
    if (route === '/supabase-test' && method === 'GET') {
      try {
        const supabase = createSupabaseServer()
        
        // Test 1: Try to read schools
        const { data: schools, error: schoolsError } = await supabase
          .from('schools')
          .select('*')
          .limit(5)

        if (schoolsError && schoolsError.code !== 'PGRST116') {
          return handleCORS(NextResponse.json({
            error: "Database connection failed",
            details: schoolsError.message
          }, { status: 500 }))
        }

        // Test 2: Try to read user profiles (should be empty or require auth)
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, email, role')
          .limit(3)

        return handleCORS(NextResponse.json({
          message: "Supabase connection successful",
          schools: schools || [],
          profilesCount: profiles?.length || 0,
          timestamp: new Date().toISOString()
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: "Supabase test failed",
          details: error.message
        }, { status: 500 }))
      }
    }

    // Initialize demo schools - POST /api/init-demo-schools
    if (route === '/init-demo-schools' && method === 'POST') {
      try {
        const supabase = createSupabaseServer()
        
        const demoSchools = [
          {
            name: "Delhi Public School, Hyderabad",
            address: "Nacharam, Hyderabad, Telangana 500076",
            phone: "+91-40-27153456",
            email: "info@dpshyderabad.com"
          },
          {
            name: "Oakridge International School",
            address: "Gachibowli, Hyderabad, Telangana 500032",
            phone: "+91-40-40059999",
            email: "admissions@oakridge.in"
          },
          {
            name: "Gitanjali School",
            address: "Begumpet, Hyderabad, Telangana 500016", 
            phone: "+91-40-27904561",
            email: "info@gitanjalischool.com"
          }
        ]

        const { data, error } = await supabase
          .from('schools')
          .insert(demoSchools)
          .select()

        if (error) {
          return handleCORS(NextResponse.json({
            error: "Failed to create demo schools",
            details: error.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          message: "Demo schools created successfully",
          schools: data,
          count: data.length
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: "Demo schools initialization failed",
          details: error.message
        }, { status: 500 }))
      }
    }

    // Status endpoints - POST /api/status
    if (route === '/status' && method === 'POST') {
      const body = await request.json()
      
      if (!body.client_name) {
        return handleCORS(NextResponse.json(
          { error: "client_name is required" }, 
          { status: 400 }
        ))
      }

      const statusObj = {
        id: uuidv4(),
        client_name: body.client_name,
        timestamp: new Date()
      }

      await db.collection('status_checks').insertOne(statusObj)
      return handleCORS(NextResponse.json(statusObj))
    }

    // Status endpoints - GET /api/status
    if (route === '/status' && method === 'GET') {
      const statusChecks = await db.collection('status_checks')
        .find({})
        .limit(1000)
        .toArray()

      // Remove MongoDB's _id field from response
      const cleanedStatusChecks = statusChecks.map(({ _id, ...rest }) => rest)
      
      return handleCORS(NextResponse.json(cleanedStatusChecks))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute