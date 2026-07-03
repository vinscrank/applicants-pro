CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    reset_token_hash VARCHAR(64),
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    plan_tier VARCHAR(32) NOT NULL DEFAULT 'free',
    subscription_status VARCHAR(32) NOT NULL DEFAULT 'none',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_period_end TIMESTAMP
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_stripe_customer_id ON users (stripe_customer_id);

CREATE TABLE user_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    first_name VARCHAR(120),
    last_name VARCHAR(120),
    phone VARCHAR(40),
    city VARCHAR(120),
    country VARCHAR(120),
    address_line VARCHAR(255),
    headline VARCHAR(255),
    summary TEXT,
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    website_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    nationality VARCHAR(120),
    work_authorization VARCHAR(255),
    years_experience INTEGER,
    skills TEXT,
    cv_filename VARCHAR(255),
    cv_mime VARCHAR(120),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);