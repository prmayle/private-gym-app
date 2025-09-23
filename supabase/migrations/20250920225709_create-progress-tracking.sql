CREATE TABLE progress_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL,
    weight NUMERIC,
    body_fat_percentage NUMERIC,
    muscle_mass NUMERIC,
    measurement_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT fk_member
        FOREIGN KEY (member_id) REFERENCES members(id)
        ON DELETE CASCADE
);
