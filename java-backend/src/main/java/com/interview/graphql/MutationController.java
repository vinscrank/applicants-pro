package com.interview.graphql;

import com.interview.auth.AuthService;
import com.interview.domain.Application;
import com.interview.graphql.dto.CreateApplicationInput;
import com.interview.graphql.dto.UpdateApplicationInput;
import com.interview.service.ApplicationService;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;

@Controller
public class MutationController {

    private final AuthService authService;
    private final ApplicationService applicationService;

    public MutationController(AuthService authService, ApplicationService applicationService) {
        this.authService = authService;
        this.applicationService = applicationService;
    }

    @MutationMapping
    public Application createApplication(@Argument CreateApplicationInput input) {
        Integer userId = authService.getUserByEmail(currentUserEmail()).getId();
        return applicationService.createForUser(userId, input);
    }

    @MutationMapping
    public Application updateApplication(@Argument UpdateApplicationInput input) {
        Integer userId = authService.getUserByEmail(currentUserEmail()).getId();
        return applicationService.updateForUser(userId, input);
    }

    @MutationMapping
    public boolean deleteApplication(@Argument Integer id) {
        Integer userId = authService.getUserByEmail(currentUserEmail()).getId();
        return applicationService.deleteForUser(userId, id);
    }

    private String currentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return auth.getName();
    }
}
