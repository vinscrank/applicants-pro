package com.interview.graphql.dto;

public record CreateApplicationInput(
        String companyName,
        String jobTitle,
        String jobUrl,
        String location,
        String status,
        String priority) {
}
