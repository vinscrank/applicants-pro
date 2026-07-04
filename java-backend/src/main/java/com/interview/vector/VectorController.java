package com.interview.vector;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/vector")
public class VectorController {

    @GetMapping("/status")
    public VectorStatusResponse status() {
        return new VectorStatusResponse(false, false, "", List.of());
    }

    @PostMapping("/reindex")
    public void reindex() {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Vector search is not available yet");
    }

    @PostMapping("/assistant/ask")
    public void ask(@RequestBody AskRequest request) {
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Vector search is not available yet");
    }

    public record VectorStatusResponse(
            boolean enabled,
            boolean configured,
            @JsonProperty("embedding_model") String embeddingModel,
            List<String> features) {
    }

    public record AskRequest(String question) {
    }
}
