package com.interview.auth;

import com.interview.auth.dto.AuthResponse;
import com.interview.auth.dto.ForgotPasswordResponse;
import com.interview.auth.dto.LoginRequest;
import com.interview.auth.dto.RegisterRequest;
import com.interview.auth.dto.ResetPasswordRequest;
import com.interview.domain.User;
import com.interview.repository.UserRepository;
import com.interview.security.JwtService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final String publicAppUrl;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${app.public-url:http://localhost:3000}") String publicAppUrl) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.publicAppUrl = publicAppUrl;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());

        userRepository.save(user);

        return new AuthResponse(jwtService.generateToken(user.getEmail()));
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account disabled");
        }

        return new AuthResponse(jwtService.generateToken(user.getEmail()));
    }

    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
    }

    @Transactional
    public ForgotPasswordResponse forgotPassword(String email) {
        String message = "If the email exists, you will receive reset instructions.";
        Optional<User> userOpt = userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT));
        if (userOpt.isEmpty()) {
            return new ForgotPasswordResponse(message, null);
        }
        User user = userOpt.get();
        String rawToken = generateResetTokenRaw();
        user.setResetTokenHash(hashResetToken(rawToken));
        user.setResetTokenExpires(LocalDateTime.now().plusHours(1));
        userRepository.save(user);
        String resetUrl = publicAppUrl.replaceAll("/+$", "")
                + "/#reset-password?token="
                + rawToken;
        return new ForgotPasswordResponse(message, resetUrl);
    }

    @Transactional
    public AuthResponse resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByResetTokenHash(hashResetToken(request.token()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Invalid or expired token"));
        if (user.getResetTokenExpires() == null
                || user.getResetTokenExpires().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired token");
        }
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setResetTokenHash(null);
        user.setResetTokenExpires(null);
        userRepository.save(user);
        return new AuthResponse(jwtService.generateToken(user.getEmail()));
    }

    private static String generateResetTokenRaw() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashResetToken(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (byte value : hashed) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }
}
