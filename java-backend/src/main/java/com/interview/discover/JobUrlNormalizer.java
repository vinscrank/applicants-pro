package com.interview.discover;

import java.net.URI;
import java.net.URISyntaxException;

public final class JobUrlNormalizer {

    private static final int JOB_URL_MAX_LEN = 500;

    private JobUrlNormalizer() {
    }

    public static String normalizeJobUrl(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        String raw = url.trim().split("#", 2)[0].replaceAll("/+$", "");
        try {
            URI uri = new URI(raw);
            String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase() : "https";
            String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
            String path = uri.getPath() != null ? uri.getPath().replaceAll("/+$", "") : "";
            return scheme + "://" + host + path;
        } catch (URISyntaxException ex) {
            return raw.length() <= JOB_URL_MAX_LEN ? raw : raw.substring(0, JOB_URL_MAX_LEN);
        }
    }

    public static String persistJobUrl(String url) {
        String normalized = normalizeJobUrl(url);
        if (normalized.isBlank()) {
            String trimmed = url != null ? url.trim() : "";
            return trimmed.length() <= JOB_URL_MAX_LEN ? trimmed : trimmed.substring(0, JOB_URL_MAX_LEN);
        }
        return normalized.length() <= JOB_URL_MAX_LEN
                ? normalized
                : normalized.substring(0, JOB_URL_MAX_LEN);
    }

    public static String normalizeMatchText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    public static boolean isGenericApplyUrl(String urlNorm) {
        if (urlNorm == null || urlNorm.isBlank()) {
            return true;
        }
        String lower = urlNorm.toLowerCase();
        if (lower.endsWith("/jobs/search") || lower.endsWith("/careers") || lower.endsWith("/careers/job")) {
            return true;
        }
        if (lower.contains("linkedin.com") && !lower.contains("/jobs/view/")) {
            return true;
        }
        if (lower.contains("indeed.com") && !lower.contains("/viewjob") && !lower.contains("/rc/clk")) {
            if (lower.endsWith("/jobs") || lower.endsWith("/jobs/")) {
                return true;
            }
        }
        try {
            URI uri = new URI(urlNorm);
            String path = uri.getPath() != null ? uri.getPath() : "";
            return path.isBlank() || "/".equals(path);
        } catch (URISyntaxException ex) {
            return false;
        }
    }
}
