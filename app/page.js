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
import { BookOpen, Users, Settings, LogOut, User, GraduationCap, UserCheck, Crown, Building } from 'lucide-react'
import { toast } from 'sonner'

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState('signin')
  const [schools, setSchools] = useState([])
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  const supabase = createClient()

  // Authentication state management
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

  // Main Dashboard
  if (user && profile) {
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
                <p className="text-sm text-gray-500">Educational Platform</p>
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
                    Foundation Phase Complete ✓
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