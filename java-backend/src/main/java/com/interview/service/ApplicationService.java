package com.interview.service;

import com.interview.domain.Application;
import com.interview.graphql.dto.ApplicationPageInput;
import com.interview.graphql.dto.ApplicationPageResponse;
import com.interview.graphql.dto.CreateApplicationInput;
import com.interview.graphql.dto.UpdateApplicationInput;
import com.interview.repository.ApplicationRepository;
import com.interview.service.dto.ApplicationStatsResponse;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ApplicationService {

  private static final int MAX_PAGE_SIZE = 500;
  private static final int DEFAULT_PAGE_SIZE = 100;

  private final ApplicationRepository applicationRepository;

  public ApplicationService(ApplicationRepository applicationRepository) {
    this.applicationRepository = applicationRepository;
  }

  public List<Application> listForUser(Integer userId) {
    return applicationRepository.findByUserIdOrderByCreatedAtDesc(userId);
  }

  public ApplicationPageResponse listPageForUser(Integer userId, ApplicationPageInput input) {
    int limit = input != null && input.limit() != null ? input.limit() : DEFAULT_PAGE_SIZE;
    int offset = input != null && input.offset() != null ? input.offset() : 0;
    if (limit < 1) {
      throw new IllegalArgumentException("limit must be at least 1");
    }
    if (limit > MAX_PAGE_SIZE) {
      throw new IllegalArgumentException("limit cannot exceed " + MAX_PAGE_SIZE);
    }
    if (offset < 0) {
      throw new IllegalArgumentException("offset cannot be negative");
    }

    long totalCount = applicationRepository.countByUserId(userId);
    List<Application> items = applicationRepository.findPageByUserId(userId, limit, offset);
    boolean hasNextPage = (long) offset + items.size() < totalCount;

    return new ApplicationPageResponse(
        items,
        (int) totalCount,
        limit,
        offset,
        hasNextPage);
  }

  public Application getForUser(Integer userId, Integer id) {
    return applicationRepository.findByIdAndUserId(id, userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
  }

  @Transactional
  public Application createForUser(Integer userId, CreateApplicationInput input) {
    Application app = new Application();
    app.setUserId(userId);
    applyCreateInput(app, input);
    app.setCreatedAt(LocalDate.now());
    app.setUpdatedAt(LocalDateTime.now());
    return applicationRepository.save(app);
  }

  @Transactional
  public Application updateForUser(Integer userId, UpdateApplicationInput input) {
    Application app = applicationRepository.findByIdAndUserId(Integer.valueOf(input.id()), userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    applyUpdateInput(app, input);
    app.setUpdatedAt(LocalDateTime.now());
    return applicationRepository.save(app);
  }

  @Transactional
  public boolean deleteForUser(Integer userId, Integer id) {
    Application app = applicationRepository.findByIdAndUserId(id, userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    applicationRepository.delete(app);
    return true;
  }

  public ApplicationStatsResponse statsForUser(Integer userId) {
    List<Application> apps = applicationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    java.util.Map<String, Integer> byStatus = new java.util.LinkedHashMap<>();
    int followUpDue = 0;
    int linkedinPending = 0;
    int appliedToday = 0;
    LocalDate today = LocalDate.now();
    java.util.List<LocalDate> appliedDates = new java.util.ArrayList<>();
    java.util.Set<String> closedStatuses = java.util.Set.of(
        "rejected", "ghosted", "withdrawn", "accepted");

    for (Application app : apps) {
      if ("draft".equals(app.getStatus())) {
        continue;
      }
      byStatus.merge(app.getStatus(), 1, Integer::sum);
      LocalDate appliedOn = app.getLastAppliedAt() != null
          ? app.getLastAppliedAt().toLocalDate()
          : app.getCreatedAt();
      if (appliedOn != null) {
        appliedDates.add(appliedOn);
        if (appliedOn.equals(today)) {
          appliedToday++;
        }
      }
      if (app.getFollowUpDate() != null
          && !app.getFollowUpDate().isAfter(today)
          && !closedStatuses.contains(app.getStatus())) {
        followUpDue++;
      }
      if (!app.isLinkedinConnectionSent()
          && app.getTaLinkedinUrl() != null
          && !app.getTaLinkedinUrl().isBlank()) {
        linkedinPending++;
      }
    }

    double dailyAverage = 0;
    if (!appliedDates.isEmpty()) {
      LocalDate firstDay = appliedDates.stream().min(LocalDate::compareTo).orElse(today);
      long trackedDays = Math.max(1, java.time.temporal.ChronoUnit.DAYS.between(firstDay, today) + 1);
      dailyAverage = Math.round((appliedDates.size() * 10.0) / trackedDays) / 10.0;
    }

    int applied = 0;
    int interview = 0;
    int offer = 0;
    int rejected = 0;
    for (var entry : byStatus.entrySet()) {
      switch (entry.getKey()) {
        case "phone_screen", "technical_interview", "final_interview" -> interview += entry.getValue();
        case "offer", "accepted" -> offer += entry.getValue();
        case "rejected", "ghosted", "withdrawn" -> rejected += entry.getValue();
        default -> applied += entry.getValue();
      }
    }

    java.util.List<ApplicationStatsResponse.StatusCount> statusRows = byStatus.entrySet().stream()
        .map(entry -> new ApplicationStatsResponse.StatusCount(entry.getKey(), entry.getValue()))
        .toList();

    return new ApplicationStatsResponse(
        byStatus.values().stream().mapToInt(Integer::intValue).sum(),
        applied,
        interview,
        offer,
        rejected,
        followUpDue,
        linkedinPending,
        appliedToday,
        dailyAverage,
        statusRows);
  }

  public java.util.List<com.interview.service.dto.ApplicationTaskResponse> tasksForUser(
      Integer userId, String scope) {
    java.util.Set<String> closedStatuses = java.util.Set.of(
        "rejected", "ghosted", "withdrawn", "accepted");
    LocalDate today = LocalDate.now();
    java.util.List<com.interview.service.dto.ApplicationTaskResponse> tasks = new java.util.ArrayList<>();

    for (Application app : applicationRepository.findByUserIdOrderByCreatedAtDesc(userId)) {
      if ("draft".equals(app.getStatus()) || closedStatuses.contains(app.getStatus())) {
        continue;
      }
      if (app.getFollowUpDate() != null && taskInScope(app.getFollowUpDate(), scope, today)) {
        tasks.add(new com.interview.service.dto.ApplicationTaskResponse(
            "fu-" + app.getId(),
            app.getId(),
            "follow_up",
            app.getCompanyName(),
            app.getJobTitle(),
            app.getFollowUpDate()));
      }
      if (app.getInterviewDate() != null && taskInScope(app.getInterviewDate(), scope, today)) {
        tasks.add(new com.interview.service.dto.ApplicationTaskResponse(
            "in-" + app.getId(),
            app.getId(),
            "interview",
            app.getCompanyName(),
            app.getJobTitle(),
            app.getInterviewDate()));
      }
    }

    tasks.sort(java.util.Comparator
        .comparing(com.interview.service.dto.ApplicationTaskResponse::due)
        .thenComparing(com.interview.service.dto.ApplicationTaskResponse::applicationId));
    return tasks;
  }

  private static boolean taskInScope(LocalDate due, String scope, LocalDate today) {
    return switch (scope) {
      case "today" -> due.equals(today);
      case "week" -> {
        LocalDate weekStart = today.minusDays(today.getDayOfWeek().getValue() - 1L);
        LocalDate weekEnd = weekStart.plusDays(6);
        yield !due.isBefore(weekStart) && !due.isAfter(weekEnd);
      }
      case "overdue" -> due.isBefore(today);
      default -> false;
    };
  }

  private void applyCreateInput(Application app, CreateApplicationInput input) {
    app.setCompanyName(input.companyName());
    app.setJobTitle(input.jobTitle());
    setIfPresent(input.jobUrl(), app::setJobUrl);
    setIfPresent(input.companyWebsite(), app::setCompanyWebsite);
    setIfPresent(input.companyLinkedinUrl(), app::setCompanyLinkedinUrl);
    setIfPresent(input.location(), app::setLocation);
    app.setStatus(input.status() != null ? input.status() : "applied");
    app.setPriority(input.priority() != null ? input.priority() : "medium");
    setIfPresent(input.remoteType(), app::setRemoteType);
    setIfPresent(input.applicationMethod(), app::setApplicationMethod);
    setIfPresent(input.applicationMethodOther(), app::setApplicationMethodOther);
    if (input.salaryMin() != null) {
      app.setSalaryMin(input.salaryMin());
    }
    if (input.salaryMax() != null) {
      app.setSalaryMax(input.salaryMax());
    }
    if (input.salaryCurrency() != null) {
      app.setSalaryCurrency(input.salaryCurrency());
    }
    if (input.visaSponsorship() != null) {
      app.setVisaSponsorship(input.visaSponsorship());
    }
    setIfPresent(input.taName(), app::setTaName);
    setIfPresent(input.taEmail(), app::setTaEmail);
    setIfPresent(input.taLinkedinUrl(), app::setTaLinkedinUrl);
    setIfPresent(input.taPhone(), app::setTaPhone);
    setIfPresent(input.hiringManagerName(), app::setHiringManagerName);
    setIfPresent(input.hiringManagerLinkedinUrl(), app::setHiringManagerLinkedinUrl);
    if (input.linkedinConnectionSent() != null) {
      app.setLinkedinConnectionSent(input.linkedinConnectionSent());
    }
    if (input.linkedinMessageSent() != null) {
      app.setLinkedinMessageSent(input.linkedinMessageSent());
    }
    setDateIfPresent(input.followUpDate(), app::setFollowUpDate);
    setDateIfPresent(input.lastContactDate(), app::setLastContactDate);
    setDateIfPresent(input.responseReceivedAt(), app::setResponseReceivedAt);
    setDateIfPresent(input.interviewDate(), app::setInterviewDate);
    setDateTimeIfPresent(input.lastAppliedAt(), app::setLastAppliedAt);
    app.setApplicationSource(input.applicationSource() != null ? input.applicationSource() : "manual");
    setIfPresent(input.linkedOfferId(), app::setLinkedOfferId);
    setIfPresent(input.notes(), app::setNotes);
  }

  private void applyUpdateInput(Application app, UpdateApplicationInput input) {
    if (input.companyName() != null) {
      app.setCompanyName(input.companyName());
    }
    if (input.jobTitle() != null) {
      app.setJobTitle(input.jobTitle());
    }
    if (input.jobUrl() != null) {
      app.setJobUrl(blankToNull(input.jobUrl()));
    }
    if (input.companyWebsite() != null) {
      app.setCompanyWebsite(blankToNull(input.companyWebsite()));
    }
    if (input.companyLinkedinUrl() != null) {
      app.setCompanyLinkedinUrl(blankToNull(input.companyLinkedinUrl()));
    }
    if (input.location() != null) {
      app.setLocation(blankToNull(input.location()));
    }
    if (input.status() != null) {
      app.setStatus(input.status());
    }
    if (input.priority() != null) {
      app.setPriority(input.priority());
    }
    if (input.remoteType() != null) {
      app.setRemoteType(blankToNull(input.remoteType()));
    }
    if (input.applicationMethod() != null) {
      app.setApplicationMethod(blankToNull(input.applicationMethod()));
    }
    if (input.applicationMethodOther() != null) {
      app.setApplicationMethodOther(blankToNull(input.applicationMethodOther()));
    }
    if (input.salaryMin() != null) {
      app.setSalaryMin(input.salaryMin());
    }
    if (input.salaryMax() != null) {
      app.setSalaryMax(input.salaryMax());
    }
    if (input.salaryCurrency() != null) {
      app.setSalaryCurrency(input.salaryCurrency());
    }
    if (input.visaSponsorship() != null) {
      app.setVisaSponsorship(input.visaSponsorship());
    }
    if (input.taName() != null) {
      app.setTaName(blankToNull(input.taName()));
    }
    if (input.taEmail() != null) {
      app.setTaEmail(blankToNull(input.taEmail()));
    }
    if (input.taLinkedinUrl() != null) {
      app.setTaLinkedinUrl(blankToNull(input.taLinkedinUrl()));
    }
    if (input.taPhone() != null) {
      app.setTaPhone(blankToNull(input.taPhone()));
    }
    if (input.hiringManagerName() != null) {
      app.setHiringManagerName(blankToNull(input.hiringManagerName()));
    }
    if (input.hiringManagerLinkedinUrl() != null) {
      app.setHiringManagerLinkedinUrl(blankToNull(input.hiringManagerLinkedinUrl()));
    }
    if (input.linkedinConnectionSent() != null) {
      app.setLinkedinConnectionSent(input.linkedinConnectionSent());
    }
    if (input.linkedinMessageSent() != null) {
      app.setLinkedinMessageSent(input.linkedinMessageSent());
    }
    if (input.followUpDate() != null) {
      app.setFollowUpDate(parseDateOrNull(input.followUpDate()));
    }
    if (input.lastContactDate() != null) {
      app.setLastContactDate(parseDateOrNull(input.lastContactDate()));
    }
    if (input.responseReceivedAt() != null) {
      app.setResponseReceivedAt(parseDateOrNull(input.responseReceivedAt()));
    }
    if (input.interviewDate() != null) {
      app.setInterviewDate(parseDateOrNull(input.interviewDate()));
    }
    if (input.lastAppliedAt() != null) {
      app.setLastAppliedAt(parseDateTimeOrNull(input.lastAppliedAt()));
    }
    if (input.applicationSource() != null) {
      app.setApplicationSource(input.applicationSource());
    }
    if (input.linkedOfferId() != null) {
      app.setLinkedOfferId(blankToNull(input.linkedOfferId()));
    }
    if (input.notes() != null) {
      app.setNotes(blankToNull(input.notes()));
    }
  }

  private static void setIfPresent(String value, java.util.function.Consumer<String> setter) {
    if (value != null) {
      setter.accept(blankToNull(value));
    }
  }

  private static void setDateIfPresent(String value, java.util.function.Consumer<LocalDate> setter) {
    if (value != null) {
      setter.accept(parseDateOrNull(value));
    }
  }

  private static void setDateTimeIfPresent(String value, java.util.function.Consumer<LocalDateTime> setter) {
    if (value != null) {
      setter.accept(parseDateTimeOrNull(value));
    }
  }

  private static String blankToNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value;
  }

  private static LocalDate parseDateOrNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return LocalDate.parse(value.length() >= 10 ? value.substring(0, 10) : value);
    } catch (DateTimeParseException ex) {
      return null;
    }
  }

  private static LocalDateTime parseDateTimeOrNull(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return LocalDateTime.parse(value);
    } catch (DateTimeParseException ex) {
      try {
        return LocalDate.parse(value.substring(0, 10)).atStartOfDay();
      } catch (DateTimeParseException ignored) {
        return null;
      }
    }
  }
}
