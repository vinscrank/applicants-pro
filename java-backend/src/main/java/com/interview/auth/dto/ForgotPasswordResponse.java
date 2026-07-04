package com.interview.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ForgotPasswordResponse(
        String message,
        @JsonProperty("reset_url") String resetUrl) {
}
