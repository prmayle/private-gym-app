-- 1. Add a new column referencing package_types
ALTER TABLE bookings
ADD COLUMN package_type_id UUID NOT NULL;

-- 3. Add foreign key constraint
ALTER TABLE bookings
ADD CONSTRAINT fk_package_type
FOREIGN KEY (package_type_id)
REFERENCES package_types(id)
ON DELETE RESTRICT;  -- or CASCADE depending on your use case
