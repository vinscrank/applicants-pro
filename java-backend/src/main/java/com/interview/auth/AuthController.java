package com.interview.auth;

import com.interview.auth.dto.AuthResponse;
import com.interview.auth.dto.LoginRequest;
import com.interview.auth.dto.ProfileResponse;
import com.interview.auth.dto.ProfileUpdateRequest;
import com.interview.auth.dto.RegisterRequest;
import com.interview.auth.dto.UserResponse;
import com.interview.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
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

@RestController
@RequestMapping("/api/v2/auth")
public class AuthController {

    private final AuthService authService;
    private final ProfileService profileService;

    public AuthController(AuthService authService, ProfileService profileService) {
        this.authService = authService;
        this.profileService = profileService;
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
}
