package com.interview.service;

import com.interview.domain.Application;
import com.interview.repository.ApplicationRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ApplicationService {

  private final ApplicationRepository applicationRepository;

  public ApplicationService(ApplicationRepository applicationRepository) {
    this.applicationRepository = applicationRepository;
  }

  public List<Application> listForUser(Integer userId) {
    return applicationRepository.findByUserIdOrderByCreatedAtDesc(userId);
  }
}