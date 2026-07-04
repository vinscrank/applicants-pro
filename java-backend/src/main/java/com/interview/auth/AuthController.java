package com.interview.auth;

import com.interview.auth.dto.AuthResponse;
import com.interview.auth.dto.ForgotPasswordRequest;
import com.interview.auth.dto.ForgotPasswordResponse;
import com.interview.auth.dto.LoginRequest;
import com.interview.auth.dto.ProfileResponse;
import com.interview.auth.dto.ProfileUpdateRequest;
import com.interview.auth.dto.RegisterRequest;
import com.interview.auth.dto.ResetPasswordRequest;
import com.interview.auth.dto.UserResponse;
import com.interview.domain.User;
import com.interview.domain.UserProfile;
import com.interview.repository.UserProfileRepository;
import jakarta.validation.Valid;
import java.nio.file.Path;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v2/auth")
public class AuthController {

    private final AuthService authService;
    private final ProfileService profileService;
    private final CvStorageService cvStorageService;
    private final UserProfileRepository userProfileRepository;

    public AuthController(
            AuthService authService,
            ProfileService profileService,
            CvStorageService cvStorageService,
            UserProfileRepository userProfileRepository) {
        this.authService = authService;
        this.profileService = profileService;
        this.cvStorageService = cvStorageService;
        this.userProfileRepository = userProfileRepository;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        String email = authentication.getName();
        return new UserResponse(authService.getUserByEmail(email));
    }

    @GetMapping("/profile")
    public ProfileResponse getProfile(Authentication authentication) {
        User user = authService.getUserByEmail(authentication.getName());
        return profileService.getProfileResponse(user);
    }

    @PutMapping("/profile")
    public ProfileResponse updateProfile(
            Authentication authentication,
            @RequestBody ProfileUpdateRequest request) {
        User user = authService.getUserByEmail(authentication.getName());
        return profileService.updateProfile(user, request);
    }

    @PostMapping(value = "/profile/cv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProfileResponse uploadCv(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        User user = authService.getUserByEmail(authentication.getName());
        return profileService.uploadCv(user, file);
    }

    @DeleteMapping("/profile/cv")
    public ProfileResponse deleteCv(Authentication authentication) {
        User user = authService.getUserByEmail(authentication.getName());
        return profileService.deleteCv(user);
    }

    @PostMapping("/forgot-password")
    public ForgotPasswordResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request.email());
    }

    @PostMapping("/reset-password")
    public AuthResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }

    @GetMapping("/profile/cv")
    public ResponseEntity<Resource> downloadCv(Authentication authentication) {
        User user = authService.getUserByEmail(authentication.getName());
        Path path = cvStorageService.resolveCvPath(user.getId());
        if (path == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CV not found");
        }
        UserProfile profile = userProfileRepository.findById(user.getId()).orElse(null);
        String filename = profile != null && profile.getCvFilename() != null
                ? profile.getCvFilename()
                : path.getFileName().toString();
        String mime = profile != null && profile.getCvMime() != null
                ? profile.getCvMime()
                : MediaType.APPLICATION_PDF_VALUE;
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(mime))
                .body(new FileSystemResource(path));
    }
}
