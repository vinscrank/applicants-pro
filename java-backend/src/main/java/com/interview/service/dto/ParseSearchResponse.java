package com.interview.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ParseSearchResponse(
        @JsonProperty("job_title") String jobTitle,
        String location,
        Boolean remote,
        @JsonProperty("raw_prompt") String rawPrompt) {
}
