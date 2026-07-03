package com.interview.graphql.dto;

public record UpdateApplicationInput(
        String id,
        String companyName,
        String jobTitle,
        String jobUrl,
        String location,
        String status,
        String priority) {
}
