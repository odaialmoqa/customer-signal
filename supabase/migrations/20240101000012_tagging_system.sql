-- Tagging and Categorization System Migration
-- This migration creates the comprehensive tagging system for conversations

-- Create tags table for managing tag definitions
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280', -- Hex color code
    parent_tag_id UUID REFERENCES tags(id) ON DELETE SET NULL, -- For hierarchical tags
    usage_count INTEGER DEFAULT 0,
    is_system_tag BOOLEAN DEFAULT FALSE, -- System-generated vs user-created
    created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique tag names per tenant
    CONSTRAINT unique_tag_name_per_tenant UNIQUE (tenant_id, name)
);

-- Create conversation_tags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    tagged_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    tagged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confidence DECIMAL(3,2), -- For auto-suggested tags (0.00-1.00)
    is_auto_tagged BOOLEAN DEFAULT FALSE,
    
    -- Prevent duplicate tags on same conversation
    CONSTRAINT unique_conversation_tag UNIQUE (conversation_id, tag_id)
);

-- Create tag suggestions table for ML-based tag recommendations
CREATE TABLE IF NOT EXISTS tag_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) NOT NULL, -- Confidence score from ML model
    reason TEXT, -- Why this tag was suggested
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_suggestion UNIQUE (conversation_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tags_tenant_id ON tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tags_parent_tag_id ON tags(parent_tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag_id ON conversation_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tagged_at ON conversation_tags(tagged_at DESC);

CREATE INDEX IF NOT EXISTS idx_tag_suggestions_conversation_id ON tag_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tag_suggestions_confidence ON tag_suggestions(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_tag_suggestions_status ON tag_suggestions(status);

-- Create function to update tag usage count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags 
        SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags 
        SET usage_count = GREATEST(usage_count - 1, 0), updated_at = NOW()
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update tag usage counts
CREATE TRIGGER trigger_update_tag_usage_count
    AFTER INSERT OR DELETE ON conversation_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_usage_count();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tags table
CREATE TRIGGER trigger_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_suggestions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tags table
CREATE POLICY "Users can view tags from their tenant" ON tags
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create tags in their tenant" ON tags
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update tags in their tenant" ON tags
    FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete tags in their tenant" ON tags
    FOR DELETE USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid()));

-- Create RLS policies for conversation_tags table
CREATE POLICY "Users can view conversation tags from their tenant" ON conversation_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = conversation_tags.conversation_id 
            AND c.tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can create conversation tags in their tenant" ON conversation_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = conversation_tags.conversation_id 
            AND c.tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can update conversation tags in their tenant" ON conversation_tags
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = conversation_tags.conversation_id 
            AND c.tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can delete conversation tags in their tenant" ON conversation_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = conversation_tags.conversation_id 
            AND c.tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
        )
    );

-- Create RLS policies for tag_suggestions table
CREATE POLICY "Users can view tag suggestions from their tenant" ON tag_suggestions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = tag_suggestions.conversation_id 
            AND c.tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can create tag suggestions in their tenant" ON tag_suggestions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = tag_suggestions.conversation_id 
            AND c.tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "Users can update tag suggestions in their tenant" ON tag_suggestions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversations c 
            WHERE c.id = tag_suggestions.conversation_id 
            AND c.tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
        )
    );

-- Create view for tag hierarchy
CREATE OR REPLACE VIEW tag_hierarchy AS
WITH RECURSIVE tag_tree AS (
    -- Base case: root tags (no parent)
    SELECT 
        id,
        tenant_id,
        name,
        description,
        color,
        parent_tag_id,
        usage_count,
        is_system_tag,
        created_by,
        created_at,
        updated_at,
        0 as level,
        ARRAY[name] as path,
        name as root_name
    FROM tags 
    WHERE parent_tag_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child tags
    SELECT 
        t.id,
        t.tenant_id,
        t.name,
        t.description,
        t.color,
        t.parent_tag_id,
        t.usage_count,
        t.is_system_tag,
        t.created_by,
        t.created_at,
        t.updated_at,
        tt.level + 1,
        tt.path || t.name,
        tt.root_name
    FROM tags t
    INNER JOIN tag_tree tt ON t.parent_tag_id = tt.id
)
SELECT * FROM tag_tree;

-- Create function to get tag suggestions for a conversation
CREATE OR REPLACE FUNCTION get_tag_suggestions(conversation_id_param UUID)
RETURNS TABLE (
    tag_id UUID,
    tag_name VARCHAR(100),
    confidence DECIMAL(3,2),
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.tag_id,
        t.name as tag_name,
        ts.confidence,
        ts.reason
    FROM tag_suggestions ts
    JOIN tags t ON ts.tag_id = t.id
    WHERE ts.conversation_id = conversation_id_param
    AND ts.status = 'pending'
    ORDER BY ts.confidence DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to bulk tag conversations
CREATE OR REPLACE FUNCTION bulk_tag_conversations(
    conversation_ids UUID[],
    tag_ids UUID[],
    tagged_by_param UUID
)
RETURNS INTEGER AS $$
DECLARE
    conversation_id UUID;
    tag_id UUID;
    inserted_count INTEGER := 0;
BEGIN
    FOREACH conversation_id IN ARRAY conversation_ids
    LOOP
        FOREACH tag_id IN ARRAY tag_ids
        LOOP
            INSERT INTO conversation_tags (conversation_id, tag_id, tagged_by)
            VALUES (conversation_id, tag_id, tagged_by_param)
            ON CONFLICT (conversation_id, tag_id) DO NOTHING;
            
            IF FOUND THEN
                inserted_count := inserted_count + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert some default system tags
INSERT INTO tags (tenant_id, name, description, color, is_system_tag) 
SELECT 
    t.id as tenant_id,
    tag_data.name,
    tag_data.description,
    tag_data.color,
    true as is_system_tag
FROM tenants t
CROSS JOIN (
    VALUES 
        ('Bug Report', 'Issues and bugs reported by users', '#EF4444'),
        ('Feature Request', 'Requests for new features or improvements', '#3B82F6'),
        ('Complaint', 'Customer complaints and negative feedback', '#F59E0B'),
        ('Praise', 'Positive feedback and compliments', '#10B981'),
        ('Question', 'User questions and inquiries', '#8B5CF6'),
        ('Support', 'General support requests', '#6B7280'),
        ('Urgent', 'High priority items requiring immediate attention', '#DC2626'),
        ('Competitor Mention', 'Mentions of competitors', '#F97316'),
        ('Product Feedback', 'Feedback about specific products', '#06B6D4'),
        ('Service Feedback', 'Feedback about customer service', '#84CC16')
) AS tag_data(name, description, color)
ON CONFLICT (tenant_id, name) DO NOTHING;