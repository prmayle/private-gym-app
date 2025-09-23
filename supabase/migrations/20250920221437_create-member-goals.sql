CREATE TABLE member_goals (
    id SERIAL PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL,
    target_value NUMERIC(10,2) NOT NULL,
    current_value NUMERIC(10,2),
    target_unit VARCHAR(20),
    target_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
