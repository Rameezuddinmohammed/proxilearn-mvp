-- ================================================================================================
-- TEACHER PHASE DATABASE SCHEMA
-- Extends existing Student Phase schema for complete Teacher Dashboard functionality
-- ================================================================================================

-- Lesson Plans Table
CREATE TABLE IF NOT EXISTS lesson_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    grade_level VARCHAR(50),
    duration_minutes INTEGER DEFAULT 40,
    learning_objectives TEXT[],
    key_concepts TEXT[],
    discussion_points TEXT[],
    activities JSONB, -- {type, description, duration, resources}
    resources JSONB, -- {type, title, url, description}
    prerequisites TEXT[],
    assessment_notes TEXT,
    homework_suggestions TEXT,
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT, -- Store original AI prompt for regeneration
    is_template BOOLEAN DEFAULT false,
    tags TEXT[],
    status VARCHAR(20) DEFAULT 'draft', -- draft, active, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Question Bank
CREATE TABLE IF NOT EXISTS teacher_question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- multiple_choice, fill_blank, true_false, short_answer
    options JSONB, -- For MCQ: ["option1", "option2", "option3", "option4"]
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty_level VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
    topic VARCHAR(255),
    subtopic VARCHAR(255),
    bloom_taxonomy VARCHAR(50), -- remember, understand, apply, analyze, evaluate, create
    points DECIMAL(5,2) DEFAULT 1.0,
    estimated_time_seconds INTEGER DEFAULT 60,
    usage_count INTEGER DEFAULT 0,
    tags TEXT[],
    ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Grade Book
CREATE TABLE IF NOT EXISTS teacher_gradebook (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    assignment_attempt_id UUID REFERENCES assignment_attempts(id) ON DELETE SET NULL,
    auto_score DECIMAL(5,2), -- Auto-calculated score
    manual_score DECIMAL(5,2), -- Teacher override score
    final_score DECIMAL(5,2) NOT NULL, -- Final score (manual takes precedence)
    percentage DECIMAL(5,2),
    grade_letter VARCHAR(5), -- A+, A, B+, B, etc.
    comments TEXT,
    late_submission BOOLEAN DEFAULT false,
    late_penalty DECIMAL(5,2) DEFAULT 0,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    graded_by UUID REFERENCES user_profiles(id),
    rubric_scores JSONB, -- For future rubric-based grading
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Messages/Communications
CREATE TABLE IF NOT EXISTS teacher_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    recipient_type VARCHAR(20) NOT NULL, -- student, teacher, parent, coordinator, principal
    subject VARCHAR(255),
    message_text TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'general', -- assignment_reminder, grade_notification, performance_alert
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    priority_level VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    parent_notification_sent BOOLEAN DEFAULT false,
    coordinator_escalated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Resource Library
CREATE TABLE IF NOT EXISTS teacher_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    resource_type VARCHAR(50) NOT NULL, -- document, video, audio, image, link, presentation
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500), -- For uploaded files
    external_url VARCHAR(500), -- For external resources
    file_size BIGINT, -- In bytes
    mime_type VARCHAR(100),
    tags TEXT[],
    grade_levels VARCHAR(100)[], -- ["6", "7", "8"]
    topics TEXT[],
    usage_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false, -- Share with other teachers
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PDF Assessments
CREATE TABLE IF NOT EXISTS pdf_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    topics TEXT[] NOT NULL,
    difficulty_distribution JSONB, -- {"easy": 30, "medium": 50, "hard": 20}
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
    status VARCHAR(20) DEFAULT 'draft', -- draft, finalized, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Performance Analytics
CREATE TABLE IF NOT EXISTS teacher_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    analytics_type VARCHAR(50) NOT NULL, -- class_performance, student_engagement, assignment_completion
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics JSONB NOT NULL, -- Flexible metrics storage
    insights TEXT[], -- AI-generated insights
    recommendations TEXT[], -- AI-generated recommendations
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Class Assignments (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS teacher_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    class_name VARCHAR(100) NOT NULL, -- "Grade 6-A", "Grade 7-B"
    grade_level VARCHAR(20) NOT NULL,
    section VARCHAR(20),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL, -- "2024-25"
    student_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Class Enrollment (Link students to teacher's classes)
CREATE TABLE IF NOT EXISTS student_class_enrollment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    teacher_class_id UUID NOT NULL REFERENCES teacher_classes(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, teacher_class_id)
);

-- ================================================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================================================

-- Lesson Plans indexes
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher_id ON lesson_plans(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_subject_id ON lesson_plans(subject_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_status ON lesson_plans(status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_tags ON lesson_plans USING GIN(tags);

-- Question Bank indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_teacher_id ON teacher_question_bank(teacher_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_subject_id ON teacher_question_bank(subject_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON teacher_question_bank(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_question_bank_topic ON teacher_question_bank(topic);
CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON teacher_question_bank USING GIN(tags);

-- Gradebook indexes
CREATE INDEX IF NOT EXISTS idx_gradebook_teacher_id ON teacher_gradebook(teacher_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_student_id ON teacher_gradebook(student_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_assignment_id ON teacher_gradebook(assignment_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON teacher_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON teacher_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON teacher_messages(is_read);

-- Resources indexes
CREATE INDEX IF NOT EXISTS idx_resources_teacher_id ON teacher_resources(teacher_id);
CREATE INDEX IF NOT EXISTS idx_resources_subject_id ON teacher_resources(subject_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON teacher_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_tags ON teacher_resources USING GIN(tags);

-- PDF Assessments indexes
CREATE INDEX IF NOT EXISTS idx_pdf_assessments_teacher_id ON pdf_assessments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_pdf_assessments_subject_id ON pdf_assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_pdf_assessments_status ON pdf_assessments(status);

-- Teacher Classes indexes
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON teacher_classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_subject_id ON teacher_classes(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_grade_level ON teacher_classes(grade_level);

-- Student Enrollment indexes
CREATE INDEX IF NOT EXISTS idx_student_enrollment_student_id ON student_class_enrollment(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollment_class_id ON student_class_enrollment(teacher_class_id);

-- ================================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================================================

-- Enable RLS on all tables
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_gradebook ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_class_enrollment ENABLE ROW LEVEL SECURITY;

-- Lesson Plans RLS Policies
CREATE POLICY "Teachers can manage their own lesson plans" ON lesson_plans
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM user_profiles 
            WHERE id = lesson_plans.teacher_id 
            AND role = 'teacher'
        )
    );

-- Question Bank RLS Policies
CREATE POLICY "Teachers can manage their own question bank" ON teacher_question_bank
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM user_profiles 
            WHERE id = teacher_question_bank.teacher_id 
            AND role = 'teacher'
        )
    );

-- Gradebook RLS Policies
CREATE POLICY "Teachers can manage grades for their assignments" ON teacher_gradebook
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM user_profiles 
            WHERE id = teacher_gradebook.teacher_id 
            AND role = 'teacher'
        )
    );

CREATE POLICY "Students can view their own grades" ON teacher_gradebook
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM user_profiles 
            WHERE id = teacher_gradebook.student_id 
            AND role = 'student'
        )
    );

-- Messages RLS Policies
CREATE POLICY "Users can manage their sent and received messages" ON teacher_messages
    FOR ALL USING (
        auth.uid() = sender_id OR auth.uid() = recipient_id
    );

-- Resources RLS Policies
CREATE POLICY "Teachers can manage their own resources" ON teacher_resources
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM user_profiles 
            WHERE id = teacher_resources.teacher_id 
            AND role = 'teacher'
        )
    );

CREATE POLICY "Teachers can view public resources" ON teacher_resources
    FOR SELECT USING (
        is_public = true AND auth.uid() IN (
            SELECT id FROM user_profiles WHERE role = 'teacher'
        )
    );

-- PDF Assessments RLS Policies
CREATE POLICY "Teachers can manage their own assessments" ON pdf_assessments
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM user_profiles 
            WHERE id = pdf_assessments.teacher_id 
            AND role = 'teacher'
        )
    );

-- Teacher Analytics RLS Policies
CREATE POLICY "Teachers can view their own analytics" ON teacher_analytics
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM user_profiles 
            WHERE id = teacher_analytics.teacher_id 
            AND role = 'teacher'
        )
    );

-- Teacher Classes RLS Policies
CREATE POLICY "Teachers can manage their own classes" ON teacher_classes
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM user_profiles 
            WHERE id = teacher_classes.teacher_id 
            AND role = 'teacher'
        )
    );

-- Student Enrollment RLS Policies
CREATE POLICY "Teachers can manage enrollment in their classes" ON student_class_enrollment
    FOR ALL USING (
        auth.uid() IN (
            SELECT teacher_id FROM teacher_classes 
            WHERE id = student_class_enrollment.teacher_class_id
        )
    );

CREATE POLICY "Students can view their own enrollment" ON student_class_enrollment
    FOR SELECT USING (
        auth.uid() = student_id
    );

-- ================================================================================================
-- FUNCTIONS AND TRIGGERS
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
    BEFORE UPDATE ON lesson_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_lesson_plan_timestamp();

-- Function to update question bank usage count
CREATE OR REPLACE FUNCTION increment_question_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE teacher_question_bank 
    SET usage_count = usage_count + 1 
    WHERE id = NEW.question_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-populate gradebook from assignment attempts
CREATE OR REPLACE FUNCTION auto_populate_gradebook()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed attempts
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        INSERT INTO teacher_gradebook (
            teacher_id, student_id, assignment_id, assignment_attempt_id,
            auto_score, final_score, percentage, graded_at
        )
        SELECT 
            a.teacher_id,
            NEW.student_id,
            NEW.assignment_id,
            NEW.id,
            NEW.total_score,
            NEW.total_score,
            NEW.percentage_score,
            NOW()
        FROM assignments a
        WHERE a.id = NEW.assignment_id
        ON CONFLICT (teacher_id, student_id, assignment_id) 
        DO UPDATE SET
            assignment_attempt_id = NEW.id,
            auto_score = NEW.total_score,
            final_score = COALESCE(teacher_gradebook.manual_score, NEW.total_score),
            percentage = NEW.percentage_score,
            graded_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-populate gradebook
CREATE TRIGGER auto_populate_gradebook_trigger
    AFTER UPDATE ON assignment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION auto_populate_gradebook();

-- Function to update student count in teacher classes
CREATE OR REPLACE FUNCTION update_student_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
        UPDATE teacher_classes 
        SET student_count = student_count + 1 
        WHERE id = NEW.teacher_class_id;
    ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true) THEN
        UPDATE teacher_classes 
        SET student_count = student_count - 1 
        WHERE id = COALESCE(OLD.teacher_class_id, NEW.teacher_class_id);
    ELSIF TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false THEN
        UPDATE teacher_classes 
        SET student_count = student_count + 1 
        WHERE id = NEW.teacher_class_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for student count updates
CREATE TRIGGER update_student_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON student_class_enrollment
    FOR EACH ROW
    EXECUTE FUNCTION update_student_count();

-- ================================================================================================
-- INITIAL DATA AND SAMPLE RECORDS
-- ================================================================================================

-- Insert sample lesson plan templates (only if not exists)
INSERT INTO lesson_plans (teacher_id, subject_id, title, description, duration_minutes, is_template, status)
SELECT 
    t.id as teacher_id,
    s.id as subject_id,
    'Basic Lesson Plan Template',
    'A template for creating new lesson plans with standard structure',
    40,
    true,
    'active'
FROM user_profiles t
CROSS JOIN subjects s
WHERE t.role = 'teacher' 
AND NOT EXISTS (
    SELECT 1 FROM lesson_plans 
    WHERE is_template = true 
    AND title = 'Basic Lesson Plan Template'
)
LIMIT 1;

-- Add notification for schema creation
DO $$
BEGIN
    RAISE NOTICE 'Teacher Phase database schema created successfully!';
    RAISE NOTICE 'Tables created: lesson_plans, teacher_question_bank, teacher_gradebook, teacher_messages, teacher_resources, pdf_assessments, teacher_analytics, teacher_classes, student_class_enrollment';
    RAISE NOTICE 'RLS policies, indexes, and triggers configured.';
END $$;