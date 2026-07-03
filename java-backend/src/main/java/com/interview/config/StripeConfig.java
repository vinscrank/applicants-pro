package com.interview.config;

import com.stripe.Stripe;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;

@Configuration
@EnableConfigurationProperties(StripeProperties.class)
public class StripeConfig {

    private final StripeProperties stripeProperties;

    public StripeConfig(StripeProperties stripeProperties) {
        this.stripeProperties = stripeProperties;
    }

    @PostConstruct
    void initStripe() {
        if (stripeProperties.isConfigured()) {
            Stripe.apiKey = stripeProperties.getSecretKey();
        }
    }
}
