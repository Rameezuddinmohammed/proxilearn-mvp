'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { BookOpen, Users, Settings, LogOut, User, GraduationCap, UserCheck, Crown, Building, 
         Clock, CheckCircle, XCircle, MessageSquare, Send, Smile, Trophy, TrendingUp, 
         Brain, HelpCircle, Play, Plus, Hash, Calendar, Target, Award } from 'lucide-react'
import { toast } from 'sonner'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin')
  const [schools, setSchools] = useState([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Student Dashboard State
  const [activeTab, setActiveTab] = useState('homework')
  const [assignments, setAssignments] = useState([])
  const [subjects, setSubjects] = useState([])
  const [studyGroups, setStudyGroups] = useState([])
  const [doubts, setDoubts] = useState([])
  const [progress, setProgress] = useState(null)
  const [loadingData, setLoadingData] = useState(false)
  
  // Teacher Dashboard State
  const [teacherActiveTab, setTeacherActiveTab] = useState('overview')
  const [teacherDashboard, setTeacherDashboard] = useState(null)
  const [lessonPlans, setLessonPlans] = useState([])
  const [teacherAssignments, setTeacherAssignments] = useState([])
  const [gradebook, setGradebook] = useState([])
  const [teacherAnalytics, setTeacherAnalytics] = useState(null)
  const [teacherResources, setTeacherResources] = useState([])
  const [teacherMessages, setTeacherMessages] = useState([])
  
  // Teacher UI State
  const [showCreateLessonPlan, setShowCreateLessonPlan] = useState(false)
  const [showCreateAssignment, setShowCreateAssignment] = useState(false)
  const [showCreateResource, setShowCreateResource] = useState(false)
  const [showSendMessage, setShowSendMessage] = useState(false)
  const [lessonPlanForm, setLessonPlanForm] = useState({
    title: '', subject: '', grade: '', duration: 40, objectives: '', ai_prompt: ''
  })
  const [assignmentForm, setAssignmentForm] = useState({
    title: '', subject: '', description: '', difficulty: 'medium', questionCount: 10, timeLimit: 30
  })
  
  // Quiz Interface State
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [quizTimeLeft, setQuizTimeLeft] = useState(null)
  const [quizResults, setQuizResults] = useState(null)
  
  // Study Groups State
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupMessages, setGroupMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  
  // Doubts State
  const [showSubmitDoubt, setShowSubmitDoubt] = useState(false)
  const [doubtForm, setDoubtForm] = useState({ subject: '', question: '', context: '' })
  
  const supabase = createClient()

  // Authentication state management (same as before)
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      
      if (session?.user) {
        await fetchUserProfile(session.user.id)
        await fetchSchools()
      }
      
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
          await fetchSchools()
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Load student data when profile is available
  useEffect(() => {
    if (user && profile && profile.role === 'student') {
      loadStudentData()
    } else if (user && profile && profile.role === 'teacher') {
      loadTeacherData()
    }
  }, [user, profile])

  // Quiz timer effect
  useEffect(() => {
    if (quizTimeLeft > 0) {
      const timer = setTimeout(() => setQuizTimeLeft(quizTimeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (quizTimeLeft === 0) {
      handleSubmitQuiz()
    }
  }, [quizTimeLeft])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        return
      }

      if (data) {
        setProfile(data)
        if (!data.role || !data.onboarding_completed) {
          setShowOnboarding(true)
        }
      } else {
        setShowOnboarding(true)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching schools:', error)
        return
      }

      setSchools(data || [])
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const loadStudentData = async () => {
    setLoadingData(true)
    try {
      await Promise.all([
        loadSubjects(),
        loadAssignments(),
        loadStudyGroups(),
        loadDoubts(),
        loadProgress()
      ])
    } catch (error) {
      console.error('Error loading student data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoadingData(false)
    }
  }

  const loadSubjects = async () => {
    try {
      const response = await fetch('/api/subjects', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setSubjects(data.subjects || [])
      }
    } catch (error) {
      console.error('Error loading subjects:', error)
    }
  }

  const loadAssignments = async () => {
    try {
      const response = await fetch('/api/assignments', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const loadStudyGroups = async () => {
    try {
      const response = await fetch('/api/study-groups', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setStudyGroups(data.groups || [])
      }
    } catch (error) {
      console.error('Error loading study groups:', error)
    }
  }

  const loadDoubts = async () => {
    try {
      const response = await fetch('/api/doubts', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setDoubts(data.doubts || [])
      }
    } catch (error) {
      console.error('Error loading doubts:', error)
    }
  }

  const loadProgress = async () => {
    try {
      const response = await fetch('/api/student/progress', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setProgress(data)
      }
    } catch (error) {
      console.error('Error loading progress:', error)
    }
  }

  // Teacher Data Loading Functions
  const loadTeacherData = async () => {
    setLoadingData(true)
    try {
      await Promise.all([
        loadTeacherDashboard(),
        loadSubjects(), // Reuse from student
        loadLessonPlans(),
        loadTeacherAssignments(),
        loadGradebook(),
        loadTeacherAnalytics(),
        loadTeacherMessages()
      ])
    } catch (error) {
      console.error('Error loading teacher data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoadingData(false)
    }
  }

  const loadTeacherDashboard = async () => {
    try {
      const response = await fetch('/api/teacher/dashboard', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setTeacherDashboard(data)
      }
    } catch (error) {
      console.error('Error loading teacher dashboard:', error)
    }
  }

  const loadLessonPlans = async () => {
    try {
      const response = await fetch('/api/teacher/lesson-plans', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setLessonPlans(data.lesson_plans || [])
      }
    } catch (error) {
      console.error('Error loading lesson plans:', error)
    }
  }

  const loadTeacherAssignments = async () => {
    try {
      const response = await fetch('/api/teacher/assignments', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setTeacherAssignments(data.assignments || [])
      }
    } catch (error) {
      console.error('Error loading teacher assignments:', error)
    }
  }

  const loadGradebook = async () => {
    try {
      const response = await fetch('/api/teacher/gradebook', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setGradebook(data.grades || [])
      }
    } catch (error) {
      console.error('Error loading gradebook:', error)
    }
  }

  const loadTeacherAnalytics = async () => {
    try {
      const response = await fetch('/api/teacher/analytics', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setTeacherAnalytics(data)
      }
    } catch (error) {
      console.error('Error loading teacher analytics:', error)
    }
  }

  const loadTeacherMessages = async () => {
    try {
      const response = await fetch('/api/teacher/messages', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      if (response.ok) {
        setTeacherMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error loading teacher messages:', error)
    }
  }

  const startQuiz = async (assignment) => {
    try {
      const response = await fetch(`/api/assignments/${assignment.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        setCurrentQuiz(assignment)
        setQuizQuestions(data.questions || [])
        setCurrentQuestionIndex(0)
        setSelectedAnswers({})
        setQuizTimeLeft(assignment.time_limit_minutes * 60) // Convert to seconds
        setQuizResults(null)
        toast.success('Quiz started! Good luck!')
      } else {
        toast.error(data.error || 'Failed to start quiz')
      }
    } catch (error) {
      console.error('Error starting quiz:', error)
      toast.error('Failed to start quiz')
    }
  }

  const handleSubmitQuiz = async () => {
    if (!currentQuiz) return
    
    try {
      const response = await fetch(`/api/assignments/${currentQuiz.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers: selectedAnswers })
      })
      const data = await response.json()
      
      if (response.ok) {
        setQuizResults(data)
        setQuizTimeLeft(null)
        toast.success(`Quiz completed! Score: ${data.score}/${data.total_questions}`)
        await loadAssignments() // Refresh assignments
        await loadProgress() // Refresh progress
      } else {
        toast.error(data.error || 'Failed to submit quiz')
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
      toast.error('Failed to submit quiz')
    }
  }

  const createStudyGroup = async (formData) => {
    try {
      const response = await fetch('/api/study-groups', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.get('groupName'),
          description: formData.get('description')
        })
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Study group created successfully!')
        setShowCreateGroup(false)
        await loadStudyGroups()
      } else {
        toast.error(data.error || 'Failed to create study group')
      }
    } catch (error) {
      console.error('Error creating study group:', error)
      toast.error('Failed to create study group')
    }
  }

  const joinStudyGroup = async (formData) => {
    try {
      const response = await fetch('/api/study-groups/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invite_code: formData.get('inviteCode')
        })
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Joined study group successfully!')
        setShowJoinGroup(false)
        await loadStudyGroups()
      } else {
        toast.error(data.error || 'Failed to join study group')
      }
    } catch (error) {
      console.error('Error joining study group:', error)
      toast.error('Failed to join study group')
    }
  }

  const loadGroupMessages = async (groupId) => {
    try {
      const response = await fetch(`/api/study-groups/${groupId}/chat`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        setGroupMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error loading group messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return
    
    try {
      const response = await fetch(`/api/study-groups/${selectedGroup.id}/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          message_type: 'text'
        })
      })
      
      if (response.ok) {
        setNewMessage('')
        await loadGroupMessages(selectedGroup.id)
      } else {
        toast.error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  const submitDoubt = async (formData) => {
    try {
      const response = await fetch('/api/doubts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: formData.get('subject'),
          question: formData.get('question'),
          context: formData.get('context')
        })
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Question submitted successfully! AI is generating a response...')
        setShowSubmitDoubt(false)
        setDoubtForm({ subject: '', question: '', context: '' })
        await loadDoubts()
      } else {
        toast.error(data.error || 'Failed to submit question')
      }
    } catch (error) {
      console.error('Error submitting doubt:', error)
      toast.error('Failed to submit question')
    }
  }

  // Teacher Action Functions
  const createLessonPlan = async (formData) => {
    try {
      const response = await fetch('/api/teacher/lesson-plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.get('title'),
          subject_id: formData.get('subject'),
          grade_level: formData.get('grade'),
          duration_minutes: parseInt(formData.get('duration')),
          learning_objectives: formData.get('objectives').split('\n').filter(obj => obj.trim()),
          ai_prompt: formData.get('ai_prompt'),
          ai_generated: !!formData.get('ai_prompt')
        })
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Lesson plan created successfully!')
        setShowCreateLessonPlan(false)
        setLessonPlanForm({ title: '', subject: '', grade: '', duration: 40, objectives: '', ai_prompt: '' })
        await loadLessonPlans()
      } else {
        toast.error(data.error || 'Failed to create lesson plan')
      }
    } catch (error) {
      console.error('Error creating lesson plan:', error)
      toast.error('Failed to create lesson plan')
    }
  }

  const createAssignment = async (formData) => {
    try {
      const response = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.get('title'),
          subject_id: formData.get('subject'),
          description: formData.get('description'),
          difficulty: formData.get('difficulty'),
          question_count: parseInt(formData.get('questionCount')),
          time_limit_minutes: parseInt(formData.get('timeLimit')),
          due_date: formData.get('dueDate'),
          ai_generated: true
        })
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Assignment created successfully!')
        setShowCreateAssignment(false)
        setAssignmentForm({ title: '', subject: '', description: '', difficulty: 'medium', questionCount: 10, timeLimit: 30 })
        await loadTeacherAssignments()
      } else {
        toast.error(data.error || 'Failed to create assignment')
      }
    } catch (error) {
      console.error('Error creating assignment:', error)
      toast.error('Failed to create assignment')
    }
  }

  const publishAssignment = async (assignmentId) => {
    try {
      const response = await fetch(`/api/teacher/assignments/${assignmentId}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        toast.success('Assignment published successfully!')
        await loadTeacherAssignments()
      } else {
        toast.error(data.error || 'Failed to publish assignment')
      }
    } catch (error) {
      console.error('Error publishing assignment:', error)
      toast.error('Failed to publish assignment')
    }
  }

  const handleSignUp = async (formData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.get('email'),
        password: formData.get('password'),
        options: {
          data: {
            full_name: formData.get('fullName')
          }
        }
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (data.user && !data.user.email_confirmed_at) {
        toast.success('Please check your email for verification link')
      }
    } catch (error) {
      toast.error('Error signing up')
    }
  }

  const handleSignIn = async (formData) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.get('email'),
        password: formData.get('password')
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Welcome back!')
    } catch (error) {
      toast.error('Error signing in')
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        toast.error(error.message)
      }
    } catch (error) {
      toast.error('Error with Google sign in')
    }
  }

  const handleOnboarding = async (formData) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: formData.get('fullName') || user.user_metadata?.full_name || user.email,
          role: formData.get('role'),
          school_id: formData.get('schoolId') || null,
          phone: formData.get('phone'),
          onboarding_completed: true
        })

      if (error) {
        toast.error('Error updating profile')
        return
      }

      toast.success('Profile completed!')
      setShowOnboarding(false)
      await fetchUserProfile(user.id)
    } catch (error) {
      toast.error('Error completing onboarding')
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'student': return <GraduationCap className="w-4 h-4" />
      case 'teacher': return <BookOpen className="w-4 h-4" />
      case 'coordinator': return <UserCheck className="w-4 h-4" />
      case 'principal': return <Users className="w-4 h-4" />
      case 'chairman': return <Crown className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'student': return 'bg-blue-100 text-blue-800'
      case 'teacher': return 'bg-green-100 text-green-800'
      case 'coordinator': return 'bg-purple-100 text-purple-800'
      case 'principal': return 'bg-orange-100 text-orange-800'
      case 'chairman': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSubjectColor = (subject) => {
    const colors = {
      'Mathematics': 'bg-blue-100 text-blue-800',
      'Science': 'bg-green-100 text-green-800',
      'English': 'bg-purple-100 text-purple-800',
      'History': 'bg-orange-100 text-orange-800',
      'Geography': 'bg-teal-100 text-teal-800',
    }
    return colors[subject] || 'bg-gray-100 text-gray-800'
  }

  const emojis = ['😊', '👍', '❤️', '😄', '🎉', '👏', '🔥', '💯', '🤔', '😅']

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Onboarding Screen
  if (user && showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              Tell us a bit about yourself to get started with Proxilearn
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleOnboarding} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={user.user_metadata?.full_name || ''}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Your Role</Label>
                <Select name="role" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        Student
                      </div>
                    </SelectItem>
                    <SelectItem value="teacher">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Teacher
                      </div>
                    </SelectItem>
                    <SelectItem value="coordinator">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Coordinator
                      </div>
                    </SelectItem>
                    <SelectItem value="principal">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Principal
                      </div>
                    </SelectItem>
                    <SelectItem value="chairman">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        Chairman
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {schools.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="schoolId">School (Optional)</Label>
                  <Select name="schoolId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select your school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            {school.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Complete Setup
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Quiz Interface
  if (currentQuiz && !quizResults) {
    const currentQuestion = quizQuestions[currentQuestionIndex]
    const isLastQuestion = currentQuestionIndex === quizQuestions.length - 1

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Quiz Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{currentQuiz.title}</h1>
                <p className="text-sm text-gray-500">{currentQuiz.subject}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <Clock className="w-4 h-4 mr-1" />
                {formatTime(quizTimeLeft)}
              </Badge>
              <Badge variant="outline">
                Question {currentQuestionIndex + 1} of {quizQuestions.length}
              </Badge>
            </div>
          </div>
        </header>

        {/* Quiz Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Progress value={(currentQuestionIndex + 1) / quizQuestions.length * 100} className="h-2" />
          </div>

          {currentQuestion && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentQuestion.options?.map((option, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAnswers[currentQuestion.id] === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAnswers({
                      ...selectedAnswers,
                      [currentQuestion.id]: option
                    })}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAnswers[currentQuestion.id] === option
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedAnswers[currentQuestion.id] === option && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <span className="font-medium text-gray-700">{String.fromCharCode(65 + index)}.</span>
                      <span>{option}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              {isLastQuestion ? (
                <Button
                  onClick={handleSubmitQuiz}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Submit Quiz
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  disabled={!selectedAnswers[currentQuestion?.id]}
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Quiz Results Screen
  if (quizResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
              <Trophy className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
            <CardDescription>Great job on completing {currentQuiz.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {quizResults.score}/{quizResults.total_questions}
              </div>
              <div className="text-lg text-gray-600">
                {Math.round((quizResults.score / quizResults.total_questions) * 100)}% Score
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{quizResults.correct_answers}</div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{quizResults.incorrect_answers}</div>
                <div className="text-sm text-gray-600">Incorrect</div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Detailed Results:</h3>
              <ScrollArea className="h-64">
                {quizResults.question_results?.map((result, index) => (
                  <div key={index} className="mb-4 p-4 border rounded-lg">
                    <div className="flex items-start gap-3 mb-2">
                      {result.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium mb-2">{result.question}</p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Your answer:</span> {result.student_answer}
                        </p>
                        {!result.is_correct && (
                          <p className="text-sm text-green-600">
                            <span className="font-medium">Correct answer:</span> {result.correct_answer}
                          </p>
                        )}
                        {result.explanation && (
                          <p className="text-sm text-gray-500 mt-2 italic">{result.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>

            <Button
              onClick={() => {
                setCurrentQuiz(null)
                setQuizResults(null)
                setQuizQuestions([])
                setSelectedAnswers({})
              }}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main Student Dashboard
  if (user && profile && profile.role === 'student') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Proxilearn</h1>
                <p className="text-sm text-gray-500">Student Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge className={`${getRoleBadgeColor(profile.role)} border-0`}>
                {getRoleIcon(profile.role)}
                <span className="ml-1 capitalize">{profile.role}</span>
              </Badge>
              
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {profile.full_name?.charAt(0) || user.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {profile.full_name?.split(' ')[0] || 'Student'}! 👋
            </h2>
            <p className="text-gray-600">
              Ready to learn something new today? Let's get started!
            </p>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                <TabsTrigger value="homework" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Homework</span>
                </TabsTrigger>
                <TabsTrigger value="study-groups" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Study Groups</span>
                </TabsTrigger>
                <TabsTrigger value="doubts" className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Ask Doubts</span>
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Progress</span>
                </TabsTrigger>
              </TabsList>

              {/* Interactive Homework Tab */}
              <TabsContent value="homework" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Interactive Homework</h3>
                  <Badge variant="outline" className="text-blue-600">
                    {assignments.length} Assignments
                  </Badge>
                </div>

                {assignments.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
                        <BookOpen className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Assignments Yet</h3>
                      <p className="text-gray-600">Check back later for new assignments from your teachers.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assignments.map((assignment) => (
                      <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg mb-1">{assignment.title}</CardTitle>
                              <Badge className={getSubjectColor(assignment.subject)} variant="secondary">
                                {assignment.subject}
                              </Badge>
                            </div>
                            {assignment.completed ? (
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            ) : (
                              <Clock className="w-6 h-6 text-orange-600" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 text-sm mb-4">{assignment.description}</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Questions:</span>
                              <span className="font-medium">{assignment.question_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Time Limit:</span>
                              <span className="font-medium">{assignment.time_limit_minutes} min</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Due Date:</span>
                              <span className="font-medium">
                                {new Date(assignment.due_date).toLocaleDateString()}
                              </span>
                            </div>
                            {assignment.completed && assignment.score !== null && (
                              <div className="flex items-center justify-between pt-2 border-t">
                                <span className="text-gray-500">Your Score:</span>
                                <span className="font-medium text-green-600">
                                  {assignment.score}/{assignment.question_count}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardContent className="pt-0">
                          <Button
                            onClick={() => startQuiz(assignment)}
                            disabled={assignment.completed}
                            className="w-full"
                          >
                            {assignment.completed ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Completed
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Start Assignment
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Study Groups Tab */}
              <TabsContent value="study-groups" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Study Groups</h3>
                  <div className="flex gap-2">
                    <Dialog open={showJoinGroup} onOpenChange={setShowJoinGroup}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Hash className="w-4 h-4 mr-2" />
                          Join Group
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Join Study Group</DialogTitle>
                          <DialogDescription>
                            Enter the invite code to join an existing study group.
                          </DialogDescription>
                        </DialogHeader>
                        <form action={joinStudyGroup} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="inviteCode">Invite Code</Label>
                            <Input
                              id="inviteCode"
                              name="inviteCode"
                              placeholder="Enter 6-character code"
                              maxLength={6}
                              required
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit">Join Group</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Group
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Study Group</DialogTitle>
                          <DialogDescription>
                            Create a new study group to collaborate with friends.
                          </DialogDescription>
                        </DialogHeader>
                        <form action={createStudyGroup} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="groupName">Group Name</Label>
                            <Input
                              id="groupName"
                              name="groupName"
                              placeholder="Enter group name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              name="description"
                              placeholder="What will you study together?"
                              rows={3}
                            />
                          </div>
                          <DialogFooter>
                            <Button type="submit">Create Group</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {studyGroups.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mx-auto mb-4 p-4 bg-purple-100 rounded-full w-fit">
                        <Users className="w-8 h-8 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Study Groups Yet</h3>
                      <p className="text-gray-600 mb-4">Create or join a study group to collaborate with friends.</p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => setShowCreateGroup(true)} size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Create Group
                        </Button>
                        <Button onClick={() => setShowJoinGroup(true)} variant="outline" size="sm">
                          <Hash className="w-4 h-4 mr-2" />
                          Join Group
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studyGroups.map((group) => (
                      <Card key={group.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg mb-1">{group.name}</CardTitle>
                              <Badge variant="outline" className="text-purple-600">
                                {group.member_count}/3 members
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 text-sm mb-4">
                            {group.description || 'No description'}
                          </p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Invite Code:</span>
                              <code className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                                {group.invite_code}
                              </code>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Created:</span>
                              <span className="font-medium">
                                {new Date(group.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <CardContent className="pt-0">
                          <Button
                            onClick={() => {
                              setSelectedGroup(group)
                              setShowGroupChat(true)
                              loadGroupMessages(group.id)
                            }}
                            className="w-full"
                            variant="outline"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Open Chat
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Group Chat Dialog */}
                <Dialog open={showGroupChat} onOpenChange={setShowGroupChat}>
                  <DialogContent className="max-w-2xl h-[600px] flex flex-col">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {selectedGroup?.name}
                      </DialogTitle>
                      <DialogDescription>
                        Chat with your study group members
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 flex flex-col min-h-0">
                      <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-4">
                          {groupMessages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.sender_id === user.id ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-xs px-4 py-2 rounded-lg ${
                                  message.sender_id === user.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <div className="text-sm font-medium mb-1">
                                  {message.sender_name}
                                </div>
                                <div>{message.message}</div>
                                <div className="text-xs opacity-75 mt-1">
                                  {new Date(message.created_at).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      
                      <Separator className="my-4" />
                      
                      <div className="space-y-4">
                        <div className="flex gap-2 flex-wrap">
                          {emojis.map((emoji) => (
                            <Button
                              key={emoji}
                              variant="outline"
                              size="sm"
                              onClick={() => setNewMessage(newMessage + emoji)}
                              className="text-lg p-2 h-8"
                            >
                              {emoji}
                            </Button>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type your message..."
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            className="flex-1"
                          />
                          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Ask Doubts Tab */}
              <TabsContent value="doubts" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Ask Doubts</h3>
                  <Dialog open={showSubmitDoubt} onOpenChange={setShowSubmitDoubt}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Ask Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ask a Question</DialogTitle>
                        <DialogDescription>
                          Get help from AI or your teachers by asking a question.
                        </DialogDescription>
                      </DialogHeader>
                      <form action={submitDoubt} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject</Label>
                          <Select name="subject" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.name}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="question">Your Question</Label>
                          <Textarea
                            id="question"
                            name="question"
                            placeholder="What would you like to know?"
                            rows={3}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="context">Additional Context (Optional)</Label>
                          <Textarea
                            id="context"
                            name="context"
                            placeholder="Any additional details that might help..."
                            rows={2}
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit">Submit Question</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {doubts.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mx-auto mb-4 p-4 bg-orange-100 rounded-full w-fit">
                        <HelpCircle className="w-8 h-8 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Questions Yet</h3>
                      <p className="text-gray-600 mb-4">Ask your first question and get help from AI or teachers.</p>
                      <Button onClick={() => setShowSubmitDoubt(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Ask Question
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {doubts.map((doubt) => (
                      <Card key={doubt.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg mb-2">{doubt.question}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge className={getSubjectColor(doubt.subject)} variant="secondary">
                                  {doubt.subject}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {new Date(doubt.created_at).toLocaleDateString()}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        {doubt.context && (
                          <CardContent className="pt-0">
                            <p className="text-gray-600 text-sm">
                              <span className="font-medium">Context:</span> {doubt.context}
                            </p>
                          </CardContent>
                        )}
                        {doubt.ai_response && (
                          <CardContent className="pt-0">
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">AI Response</span>
                              </div>
                              <p className="text-sm text-blue-700">{doubt.ai_response}</p>
                            </div>
                          </CardContent>
                        )}
                        {doubt.teacher_response && (
                          <CardContent className="pt-0">
                            <div className="bg-green-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">Teacher Response</span>
                              </div>
                              <p className="text-sm text-green-700">{doubt.teacher_response}</p>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-6">
                <h3 className="text-lg font-semibold">Your Progress</h3>

                {!progress ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mx-auto mb-4 p-4 bg-gray-100 rounded-full w-fit">
                        <TrendingUp className="w-8 h-8 text-gray-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Progress Data</h3>
                      <p className="text-gray-600">Complete some assignments to see your progress.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Overall Stats */}
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Assignments</p>
                            <p className="text-2xl font-bold">{progress.total_assignments}</p>
                          </div>
                          <BookOpen className="w-8 h-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Completed</p>
                            <p className="text-2xl font-bold">{progress.completed_assignments}</p>
                          </div>
                          <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Avg Score</p>
                            <p className="text-2xl font-bold">{Math.round(progress.average_score)}%</p>
                          </div>
                          <Target className="w-8 h-8 text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Questions Asked</p>
                            <p className="text-2xl font-bold">{progress.total_doubts}</p>
                          </div>
                          <HelpCircle className="w-8 h-8 text-orange-600" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Subject Performance */}
                    <Card className="col-span-full md:col-span-2">
                      <CardHeader>
                        <CardTitle>Subject Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {progress.subject_progress?.map((subject) => (
                            <div key={subject.subject} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{subject.subject}</span>
                                <span className="text-sm text-gray-600">
                                  {subject.completed}/{subject.total} completed
                                </span>
                              </div>
                              <Progress 
                                value={(subject.completed / subject.total) * 100} 
                                className="h-2"
                              />
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Avg: {Math.round(subject.average_score)}%</span>
                                <span>{Math.round((subject.completed / subject.total) * 100)}% complete</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="col-span-full md:col-span-2">
                      <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {progress.recent_attempts?.map((attempt) => (
                            <div key={attempt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{attempt.assignment_title}</p>
                                <p className="text-sm text-gray-600">{attempt.subject}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(attempt.completed_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={attempt.score >= attempt.total_questions * 0.8 ? 'default' : 'secondary'}
                                  className={attempt.score >= attempt.total_questions * 0.8 ? 'bg-green-600' : ''}
                                >
                                  {Math.round((attempt.score / attempt.total_questions) * 100)}%
                                </Badge>
                                {attempt.score >= attempt.total_questions * 0.8 && (
                                  <Award className="w-4 h-4 text-yellow-600" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    )
  }

  // Teacher Dashboard
  if (user && profile && profile.role === 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Proxilearn</h1>
                <p className="text-sm text-gray-500">Teacher Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge className={`${getRoleBadgeColor(profile.role)} border-0`}>
                {getRoleIcon(profile.role)}
                <span className="ml-1 capitalize">{profile.role}</span>
              </Badge>
              
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {profile.full_name?.charAt(0) || user.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{profile.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {profile.full_name?.split(' ')[0] || 'Teacher'}! 👋
            </h2>
            <p className="text-gray-600">
              Ready to inspire and educate your students today?
            </p>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Tabs value={teacherActiveTab} onValueChange={setTeacherActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 max-w-3xl">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="lessons" className="flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  <span className="hidden sm:inline">Lessons</span>
                </TabsTrigger>
                <TabsTrigger value="assignments" className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Assignments</span>
                </TabsTrigger>
                <TabsTrigger value="gradebook" className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Gradebook</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Dashboard Overview</h3>
                </div>

                {teacherDashboard && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Total Classes</p>
                            <p className="text-2xl font-bold">{teacherDashboard.total_classes || 0}</p>
                          </div>
                          <Users className="w-8 h-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Total Students</p>
                            <p className="text-2xl font-bold">{teacherDashboard.total_students || 0}</p>
                          </div>
                          <GraduationCap className="w-8 h-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Assignments</p>
                            <p className="text-2xl font-bold">{teacherDashboard.total_assignments || 0}</p>
                          </div>
                          <BookOpen className="w-8 h-8 text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Lesson Plans</p>
                            <p className="text-2xl font-bold">{teacherDashboard.total_lesson_plans || 0}</p>
                          </div>
                          <Brain className="w-8 h-8 text-orange-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Assignments */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Recent Assignments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {teacherAssignments.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No assignments yet</p>
                      ) : (
                        <div className="space-y-3">
                          {teacherAssignments.slice(0, 5).map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{assignment.title}</p>
                                <p className="text-sm text-gray-600">{assignment.subject}</p>
                              </div>
                              <Badge 
                                variant={assignment.status === 'published' ? 'default' : 'secondary'}
                                className={assignment.status === 'published' ? 'bg-green-600' : ''}
                              >
                                {assignment.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Lesson Plans */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        Recent Lesson Plans
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {lessonPlans.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No lesson plans yet</p>
                      ) : (
                        <div className="space-y-3">
                          {lessonPlans.slice(0, 5).map((plan) => (
                            <div key={plan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{plan.title}</p>
                                <p className="text-sm text-gray-600">{plan.subject}</p>
                              </div>
                              <Badge variant="outline">
                                {plan.duration_minutes}min
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* AI Lesson Plans Tab */}
              <TabsContent value="lessons" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">AI Lesson Planner</h3>
                  <Dialog open={showCreateLessonPlan} onOpenChange={setShowCreateLessonPlan}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Lesson Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create AI-Powered Lesson Plan</DialogTitle>
                        <DialogDescription>
                          Let AI help you create comprehensive lesson plans with learning objectives, activities, and resources.
                        </DialogDescription>
                      </DialogHeader>
                      <form action={createLessonPlan} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Lesson Title</Label>
                            <Input
                              id="title"
                              name="title"
                              placeholder="e.g., Introduction to Photosynthesis"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Select name="subject" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="grade">Grade Level</Label>
                            <Input
                              id="grade"
                              name="grade"
                              placeholder="e.g., Grade 8"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="duration">Duration (minutes)</Label>
                            <Input
                              id="duration"
                              name="duration"
                              type="number"
                              defaultValue={40}
                              min={15}
                              max={120}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="objectives">Learning Objectives (one per line)</Label>
                          <Textarea
                            id="objectives"
                            name="objectives"
                            placeholder="Students will be able to:&#10;- Explain the process of photosynthesis&#10;- Identify factors affecting photosynthesis"
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ai_prompt">AI Prompt (Optional)</Label>
                          <Textarea
                            id="ai_prompt"
                            name="ai_prompt"
                            placeholder="Describe what you want the AI to focus on... e.g., 'Create an interactive lesson with hands-on experiments and real-world examples'"
                            rows={3}
                          />
                          <p className="text-sm text-gray-500">
                            Let AI generate detailed content including key concepts, discussion points, activities, and resources.
                          </p>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Create Lesson Plan</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {lessonPlans.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
                        <Brain className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Lesson Plans Yet</h3>
                      <p className="text-gray-600 mb-4">Create your first AI-powered lesson plan to get started.</p>
                      <Button onClick={() => setShowCreateLessonPlan(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Lesson Plan
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lessonPlans.map((plan) => (
                      <Card key={plan.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg mb-1">{plan.title}</CardTitle>
                              <Badge className={getSubjectColor(plan.subject)} variant="secondary">
                                {plan.subject}
                              </Badge>
                            </div>
                            {plan.ai_generated && (
                              <Badge variant="outline" className="text-purple-600 border-purple-200">
                                <Brain className="w-3 h-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Grade:</span>
                              <span className="font-medium">{plan.grade_level}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Duration:</span>
                              <span className="font-medium">{plan.duration_minutes} min</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Status:</span>
                              <Badge 
                                variant={plan.status === 'active' ? 'default' : 'secondary'}
                                className={plan.status === 'active' ? 'bg-green-600' : ''}
                              >
                                {plan.status}
                              </Badge>
                            </div>
                          </div>
                          {plan.learning_objectives && plan.learning_objectives.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-700 mb-2">Objectives:</p>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {plan.learning_objectives.slice(0, 2).map((objective, index) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-0.5">•</span>
                                    <span className="line-clamp-2">{objective}</span>
                                  </li>
                                ))}
                                {plan.learning_objectives.length > 2 && (
                                  <li className="text-gray-500">
                                    +{plan.learning_objectives.length - 2} more...
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                        <CardContent className="pt-0">
                          <Button variant="outline" className="w-full">
                            <BookOpen className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Assignment & Quiz Creation</h3>
                  <Dialog open={showCreateAssignment} onOpenChange={setShowCreateAssignment}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Assignment
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create AI-Generated Assignment</DialogTitle>
                        <DialogDescription>
                          Create engaging quizzes with AI-generated questions tailored to your requirements.
                        </DialogDescription>
                      </DialogHeader>
                      <form action={createAssignment} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Assignment Title</Label>
                            <Input
                              id="title"
                              name="title"
                              placeholder="e.g., Photosynthesis Quiz"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Select name="subject" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                              <SelectContent>
                                {subjects.map((subject) => (
                                  <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            name="description"
                            placeholder="Brief description of the assignment..."
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="difficulty">Difficulty</Label>
                            <Select name="difficulty" defaultValue="medium">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="questionCount">Questions</Label>
                            <Input
                              id="questionCount"
                              name="questionCount"
                              type="number"
                              defaultValue={10}
                              min={5}
                              max={50}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="timeLimit">Time Limit (min)</Label>
                            <Input
                              id="timeLimit"
                              name="timeLimit"
                              type="number"
                              defaultValue={30}
                              min={10}
                              max={180}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dueDate">Due Date</Label>
                          <Input
                            id="dueDate"
                            name="dueDate"
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit">Create Assignment</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                {teacherAssignments.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
                        <BookOpen className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Assignments Yet</h3>
                      <p className="text-gray-600 mb-4">Create your first AI-generated assignment to engage your students.</p>
                      <Button onClick={() => setShowCreateAssignment(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Assignment
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teacherAssignments.map((assignment) => (
                      <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg mb-1">{assignment.title}</CardTitle>
                              <Badge className={getSubjectColor(assignment.subject)} variant="secondary">
                                {assignment.subject}
                              </Badge>
                            </div>
                            <Badge 
                              variant={assignment.status === 'published' ? 'default' : 'secondary'}
                              className={assignment.status === 'published' ? 'bg-green-600' : ''}
                            >
                              {assignment.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{assignment.description}</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Questions:</span>
                              <span className="font-medium">{assignment.question_count}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Time Limit:</span>
                              <span className="font-medium">{assignment.time_limit_minutes} min</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Difficulty:</span>
                              <Badge variant="outline" className={
                                assignment.difficulty === 'easy' ? 'text-green-600 border-green-200' :
                                assignment.difficulty === 'hard' ? 'text-red-600 border-red-200' :
                                'text-orange-600 border-orange-200'
                              }>
                                {assignment.difficulty}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Due Date:</span>
                              <span className="font-medium">
                                {new Date(assignment.due_date).toLocaleDateString()}
                              </span>
                            </div>
                            {assignment.completion_stats && (
                              <div className="flex items-center justify-between pt-2 border-t">
                                <span className="text-gray-500">Completed:</span>
                                <span className="font-medium text-blue-600">
                                  {assignment.completion_stats.completed}/{assignment.completion_stats.total} students
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardContent className="pt-0">
                          <div className="flex gap-2">
                            {assignment.status === 'draft' ? (
                              <Button
                                onClick={() => publishAssignment(assignment.id)}
                                className="flex-1"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Publish
                              </Button>
                            ) : (
                              <Button variant="outline" className="flex-1">
                                <BookOpen className="w-4 h-4 mr-2" />
                                View Results
                              </Button>
                            )}
                            <Button variant="outline" size="icon">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {profile.full_name?.split(' ')[0] || 'User'}! 👋
            </h2>
            <p className="text-gray-600">
              Here's what's happening in your educational journey today.
            </p>
          </div>

          {/* Role-specific Dashboard Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getRoleIcon(profile.role)}
                  {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} Dashboard
                </CardTitle>
                <CardDescription>
                  Your personalized workspace is being prepared. Coming soon!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
                    <Settings className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Dashboard Under Construction</h3>
                  <p className="text-gray-600 mb-4">
                    We're building amazing features tailored for {profile.role}s. 
                    Stay tuned for updates!
                  </p>
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                    Student Phase Complete ✓
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Authentication Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Welcome to Proxilearn</CardTitle>
          <CardDescription>
            Your AI-powered educational ecosystem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={authMode} onValueChange={setAuthMode} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form action={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form action={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full mt-4"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}