package com.interview.config;

import io.micrometer.core.instrument.MeterRegistry;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RequestObservabilityFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestObservabilityFilter.class);

    private final MeterRegistry meterRegistry;

    public RequestObservabilityFilter(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long started = System.currentTimeMillis();
        String path = normalizePath(request);
        MDC.put("http.method", request.getMethod());
        MDC.put("http.path", path);
        try {
            filterChain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            long durationMs = System.currentTimeMillis() - started;
            MDC.put("http.status", String.valueOf(status));
            MDC.put("duration_ms", String.valueOf(durationMs));
            meterRegistry.counter(
                    "http.server.requests",
                    "method", request.getMethod(),
                    "path", path,
                    "status", String.valueOf(status))
                    .increment();
            meterRegistry.timer(
                    "http.server.request.duration",
                    "method", request.getMethod(),
                    "path", path)
                    .record(java.time.Duration.ofMillis(durationMs));
            if (status >= 500) {
                log.error("request completed with server error");
            } else if (status >= 400) {
                log.warn("request completed with client error");
            } else {
                log.info("request completed");
            }
            MDC.clear();
        }
    }

    private static String normalizePath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri.startsWith("/graphql")) {
            return "/graphql";
        }
        if (uri.startsWith("/actuator/")) {
            return uri;
        }
        if (uri.startsWith("/api/v2/auth/")) {
            return "/api/v2/auth/*";
        }
        if (uri.startsWith("/api/jobs/")) {
            return "/api/jobs/*";
        }
        if (uri.startsWith("/api/tasks")) {
            return "/api/tasks";
        }
        return uri;
    }
}
