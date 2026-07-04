package com.interview.auth;

import com.interview.auth.dto.ProfileResponse;
import com.interview.auth.dto.ProfileUpdateRequest;
import com.interview.domain.User;
import com.interview.domain.UserProfile;
import com.interview.repository.UserProfileRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProfileService {

    private final UserProfileRepository profileRepository;
    private final CvStorageService cvStorageService;

    public ProfileService(UserProfileRepository profileRepository, CvStorageService cvStorageService) {
        this.profileRepository = profileRepository;
        this.cvStorageService = cvStorageService;
    }

    public ProfileResponse getProfileResponse(User user) {
        return toResponse(user, getOrCreateProfile(user));
    }

    @Transactional
    public ProfileResponse updateProfile(User user, ProfileUpdateRequest request) {
        UserProfile profile = getOrCreateProfile(user);
        profile.setFirstName(trimToNull(request.getFirstName()));
        profile.setLastName(trimToNull(request.getLastName()));
        profile.setPhone(trimToNull(request.getPhone()));
        profile.setCity(trimToNull(request.getCity()));
        profile.setCountry(trimToNull(request.getCountry()));
        profile.setAddressLine(trimToNull(request.getAddressLine()));
        profile.setHeadline(trimToNull(request.getHeadline()));
        profile.setSummary(trimToNull(request.getSummary()));
        profile.setLinkedinUrl(trimToNull(request.getLinkedinUrl()));
        profile.setGithubUrl(trimToNull(request.getGithubUrl()));
        profile.setWebsiteUrl(trimToNull(request.getWebsiteUrl()));
        profile.setPortfolioUrl(trimToNull(request.getPortfolioUrl()));
        profile.setNationality(trimToNull(request.getNationality()));
        profile.setWorkAuthorization(trimToNull(request.getWorkAuthorization()));
        profile.setYearsExperience(request.getYearsExperience());
        profile.setSkills(trimToNull(request.getSkills()));
        profile.setUpdatedAt(LocalDateTime.now());
        profileRepository.save(profile);
        return toResponse(user, profile);
    }

    @Transactional
    public ProfileResponse uploadCv(User user, MultipartFile file) {
        CvStorageService.StoredCv stored = cvStorageService.save(user.getId(), file);
        UserProfile profile = getOrCreateProfile(user);
        profile.setCvFilename(stored.filename());
        profile.setCvMime(stored.mime());
        profile.setUpdatedAt(LocalDateTime.now());
        profileRepository.save(profile);
        return toResponse(user, profile);
    }

    @Transactional
    public ProfileResponse deleteCv(User user) {
        cvStorageService.delete(user.getId());
        UserProfile profile = getOrCreateProfile(user);
        profile.setCvFilename(null);
        profile.setCvMime(null);
        profile.setUpdatedAt(LocalDateTime.now());
        profileRepository.save(profile);
        return toResponse(user, profile);
    }

    private UserProfile getOrCreateProfile(User user) {
        return profileRepository.findById(user.getId()).orElseGet(() -> {
            UserProfile profile = new UserProfile();
            profile.setUserId(user.getId());
            profile.setUpdatedAt(LocalDateTime.now());
            return profileRepository.save(profile);
        });
    }

    private ProfileResponse toResponse(User user, UserProfile profile) {
        ProfileResponse response = new ProfileResponse();
        response.setUserId(user.getId());
        response.setEmail(user.getEmail());
        response.setFirstName(profile.getFirstName());
        response.setLastName(profile.getLastName());
        response.setPhone(profile.getPhone());
        response.setCity(profile.getCity());
        response.setCountry(profile.getCountry());
        response.setAddressLine(profile.getAddressLine());
        response.setHeadline(profile.getHeadline());
        response.setSummary(profile.getSummary());
        response.setLinkedinUrl(profile.getLinkedinUrl());
        response.setGithubUrl(profile.getGithubUrl());
        response.setWebsiteUrl(profile.getWebsiteUrl());
        response.setPortfolioUrl(profile.getPortfolioUrl());
        response.setNationality(profile.getNationality());
        response.setWorkAuthorization(profile.getWorkAuthorization());
        response.setYearsExperience(profile.getYearsExperience());
        response.setSkills(profile.getSkills());
        response.setFullName(fullName(profile, user.getEmail()));
        response.setProfileComplete(isProfileComplete(profile));
        response.setHasCv(profile.getCvFilename() != null && !profile.getCvFilename().isBlank());
        response.setCvFilename(profile.getCvFilename());
        response.setUpdatedAt(profile.getUpdatedAt());
        return response;
    }

    private static String fullName(UserProfile profile, String email) {
        List<String> parts = new ArrayList<>(2);
        if (isNotBlank(profile.getFirstName())) {
            parts.add(profile.getFirstName().trim());
        }
        if (isNotBlank(profile.getLastName())) {
            parts.add(profile.getLastName().trim());
        }
        if (parts.isEmpty()) {
            return email;
        }
        return String.join(" ", parts);
    }

    private static boolean isProfileComplete(UserProfile profile) {
        return isNotBlank(profile.getFirstName())
                && isNotBlank(profile.getLastName())
                && isNotBlank(profile.getPhone())
                && isNotBlank(profile.getCity())
                && isNotBlank(profile.getLinkedinUrl());
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
