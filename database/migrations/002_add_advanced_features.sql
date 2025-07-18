-- Migration: 002_add_advanced_features.sql
-- Description: Add advanced features like workflow automation, batch processing, and quality control
-- Author: DevOps Team
-- Date: 2024-01-15
-- Version: 1.1.0

-- Create additional types
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE batch_status AS ENUM ('created', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE qc_status AS ENUM ('pending', 'passed', 'failed', 'requires_review');
CREATE TYPE equipment_status AS ENUM ('available', 'in_use', 'maintenance', 'out_of_service');

-- Workflow templates table
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    test_type test_type NOT NULL,
    steps JSONB NOT NULL,
    estimated_duration INTEGER, -- in minutes
    required_equipment TEXT[],
    required_reagents TEXT[],
    sop_reference VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system',
    version_number INTEGER DEFAULT 1
);

-- Workflow instances table
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    batch_id UUID,
    status workflow_status NOT NULL DEFAULT 'draft',
    current_step INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES users(id),
    step_data JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Batch processing table
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    batch_type VARCHAR(50) NOT NULL,
    description TEXT,
    status batch_status NOT NULL DEFAULT 'created',
    sample_count INTEGER DEFAULT 0,
    processing_date DATE,
    equipment_used TEXT[],
    reagent_lots TEXT[],
    operator_id UUID REFERENCES users(id),
    qc_status qc_status DEFAULT 'pending',
    qc_performed_by UUID REFERENCES users(id),
    qc_performed_at TIMESTAMP WITH TIME ZONE,
    qc_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Equipment table
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    equipment_type VARCHAR(50) NOT NULL,
    location VARCHAR(200),
    status equipment_status NOT NULL DEFAULT 'available',
    calibration_date DATE,
    next_calibration_date DATE,
    maintenance_schedule VARCHAR(100),
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    specifications JSONB,
    operating_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Reagents and consumables table
CREATE TABLE reagents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reagent_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    manufacturer VARCHAR(100),
    catalog_number VARCHAR(100),
    lot_number VARCHAR(100),
    expiration_date DATE,
    storage_conditions VARCHAR(200),
    quantity_on_hand DECIMAL(10,2),
    unit VARCHAR(20),
    minimum_stock_level DECIMAL(10,2),
    cost_per_unit DECIMAL(10,2),
    supplier VARCHAR(200),
    received_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    msds_file_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Quality control samples table
CREATE TABLE qc_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qc_sample_id VARCHAR(100) UNIQUE NOT NULL,
    sample_type VARCHAR(50) NOT NULL,
    qc_type VARCHAR(50) NOT NULL, -- positive_control, negative_control, blank, etc.
    expected_results JSONB,
    actual_results JSONB,
    test_date DATE NOT NULL,
    batch_id UUID REFERENCES batches(id),
    status qc_status NOT NULL DEFAULT 'pending',
    performed_by UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    deviation_notes TEXT,
    corrective_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'system',
    updated_by VARCHAR(50) DEFAULT 'system'
);

-- Sample tracking events table
CREATE TABLE sample_tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(200),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    equipment_id UUID REFERENCES equipment(id),
    performed_by UUID REFERENCES users(id),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    priority priority_level NOT NULL DEFAULT 'normal',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    action_url VARCHAR(500),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sample aliquots table
CREATE TABLE sample_aliquots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_sample_id UUID NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    aliquot_id VARCHAR(100) UNIQUE NOT NULL,
    volume DECIMAL(8,2) NOT NULL,
    unit VARCHAR(10) DEFAULT 'mL',
    concentration DECIMAL(10,4),
    concentration_unit VARCHAR(20),
    storage_location VARCHAR(200),
    storage_conditions VARCHAR(200),
    created_date DATE NOT NULL,
    created_by_user UUID REFERENCES users(id),
    is_consumed BOOLEAN DEFAULT FALSE,
    consumed_date DATE,
    consumed_by UUID REFERENCES users(id),
    purpose TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for new tables
CREATE INDEX idx_workflow_templates_test_type ON workflow_templates(test_type);
CREATE INDEX idx_workflow_templates_is_active ON workflow_templates(is_active);

CREATE INDEX idx_workflow_instances_template_id ON workflow_instances(workflow_template_id);
CREATE INDEX idx_workflow_instances_sample_id ON workflow_instances(sample_id);
CREATE INDEX idx_workflow_instances_batch_id ON workflow_instances(batch_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_assigned_to ON workflow_instances(assigned_to);

CREATE INDEX idx_batches_batch_number ON batches(batch_number);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_processing_date ON batches(processing_date);
CREATE INDEX idx_batches_operator_id ON batches(operator_id);
CREATE INDEX idx_batches_qc_status ON batches(qc_status);

CREATE INDEX idx_equipment_equipment_id ON equipment(equipment_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_equipment_type ON equipment(equipment_type);
CREATE INDEX idx_equipment_location ON equipment(location);
CREATE INDEX idx_equipment_calibration_date ON equipment(calibration_date);
CREATE INDEX idx_equipment_maintenance_date ON equipment(next_maintenance_date);

CREATE INDEX idx_reagents_reagent_id ON reagents(reagent_id);
CREATE INDEX idx_reagents_lot_number ON reagents(lot_number);
CREATE INDEX idx_reagents_expiration_date ON reagents(expiration_date);
CREATE INDEX idx_reagents_is_active ON reagents(is_active);

CREATE INDEX idx_qc_samples_qc_sample_id ON qc_samples(qc_sample_id);
CREATE INDEX idx_qc_samples_batch_id ON qc_samples(batch_id);
CREATE INDEX idx_qc_samples_status ON qc_samples(status);
CREATE INDEX idx_qc_samples_test_date ON qc_samples(test_date);

CREATE INDEX idx_sample_tracking_events_sample_id ON sample_tracking_events(sample_id);
CREATE INDEX idx_sample_tracking_events_event_type ON sample_tracking_events(event_type);
CREATE INDEX idx_sample_tracking_events_timestamp ON sample_tracking_events(event_timestamp);

CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_sample_aliquots_parent_sample_id ON sample_aliquots(parent_sample_id);
CREATE INDEX idx_sample_aliquots_aliquot_id ON sample_aliquots(aliquot_id);
CREATE INDEX idx_sample_aliquots_is_consumed ON sample_aliquots(is_consumed);

-- Create GIN indexes for JSONB columns
CREATE INDEX idx_workflow_templates_steps_gin ON workflow_templates USING gin(steps);
CREATE INDEX idx_workflow_instances_step_data_gin ON workflow_instances USING gin(step_data);
CREATE INDEX idx_equipment_specifications_gin ON equipment USING gin(specifications);
CREATE INDEX idx_qc_samples_expected_results_gin ON qc_samples USING gin(expected_results);
CREATE INDEX idx_qc_samples_actual_results_gin ON qc_samples USING gin(actual_results);
CREATE INDEX idx_sample_tracking_events_metadata_gin ON sample_tracking_events USING gin(metadata);

-- Add foreign key for batch_id in workflow_instances
ALTER TABLE workflow_instances ADD CONSTRAINT fk_workflow_instances_batch_id 
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;

-- Add audit triggers for new tables
CREATE TRIGGER workflow_templates_audit_trigger
    BEFORE INSERT OR UPDATE ON workflow_templates
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER workflow_instances_audit_trigger
    BEFORE INSERT OR UPDATE ON workflow_instances
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER batches_audit_trigger
    BEFORE INSERT OR UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER equipment_audit_trigger
    BEFORE INSERT OR UPDATE ON equipment
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER reagents_audit_trigger
    BEFORE INSERT OR UPDATE ON reagents
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER qc_samples_audit_trigger
    BEFORE INSERT OR UPDATE ON qc_samples
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Create additional views
CREATE VIEW v_active_workflows AS
SELECT 
    wi.id,
    wi.sample_id,
    s.sample_id as sample_identifier,
    wt.name as workflow_name,
    wi.status,
    wi.current_step,
    wi.started_at,
    wi.assigned_to,
    u.first_name || ' ' || u.last_name as assigned_to_name,
    c.name as client_name
FROM workflow_instances wi
JOIN workflow_templates wt ON wi.workflow_template_id = wt.id
JOIN samples s ON wi.sample_id = s.id
JOIN clients c ON s.client_id = c.id
LEFT JOIN users u ON wi.assigned_to = u.id
WHERE wi.status IN ('active', 'paused')
ORDER BY wi.started_at ASC;

CREATE VIEW v_equipment_maintenance_schedule AS
SELECT 
    e.id,
    e.equipment_id,
    e.name,
    e.equipment_type,
    e.location,
    e.status,
    e.last_maintenance_date,
    e.next_maintenance_date,
    e.next_calibration_date,
    CASE 
        WHEN e.next_maintenance_date < CURRENT_DATE THEN 'overdue'
        WHEN e.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
        ELSE 'scheduled'
    END as maintenance_status,
    CASE 
        WHEN e.next_calibration_date < CURRENT_DATE THEN 'overdue'
        WHEN e.next_calibration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
        ELSE 'scheduled'
    END as calibration_status
FROM equipment e
WHERE e.status != 'out_of_service'
ORDER BY e.next_maintenance_date ASC;

CREATE VIEW v_reagent_inventory AS
SELECT 
    r.id,
    r.reagent_id,
    r.name,
    r.manufacturer,
    r.lot_number,
    r.quantity_on_hand,
    r.unit,
    r.minimum_stock_level,
    r.expiration_date,
    CASE 
        WHEN r.expiration_date < CURRENT_DATE THEN 'expired'
        WHEN r.expiration_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expires_soon'
        ELSE 'valid'
    END as expiration_status,
    CASE 
        WHEN r.quantity_on_hand <= r.minimum_stock_level THEN 'low_stock'
        WHEN r.quantity_on_hand <= r.minimum_stock_level * 1.5 THEN 'monitor'
        ELSE 'adequate'
    END as stock_status
FROM reagents r
WHERE r.is_active = TRUE
ORDER BY r.expiration_date ASC;

CREATE VIEW v_batch_qc_summary AS
SELECT 
    b.id,
    b.batch_number,
    b.batch_type,
    b.status,
    b.sample_count,
    b.processing_date,
    b.qc_status,
    u1.first_name || ' ' || u1.last_name as operator_name,
    u2.first_name || ' ' || u2.last_name as qc_performed_by_name,
    COUNT(qc.id) as qc_sample_count,
    COUNT(CASE WHEN qc.status = 'passed' THEN 1 END) as qc_passed_count,
    COUNT(CASE WHEN qc.status = 'failed' THEN 1 END) as qc_failed_count,
    COUNT(CASE WHEN qc.status = 'requires_review' THEN 1 END) as qc_review_count
FROM batches b
LEFT JOIN users u1 ON b.operator_id = u1.id
LEFT JOIN users u2 ON b.qc_performed_by = u2.id
LEFT JOIN qc_samples qc ON b.id = qc.batch_id
GROUP BY b.id, b.batch_number, b.batch_type, b.status, b.sample_count, b.processing_date, b.qc_status, u1.first_name, u1.last_name, u2.first_name, u2.last_name
ORDER BY b.processing_date DESC;

-- Create stored procedures for advanced features
CREATE OR REPLACE FUNCTION create_batch_workflow(
    p_batch_id UUID,
    p_workflow_template_id UUID,
    p_created_by VARCHAR(50)
) RETURNS INTEGER AS $$
DECLARE
    sample_record RECORD;
    workflow_count INTEGER := 0;
BEGIN
    -- Create workflow instances for all samples in the batch
    FOR sample_record IN 
        SELECT s.id as sample_id 
        FROM samples s
        JOIN workflow_instances wi ON s.id = wi.sample_id
        WHERE wi.batch_id = p_batch_id
    LOOP
        INSERT INTO workflow_instances (
            workflow_template_id,
            sample_id,
            batch_id,
            status,
            created_by,
            updated_by
        ) VALUES (
            p_workflow_template_id,
            sample_record.sample_id,
            p_batch_id,
            'draft',
            p_created_by,
            p_created_by
        );
        
        workflow_count := workflow_count + 1;
    END LOOP;
    
    RETURN workflow_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION advance_workflow_step(
    p_workflow_instance_id UUID,
    p_step_data JSONB,
    p_updated_by VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
    current_step_num INTEGER;
    total_steps INTEGER;
    template_steps JSONB;
BEGIN
    -- Get current step and template information
    SELECT wi.current_step, wt.steps
    INTO current_step_num, template_steps
    FROM workflow_instances wi
    JOIN workflow_templates wt ON wi.workflow_template_id = wt.id
    WHERE wi.id = p_workflow_instance_id;
    
    -- Get total number of steps
    SELECT jsonb_array_length(template_steps) INTO total_steps;
    
    -- Update step data
    UPDATE workflow_instances 
    SET step_data = COALESCE(step_data, '{}'::jsonb) || p_step_data,
        updated_by = p_updated_by,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_workflow_instance_id;
    
    -- Advance to next step if not at the end
    IF current_step_num < total_steps THEN
        UPDATE workflow_instances 
        SET current_step = current_step_num + 1,
            updated_by = p_updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_workflow_instance_id;
    ELSE
        -- Mark as completed if at the last step
        UPDATE workflow_instances 
        SET status = 'completed',
            completed_at = CURRENT_TIMESTAMP,
            updated_by = p_updated_by,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_workflow_instance_id;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_reagent_expiration()
RETURNS TABLE (
    reagent_id VARCHAR(100),
    name VARCHAR(200),
    expiration_date DATE,
    days_until_expiration INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.reagent_id,
        r.name,
        r.expiration_date,
        (r.expiration_date - CURRENT_DATE) as days_until_expiration
    FROM reagents r
    WHERE r.is_active = TRUE
    AND r.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
    ORDER BY r.expiration_date ASC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_sample_tracking_event(
    p_sample_id UUID,
    p_event_type VARCHAR(50),
    p_location VARCHAR(200),
    p_temperature DECIMAL(5,2),
    p_performed_by UUID,
    p_notes TEXT
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO sample_tracking_events (
        sample_id,
        event_type,
        location,
        temperature,
        performed_by,
        notes
    ) VALUES (
        p_sample_id,
        p_event_type,
        p_location,
        p_temperature,
        p_performed_by,
        p_notes
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Add constraints for new tables
ALTER TABLE workflow_instances ADD CONSTRAINT chk_workflow_current_step_positive CHECK (current_step > 0);
ALTER TABLE batches ADD CONSTRAINT chk_batch_sample_count_positive CHECK (sample_count >= 0);
ALTER TABLE reagents ADD CONSTRAINT chk_reagent_quantity_positive CHECK (quantity_on_hand >= 0);
ALTER TABLE reagents ADD CONSTRAINT chk_reagent_minimum_stock_positive CHECK (minimum_stock_level >= 0);
ALTER TABLE sample_aliquots ADD CONSTRAINT chk_aliquot_volume_positive CHECK (volume > 0);

-- Create notification triggers
CREATE OR REPLACE FUNCTION create_notification_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for sample status changes
    IF TG_TABLE_NAME = 'samples' AND NEW.status != OLD.status THEN
        INSERT INTO notifications (
            recipient_id,
            title,
            message,
            notification_type,
            related_entity_type,
            related_entity_id
        )
        SELECT 
            u.id,
            'Sample Status Changed',
            'Sample ' || NEW.sample_id || ' status changed from ' || OLD.status || ' to ' || NEW.status,
            'sample_status_change',
            'sample',
            NEW.id
        FROM users u
        WHERE u.role IN ('admin', 'technician')
        AND u.is_active = TRUE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sample_notification_trigger
    AFTER UPDATE ON samples
    FOR EACH ROW
    EXECUTE FUNCTION create_notification_trigger();

-- Record this migration
INSERT INTO schema_migrations (version, description, checksum) VALUES 
('002', 'Add advanced features like workflow automation, batch processing, and quality control', md5('002_add_advanced_features.sql'));

COMMIT;