-- Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    requestor_id UUID REFERENCES auth.users(id),
    approver_id UUID REFERENCES auth.users(id),
    operation_id UUID REFERENCES wood_slicing_operations(id),
    notes TEXT
);

-- Create approval_rules table
CREATE TABLE IF NOT EXISTS approval_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    condition_type VARCHAR(50) NOT NULL,
    condition_value NUMERIC(10,2) NOT NULL,
    approver_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Add RLS policies
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_rules ENABLE ROW LEVEL SECURITY;

-- Policies for approval_requests
CREATE POLICY "Allow read access to all authenticated users" 
    ON approval_requests FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow insert for authenticated users" 
    ON approval_requests FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = requestor_id);

CREATE POLICY "Allow update for approvers" 
    ON approval_requests FOR UPDATE 
    TO authenticated 
    USING (
        auth.uid() IN (
            SELECT approver_id FROM approval_rules WHERE is_active = true
        ) OR 
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'ADMIN'
        )
    );

-- Policies for approval_rules
CREATE POLICY "Allow read access to all authenticated users" 
    ON approval_rules FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Allow all access to admins" 
    ON approval_rules FOR ALL 
    TO authenticated 
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'ADMIN'
        )
    );

-- Add necessary indexes
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_requestor ON approval_requests(requestor_id);
CREATE INDEX idx_approval_requests_operation ON approval_requests(operation_id);
CREATE INDEX idx_approval_rules_module ON approval_rules(module);
CREATE INDEX idx_approval_rules_approver ON approval_rules(approver_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_rules_updated_at
    BEFORE UPDATE ON approval_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 