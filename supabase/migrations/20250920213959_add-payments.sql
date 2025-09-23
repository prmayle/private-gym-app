CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- unique id for each payment
    member_id UUID NOT NULL,                         -- foreign key to members table
    package_id UUID NOT NULL,                        -- foreign key to packages table
    amount NUMERIC(10,2) NOT NULL,                  -- e.g., 150.00
    payment_method TEXT NOT NULL DEFAULT 'admin_assigned',
    transaction_id TEXT UNIQUE NOT NULL,            -- unique transaction identifier
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'pending')) DEFAULT 'pending',
    currency TEXT NOT NULL DEFAULT 'USD',
    invoice_number TEXT UNIQUE NOT NULL,
    processed_by UUID,                              -- user/admin who processed it, nullable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
