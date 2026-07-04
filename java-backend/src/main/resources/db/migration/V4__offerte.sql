CREATE TABLE offerte_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    searched_at TIMESTAMP NOT NULL,
    total_found INTEGER NOT NULL,
    verified_count INTEGER NOT NULL,
    maybe_count INTEGER NOT NULL,
    rejected_count INTEGER NOT NULL,
    command_json TEXT NOT NULL
);

CREATE INDEX idx_offerte_searches_user_id ON offerte_searches (user_id);
CREATE INDEX idx_offerte_searches_searched_at ON offerte_searches (searched_at DESC);

CREATE TABLE offerte_offers (
    id SERIAL PRIMARY KEY,
    search_id INTEGER NOT NULL REFERENCES offerte_searches (id) ON DELETE CASCADE,
    offer_id VARCHAR(64) NOT NULL,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(500) NOT NULL,
    apply_url VARCHAR(1000) NOT NULL,
    source VARCHAR(64) NOT NULL,
    posted_at VARCHAR(64),
    language_requirement VARCHAR(255),
    seniority VARCHAR(32) NOT NULL,
    web_dev_fit INTEGER NOT NULL,
    web_dev_fit_label VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL,
    status_reason TEXT NOT NULL DEFAULT '',
    location TEXT,
    origin VARCHAR(16) NOT NULL DEFAULT 'ats',
    verified_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_offerte_offers_search_id ON offerte_offers (search_id);
CREATE INDEX idx_offerte_offers_offer_id ON offerte_offers (offer_id);

CREATE TABLE offerte_applied_offers (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    offer_id VARCHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, offer_id)
);

CREATE TABLE offerte_dismissed_offers (
    user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    offer_id VARCHAR(64) NOT NULL,
    dismissed_at TIMESTAMP NOT NULL,
    apply_url_norm VARCHAR(1000),
    company_norm VARCHAR(255),
    role_norm VARCHAR(500),
    PRIMARY KEY (user_id, offer_id)
);

CREATE TABLE monitored_companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    ats VARCHAR(32) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    careers_url VARCHAR(1000) NOT NULL DEFAULT '',
    job_count INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    source VARCHAR(32) NOT NULL DEFAULT 'manual',
    discovered_at TIMESTAMP NOT NULL,
    priority BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_monitored_ats_slug UNIQUE (ats, slug)
);

CREATE TABLE llm_usage (
    id SERIAL PRIMARY KEY,
    provider VARCHAR(32) NOT NULL,
    model VARCHAR(64) NOT NULL,
    operation VARCHAR(64) NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_llm_usage_user_id ON llm_usage (user_id);
CREATE INDEX idx_llm_usage_created_at ON llm_usage (created_at);

CREATE TABLE llm_settings (
    id SERIAL PRIMARY KEY,
    monthly_budget_usd DOUBLE PRECISION NOT NULL,
    parse_prompt_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    discover_company_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_discover_enabled BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE user_offerte_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    preferences_json TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

INSERT INTO llm_settings (monthly_budget_usd) VALUES (50.0);
