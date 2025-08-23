-- RLS Policies for multi-tenant data isolation

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tenants policies
CREATE POLICY "Users can view their own tenant" ON tenants
    FOR SELECT USING (id = get_user_tenant_id());

CREATE POLICY "Users can update their own tenant" ON tenants
    FOR UPDATE USING (id = get_user_tenant_id());

-- User profiles policies
CREATE POLICY "Users can view profiles in their tenant" ON user_profiles
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Keywords policies
CREATE POLICY "Users can view keywords in their tenant" ON keywords
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert keywords in their tenant" ON keywords
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update keywords in their tenant" ON keywords
    FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete keywords in their tenant" ON keywords
    FOR DELETE USING (tenant_id = get_user_tenant_id());

-- Conversations policies
CREATE POLICY "Users can view conversations in their tenant" ON conversations
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert conversations in their tenant" ON conversations
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update conversations in their tenant" ON conversations
    FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete conversations in their tenant" ON conversations
    FOR DELETE USING (tenant_id = get_user_tenant_id());

-- Integrations policies
CREATE POLICY "Users can view integrations in their tenant" ON integrations
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert integrations in their tenant" ON integrations
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update integrations in their tenant" ON integrations
    FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete integrations in their tenant" ON integrations
    FOR DELETE USING (tenant_id = get_user_tenant_id());

-- Alerts policies
CREATE POLICY "Users can view alerts in their tenant" ON alerts
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert alerts in their tenant" ON alerts
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update alerts in their tenant" ON alerts
    FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete alerts in their tenant" ON alerts
    FOR DELETE USING (tenant_id = get_user_tenant_id());

-- Reports policies
CREATE POLICY "Users can view reports in their tenant" ON reports
    FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert reports in their tenant" ON reports
    FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update reports in their tenant" ON reports
    FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can delete reports in their tenant" ON reports
    FOR DELETE USING (tenant_id = get_user_tenant_id());