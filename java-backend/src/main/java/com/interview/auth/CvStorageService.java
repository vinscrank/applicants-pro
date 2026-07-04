package com.interview.auth;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CvStorageService {

    private static final long MAX_CV_BYTES = 10L * 1024L * 1024L;
    private static final Pattern UNSAFE_FILENAME = Pattern.compile("[^\\w.\\-]");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(".pdf", ".doc", ".docx");
    private static final Map<String, String> MIME_EXTENSIONS = Map.of(
            "application/pdf", ".pdf",
            "application/msword", ".doc",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx");

    private final Path root;

    public CvStorageService(@Value("${app.cv.upload-dir:/app/uploads/cv}") String uploadDir) {
        this.root = Path.of(uploadDir);
    }

    public StoredCv save(int userId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CV file is required");
        }
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Failed to read CV file");
        }
        if (content.length > MAX_CV_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CV file too large (max 10 MB)");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "cv.pdf";
        String extension = resolveExtension(originalName, file.getContentType());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported CV format");
        }

        Path directory = root.resolve(String.valueOf(userId));
        try {
            Files.createDirectories(directory);
            clearDirectory(directory);
            String safeName = sanitizeFilename(originalName, extension);
            Path target = directory.resolve(safeName);
            Files.write(target, content);
            String mime = file.getContentType() != null ? file.getContentType() : "application/pdf";
            return new StoredCv(safeName, mime);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store CV file");
        }
    }

    public void delete(int userId) {
        Path directory = root.resolve(String.valueOf(userId));
        if (!Files.isDirectory(directory)) {
            return;
        }
        clearDirectory(directory);
    }

    private static String resolveExtension(String filename, String mime) {
        String fromName = Path.of(filename).getFileName().toString();
        int dot = fromName.lastIndexOf('.');
        if (dot >= 0) {
            String ext = fromName.substring(dot).toLowerCase();
            if (ALLOWED_EXTENSIONS.contains(ext)) {
                return ext;
            }
        }
        if (mime != null && MIME_EXTENSIONS.containsKey(mime)) {
            return MIME_EXTENSIONS.get(mime);
        }
        return ".pdf";
    }

    private static String sanitizeFilename(String filename, String extension) {
        String base = Path.of(filename).getFileName().toString();
        base = UNSAFE_FILENAME.matcher(base).replaceAll("_");
        if (base.isBlank()) {
            base = "cv" + extension;
        }
        if (!base.toLowerCase().endsWith(extension)) {
            int dot = base.lastIndexOf('.');
            base = (dot >= 0 ? base.substring(0, dot) : base) + extension;
        }
        return base;
    }

    private static void clearDirectory(Path directory) {
        try (var stream = Files.list(directory)) {
            stream.filter(Files::isRegularFile).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                }
            });
        } catch (IOException ignored) {
        }
    }

    public record StoredCv(String filename, String mime) {
    }

    public java.nio.file.Path resolveCvPath(int userId) {
        java.nio.file.Path directory = root.resolve(String.valueOf(userId));
        if (!java.nio.file.Files.isDirectory(directory)) {
            return null;
        }
        try (var stream = java.nio.file.Files.list(directory)) {
            return stream
                    .filter(java.nio.file.Files::isRegularFile)
                    .filter(path -> {
                        String name = path.getFileName().toString().toLowerCase();
                        return name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx");
                    })
                    .findFirst()
                    .orElse(null);
        } catch (java.io.IOException ex) {
            return null;
        }
    }
}
