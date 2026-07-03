package com.interview.graphql;

import com.interview.auth.AuthService;
import com.interview.auth.dto.UserResponse;
import com.interview.domain.Application;
import com.interview.service.ApplicationService;
import com.interview.service.dto.ApplicationStatsResponse;
import java.util.List;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

@org.springframework.stereotype.Controller
public class QueryController {

  private final AuthService authService;
  private final ApplicationService applicationService;

  public QueryController(AuthService authService, ApplicationService applicationService) {
    this.authService = authService;
    this.applicationService = applicationService;
  }

  @QueryMapping
  public UserResponse me() {
    return new UserResponse(authService.getUserByEmail(currentUserEmail()));
  }

  @QueryMapping
  public List<Application> applications() {
    Integer userId = authService.getUserByEmail(currentUserEmail()).getId();
    return applicationService.listForUser(userId);
  }

  @QueryMapping
  public ApplicationStatsResponse applicationStats() {
    Integer userId = authService.getUserByEmail(currentUserEmail()).getId();
    return applicationService.statsForUser(userId);
  }

  private String currentUserEmail() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
    return auth.getName();
  }
}