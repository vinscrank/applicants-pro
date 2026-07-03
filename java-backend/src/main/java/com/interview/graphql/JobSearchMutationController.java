package com.interview.graphql;

import com.interview.auth.AuthService;
import com.interview.graphql.dto.JobSearchInput;
import com.interview.service.JobSearchService;
import com.interview.service.dto.ParseSearchResponse;
import com.interview.service.dto.RunSearchRequest;
import com.interview.service.dto.RunSearchResponse;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;

@Controller
public class JobSearchMutationController {

    private final AuthService authService;
    private final JobSearchService jobSearchService;

    public JobSearchMutationController(AuthService authService, JobSearchService jobSearchService) {
        this.authService = authService;
        this.jobSearchService = jobSearchService;
    }

    @MutationMapping
    public ParseSearchResponse parseSearchPrompt(@Argument String prompt) {
        requireAuthenticatedUser();
        return jobSearchService.parseSearchPrompt(prompt);
    }

    @MutationMapping
    public RunSearchResponse runJobSearch(@Argument JobSearchInput input) {
        requireAuthenticatedUser();
        return jobSearchService.runJobSearch(new RunSearchRequest(
                input.jobTitle(),
                input.location(),
                input.remote()));
    }

    private void requireAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        authService.getUserByEmail(auth.getName());
    }
}
