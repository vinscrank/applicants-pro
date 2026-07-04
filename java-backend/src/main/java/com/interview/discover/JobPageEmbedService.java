package com.interview.discover;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class JobPageEmbedService {

    private static final Pattern HEAD_PATTERN = Pattern.compile("(<head[^>]*>)", Pattern.CASE_INSENSITIVE);
    private static final Pattern HTML_PATTERN = Pattern.compile("(<html[^>]*>)", Pattern.CASE_INSENSITIVE);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(30))
            .build();

    public String embedPage(String url) {
        String cleaned = validatePublicUrl(url);
        HttpRequest request = HttpRequest.newBuilder(URI.create(cleaned))
                .timeout(Duration.ofSeconds(30))
                .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                        + "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                .header("Accept-Language", "it-IT,it;q=0.9,en;q=0.8")
                .header("Accept", "text/html,application/xhtml+xml")
                .GET()
                .build();
        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to open job page URL");
            }
            String finalUrl = response.uri() != null ? response.uri().toString() : cleaned;
            return prepareEmbedHtml(response.body(), finalUrl);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to open job page URL");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to open job page URL");
        }
    }

    private static String prepareEmbedHtml(String html, String baseUrl) {
        String safeBase = baseUrl.replace("\"", "&quot;");
        String baseTag = "<base href=\"" + safeBase + "\">";
        Matcher head = HEAD_PATTERN.matcher(html);
        if (head.find()) {
            return head.replaceFirst("$1" + baseTag);
        }
        Matcher htmlTag = HTML_PATTERN.matcher(html);
        if (htmlTag.find()) {
            return htmlTag.replaceFirst("$1<head>" + baseTag + "</head>");
        }
        return "<!DOCTYPE html><html><head>" + baseTag + "</head><body>" + html + "</body></html>";
    }

    private static String validatePublicUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid URL");
        }
        String trimmed = url.trim();
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid URL");
        }
        if (trimmed.length() > 2000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid URL");
        }
        return trimmed;
    }
}
