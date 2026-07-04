package com.interview.graphql;

import com.interview.auth.AuthService;
import com.interview.auth.dto.UserResponse;
import com.interview.domain.Application;
import com.interview.graphql.dto.ApplicationPageInput;
import com.interview.graphql.dto.ApplicationPageResponse;
import com.interview.service.ApplicationService;
import com.interview.service.dto.ApplicationStatsResponse;
import com.interview.service.dto.ApplicationTaskResponse;
import java.util.List;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;

@Controller
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
  public ApplicationPageResponse applicationsPage(@Argument ApplicationPageInput input) {
    Integer userId = authService.getUserByEmail(currentUserEmail()).getId();
    return applicationService.listPageForUser(userId, input);
  }

  @QueryMapping
  public Application application(@Argument Integer id) {
    Integer userId = authService.getUserByEmail(currentUserEmail()).getId();
    return applicationService.getForUser(userId, id);
  }

  @QueryMapping
  public ApplicationStatsResponse applicationStats() {
    Integer userId = authService.getUserByEmail(currentUserEmail()).getId();
    return applicationService.statsForUser(userId);
  }

  @QueryMapping
  public List<ApplicationTaskResponse> applicationTasks(@Argument String scope) {
    Integer userId = authService.getUserByEmail(currentUserEmail()).getId();
    return applicationService.tasksForUser(userId, mapTaskScope(scope));
  }

  private static String mapTaskScope(String scope) {
    if (scope == null) {
      throw new IllegalArgumentException("scope is required");
    }
    return switch (scope) {
      case "TODAY" -> "today";
      case "WEEK" -> "week";
      case "OVERDUE" -> "overdue";
      default -> throw new IllegalArgumentException("Invalid task scope: " + scope);
    };
  }

  private String currentUserEmail() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }
    return auth.getName();
  }
}
