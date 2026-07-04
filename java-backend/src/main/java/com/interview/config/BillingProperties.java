package com.interview.config;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.billing")
public class BillingProperties {

    private String ownerEmails = "vinci.loca1@gmail.com";

    public String getOwnerEmails() {
        return ownerEmails;
    }

    public void setOwnerEmails(String ownerEmails) {
        this.ownerEmails = ownerEmails;
    }

    public Set<String> getOwnerEmailSet() {
        return Arrays.stream(ownerEmails.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .map(value -> value.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }
}
