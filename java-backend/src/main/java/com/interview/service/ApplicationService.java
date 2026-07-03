package com.interview.service;

import com.interview.domain.Application;
import com.interview.graphql.dto.CreateApplicationInput;
import com.interview.graphql.dto.UpdateApplicationInput;
import com.interview.repository.ApplicationRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ApplicationService {

  private final ApplicationRepository applicationRepository;

  public ApplicationService(ApplicationRepository applicationRepository) {
    this.applicationRepository = applicationRepository;
  }

  public List<Application> listForUser(Integer userId) {
    return applicationRepository.findByUserIdOrderByCreatedAtDesc(userId);
  }

  @Transactional
  public Application createForUser(Integer userId, CreateApplicationInput input) {
    Application app = new Application();
    app.setUserId(userId);
    app.setCompanyName(input.companyName());
    app.setJobTitle(input.jobTitle());
    app.setJobUrl(input.jobUrl());
    app.setLocation(input.location());
    app.setStatus(input.status() != null ? input.status() : "applied");
    app.setPriority(input.priority() != null ? input.priority() : "medium");
    app.setCreatedAt(LocalDate.now());
    app.setUpdatedAt(LocalDateTime.now());
    return applicationRepository.save(app);
  }

  @Transactional
  public Application updateForUser(Integer userId, UpdateApplicationInput input) {
    Application app = applicationRepository.findByIdAndUserId(Integer.valueOf(input.id()), userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found"));
    if (input.companyName() != null)
      app.setCompanyName(input.companyName());
    if (input.jobTitle() != null)
      app.setJobTitle(input.jobTitle());
    if (input.jobUrl() != null)
      app.setJobUrl(input.jobUrl());
    if (input.location() != null)
      app.setLocation(input.location());
    if (input.status() != null)
      app.setStatus(input.status());
    if (input.priority() != null)
      app.setPriority(input.priority());
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
}