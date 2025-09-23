-- 1. Add a new column referencing package_types
ALTER TABLE member_goals
ADD COLUMN member_id UUID NOT NULL;

-- 3. Add foreign key constraint
ALTER TABLE member_goals
ADD CONSTRAINT fk_member_goals
FOREIGN KEY (member_id)
REFERENCES members(id)
ON DELETE RESTRICT;  -- or CASCADE depending on your use case
