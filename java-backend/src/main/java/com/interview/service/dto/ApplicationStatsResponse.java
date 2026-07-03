package com.interview.service.dto;

public record ApplicationStatsResponse(
    int total,
    int applied,
    int interview,
    int offer,
    int rejected) {
}