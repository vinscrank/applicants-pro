package com.interview.service.dto;

import java.util.List;

public record ApplicationStatsResponse(
        int total,
        int applied,
        int interview,
        int offer,
        int rejected,
        int followUpDue,
        int linkedinPending,
        int appliedToday,
        double dailyAverage,
        List<StatusCount> byStatus) {

    public record StatusCount(String status, int count) {
    }
}
