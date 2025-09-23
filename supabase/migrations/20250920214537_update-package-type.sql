-- 1. Drop the old package_type column if needed
ALTER TABLE packages
DROP COLUMN package_type;

-- 2. Add a new column referencing package_types
ALTER TABLE packages
ADD COLUMN package_type_id UUID NOT NULL;

-- 3. Add foreign key constraint
ALTER TABLE packages
ADD CONSTRAINT fk_package_type
FOREIGN KEY (package_type_id)
REFERENCES package_types(id)
ON DELETE RESTRICT;  -- or CASCADE depending on your use case
