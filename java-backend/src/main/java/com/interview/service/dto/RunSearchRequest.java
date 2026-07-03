package com.interview.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record RunSearchRequest(
        @JsonProperty("job_title") String jobTitle,
        String location,
        Boolean remote) {
}
