-- ================================================================================================
-- COORDINATOR PHASE - SUPABASE SQL SCHEMA EXTENSION
-- ================================================================================================
-- This schema builds upon the Student Phase and Teacher Phase schemas
-- Execute these queries in your Supabase SQL editor AFTER both Student & Teacher Phase schemas
-- 
-- Prerequisites: 
-- - Student Phase schema must be applied first (11 tables)
-- - Teacher Phase schema must be applied second (9 tables)
-- 
-- This adds 8 new tables for comprehensive coordinator functionality
-- ================================================================================================

-- ------------------------------------------------------------------------------------------------
-- 1. COORDINATOR ASSIGNMENTS - Link coordinators to classes/sections they oversee
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.coordinator_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coordinator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    grade_level VARCHAR(20) NOT NULL, -- "Grade 6", "Grade 7", etc.
    section VARCHAR(20), -- "A", "B", "C", etc. NULL means all sections
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL, -- NULL means all subjects
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2024-25',
    student_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    assigned_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique assignments
    CONSTRAINT unique_coordinator_grade_section UNIQUE (coordinator_id, grade_level, section, academic_year)
);

-- Indexes for coordinator assignments
CREATE INDEX idx_coordinator_assignments_coordinator_id ON public.coordinator_assignments(coordinator_id);
CREATE INDEX idx_coordinator_assignments_grade_level ON public.coordinator_assignments(grade_level);
CREATE INDEX idx_coordinator_assignments_school_id ON public.coordinator_assignments(school_id);
CREATE INDEX idx_coordinator_assignments_active ON public.coordinator_assignments(is_active);

-- ------------------------------------------------------------------------------------------------
-- 2. STUDENT_SUPPORT_CATEGORIES - Soft categorization instead of "at-risk"
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.student_support_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    coordinator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    support_type VARCHAR(50) NOT NULL CHECK (support_type IN (
        'academic_support', 'engagement_boost', 'attendance_focus', 
        'homework_guidance', 'peer_interaction', 'confidence_building'
    )),
    priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high')),
    category_reason TEXT NOT NULL, -- Why student needs this support
    ai_detected BOOLEAN DEFAULT false, -- Was this detected by AI analysis
    teacher_flagged BOOLEAN DEFAULT false, -- Was this flagged by a teacher
    auto_metrics JSONB, -- AI metrics that triggered this categorization
    current_status VARCHAR(30) DEFAULT 'active' CHECK (current_status IN ('active', 'monitoring', 'resolved', 'escalated')),
    intervention_notes TEXT,
    review_date DATE,
    resolved_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Allow multiple support categories per student
    CONSTRAINT unique_student_support_type UNIQUE (student_id, support_type, coordinator_id)
);

-- Indexes for student support categories
CREATE INDEX idx_support_categories_student_id ON public.student_support_categories(student_id);
CREATE INDEX idx_support_categories_coordinator_id ON public.student_support_categories(coordinator_id);
CREATE INDEX idx_support_categories_type ON public.student_support_categories(support_type);
CREATE INDEX idx_support_categories_priority ON public.student_support_categories(priority_level);
CREATE INDEX idx_support_categories_status ON public.student_support_categories(current_status);
CREATE INDEX idx_support_categories_ai_detected ON public.student_support_categories(ai_detected);

-- ------------------------------------------------------------------------------------------------
-- 3. STUDENT_INTERVENTION_LOG - Track all interventions and support actions
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.student_intervention_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    coordinator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    support_category_id UUID REFERENCES public.student_support_categories(id) ON DELETE SET NULL,
    intervention_type VARCHAR(50) NOT NULL CHECK (intervention_type IN (
        'one_on_one_meeting', 'parent_call', 'teacher_consultation', 'peer_buddy_assignment',
        'extra_help_session', 'counseling_referral', 'study_group_assignment', 'mentor_assignment'
    )),
    intervention_title VARCHAR(255) NOT NULL,
    intervention_description TEXT NOT NULL,
    participants TEXT[], -- Array of people involved (parent, teacher names, etc.)
    action_taken TEXT NOT NULL,
    outcome_notes TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
    intervention_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for intervention log
CREATE INDEX idx_intervention_log_student_id ON public.student_intervention_log(student_id);
CREATE INDEX idx_intervention_log_coordinator_id ON public.student_intervention_log(coordinator_id);
CREATE INDEX idx_intervention_log_type ON public.student_intervention_log(intervention_type);
CREATE INDEX idx_intervention_log_date ON public.student_intervention_log(intervention_date);
CREATE INDEX idx_intervention_log_follow_up ON public.student_intervention_log(follow_up_required);

-- ------------------------------------------------------------------------------------------------
-- 4. COORDINATOR_COMMUNICATIONS - Bulk messaging and communication tracking
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.coordinator_communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coordinator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN (
        'announcement', 'reminder', 'appreciation', 'concern_alert', 
        'parent_update', 'teacher_coordination', 'student_motivation'
    )),
    target_audience VARCHAR(50) NOT NULL CHECK (target_audience IN (
        'specific_students', 'grade_level', 'section', 'parents', 'teachers', 'mixed'
    )),
    recipient_ids UUID[], -- Array of recipient user IDs
    recipient_count INTEGER DEFAULT 0,
    subject VARCHAR(255) NOT NULL,
    message_content TEXT NOT NULL,
    delivery_method VARCHAR(30) DEFAULT 'in_app' CHECK (delivery_method IN ('in_app', 'email', 'sms', 'whatsapp')),
    priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'urgent')),
    scheduled_send TIMESTAMPTZ, -- NULL for immediate send
    sent_at TIMESTAMPTZ,
    delivery_status VARCHAR(30) DEFAULT 'draft' CHECK (delivery_status IN ('draft', 'scheduled', 'sent', 'delivered', 'failed')),
    read_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    tags TEXT[], -- For organization and search
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for coordinator communications
CREATE INDEX idx_coordinator_comms_coordinator_id ON public.coordinator_communications(coordinator_id);
CREATE INDEX idx_coordinator_comms_type ON public.coordinator_communications(communication_type);
CREATE INDEX idx_coordinator_comms_audience ON public.coordinator_communications(target_audience);
CREATE INDEX idx_coordinator_comms_status ON public.coordinator_communications(delivery_status);
CREATE INDEX idx_coordinator_comms_sent_at ON public.coordinator_communications(sent_at);
CREATE INDEX idx_coordinator_comms_tags ON public.coordinator_communications USING GIN(tags);

-- ------------------------------------------------------------------------------------------------
-- 5. COORDINATOR_ANALYTICS - Performance insights and trend analysis
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.coordinator_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coordinator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN (
        'grade_performance', 'attendance_trends', 'homework_completion', 
        'doubt_patterns', 'engagement_metrics', 'improvement_tracking'
    )),
    scope VARCHAR(30) NOT NULL CHECK (scope IN ('individual_student', 'section', 'grade_level', 'subject', 'school')),
    target_id VARCHAR(255), -- Can be student_id, grade_level, subject_id, etc.
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    metrics_data JSONB NOT NULL, -- Flexible metrics storage
    benchmark_data JSONB, -- Comparative benchmarks (school average, grade average)
    trend_analysis JSONB, -- Trend indicators (improving, declining, stable)
    ai_insights TEXT[], -- AI-generated insights about the data
    action_recommendations TEXT[], -- AI-suggested actions based on analysis
    red_flags JSONB, -- Critical issues requiring immediate attention
    positive_trends JSONB, -- Good trends to celebrate and reinforce
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for coordinator analytics
CREATE INDEX idx_coordinator_analytics_coordinator_id ON public.coordinator_analytics(coordinator_id);
CREATE INDEX idx_coordinator_analytics_type ON public.coordinator_analytics(analysis_type);
CREATE INDEX idx_coordinator_analytics_scope ON public.coordinator_analytics(scope);
CREATE INDEX idx_coordinator_analytics_period ON public.coordinator_analytics(period_start, period_end);
CREATE INDEX idx_coordinator_analytics_generated_at ON public.coordinator_analytics(generated_at);

-- ------------------------------------------------------------------------------------------------
-- 6. TEACHER_COORDINATOR_COLLABORATION - Communication between teachers and coordinators
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.teacher_coordinator_collaboration (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    coordinator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    collaboration_type VARCHAR(50) NOT NULL CHECK (collaboration_type IN (
        'student_concern', 'performance_discussion', 'intervention_planning', 
        'progress_update', 'resource_request', 'feedback_sharing'
    )),
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE, -- NULL for general discussions
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    discussion_title VARCHAR(255) NOT NULL,
    initial_message TEXT NOT NULL,
    teacher_notes TEXT,
    coordinator_response TEXT,
    action_items TEXT[],
    resolution_status VARCHAR(30) DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'escalated')),
    priority_level VARCHAR(20) DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
    follow_up_date DATE,
    resolved_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for teacher-coordinator collaboration
CREATE INDEX idx_teacher_coord_collab_teacher_id ON public.teacher_coordinator_collaboration(teacher_id);
CREATE INDEX idx_teacher_coord_collab_coordinator_id ON public.teacher_coordinator_collaboration(coordinator_id);
CREATE INDEX idx_teacher_coord_collab_student_id ON public.teacher_coordinator_collaboration(student_id);
CREATE INDEX idx_teacher_coord_collab_type ON public.teacher_coordinator_collaboration(collaboration_type);
CREATE INDEX idx_teacher_coord_collab_status ON public.teacher_coordinator_collaboration(resolution_status);
CREATE INDEX idx_teacher_coord_collab_priority ON public.teacher_coordinator_collaboration(priority_level);

-- ------------------------------------------------------------------------------------------------
-- 7. COORDINATOR_ALERTS - Automated and manual alert system
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.coordinator_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coordinator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'attendance_drop', 'grade_decline', 'homework_pattern', 'doubt_spike',
        'teacher_concern', 'parent_request', 'system_notification', 'deadline_reminder'
    )),
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('info', 'warning', 'high', 'critical')),
    alert_title VARCHAR(255) NOT NULL,
    alert_message TEXT NOT NULL,
    related_student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    related_teacher_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    related_assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
    auto_generated BOOLEAN DEFAULT false,
    trigger_data JSONB, -- Data that triggered this alert
    action_required BOOLEAN DEFAULT true,
    action_taken TEXT,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ, -- For temporary alerts
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for coordinator alerts
CREATE INDEX idx_coordinator_alerts_coordinator_id ON public.coordinator_alerts(coordinator_id);
CREATE INDEX idx_coordinator_alerts_type ON public.coordinator_alerts(alert_type);
CREATE INDEX idx_coordinator_alerts_severity ON public.coordinator_alerts(severity_level);
CREATE INDEX idx_coordinator_alerts_student_id ON public.coordinator_alerts(related_student_id);
CREATE INDEX idx_coordinator_alerts_resolved ON public.coordinator_alerts(is_resolved);
CREATE INDEX idx_coordinator_alerts_acknowledged ON public.coordinator_alerts(acknowledged);
CREATE INDEX idx_coordinator_alerts_auto ON public.coordinator_alerts(auto_generated);

-- ------------------------------------------------------------------------------------------------
-- 8. COORDINATOR_DASHBOARD_WIDGETS - Customizable dashboard configuration
-- ------------------------------------------------------------------------------------------------
CREATE TABLE public.coordinator_dashboard_widgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coordinator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL CHECK (widget_type IN (
        'kpi_summary', 'support_categories_chart', 'recent_interventions', 
        'teacher_updates', 'upcoming_reviews', 'grade_performance', 'attendance_overview'
    )),
    widget_title VARCHAR(255) NOT NULL,
    widget_config JSONB NOT NULL, -- Configuration like filters, date ranges, etc.
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4, -- Grid width (1-12)
    height INTEGER DEFAULT 3, -- Grid height in units
    is_visible BOOLEAN DEFAULT true,
    refresh_interval INTEGER DEFAULT 300, -- Seconds between auto-refresh
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique widget positions per coordinator
    CONSTRAINT unique_coordinator_widget_position UNIQUE (coordinator_id, position_x, position_y)
);

-- Indexes for dashboard widgets
CREATE INDEX idx_dashboard_widgets_coordinator_id ON public.coordinator_dashboard_widgets(coordinator_id);
CREATE INDEX idx_dashboard_widgets_type ON public.coordinator_dashboard_widgets(widget_type);
CREATE INDEX idx_dashboard_widgets_visible ON public.coordinator_dashboard_widgets(is_visible);

-- ================================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR COORDINATOR TABLES
-- ================================================================================================

-- Enable RLS on all coordinator tables
ALTER TABLE public.coordinator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_intervention_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_coordinator_collaboration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coordinator_dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------------------------
-- COORDINATOR ASSIGNMENTS RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Coordinators can manage their own assignments" ON public.coordinator_assignments
FOR ALL USING (
    coordinator_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'coordinator')
);

-- Allow principals to view coordinator assignments in their school
CREATE POLICY "Principals can view coordinator assignments in their school" ON public.coordinator_assignments
FOR SELECT USING (
    school_id IN (
        SELECT school_id FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'principal'
    )
);

-- ------------------------------------------------------------------------------------------------
-- STUDENT SUPPORT CATEGORIES RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Coordinators can manage support categories for their students" ON public.student_support_categories
FOR ALL USING (
    coordinator_id = auth.uid() AND
    student_id IN (
        SELECT DISTINCT up.id FROM public.user_profiles up
        JOIN public.coordinator_assignments ca ON (
            up.grade_level = ca.grade_level AND 
            (ca.section IS NULL OR up.section = ca.section)
        )
        WHERE ca.coordinator_id = auth.uid() AND ca.is_active = true
        AND up.role = 'student'
    )
);

-- Allow teachers to view support categories for students in their classes
CREATE POLICY "Teachers can view support categories for their students" ON public.student_support_categories
FOR SELECT USING (
    student_id IN (
        SELECT DISTINCT sce.student_id FROM public.student_class_enrollment sce
        JOIN public.teacher_classes tc ON sce.teacher_class_id = tc.id
        WHERE tc.teacher_id = auth.uid() AND sce.is_active = true
    ) AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- ------------------------------------------------------------------------------------------------
-- STUDENT INTERVENTION LOG RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Coordinators can manage intervention logs for their students" ON public.student_intervention_log
FOR ALL USING (
    coordinator_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'coordinator')
);

-- Allow teachers to view interventions related to their students
CREATE POLICY "Teachers can view interventions for their students" ON public.student_intervention_log
FOR SELECT USING (
    student_id IN (
        SELECT DISTINCT sce.student_id FROM public.student_class_enrollment sce
        JOIN public.teacher_classes tc ON sce.teacher_class_id = tc.id
        WHERE tc.teacher_id = auth.uid() AND sce.is_active = true
    ) AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'teacher')
);

-- ------------------------------------------------------------------------------------------------
-- COORDINATOR COMMUNICATIONS RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Coordinators can manage their own communications" ON public.coordinator_communications
FOR ALL USING (
    coordinator_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'coordinator')
);

-- Allow recipients to view communications sent to them
CREATE POLICY "Users can view communications sent to them" ON public.coordinator_communications
FOR SELECT USING (
    auth.uid() = ANY(recipient_ids)
);

-- ------------------------------------------------------------------------------------------------
-- COORDINATOR ANALYTICS RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Coordinators can manage their own analytics" ON public.coordinator_analytics
FOR ALL USING (
    coordinator_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'coordinator')
);

-- ------------------------------------------------------------------------------------------------
-- TEACHER COORDINATOR COLLABORATION RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Teachers and coordinators can manage their collaborations" ON public.teacher_coordinator_collaboration
FOR ALL USING (
    teacher_id = auth.uid() OR coordinator_id = auth.uid()
);

-- ------------------------------------------------------------------------------------------------
-- COORDINATOR ALERTS RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Coordinators can manage their own alerts" ON public.coordinator_alerts
FOR ALL USING (
    coordinator_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'coordinator')
);

-- ------------------------------------------------------------------------------------------------
-- COORDINATOR DASHBOARD WIDGETS RLS POLICIES
-- ------------------------------------------------------------------------------------------------
CREATE POLICY "Coordinators can manage their own dashboard widgets" ON public.coordinator_dashboard_widgets
FOR ALL USING (
    coordinator_id = auth.uid() AND
    auth.uid() IN (SELECT id FROM public.user_profiles WHERE role = 'coordinator')
);

-- ================================================================================================
-- FUNCTIONS AND TRIGGERS FOR COORDINATOR PHASE
-- ================================================================================================

-- Function to update coordinator assignment student counts
CREATE OR REPLACE FUNCTION update_coordinator_assignment_student_count()
RETURNS TRIGGER AS $$
DECLARE
    coord_assignment RECORD;
BEGIN
    -- Update student counts for all relevant coordinator assignments
    FOR coord_assignment IN (
        SELECT ca.id FROM public.coordinator_assignments ca
        WHERE ca.grade_level = COALESCE(NEW.grade_level, OLD.grade_level)
        AND (ca.section IS NULL OR ca.section = COALESCE(NEW.section, OLD.section))
        AND ca.is_active = true
    ) LOOP
        UPDATE public.coordinator_assignments 
        SET student_count = (
            SELECT COUNT(*) FROM public.user_profiles up
            WHERE up.role = 'student' 
            AND up.grade_level = coord_assignment.id
            AND (coord_assignment.section IS NULL OR up.section = coord_assignment.section)
        ),
        updated_at = NOW()
        WHERE id = coord_assignment.id;
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-detect students needing support (AI-powered categorization)
CREATE OR REPLACE FUNCTION auto_detect_support_needs()
RETURNS VOID AS $$
DECLARE
    student_record RECORD;
    coordinator_record RECORD;
    support_needed TEXT[];
    avg_completion_rate DECIMAL;
    recent_score_trend DECIMAL;
    doubt_frequency INTEGER;
BEGIN
    -- Loop through all active students
    FOR student_record IN (
        SELECT up.id, up.grade_level, up.section, up.school_id
        FROM public.user_profiles up
        WHERE up.role = 'student' AND up.is_active = true
    ) LOOP
        
        -- Find the coordinator for this student
        SELECT * INTO coordinator_record
        FROM public.coordinator_assignments ca
        WHERE ca.grade_level = student_record.grade_level
        AND (ca.section IS NULL OR ca.section = student_record.section)
        AND ca.school_id = student_record.school_id
        AND ca.is_active = true
        LIMIT 1;
        
        IF coordinator_record.id IS NOT NULL THEN
            support_needed := ARRAY[]::TEXT[];
            
            -- Check homework completion rate (last 30 days)
            SELECT COALESCE(
                (COUNT(CASE WHEN aa.status = 'completed' THEN 1 END)::DECIMAL / 
                 NULLIF(COUNT(*), 0)) * 100, 0
            ) INTO avg_completion_rate
            FROM public.assignment_attempts aa
            JOIN public.assignments a ON aa.assignment_id = a.id
            WHERE aa.student_id = student_record.id
            AND aa.created_at >= NOW() - INTERVAL '30 days';
            
            -- Check recent score trend (last 10 assignments)
            SELECT COALESCE(AVG(aa.percentage_score), 0) INTO recent_score_trend
            FROM (
                SELECT aa.percentage_score
                FROM public.assignment_attempts aa
                WHERE aa.student_id = student_record.id
                AND aa.status = 'completed'
                ORDER BY aa.submitted_at DESC
                LIMIT 10
            ) aa;
            
            -- Check doubt frequency (last 30 days)
            SELECT COUNT(*) INTO doubt_frequency
            FROM public.doubts d
            WHERE d.student_id = student_record.id
            AND d.created_at >= NOW() - INTERVAL '30 days';
            
            -- Determine support categories needed
            IF avg_completion_rate < 60 THEN
                support_needed := array_append(support_needed, 'homework_guidance');
            END IF;
            
            IF recent_score_trend < 65 THEN
                support_needed := array_append(support_needed, 'academic_support');
            END IF;
            
            IF avg_completion_rate < 40 THEN
                support_needed := array_append(support_needed, 'engagement_boost');
            END IF;
            
            IF doubt_frequency > 10 THEN
                support_needed := array_append(support_needed, 'confidence_building');
            END IF;
            
            -- Insert support categories if any were identified
            IF array_length(support_needed, 1) > 0 THEN
                INSERT INTO public.student_support_categories (
                    student_id, coordinator_id, support_type, priority_level,
                    category_reason, ai_detected, auto_metrics
                )
                SELECT 
                    student_record.id,
                    coordinator_record.coordinator_id,
                    unnest(support_needed),
                    CASE 
                        WHEN avg_completion_rate < 30 OR recent_score_trend < 50 THEN 'high'
                        WHEN avg_completion_rate < 50 OR recent_score_trend < 65 THEN 'medium'
                        ELSE 'low'
                    END,
                    'Auto-detected based on performance patterns',
                    true,
                    jsonb_build_object(
                        'completion_rate', avg_completion_rate,
                        'recent_score_trend', recent_score_trend,
                        'doubt_frequency', doubt_frequency,
                        'analysis_date', CURRENT_DATE
                    )
                ON CONFLICT (student_id, support_type, coordinator_id) 
                DO UPDATE SET
                    auto_metrics = EXCLUDED.auto_metrics,
                    updated_at = NOW();
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate coordinator alerts based on patterns
CREATE OR REPLACE FUNCTION generate_coordinator_alerts()
RETURNS VOID AS $$
DECLARE
    alert_record RECORD;
BEGIN
    -- Alert for students with multiple high-priority support needs
    INSERT INTO public.coordinator_alerts (
        coordinator_id, alert_type, severity_level, alert_title, alert_message,
        related_student_id, auto_generated, trigger_data
    )
    SELECT DISTINCT
        ssc.coordinator_id,
        'system_notification',
        'high',
        'Multiple Support Needs Detected',
        'Student ' || up.full_name || ' has been flagged for multiple support categories requiring attention.',
        ssc.student_id,
        true,
        jsonb_build_object(
            'support_count', support_count,
            'categories', support_categories,
            'generated_at', NOW()
        )
    FROM (
        SELECT 
            student_id, 
            coordinator_id,
            COUNT(*) as support_count,
            array_agg(support_type) as support_categories
        FROM public.student_support_categories
        WHERE current_status = 'active' AND priority_level = 'high'
        GROUP BY student_id, coordinator_id
        HAVING COUNT(*) >= 3
    ) ssc
    JOIN public.user_profiles up ON ssc.student_id = up.id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.coordinator_alerts ca
        WHERE ca.related_student_id = ssc.student_id
        AND ca.alert_type = 'system_notification'
        AND ca.created_at >= CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate coordinator KPIs
CREATE OR REPLACE FUNCTION calculate_coordinator_kpis(p_coordinator_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_students INTEGER;
    avg_homework_completion DECIMAL;
    total_doubts INTEGER;
    support_students INTEGER;
    attendance_rate DECIMAL;
BEGIN
    -- Get total students under coordinator
    SELECT COUNT(DISTINCT up.id) INTO total_students
    FROM public.user_profiles up
    JOIN public.coordinator_assignments ca ON (
        up.grade_level = ca.grade_level AND
        (ca.section IS NULL OR up.section = ca.section)
    )
    WHERE ca.coordinator_id = p_coordinator_id 
    AND ca.is_active = true
    AND up.role = 'student';
    
    -- Calculate average homework completion rate
    SELECT COALESCE(
        AVG(CASE WHEN aa.status = 'completed' THEN 100.0 ELSE 0.0 END), 0
    ) INTO avg_homework_completion
    FROM public.assignment_attempts aa
    JOIN public.user_profiles up ON aa.student_id = up.id
    JOIN public.coordinator_assignments ca ON (
        up.grade_level = ca.grade_level AND
        (ca.section IS NULL OR up.section = ca.section)
    )
    WHERE ca.coordinator_id = p_coordinator_id
    AND aa.created_at BETWEEN p_start_date AND p_end_date;
    
    -- Count total doubts raised
    SELECT COUNT(*) INTO total_doubts
    FROM public.doubts d
    JOIN public.user_profiles up ON d.student_id = up.id
    JOIN public.coordinator_assignments ca ON (
        up.grade_level = ca.grade_level AND
        (ca.section IS NULL OR up.section = ca.section)
    )
    WHERE ca.coordinator_id = p_coordinator_id
    AND d.created_at BETWEEN p_start_date AND p_end_date;
    
    -- Count students in support categories
    SELECT COUNT(DISTINCT student_id) INTO support_students
    FROM public.student_support_categories
    WHERE coordinator_id = p_coordinator_id
    AND current_status = 'active';
    
    -- Build result JSON
    result := jsonb_build_object(
        'total_students', total_students,
        'avg_homework_completion', ROUND(avg_homework_completion, 2),
        'total_doubts', total_doubts,
        'students_needing_support', support_students,
        'support_percentage', CASE 
            WHEN total_students > 0 THEN ROUND((support_students::DECIMAL / total_students) * 100, 2)
            ELSE 0
        END,
        'calculation_period', jsonb_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        ),
        'calculated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ================================================================================================
-- SCHEDULED TASKS AND AUTOMATION (Optional - requires pg_cron extension)
-- ================================================================================================

-- Note: These require the pg_cron extension to be enabled in Supabase
-- Uncomment if you want automated daily analysis

/*
-- Schedule daily support needs detection (runs at 6 AM daily)
SELECT cron.schedule('daily-support-detection', '0 6 * * *', 'SELECT auto_detect_support_needs();');

-- Schedule daily alert generation (runs at 7 AM daily)
SELECT cron.schedule('daily-alert-generation', '0 7 * * *', 'SELECT generate_coordinator_alerts();');
*/

-- ================================================================================================
-- SAMPLE DATA FOR TESTING (Optional)
-- ================================================================================================

-- Function to create sample coordinator data
CREATE OR REPLACE FUNCTION create_coordinator_sample_data()
RETURNS TEXT AS $$
DECLARE
    sample_coordinator_id UUID;
    sample_school_id UUID;
    sample_student_id UUID;
BEGIN
    -- Get sample coordinator, school, and student
    SELECT id INTO sample_coordinator_id FROM public.user_profiles WHERE role = 'coordinator' LIMIT 1;
    SELECT id INTO sample_school_id FROM public.schools LIMIT 1;
    SELECT id INTO sample_student_id FROM public.user_profiles WHERE role = 'student' LIMIT 1;
    
    IF sample_coordinator_id IS NULL THEN
        RETURN 'No coordinator found. Please create a coordinator user first.';
    END IF;
    
    IF sample_school_id IS NULL OR sample_student_id IS NULL THEN
        RETURN 'No school or student found. Please create sample data first.';
    END IF;
    
    -- Create sample coordinator assignment
    INSERT INTO public.coordinator_assignments (
        coordinator_id, grade_level, section, school_id, student_count
    ) VALUES (
        sample_coordinator_id, 'Grade 10', 'A', sample_school_id, 25
    ) ON CONFLICT DO NOTHING;
    
    -- Create sample support category
    INSERT INTO public.student_support_categories (
        student_id, coordinator_id, support_type, priority_level,
        category_reason, ai_detected, auto_metrics
    ) VALUES (
        sample_student_id, sample_coordinator_id, 'academic_support', 'medium',
        'Recent decline in mathematics performance',
        true,
        '{"completion_rate": 45, "recent_score_trend": 58, "analysis_date": "2024-12-01"}'::jsonb
    ) ON CONFLICT DO NOTHING;
    
    RETURN 'Sample coordinator data created successfully!';
END;
$$ LANGUAGE plpgsql;

-- Uncomment to create sample data:
-- SELECT create_coordinator_sample_data();

-- ================================================================================================
-- SCHEMA VALIDATION FOR COORDINATOR PHASE
-- ================================================================================================

-- Verify all coordinator tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    coordinator_tables TEXT[] := ARRAY[
        'coordinator_assignments', 'student_support_categories', 'student_intervention_log',
        'coordinator_communications', 'coordinator_analytics', 'teacher_coordinator_collaboration',
        'coordinator_alerts', 'coordinator_dashboard_widgets'
    ];
    missing_tables TEXT := '';
    table_name TEXT;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY(coordinator_tables);
    
    -- Check for missing tables
    FOREACH table_name IN ARRAY coordinator_tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := missing_tables || table_name || ', ';
        END IF;
    END LOOP;
    
    IF table_count = 8 THEN
        RAISE NOTICE '🎉 SUCCESS: All 8 Coordinator Phase tables created successfully!';
        RAISE NOTICE '📋 Tables created: %', array_to_string(coordinator_tables, ', ');
        RAISE NOTICE '🔒 RLS policies applied to all tables';
        RAISE NOTICE '⚡ Functions and triggers configured';
        RAISE NOTICE '🤖 AI-powered support detection functions ready';
        RAISE NOTICE '✅ Coordinator Phase schema is ready to use!';
    ELSE
        RAISE NOTICE '⚠️ WARNING: Only % out of 8 Coordinator Phase tables were created.', table_count;
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
🚀 COORDINATOR PHASE SCHEMA DEPLOYMENT INSTRUCTIONS:

1. PREREQUISITES:
   - Student Phase schema must be applied first (11 tables)
   - Teacher Phase schema must be applied second (9 tables)
   - Ensure you have at least one coordinator user in 'user_profiles' table

2. APPLY THIS SCHEMA:
   - Copy and paste this entire SQL script into your Supabase SQL Editor
   - Execute the script (it will take a few moments)
   - Look for the success message at the end

3. VERIFICATION:
   - Check that all 8 new tables are listed in your database
   - Verify RLS policies are enabled
   - Test the AI functions using: SELECT auto_detect_support_needs();

4. AI-POWERED FEATURES:
   - auto_detect_support_needs(): Analyzes student performance and flags support needs
   - generate_coordinator_alerts(): Creates alerts for concerning patterns
   - calculate_coordinator_kpis(): Provides coordinator dashboard metrics

5. SOFT TERMINOLOGY:
   - Instead of "at-risk", uses supportive categories like "academic_support", "engagement_boost"
   - Focus on positive interventions and growth opportunities
   - Emphasizes support rather than problems

📊 TOTAL SCHEMA STATS:
- Student Phase: 11 tables
- Teacher Phase: 9 tables  
- Coordinator Phase: 8 tables
- Combined: 28 tables total
- All with comprehensive RLS policies, AI functions, and optimized indexes
*/

-- ================================================================================================
-- END OF COORDINATOR PHASE SCHEMA
-- ================================================================================================