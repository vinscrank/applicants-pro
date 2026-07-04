package com.interview.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

public record ApplicationTaskResponse(
        String id,
        @JsonProperty("application_id") int applicationId,
        String kind,
        @JsonProperty("company_name") String companyName,
        @JsonProperty("job_title") String jobTitle,
        LocalDate due) {
}
