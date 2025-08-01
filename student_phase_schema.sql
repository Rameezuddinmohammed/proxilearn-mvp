-- ================================================================================================
-- STUDENT PHASE - SUPABASE SQL SCHEMA EXTENSION
-- ================================================================================================
-- This schema builds upon the existing foundational schema for user_profiles and schools
-- Execute these queries in your Supabase SQL editor in the given order

-- ------------------------------------------------------------------------------------------------
-- 1. SUBJECTS TABLE - Manage academic subjects
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    code TEXT UNIQUE, -- Subject code like "MATH101", "PHY201"
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    grade_level TEXT, -- "Grade 1", "Grade 2", etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_subjects_school_id ON public.subjects(school_id);
CREATE INDEX idx_subjects_active ON public.subjects(is_active);

-- ------------------------------------------------------------------------------------------------
-- 2. ASSIGNMENTS TABLE - Homework/Quiz assignments created by teachers
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('quiz', 'homework', 'practice', 'test')),
    difficulty_level TEXT DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    total_questions INTEGER DEFAULT 0,
    time_limit_minutes INTEGER, -- NULL means no time limit
    max_attempts INTEGER DEFAULT 1,
    passing_score DECIMAL(5,2) DEFAULT 60.00, -- Percentage required to pass
    is_published BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assignments_subject_id ON public.assignments(subject_id);
CREATE INDEX idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX idx_assignments_published ON public.assignments(is_published);
CREATE INDEX idx_assignments_due_date ON public.assignments(due_date);

-- ------------------------------------------------------------------------------------------------
-- 3. ASSIGNMENT_QUESTIONS TABLE - Questions for each assignment
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.assignment_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'fill_blank', 'true_false', 'short_answer')),
    options JSONB, -- For multiple choice: ["Option A", "Option B", "Option C", "Option D"]
    correct_answer TEXT NOT NULL,
    explanation TEXT, -- AI-generated explanation
    points DECIMAL(5,2) DEFAULT 1.00,
    order_index INTEGER DEFAULT 0, -- Question order in the assignment
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_assignment_questions_assignment_id ON public.assignment_questions(assignment_id);
CREATE INDEX idx_assignment_questions_order ON public.assignment_questions(assignment_id, order_index);

-- ------------------------------------------------------------------------------------------------
-- 4. STUDENT_RESPONSES TABLE - Student answers and scores
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.student_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.assignment_questions(id) ON DELETE CASCADE,
    student_answer TEXT,
    is_correct BOOLEAN,
    points_earned DECIMAL(5,2) DEFAULT 0.00,
    attempt_number INTEGER DEFAULT 1,
    time_spent_seconds INTEGER DEFAULT 0, -- Time spent on this question
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one response per question per attempt
    CONSTRAINT unique_student_question_attempt UNIQUE (student_id, question_id, attempt_number)
);

-- Indexes for performance
CREATE INDEX idx_student_responses_assignment_id ON public.student_responses(assignment_id);
CREATE INDEX idx_student_responses_student_id ON public.student_responses(student_id);
CREATE INDEX idx_student_responses_question_id ON public.student_responses(question_id);

-- ------------------------------------------------------------------------------------------------
-- 5. ASSIGNMENT_ATTEMPTS TABLE - Track overall assignment attempts and scores
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.assignment_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    attempt_number INTEGER DEFAULT 1,
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'submitted', 'graded')),
    total_score DECIMAL(5,2) DEFAULT 0.00,
    percentage_score DECIMAL(5,2) DEFAULT 0.00,
    total_time_spent_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    
    -- Ensure unique attempts per student per assignment
    CONSTRAINT unique_student_assignment_attempt UNIQUE (student_id, assignment_id, attempt_number)
);

-- Indexes for performance
CREATE INDEX idx_assignment_attempts_assignment_id ON public.assignment_attempts(assignment_id);
CREATE INDEX idx_assignment_attempts_student_id ON public.assignment_attempts(student_id);
CREATE INDEX idx_assignment_attempts_status ON public.assignment_attempts(status);

-- ------------------------------------------------------------------------------------------------
-- 6. STUDY_GROUPS TABLE - Collaborative learning groups (max 3 students including creator)
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.study_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    max_members INTEGER DEFAULT 3 CHECK (max_members <= 3), -- Max 3 as per requirement
    is_active BOOLEAN DEFAULT TRUE,
    invite_code TEXT UNIQUE, -- 6-character code for joining
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generate random invite code function
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
BEGIN
    RETURN upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite code
CREATE OR REPLACE FUNCTION set_invite_code() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code = generate_invite_code();
        -- Ensure uniqueness
        WHILE EXISTS (SELECT 1 FROM public.study_groups WHERE invite_code = NEW.invite_code) LOOP
            NEW.invite_code = generate_invite_code();
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invite_code
    BEFORE INSERT ON public.study_groups
    FOR EACH ROW EXECUTE FUNCTION set_invite_code();

-- Indexes for performance
CREATE INDEX idx_study_groups_assignment_id ON public.study_groups(assignment_id);
CREATE INDEX idx_study_groups_creator_id ON public.study_groups(creator_id);
CREATE INDEX idx_study_groups_invite_code ON public.study_groups(invite_code);

-- ------------------------------------------------------------------------------------------------
-- 7. GROUP_MEMBERS TABLE - Members of study groups
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure unique membership
    CONSTRAINT unique_group_member UNIQUE (group_id, student_id)
);

-- Indexes for performance
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_student_id ON public.group_members(student_id);

-- ------------------------------------------------------------------------------------------------
-- 8. GROUP_CHAT_MESSAGES TABLE - Real-time chat during group study sessions
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.group_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    message_text TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system')),
    emoji_code TEXT, -- For emoji reactions like "👍", "❤️", "😄"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_group_chat_group_id ON public.group_chat_messages(group_id);
CREATE INDEX idx_group_chat_created_at ON public.group_chat_messages(created_at);

-- ------------------------------------------------------------------------------------------------
-- 9. DOUBTS TABLE - Student questions to teachers ("Ask a Doubt" feature)
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.doubts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL, -- Optional reference
    title TEXT NOT NULL,
    question_text TEXT NOT NULL,
    context TEXT, -- Additional context or topic area
    priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'resolved', 'closed')),
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_doubts_student_id ON public.doubts(student_id);
CREATE INDEX idx_doubts_subject_id ON public.doubts(subject_id);
CREATE INDEX idx_doubts_status ON public.doubts(status);
CREATE INDEX idx_doubts_priority ON public.doubts(priority_level);

-- ------------------------------------------------------------------------------------------------
-- 10. DOUBT_RESPONSES TABLE - Teacher/AI responses to student doubts
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.doubt_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- NULL for AI responses
    response_text TEXT NOT NULL,
    response_type TEXT DEFAULT 'teacher' CHECK (response_type IN ('teacher', 'ai', 'peer')),
    is_helpful BOOLEAN, -- Student can mark as helpful/not helpful
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_doubt_responses_doubt_id ON public.doubt_responses(doubt_id);
CREATE INDEX idx_doubt_responses_responder_id ON public.doubt_responses(responder_id);

-- ------------------------------------------------------------------------------------------------
-- 11. STUDENT_PROGRESS TABLE - Track individual student progress and analytics
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.student_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    total_assignments INTEGER DEFAULT 0,
    completed_assignments INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    total_time_spent_minutes INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0, -- Consecutive days of activity
    last_activity_date DATE DEFAULT CURRENT_DATE,
    strengths TEXT[], -- Array of topic strengths
    weaknesses TEXT[], -- Array of topics needing improvement
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one progress record per student per subject
    CONSTRAINT unique_student_subject_progress UNIQUE (student_id, subject_id)
);

-- Indexes for performance
CREATE INDEX idx_student_progress_student_id ON public.student_progress(student_id);
CREATE INDEX idx_student_progress_subject_id ON public.student_progress(subject_id);

-- ================================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================================================

-- Enable RLS on all new tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------------------------
-- SUBJECTS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can view subjects from their school" ON public.subjects
FOR SELECT USING (
    school_id IN (
        SELECT school_id FROM public.user_profiles 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Teachers can manage subjects from their school" ON public.subjects
FOR ALL USING (
    school_id IN (
        SELECT school_id FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('teacher', 'coordinator', 'principal')
    )
);

-- ------------------------------------------------------------------------------------------------
-- ASSIGNMENTS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can view published assignments from their school subjects" ON public.assignments
FOR SELECT USING (
    is_published = true AND 
    subject_id IN (
        SELECT s.id FROM public.subjects s
        JOIN public.user_profiles up ON s.school_id = up.school_id
        WHERE up.id = auth.uid()
    )
);

CREATE POLICY "Teachers can manage their own assignments" ON public.assignments
FOR ALL USING (teacher_id = auth.uid());

-- ------------------------------------------------------------------------------------------------
-- ASSIGNMENT_QUESTIONS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can view questions from published assignments" ON public.assignment_questions
FOR SELECT USING (
    assignment_id IN (
        SELECT a.id FROM public.assignments a
        JOIN public.subjects s ON a.subject_id = s.id
        JOIN public.user_profiles up ON s.school_id = up.school_id
        WHERE up.id = auth.uid() AND a.is_published = true
    )
);

CREATE POLICY "Teachers can manage questions for their assignments" ON public.assignment_questions
FOR ALL USING (
    assignment_id IN (
        SELECT id FROM public.assignments WHERE teacher_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------------------------
-- STUDENT_RESPONSES POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can manage their own responses" ON public.student_responses
FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view responses to their assignments" ON public.student_responses
FOR SELECT USING (
    assignment_id IN (
        SELECT id FROM public.assignments WHERE teacher_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------------------------
-- ASSIGNMENT_ATTEMPTS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can manage their own attempts" ON public.assignment_attempts
FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view attempts on their assignments" ON public.assignment_attempts
FOR SELECT USING (
    assignment_id IN (
        SELECT id FROM public.assignments WHERE teacher_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------------------------
-- STUDY_GROUPS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can view and create study groups for assignments they can access" ON public.study_groups
FOR ALL USING (
    assignment_id IN (
        SELECT a.id FROM public.assignments a
        JOIN public.subjects s ON a.subject_id = s.id
        JOIN public.user_profiles up ON s.school_id = up.school_id
        WHERE up.id = auth.uid() AND a.is_published = true
    )
);

-- ------------------------------------------------------------------------------------------------
-- GROUP_MEMBERS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can view group members for groups they belong to" ON public.group_members
FOR SELECT USING (
    group_id IN (
        SELECT group_id FROM public.group_members WHERE student_id = auth.uid()
    )
);

CREATE POLICY "Students can join groups" ON public.group_members
FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can leave groups they belong to" ON public.group_members
FOR DELETE USING (student_id = auth.uid());

-- ------------------------------------------------------------------------------------------------
-- GROUP_CHAT_MESSAGES POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Group members can view chat messages" ON public.group_chat_messages
FOR SELECT USING (
    group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE student_id = auth.uid() AND is_active = true
    )
);

CREATE POLICY "Group members can send chat messages" ON public.group_chat_messages
FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE student_id = auth.uid() AND is_active = true
    )
);

-- ------------------------------------------------------------------------------------------------
-- DOUBTS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can manage their own doubts" ON public.doubts
FOR ALL USING (student_id = auth.uid());

CREATE POLICY "Teachers can view doubts in their subjects" ON public.doubts
FOR SELECT USING (
    subject_id IN (
        SELECT s.id FROM public.subjects s
        JOIN public.user_profiles up ON s.school_id = up.school_id
        WHERE up.id = auth.uid() AND up.role IN ('teacher', 'coordinator', 'principal')
    )
);

-- ------------------------------------------------------------------------------------------------
-- DOUBT_RESPONSES POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can view responses to their doubts" ON public.doubt_responses
FOR SELECT USING (
    doubt_id IN (
        SELECT id FROM public.doubts WHERE student_id = auth.uid()
    )
);

CREATE POLICY "Teachers can respond to doubts in their subjects" ON public.doubt_responses
FOR INSERT WITH CHECK (
    responder_id = auth.uid() AND
    doubt_id IN (
        SELECT d.id FROM public.doubts d
        JOIN public.subjects s ON d.subject_id = s.id
        JOIN public.user_profiles up ON s.school_id = up.school_id
        WHERE up.id = auth.uid() AND up.role IN ('teacher', 'coordinator', 'principal')
    )
);

-- ------------------------------------------------------------------------------------------------
-- STUDENT_PROGRESS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Students can view their own progress" ON public.student_progress
FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view progress of students in their school subjects" ON public.student_progress
FOR SELECT USING (
    subject_id IN (
        SELECT s.id FROM public.subjects s
        JOIN public.user_profiles up ON s.school_id = up.school_id
        WHERE up.id = auth.uid() AND up.role IN ('teacher', 'coordinator', 'principal')
    )
);

-- ================================================================================================
-- UTILITY FUNCTIONS
-- ================================================================================================

-- Function to calculate assignment score
CREATE OR REPLACE FUNCTION calculate_assignment_score(p_assignment_id UUID, p_student_id UUID, p_attempt_number INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_points DECIMAL(5,2);
    earned_points DECIMAL(5,2);
    percentage DECIMAL(5,2);
BEGIN
    -- Get total possible points
    SELECT COALESCE(SUM(points), 0) INTO total_points
    FROM public.assignment_questions
    WHERE assignment_id = p_assignment_id;
    
    -- Get earned points
    SELECT COALESCE(SUM(points_earned), 0) INTO earned_points
    FROM public.student_responses
    WHERE assignment_id = p_assignment_id 
    AND student_id = p_student_id 
    AND attempt_number = p_attempt_number;
    
    -- Calculate percentage
    IF total_points > 0 THEN
        percentage = (earned_points / total_points) * 100;
    ELSE
        percentage = 0;
    END IF;
    
    RETURN percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to update student progress
CREATE OR REPLACE FUNCTION update_student_progress(p_student_id UUID, p_subject_id UUID)
RETURNS VOID AS $$
DECLARE
    assignment_count INTEGER;
    completed_count INTEGER;
    avg_score DECIMAL(5,2);
BEGIN
    -- Count total assignments in subject
    SELECT COUNT(*) INTO assignment_count
    FROM public.assignments a
    WHERE a.subject_id = p_subject_id AND a.is_published = true;
    
    -- Count completed assignments
    SELECT COUNT(DISTINCT aa.assignment_id) INTO completed_count
    FROM public.assignment_attempts aa
    JOIN public.assignments a ON aa.assignment_id = a.id
    WHERE aa.student_id = p_student_id 
    AND a.subject_id = p_subject_id 
    AND aa.status = 'completed';
    
    -- Calculate average score
    SELECT COALESCE(AVG(aa.percentage_score), 0) INTO avg_score
    FROM public.assignment_attempts aa
    JOIN public.assignments a ON aa.assignment_id = a.id
    WHERE aa.student_id = p_student_id 
    AND a.subject_id = p_subject_id 
    AND aa.status = 'completed';
    
    -- Update or insert progress record
    INSERT INTO public.student_progress (
        student_id, subject_id, total_assignments, 
        completed_assignments, average_score, updated_at
    )
    VALUES (
        p_student_id, p_subject_id, assignment_count,
        completed_count, avg_score, NOW()
    )
    ON CONFLICT (student_id, subject_id) 
    DO UPDATE SET
        total_assignments = assignment_count,
        completed_assignments = completed_count,
        average_score = avg_score,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- SAMPLE DATA INSERTION (Optional - for testing)
-- ================================================================================================

-- Note: Uncomment the following section if you want to insert sample data for testing
-- Make sure you have at least one school and teacher user created first

/*
-- Insert sample subjects
INSERT INTO public.subjects (name, description, code, school_id, grade_level) VALUES
('Mathematics', 'Basic mathematics and algebra', 'MATH101', (SELECT id FROM public.schools LIMIT 1), 'Grade 10'),
('Physics', 'Introduction to physics concepts', 'PHY101', (SELECT id FROM public.schools LIMIT 1), 'Grade 10'),
('Chemistry', 'Basic chemistry principles', 'CHEM101', (SELECT id FROM public.schools LIMIT 1), 'Grade 10');

-- Insert sample assignment (requires a teacher user)
INSERT INTO public.assignments (title, description, subject_id, teacher_id, assignment_type, difficulty_level, is_published)
SELECT 
    'Basic Algebra Quiz',
    'Test your understanding of basic algebraic concepts',
    s.id,
    up.id,
    'quiz',
    'intermediate',
    true
FROM public.subjects s
CROSS JOIN public.user_profiles up
WHERE s.code = 'MATH101' 
AND up.role = 'teacher'
LIMIT 1;
*/

-- ================================================================================================
-- SCHEMA VALIDATION
-- ================================================================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'subjects', 'assignments', 'assignment_questions', 'student_responses',
        'assignment_attempts', 'study_groups', 'group_members', 
        'group_chat_messages', 'doubts', 'doubt_responses', 'student_progress'
    );
    
    IF table_count = 11 THEN
        RAISE NOTICE 'SUCCESS: All 11 Student Phase tables created successfully!';
    ELSE
        RAISE NOTICE 'WARNING: Only % out of 11 tables were created. Please check for errors.', table_count;
    END IF;
END $$;

-- ================================================================================================
-- END OF STUDENT PHASE SCHEMA
-- ================================================================================================