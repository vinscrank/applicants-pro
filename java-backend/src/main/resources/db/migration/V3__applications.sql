CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    job_url VARCHAR(500),
    company_website VARCHAR(500),
    company_linkedin_url VARCHAR(500),
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'applied',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    remote_type VARCHAR(30),
    application_method VARCHAR(50),
    application_method_other VARCHAR(255),
    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'EUR',
    visa_sponsorship BOOLEAN,
    ta_name VARCHAR(255),
    ta_email VARCHAR(255),
    ta_linkedin_url VARCHAR(500),
    ta_phone VARCHAR(50),
    hiring_manager_name VARCHAR(255),
    hiring_manager_linkedin_url VARCHAR(500),
    linkedin_connection_sent BOOLEAN DEFAULT FALSE,
    linkedin_message_sent BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    last_contact_date DATE,
    response_received_at DATE,
    interview_date DATE,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    last_applied_at TIMESTAMP,
    application_source VARCHAR(32) NOT NULL DEFAULT 'manual',
    linked_offer_id VARCHAR(64),
    notes TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_user_id ON applications (user_id);
CREATE INDEX idx_applications_company_name ON applications (company_name);
CREATE INDEX idx_applications_status ON applications (status);
CREATE INDEX idx_applications_application_source ON applications (application_source);
CREATE INDEX idx_applications_linked_offer_id ON applications (linked_offer_id);