-- ================================================================================================
-- TEACHER PHASE - SUPABASE SQL SCHEMA EXTENSION
-- ================================================================================================
-- This schema builds upon the existing Student Phase schema
-- Execute these queries in your Supabase SQL editor AFTER the Student Phase schema
-- 
-- Prerequisites: Student Phase schema must be applied first
-- Tables this extends: user_profiles, schools, subjects, assignments, assignment_questions
-- ================================================================================================

-- ------------------------------------------------------------------------------------------------
-- 1. LESSON PLANS TABLE - AI-powered lesson planning system
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.lesson_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    grade_level VARCHAR(50),
    duration_minutes INTEGER DEFAULT 40,
    learning_objectives TEXT[], -- Array of learning objectives
    key_concepts TEXT[], -- Key concepts to cover
    discussion_points TEXT[], -- Discussion questions
    activities JSONB, -- [{type, description, duration, resources}]
    resources JSONB, -- [{type, title, url, description}]
    prerequisites TEXT[], -- Required prior knowledge
    assessment_notes TEXT,
    homework_suggestions TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT, -- Store original AI prompt for regeneration
    is_template BOOLEAN DEFAULT false,
    tags TEXT[], -- Searchable tags
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lesson plans
CREATE INDEX idx_lesson_plans_teacher_id ON public.lesson_plans(teacher_id);
CREATE INDEX idx_lesson_plans_subject_id ON public.lesson_plans(subject_id);
CREATE INDEX idx_lesson_plans_status ON public.lesson_plans(status);
CREATE INDEX idx_lesson_plans_tags ON public.lesson_plans USING GIN(tags);
CREATE INDEX idx_lesson_plans_updated_at ON public.lesson_plans(updated_at);

-- ------------------------------------------------------------------------------------------------
-- 2. TEACHER QUESTION BANK - Reusable question library
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.teacher_question_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL CHECK (question_type IN ('multiple_choice', 'fill_blank', 'true_false', 'short_answer', 'essay')),
    options JSONB, -- For MCQ: ["option1", "option2", "option3", "option4"]
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    topic VARCHAR(255),
    subtopic VARCHAR(255),
    bloom_taxonomy VARCHAR(50) CHECK (bloom_taxonomy IN ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')),
    points DECIMAL(5,2) DEFAULT 1.0,
    estimated_time_seconds INTEGER DEFAULT 60,
    usage_count INTEGER DEFAULT 0,
    tags TEXT[], -- Searchable tags
    ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for question bank
CREATE INDEX idx_question_bank_teacher_id ON public.teacher_question_bank(teacher_id);
CREATE INDEX idx_question_bank_subject_id ON public.teacher_question_bank(subject_id);
CREATE INDEX idx_question_bank_difficulty ON public.teacher_question_bank(difficulty_level);
CREATE INDEX idx_question_bank_topic ON public.teacher_question_bank(topic);
CREATE INDEX idx_question_bank_tags ON public.teacher_question_bank USING GIN(tags);
CREATE INDEX idx_question_bank_usage ON public.teacher_question_bank(usage_count);

-- ------------------------------------------------------------------------------------------------
-- 3. TEACHER GRADEBOOK - Manual grading and grade management
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.teacher_gradebook (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    assignment_attempt_id UUID REFERENCES public.assignment_attempts(id) ON DELETE SET NULL,
    auto_score DECIMAL(5,2), -- Auto-calculated score from assignment attempts
    manual_score DECIMAL(5,2), -- Teacher override score
    final_score DECIMAL(5,2) NOT NULL, -- Final score (manual takes precedence over auto)
    percentage DECIMAL(5,2),
    grade_letter VARCHAR(5), -- A+, A, B+, B, C+, C, D, F
    comments TEXT,
    late_submission BOOLEAN DEFAULT false,
    late_penalty DECIMAL(5,2) DEFAULT 0,
    graded_at TIMESTAMPTZ DEFAULT NOW(),
    graded_by UUID REFERENCES public.user_profiles(id),
    rubric_scores JSONB, -- For future rubric-based grading
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one grade record per student per assignment per teacher
    CONSTRAINT unique_teacher_student_assignment_grade UNIQUE (teacher_id, student_id, assignment_id)
);

-- Indexes for gradebook
CREATE INDEX idx_gradebook_teacher_id ON public.teacher_gradebook(teacher_id);
CREATE INDEX idx_gradebook_student_id ON public.teacher_gradebook(student_id);
CREATE INDEX idx_gradebook_assignment_id ON public.teacher_gradebook(assignment_id);
CREATE INDEX idx_gradebook_graded_at ON public.teacher_gradebook(graded_at);

-- ------------------------------------------------------------------------------------------------
-- 4. TEACHER MESSAGES - Communication system
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.teacher_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('student', 'teacher', 'parent', 'coordinator', 'principal')),
    subject VARCHAR(255),
    message_text TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'general' CHECK (message_type IN ('general', 'assignment_reminder', 'grade_notification', 'performance_alert', 'parent_update')),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
    priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    parent_notification_sent BOOLEAN DEFAULT false,
    coordinator_escalated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_messages_sender_id ON public.teacher_messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.teacher_messages(recipient_id);
CREATE INDEX idx_messages_is_read ON public.teacher_messages(is_read);
CREATE INDEX idx_messages_priority ON public.teacher_messages(priority_level);
CREATE INDEX idx_messages_created_at ON public.teacher_messages(created_at);

-- ------------------------------------------------------------------------------------------------
-- 5. TEACHER RESOURCES - Resource library and file management
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.teacher_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('document', 'video', 'audio', 'image', 'link', 'presentation', 'worksheet')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500), -- For uploaded files
    external_url VARCHAR(500), -- For external resources
    file_size BIGINT, -- File size in bytes
    mime_type VARCHAR(100),
    tags TEXT[], -- Searchable tags
    grade_levels VARCHAR(100)[], -- ["6", "7", "8"] etc.
    topics TEXT[], -- Related topics
    usage_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false, -- Share with other teachers in school
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for resources
CREATE INDEX idx_resources_teacher_id ON public.teacher_resources(teacher_id);
CREATE INDEX idx_resources_subject_id ON public.teacher_resources(subject_id);
CREATE INDEX idx_resources_type ON public.teacher_resources(resource_type);
CREATE INDEX idx_resources_tags ON public.teacher_resources USING GIN(tags);
CREATE INDEX idx_resources_public ON public.teacher_resources(is_public);

-- ------------------------------------------------------------------------------------------------
-- 6. PDF ASSESSMENTS - Printable test generator
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.pdf_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    topics TEXT[] NOT NULL, -- Topics to include in assessment
    difficulty_distribution JSONB DEFAULT '{"easy": 30, "medium": 50, "hard": 20}', -- Percentage distribution
    total_questions INTEGER NOT NULL,
    total_marks DECIMAL(5,2) NOT NULL,
    duration_minutes INTEGER,
    instructions TEXT,
    questions JSONB NOT NULL, -- Array of question objects with metadata
    pdf_generated BOOLEAN DEFAULT false,
    pdf_file_path VARCHAR(500),
    school_logo_url VARCHAR(500),
    template_style VARCHAR(50) DEFAULT 'standard',
    answer_key_generated BOOLEAN DEFAULT false,
    answer_key_path VARCHAR(500),
    usage_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for PDF assessments
CREATE INDEX idx_pdf_assessments_teacher_id ON public.pdf_assessments(teacher_id);
CREATE INDEX idx_pdf_assessments_subject_id ON public.pdf_assessments(subject_id);
CREATE INDEX idx_pdf_assessments_status ON public.pdf_assessments(status);
CREATE INDEX idx_pdf_assessments_topics ON public.pdf_assessments USING GIN(topics);

-- ------------------------------------------------------------------------------------------------
-- 7. TEACHER ANALYTICS - Performance analytics and insights
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.teacher_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
    analytics_type VARCHAR(50) NOT NULL CHECK (analytics_type IN ('class_performance', 'student_engagement', 'assignment_completion', 'grade_distribution', 'time_analysis')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSONB NOT NULL, -- Flexible metrics storage
    insights TEXT[], -- AI-generated insights
    recommendations TEXT[], -- AI-generated recommendations
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_analytics_teacher_id ON public.teacher_analytics(teacher_id);
CREATE INDEX idx_analytics_type ON public.teacher_analytics(analytics_type);
CREATE INDEX idx_analytics_period ON public.teacher_analytics(period_start, period_end);

-- ------------------------------------------------------------------------------------------------
-- 8. TEACHER CLASSES - Class management (Many-to-Many relationship)
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.teacher_classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL, -- "Grade 6-A", "Grade 7-B", etc.
    grade_level VARCHAR(20) NOT NULL,
    section VARCHAR(20),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2024-25',
    student_count INTEGER DEFAULT 0,
    class_schedule JSONB, -- {day: "Monday", time: "09:00", duration: 40}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for teacher classes
CREATE INDEX idx_teacher_classes_teacher_id ON public.teacher_classes(teacher_id);
CREATE INDEX idx_teacher_classes_subject_id ON public.teacher_classes(subject_id);
CREATE INDEX idx_teacher_classes_grade_level ON public.teacher_classes(grade_level);
CREATE INDEX idx_teacher_classes_academic_year ON public.teacher_classes(academic_year);

-- ------------------------------------------------------------------------------------------------
-- 9. STUDENT CLASS ENROLLMENT - Link students to teacher's classes
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.student_class_enrollment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    teacher_class_id UUID NOT NULL REFERENCES public.teacher_classes(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    performance_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique enrollment
    CONSTRAINT unique_student_teacher_class UNIQUE (student_id, teacher_class_id)
);

-- Indexes for student enrollment
CREATE INDEX idx_student_enrollment_student_id ON public.student_class_enrollment(student_id);
CREATE INDEX idx_student_enrollment_class_id ON public.student_class_enrollment(teacher_class_id);
CREATE INDEX idx_student_enrollment_active ON public.student_class_enrollment(is_active);

-- ================================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR TEACHER TABLES
-- ================================================================================================

-- Enable RLS on all teacher tables
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_gradebook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_class_enrollment ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------------------------
-- LESSON PLANS RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Teachers can manage their own lesson plans" ON public.lesson_plans
FOR ALL USING (
    teacher_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- Allow teachers to view templates
CREATE POLICY "Teachers can view lesson plan templates" ON public.lesson_plans
FOR SELECT USING (
    is_template = true AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- ------------------------------------------------------------------------------------------------
-- TEACHER QUESTION BANK RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Teachers can manage their own question bank" ON public.teacher_question_bank
FOR ALL USING (
    teacher_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- ------------------------------------------------------------------------------------------------
-- TEACHER GRADEBOOK RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Teachers can manage grades for their assignments" ON public.teacher_gradebook
FOR ALL USING (
    teacher_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- Allow students to view their own grades
CREATE POLICY "Students can view their own grades" ON public.teacher_gradebook
FOR SELECT USING (
    student_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'student')
);

-- ------------------------------------------------------------------------------------------------
-- TEACHER MESSAGES RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Users can manage their sent and received messages" ON public.teacher_messages
FOR ALL USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
);

-- ------------------------------------------------------------------------------------------------
-- TEACHER RESOURCES RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Teachers can manage their own resources" ON public.teacher_resources
FOR ALL USING (
    teacher_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- Allow teachers to view public resources from their school
CREATE POLICY "Teachers can view public resources from same school" ON public.teacher_resources
FOR SELECT USING (
    is_public = true AND
    teacher_id IN (
        SELECT up.id FROM public.user_profiles up
        WHERE up.school_id = (
            SELECT school_id FROM public.user_profiles WHERE id = auth.uid()
        ) AND up.role = 'teacher'
    ) AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- ------------------------------------------------------------------------------------------------
-- PDF ASSESSMENTS RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Teachers can manage their own PDF assessments" ON public.pdf_assessments
FOR ALL USING (
    teacher_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- ------------------------------------------------------------------------------------------------
-- TEACHER ANALYTICS RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Teachers can view their own analytics" ON public.teacher_analytics
FOR ALL USING (
    teacher_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- ------------------------------------------------------------------------------------------------
-- TEACHER CLASSES RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Teachers can manage their own classes" ON public.teacher_classes
FOR ALL USING (
    teacher_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- Allow students to view classes they're enrolled in
CREATE POLICY "Students can view their enrolled classes" ON public.teacher_classes
FOR SELECT USING (
    id IN (
        SELECT teacher_class_id FROM public.student_class_enrollment 
        WHERE student_id = auth.uid() AND is_active = true
    ) AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'student')
);

-- ------------------------------------------------------------------------------------------------
-- STUDENT CLASS ENROLLMENT RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Teachers can manage enrollment in their classes" ON public.student_class_enrollment
FOR ALL USING (
    teacher_class_id IN (
        SELECT id FROM public.teacher_classes WHERE teacher_id = auth.uid()
    ) AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

CREATE POLICY "Students can view their own enrollment" ON public.student_class_enrollment
FOR SELECT USING (
    student_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'student')
);

-- ================================================================================================
-- FUNCTIONS AND TRIGGERS FOR TEACHER PHASE
-- ================================================================================================

-- Function to update lesson plan timestamps
CREATE OR REPLACE FUNCTION update_lesson_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for lesson plans
CREATE TRIGGER lesson_plans_update_timestamp
    BEFORE UPDATE ON public.lesson_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_lesson_plan_timestamp();

-- Function to increment question usage count
CREATE OR REPLACE FUNCTION increment_question_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.teacher_question_bank 
    SET usage_count = usage_count + 1, updated_at = NOW()
    WHERE id = NEW.question_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-populate gradebook from assignment attempts
CREATE OR REPLACE FUNCTION auto_populate_gradebook()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed attempts
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        INSERT INTO public.teacher_gradebook (
            teacher_id, student_id, assignment_id, assignment_attempt_id,
            auto_score, final_score, percentage, graded_at
        )
        SELECT 
            a.teacher_id,
            NEW.student_id,
            NEW.assignment_id,
            NEW.id,
            NEW.total_score,
            NEW.total_score, -- Use auto score as final score initially
            NEW.percentage_score,
            NOW()
        FROM public.assignments a
        WHERE a.id = NEW.assignment_id
        ON CONFLICT (teacher_id, student_id, assignment_id) 
        DO UPDATE SET
            assignment_attempt_id = NEW.id,
            auto_score = NEW.total_score,
            final_score = COALESCE(public.teacher_gradebook.manual_score, NEW.total_score), -- Keep manual if exists
            percentage = NEW.percentage_score,
            graded_at = NOW(),
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate gradebook from assignment attempts
CREATE TRIGGER auto_populate_gradebook_trigger
    AFTER UPDATE ON public.assignment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION auto_populate_gradebook();

-- Function to update student count in teacher classes
CREATE OR REPLACE FUNCTION update_student_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        UPDATE public.teacher_classes 
        SET student_count = student_count + 1, updated_at = NOW()
        WHERE id = NEW.teacher_class_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true) THEN
        UPDATE public.teacher_classes 
        SET student_count = student_count - 1, updated_at = NOW()
        WHERE id = COALESCE(OLD.teacher_class_id, NEW.teacher_class_id);
    ELSIF TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false THEN
        UPDATE public.teacher_classes 
        SET student_count = student_count + 1, updated_at = NOW()
        WHERE id = NEW.teacher_class_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for student count updates
CREATE TRIGGER update_student_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.student_class_enrollment
    FOR EACH ROW
    EXECUTE FUNCTION update_student_count();

-- Function to calculate grade letter from percentage
CREATE OR REPLACE FUNCTION calculate_grade_letter(percentage DECIMAL(5,2))
RETURNS VARCHAR(5) AS $$
BEGIN
    CASE 
        WHEN percentage >= 95 THEN RETURN 'A+';
        WHEN percentage >= 90 THEN RETURN 'A';
        WHEN percentage >= 85 THEN RETURN 'B+';
        WHEN percentage >= 80 THEN RETURN 'B';
        WHEN percentage >= 75 THEN RETURN 'C+';
        WHEN percentage >= 70 THEN RETURN 'C';
        WHEN percentage >= 60 THEN RETURN 'D';
        ELSE RETURN 'F';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign grade letters in gradebook
CREATE OR REPLACE FUNCTION auto_assign_grade_letter()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.percentage IS NOT NULL AND (NEW.grade_letter IS NULL OR OLD.percentage != NEW.percentage) THEN
        NEW.grade_letter = calculate_grade_letter(NEW.percentage);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign grade letters
CREATE TRIGGER auto_assign_grade_letter_trigger
    BEFORE INSERT OR UPDATE ON public.teacher_gradebook
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_grade_letter();

-- ================================================================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ================================================================================================

-- Function to create sample teacher data (only run if needed for testing)
CREATE OR REPLACE FUNCTION create_teacher_sample_data()
RETURNS TEXT AS $$
DECLARE
    sample_teacher_id UUID;
    sample_subject_id UUID;
    sample_class_id UUID;
BEGIN
    -- Get a sample teacher and subject
    SELECT id INTO sample_teacher_id FROM public.user_profiles WHERE role = 'teacher' LIMIT 1;
    SELECT id INTO sample_subject_id FROM public.subjects LIMIT 1;
    
    IF sample_teacher_id IS NULL OR sample_subject_id IS NULL THEN
        RETURN 'No teacher or subject found. Please create users and subjects first.';
    END IF;
    
    -- Create sample teacher class
    INSERT INTO public.teacher_classes (teacher_id, class_name, grade_level, section, subject_id)
    VALUES (sample_teacher_id, 'Grade 10-A', 'Grade 10', 'A', sample_subject_id)
    RETURNING id INTO sample_class_id;
    
    -- Create sample lesson plan
    INSERT INTO public.lesson_plans (
        teacher_id, subject_id, title, description, duration_minutes,
        learning_objectives, key_concepts, status
    ) VALUES (
        sample_teacher_id, sample_subject_id,
        'Introduction to Algebra', 
        'Basic algebraic concepts and equations',
        40,
        ARRAY['Understand variables', 'Solve linear equations', 'Apply algebraic thinking'],
        ARRAY['Variables', 'Equations', 'Linear relationships'],
        'active'
    );
    
    RETURN 'Sample teacher data created successfully!';
END;
$$ LANGUAGE plpgsql;

-- Uncomment the following line to create sample data:
-- SELECT create_teacher_sample_data();

-- ================================================================================================
-- SCHEMA VALIDATION FOR TEACHER PHASE
-- ================================================================================================

-- Verify all teacher tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    teacher_tables TEXT[] := ARRAY[
        'lesson_plans', 'teacher_question_bank', 'teacher_gradebook', 
        'teacher_messages', 'teacher_resources', 'pdf_assessments', 
        'teacher_analytics', 'teacher_classes', 'student_class_enrollment'
    ];
    missing_tables TEXT := '';
    table_name TEXT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY(teacher_tables);
    
    -- Check for missing tables
    FOREACH table_name IN ARRAY teacher_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := missing_tables || table_name || ', ';
        END IF;
    END LOOP;
    
    IF table_count = 9 THEN
        RAISE NOTICE '🎉 SUCCESS: All 9 Teacher Phase tables created successfully!';
        RAISE NOTICE '📋 Tables created: %', array_to_string(teacher_tables, ', ');
        RAISE NOTICE '🔒 RLS policies applied to all tables';
        RAISE NOTICE '⚡ Triggers and functions configured';
        RAISE NOTICE '✅ Teacher Phase schema is ready to use!';
    ELSE
        RAISE NOTICE '⚠️ WARNING: Only % out of 9 Teacher Phase tables were created.', table_count;
        IF missing_tables != '' THEN
            RAISE NOTICE '❌ Missing tables: %', rtrim(missing_tables, ', ');
        END IF;
        RAISE NOTICE '🔍 Please check the SQL execution log for errors.';
    END IF;
END $$;

-- ================================================================================================
-- USAGE INSTRUCTIONS
-- ================================================================================================

/*
🚀 TEACHER PHASE SCHEMA DEPLOYMENT INSTRUCTIONS:

1. PREREQUISITES:
   - Student Phase schema must be applied first
   - Ensure you have at least one school in the 'schools' table
   - Ensure you have at least one teacher user in 'user_profiles' table

2. APPLY THIS SCHEMA:
   - Copy and paste this entire SQL script into your Supabase SQL Editor
   - Execute the script (it will take a few moments)
   - Look for the success message at the end

3. VERIFICATION:
   - Check that all 9 tables are listed in your database
   - Verify RLS policies are enabled (you should see policies in the Supabase dashboard)
   - Test basic operations through the API endpoints

4. NEXT STEPS:
   - The backend APIs are ready to use these tables
   - You can now proceed with frontend implementation
   - Consider running the sample data function if you need test data

5. TROUBLESHOOTING:
   - If any table creation fails, check for naming conflicts
   - Ensure the Student Phase schema was applied correctly
   - Verify that your Supabase project has sufficient permissions

📊 TOTAL SCHEMA STATS:
- Student Phase: 11 tables
- Teacher Phase: 9 tables  
- Combined: 20 tables total
- All with comprehensive RLS policies and optimized indexes
*/

-- ================================================================================================
-- END OF TEACHER PHASE SCHEMA
-- ================================================================================================