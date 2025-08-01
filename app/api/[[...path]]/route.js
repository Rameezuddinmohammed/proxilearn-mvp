import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

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

// OpenAI client for Kimi K2
const openai = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// Helper function to get authenticated user
async function getAuthenticatedUser(supabase) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('Authentication required')
  }
  return user
}

// Helper function to generate AI quiz questions
async function generateQuizQuestions(topic, difficulty, questionCount, subject) {
  const prompt = `Create ${questionCount} multiple choice questions about "${topic}" for ${subject} at ${difficulty} level.

Requirements:
- Questions should be educational and appropriate for students
- Each question should have 4 options (A, B, C, D)
- Include clear explanations for correct answers
- Difficulty: ${difficulty}
- Topic: ${topic}
- Subject: ${subject}

Format your response as a JSON array with this structure:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Detailed explanation why this is correct"
  }
]

Make sure the JSON is valid and properly formatted.`

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.KIMI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate high-quality quiz questions that are pedagogically sound and appropriate for the specified difficulty level.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const content = completion.choices[0].message.content.trim()
    // Extract JSON from the response (in case there's extra text)
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('Could not extract valid JSON from AI response')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('AI Quiz Generation Error:', error)
    throw new Error('Failed to generate quiz questions with AI')
  }
}

// Helper function to generate AI doubt response
async function generateDoubtResponse(question, context, subject) {
  const prompt = `A student has asked the following question about ${subject}:

Question: "${question}"
${context ? `Context: "${context}"` : ''}

Please provide a helpful, educational response that:
1. Directly answers the student's question
2. Explains the concept clearly with examples if needed
3. Is appropriate for a student learning ${subject}
4. Is encouraging and supportive
5. Suggests follow-up learning if relevant

Keep the response concise but comprehensive.`

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.KIMI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful, patient, and knowledgeable teacher assistant. Provide clear, accurate, and encouraging responses to student questions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.error('AI Doubt Response Error:', error)
    throw new Error('Failed to generate AI response for doubt')
  }
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
    const supabase = createSupabaseServer()

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

    // ================================================================================================
    // STUDENT PHASE APIs
    // ================================================================================================

    // GET /api/subjects - List subjects for student's school
    if (route === '/subjects' && method === 'GET') {
      try {
        const user = await getAuthenticatedUser(supabase)
        
        const { data: subjects, error } = await supabase
          .from('subjects')
          .select(`
            id, name, description, code, grade_level,
            schools!inner(id, name)
          `)
          .eq('is_active', true)
          .order('name')

        if (error) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch subjects",
            details: error.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          subjects: subjects || [],
          count: subjects?.length || 0
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // GET /api/assignments - List published assignments
    if (route === '/assignments' && method === 'GET') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const url = new URL(request.url)
        const subjectId = url.searchParams.get('subject_id')
        
        let query = supabase
          .from('assignments')
          .select(`
            id, title, description, assignment_type, difficulty_level,
            total_questions, time_limit_minutes, max_attempts, passing_score,
            due_date, created_at,
            subjects!inner(id, name, code),
            user_profiles!assignments_teacher_id_fkey!inner(id, full_name)
          `)
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (subjectId) {
          query = query.eq('subject_id', subjectId)
        }

        const { data: assignments, error } = await query

        if (error) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch assignments",
            details: error.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          assignments: assignments || [],
          count: assignments?.length || 0
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // POST /api/assignments/generate-quiz - AI-powered quiz generation
    if (route === '/assignments/generate-quiz' && method === 'POST') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const body = await request.json()
        
        const { topic, difficulty, questionCount, subjectId, title } = body
        
        if (!topic || !difficulty || !questionCount || !subjectId || !title) {
          return handleCORS(NextResponse.json({
            error: "Missing required fields: topic, difficulty, questionCount, subjectId, title"
          }, { status: 400 }))
        }

        // Get subject info for context
        const { data: subject, error: subjectError } = await supabase
          .from('subjects')
          .select('name')
          .eq('id', subjectId)
          .single()

        if (subjectError) {
          return handleCORS(NextResponse.json({
            error: "Subject not found",
            details: subjectError.message
          }, { status: 404 }))
        }

        // Generate AI quiz questions
        const questions = await generateQuizQuestions(topic, difficulty, questionCount, subject.name)

        // Create assignment
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .insert({
            title,
            description: `AI-generated quiz on ${topic}`,
            subject_id: subjectId,
            teacher_id: user.id, // Student creates their own practice quiz
            assignment_type: 'quiz',
            difficulty_level: difficulty,
            total_questions: questionCount,
            time_limit_minutes: questionCount * 2, // 2 minutes per question
            max_attempts: 3,
            is_published: true
          })
          .select()
          .single()

        if (assignmentError) {
          return handleCORS(NextResponse.json({
            error: "Failed to create assignment",
            details: assignmentError.message
          }, { status: 500 }))
        }

        // Insert questions
        const questionsToInsert = questions.map((q, index) => ({
          assignment_id: assignment.id,
          question_text: q.question,
          question_type: 'multiple_choice',
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          points: 1.0,
          order_index: index + 1
        }))

        const { data: insertedQuestions, error: questionsError } = await supabase
          .from('assignment_questions')
          .insert(questionsToInsert)
          .select()

        if (questionsError) {
          return handleCORS(NextResponse.json({
            error: "Failed to create questions",
            details: questionsError.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          message: "Quiz generated successfully",
          assignment,
          questions: insertedQuestions,
          count: insertedQuestions.length
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Failed to generate quiz"
        }, { status: 500 }))
      }
    }

    // GET /api/assignments/{id}/questions - Get assignment questions
    if (route.match(/^\/assignments\/[^\/]+\/questions$/) && method === 'GET') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const assignmentId = route.split('/')[2]
        
        // Verify assignment access
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .select('id, title, is_published')
          .eq('id', assignmentId)
          .eq('is_published', true)
          .single()

        if (assignmentError) {
          return handleCORS(NextResponse.json({
            error: "Assignment not found",
            details: assignmentError.message
          }, { status: 404 }))
        }

        // Get questions (without correct answers for students)
        const { data: questions, error: questionsError } = await supabase
          .from('assignment_questions')
          .select('id, question_text, question_type, options, points, order_index')
          .eq('assignment_id', assignmentId)
          .order('order_index')

        if (questionsError) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch questions",
            details: questionsError.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          assignment,
          questions: questions || [],
          count: questions?.length || 0
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // POST /api/assignments/{id}/start - Start assignment attempt
    if (route.match(/^\/assignments\/[^\/]+\/start$/) && method === 'POST') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const assignmentId = route.split('/')[2]
        
        // Check if assignment exists and is published
        const { data: assignment, error: assignmentError } = await supabase
          .from('assignments')
          .select('id, title, max_attempts')
          .eq('id', assignmentId)
          .eq('is_published', true)
          .single()

        if (assignmentError) {
          return handleCORS(NextResponse.json({
            error: "Assignment not found"
          }, { status: 404 }))
        }

        // Check existing attempts
        const { data: existingAttempts, error: attemptsError } = await supabase
          .from('assignment_attempts')
          .select('attempt_number')
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .order('attempt_number', { ascending: false })

        if (attemptsError) {
          return handleCORS(NextResponse.json({
            error: "Failed to check existing attempts"
          }, { status: 500 }))
        }

        const nextAttemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1

        if (nextAttemptNumber > assignment.max_attempts) {
          return handleCORS(NextResponse.json({
            error: "Maximum attempts exceeded"
          }, { status: 400 }))
        }

        // Create new attempt
        const { data: attempt, error: createAttemptError } = await supabase
          .from('assignment_attempts')
          .insert({
            assignment_id: assignmentId,
            student_id: user.id,
            attempt_number: nextAttemptNumber,
            status: 'in_progress'
          })
          .select()
          .single()

        if (createAttemptError) {
          return handleCORS(NextResponse.json({
            error: "Failed to start assignment attempt",
            details: createAttemptError.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          message: "Assignment attempt started",
          attempt,
          attemptNumber: nextAttemptNumber
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // POST /api/assignments/{id}/submit - Submit assignment with auto-grading
    if (route.match(/^\/assignments\/[^\/]+\/submit$/) && method === 'POST') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const assignmentId = route.split('/')[2]
        const body = await request.json()
        
        const { answers, attemptNumber, timeSpent } = body
        
        if (!answers || !attemptNumber) {
          return handleCORS(NextResponse.json({
            error: "Missing required fields: answers, attemptNumber"
          }, { status: 400 }))
        }

        // Get assignment questions with correct answers
        const { data: questions, error: questionsError } = await supabase
          .from('assignment_questions')
          .select('id, correct_answer, points, explanation')
          .eq('assignment_id', assignmentId)

        if (questionsError) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch questions for grading"
          }, { status: 500 }))
        }

        // Grade answers and create responses
        let totalScore = 0
        let totalPossiblePoints = 0
        const responses = []

        for (const question of questions) {
          totalPossiblePoints += question.points
          const studentAnswer = answers[question.id]
          const isCorrect = studentAnswer === question.correct_answer
          const pointsEarned = isCorrect ? question.points : 0
          totalScore += pointsEarned

          responses.push({
            assignment_id: assignmentId,
            student_id: user.id,
            question_id: question.id,
            student_answer: studentAnswer,
            is_correct: isCorrect,
            points_earned: pointsEarned,
            attempt_number: attemptNumber
          })
        }

        // Insert student responses
        const { error: responsesError } = await supabase
          .from('student_responses')
          .insert(responses)

        if (responsesError) {
          return handleCORS(NextResponse.json({
            error: "Failed to save responses",
            details: responsesError.message
          }, { status: 500 }))
        }

        // Calculate percentage
        const percentage = totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0

        // Update attempt with final score
        const { data: updatedAttempt, error: updateError } = await supabase
          .from('assignment_attempts')
          .update({
            status: 'completed',
            total_score: totalScore,
            percentage_score: percentage,
            total_time_spent_seconds: timeSpent || 0,
            submitted_at: new Date().toISOString()
          })
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .eq('attempt_number', attemptNumber)
          .select()
          .single()

        if (updateError) {
          return handleCORS(NextResponse.json({
            error: "Failed to update attempt",
            details: updateError.message
          }, { status: 500 }))
        }

        // Get detailed results with explanations
        const { data: detailedResults, error: resultsError } = await supabase
          .from('student_responses')
          .select(`
            question_id, student_answer, is_correct, points_earned,
            assignment_questions!inner(question_text, options, correct_answer, explanation)
          `)
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .eq('attempt_number', attemptNumber)

        if (resultsError) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch detailed results"
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          message: "Assignment submitted successfully",
          attempt: updatedAttempt,
          results: {
            totalScore,
            totalPossiblePoints,
            percentage,
            passed: percentage >= 60, // Default passing score
            detailedResults: detailedResults || []
          }
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // POST /api/study-groups - Create study group
    if (route === '/study-groups' && method === 'POST') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const body = await request.json()
        
        const { name, description, assignmentId } = body
        
        if (!name || !assignmentId) {
          return handleCORS(NextResponse.json({
            error: "Missing required fields: name, assignmentId"
          }, { status: 400 }))
        }

        // Create study group
        const { data: group, error: groupError } = await supabase
          .from('study_groups')
          .insert({
            name,
            description,
            assignment_id: assignmentId,
            creator_id: user.id,
            max_members: 3
          })
          .select()
          .single()

        if (groupError) {
          return handleCORS(NextResponse.json({
            error: "Failed to create study group",
            details: groupError.message
          }, { status: 500 }))
        }

        // Add creator as member
        const { error: memberError } = await supabase
          .from('group_members')
          .insert({
            group_id: group.id,
            student_id: user.id,
            role: 'creator'
          })

        if (memberError) {
          return handleCORS(NextResponse.json({
            error: "Failed to add creator as member",
            details: memberError.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          message: "Study group created successfully",
          group
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // POST /api/study-groups/join - Join study group by invite code
    if (route === '/study-groups/join' && method === 'POST') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const body = await request.json()
        
        const { inviteCode } = body
        
        if (!inviteCode) {
          return handleCORS(NextResponse.json({
            error: "Missing required field: inviteCode"
          }, { status: 400 }))
        }

        // Find group by invite code
        const { data: group, error: groupError } = await supabase
          .from('study_groups')
          .select('id, name, max_members')
          .eq('invite_code', inviteCode.toUpperCase())
          .eq('is_active', true)
          .single()

        if (groupError) {
          return handleCORS(NextResponse.json({
            error: "Invalid invite code"
          }, { status: 404 }))
        }

        // Check if user is already a member
        const { data: existingMember, error: existingError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', group.id)
          .eq('student_id', user.id)
          .single()

        if (existingMember) {
          return handleCORS(NextResponse.json({
            error: "You are already a member of this group"
          }, { status: 400 }))
        }

        // Check group capacity
        const { data: members, error: membersError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', group.id)
          .eq('is_active', true)

        if (membersError) {
          return handleCORS(NextResponse.json({
            error: "Failed to check group capacity"
          }, { status: 500 }))
        }

        if (members?.length >= group.max_members) {
          return handleCORS(NextResponse.json({
            error: "Group is full"
          }, { status: 400 }))
        }

        // Add user to group
        const { data: newMember, error: joinError } = await supabase
          .from('group_members')
          .insert({
            group_id: group.id,
            student_id: user.id,
            role: 'member'
          })
          .select()
          .single()

        if (joinError) {
          return handleCORS(NextResponse.json({
            error: "Failed to join group",
            details: joinError.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          message: "Successfully joined study group",
          group,
          member: newMember
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // GET /api/study-groups - List user's study groups
    if (route === '/study-groups' && method === 'GET') {
      try {
        const user = await getAuthenticatedUser(supabase)
        
        const { data: groups, error } = await supabase
          .from('group_members')
          .select(`
            id, role, joined_at,
            study_groups!inner(
              id, name, description, invite_code, created_at,
              assignments!inner(id, title, assignment_type),
              user_profiles!study_groups_creator_id_fkey!inner(id, full_name)
            )
          `)
          .eq('student_id', user.id)
          .eq('is_active', true)
          .eq('study_groups.is_active', true)
          .order('joined_at', { ascending: false })

        if (error) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch study groups",
            details: error.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          groups: groups || [],
          count: groups?.length || 0
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // POST /api/study-groups/{id}/chat - Send chat message
    if (route.match(/^\/study-groups\/[^\/]+\/chat$/) && method === 'POST') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const groupId = route.split('/')[2]
        const body = await request.json()
        
        const { message, messageType = 'text', emojiCode } = body
        
        if (!message && !emojiCode) {
          return handleCORS(NextResponse.json({
            error: "Message or emoji code is required"
          }, { status: 400 }))
        }

        // Verify user is a member of the group
        const { data: membership, error: membershipError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('student_id', user.id)
          .eq('is_active', true)
          .single()

        if (membershipError) {
          return handleCORS(NextResponse.json({
            error: "You are not a member of this group"
          }, { status: 403 }))
        }

        // Send message
        const { data: chatMessage, error: messageError } = await supabase
          .from('group_chat_messages')
          .insert({
            group_id: groupId,
            sender_id: user.id,
            message_text: message,
            message_type: messageType,
            emoji_code: emojiCode
          })
          .select(`
            id, message_text, message_type, emoji_code, created_at,
            user_profiles!group_chat_messages_sender_id_fkey!inner(id, full_name)
          `)
          .single()

        if (messageError) {
          return handleCORS(NextResponse.json({
            error: "Failed to send message",
            details: messageError.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          message: "Message sent successfully",
          chatMessage
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // GET /api/study-groups/{id}/chat - Get chat history
    if (route.match(/^\/study-groups\/[^\/]+\/chat$/) && method === 'GET') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const groupId = route.split('/')[2]
        
        // Verify user is a member of the group
        const { data: membership, error: membershipError } = await supabase
          .from('group_members')
          .select('id')
          .eq('group_id', groupId)
          .eq('student_id', user.id)
          .eq('is_active', true)
          .single()

        if (membershipError) {
          return handleCORS(NextResponse.json({
            error: "You are not a member of this group"
          }, { status: 403 }))
        }

        // Get chat messages
        const { data: messages, error: messagesError } = await supabase
          .from('group_chat_messages')
          .select(`
            id, message_text, message_type, emoji_code, created_at,
            user_profiles!group_chat_messages_sender_id_fkey!inner(id, full_name)
          `)
          .eq('group_id', groupId)
          .order('created_at', { ascending: true })
          .limit(100) // Limit to last 100 messages

        if (messagesError) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch chat messages",
            details: messagesError.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          messages: messages || [],
          count: messages?.length || 0
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // POST /api/doubts - Submit doubt with AI assistance
    if (route === '/doubts' && method === 'POST') {
      try {
        const user = await getAuthenticatedUser(supabase)
        const body = await request.json()
        
        const { title, questionText, context, subjectId, assignmentId, priorityLevel = 'medium' } = body
        
        if (!title || !questionText || !subjectId) {
          return handleCORS(NextResponse.json({
            error: "Missing required fields: title, questionText, subjectId"
          }, { status: 400 }))
        }

        // Get subject name for AI context
        const { data: subject, error: subjectError } = await supabase
          .from('subjects')
          .select('name')
          .eq('id', subjectId)
          .single()

        if (subjectError) {
          return handleCORS(NextResponse.json({
            error: "Subject not found"
          }, { status: 404 }))
        }

        // Create doubt
        const { data: doubt, error: doubtError } = await supabase
          .from('doubts')
          .insert({
            student_id: user.id,
            subject_id: subjectId,
            assignment_id: assignmentId,
            title,
            question_text: questionText,
            context,
            priority_level: priorityLevel
          })
          .select()
          .single()

        if (doubtError) {
          return handleCORS(NextResponse.json({
            error: "Failed to create doubt",
            details: doubtError.message
          }, { status: 500 }))
        }

        // Generate AI response
        try {
          const aiResponse = await generateDoubtResponse(questionText, context, subject.name)
          
          // Save AI response
          const { data: response, error: responseError } = await supabase
            .from('doubt_responses')
            .insert({
              doubt_id: doubt.id,
              responder_id: null, // null for AI responses
              response_text: aiResponse,
              response_type: 'ai'
            })
            .select()
            .single()

          if (responseError) {
            console.error('Failed to save AI response:', responseError)
          }

          return handleCORS(NextResponse.json({
            message: "Doubt submitted successfully",
            doubt,
            aiResponse: response
          }))

        } catch (aiError) {
          // Even if AI fails, return the doubt creation success
          return handleCORS(NextResponse.json({
            message: "Doubt submitted successfully (AI response failed)",
            doubt,
            aiError: aiError.message
          }))
        }

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // GET /api/doubts - Get student's doubts and responses
    if (route === '/doubts' && method === 'GET') {
      try {
        const user = await getAuthenticatedUser(supabase)
        
        const { data: doubts, error } = await supabase
          .from('doubts')
          .select(`
            id, title, question_text, context, priority_level, status, created_at,
            subjects!inner(id, name),
            assignments(id, title),
            doubt_responses(
              id, response_text, response_type, is_helpful, upvotes, created_at,
              user_profiles(id, full_name)
            )
          `)
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch doubts",
            details: error.message
          }, { status: 500 }))
        }

        return handleCORS(NextResponse.json({
          doubts: doubts || [],
          count: doubts?.length || 0
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
    }

    // GET /api/student/progress - Student progress analytics
    if (route === '/student/progress' && method === 'GET') {
      try {
        const user = await getAuthenticatedUser(supabase)
        
        // Get overall progress
        const { data: progress, error: progressError } = await supabase
          .from('student_progress')
          .select(`
            id, total_assignments, completed_assignments, average_score,
            total_time_spent_minutes, streak_days, last_activity_date,
            subjects!inner(id, name, code)
          `)
          .eq('student_id', user.id)

        if (progressError) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch progress",
            details: progressError.message
          }, { status: 500 }))
        }

        // Get recent assignment attempts
        const { data: recentAttempts, error: attemptsError } = await supabase
          .from('assignment_attempts')
          .select(`
            id, percentage_score, submitted_at,
            assignments!inner(id, title, assignment_type),
            assignments.subjects!inner(name)
          `)
          .eq('student_id', user.id)
          .eq('status', 'completed')
          .order('submitted_at', { ascending: false })
          .limit(10)

        if (attemptsError) {
          return handleCORS(NextResponse.json({
            error: "Failed to fetch recent attempts"
          }, { status: 500 }))
        }

        // Calculate overall stats
        const totalAssignments = progress?.reduce((sum, p) => sum + p.total_assignments, 0) || 0
        const completedAssignments = progress?.reduce((sum, p) => sum + p.completed_assignments, 0) || 0
        const overallAverage = progress?.length > 0 
          ? progress.reduce((sum, p) => sum + p.average_score, 0) / progress.length 
          : 0

        return handleCORS(NextResponse.json({
          overallStats: {
            totalAssignments,
            completedAssignments,
            completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0,
            overallAverage: Math.round(overallAverage * 100) / 100
          },
          subjectProgress: progress || [],
          recentAttempts: recentAttempts || []
        }))

      } catch (error) {
        return handleCORS(NextResponse.json({
          error: error.message || "Authentication required"
        }, { status: 401 }))
      }
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