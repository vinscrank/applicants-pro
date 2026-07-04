package com.interview.application;

import com.interview.auth.AuthService;
import com.interview.domain.User;
import com.interview.service.ApplicationService;
import com.interview.service.dto.ApplicationTaskResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final AuthService authService;
    private final ApplicationService applicationService;

    public TaskController(AuthService authService, ApplicationService applicationService) {
        this.authService = authService;
        this.applicationService = applicationService;
    }

    @GetMapping
    public List<ApplicationTaskResponse> tasks(@RequestParam(defaultValue = "today") String scope) {
        User user = currentUser();
        return applicationService.tasksForUser(user.getId(), scope);
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return authService.getUserByEmail(auth.getName());
    }
}
