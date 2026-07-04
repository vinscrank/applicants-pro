package com.interview.discover;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.interview.domain.JobSearchOffer;
import com.interview.domain.JobAppliedOffer;
import com.interview.domain.JobAppliedOfferId;
import com.interview.domain.JobDismissedOffer;
import com.interview.domain.JobDismissedOfferId;
import com.interview.repository.JobSearchOfferRepository;
import com.interview.repository.JobAppliedOfferRepository;
import com.interview.repository.JobDismissedOfferRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OfferStateService {

    private final JobAppliedOfferRepository appliedRepository;
    private final JobDismissedOfferRepository dismissedRepository;
    private final JobSearchOfferRepository jobSearchOfferRepository;
    private final ObjectMapper objectMapper;

    public OfferStateService(
            JobAppliedOfferRepository appliedRepository,
            JobDismissedOfferRepository dismissedRepository,
            JobSearchOfferRepository jobSearchOfferRepository,
            ObjectMapper objectMapper) {
        this.appliedRepository = appliedRepository;
        this.dismissedRepository = dismissedRepository;
        this.jobSearchOfferRepository = jobSearchOfferRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ObjectNode setApplied(Integer userId, String offerId, boolean applied) {
        JobAppliedOfferId id = new JobAppliedOfferId(userId, offerId);
        if (applied) {
            JobAppliedOffer row = appliedRepository.findById(id).orElseGet(JobAppliedOffer::new);
            row.setUserId(userId);
            row.setOfferId(offerId);
            row.setAppliedAt(LocalDateTime.now());
            appliedRepository.save(row);
        } else {
            appliedRepository.deleteById(id);
        }
        ObjectNode result = objectMapper.createObjectNode();
        result.put("offer_id", offerId);
        result.put("applied", applied);
        return result;
    }

    @Transactional
    public ObjectNode setDismissed(
            Integer userId,
            String offerId,
            boolean dismissed,
            String applyUrl,
            String company,
            String role) {
        String urlNorm = specificApplyUrl(JobUrlNormalizer.persistJobUrl(applyUrl));
        String companyNorm = JobUrlNormalizer.normalizeMatchText(company);
        String roleNorm = JobUrlNormalizer.normalizeMatchText(role);

        if (urlNorm.isBlank() && (companyNorm.isBlank() || roleNorm.isBlank())) {
            JobSearchOffer lookup = jobSearchOfferRepository
                    .findLatestForUserAndOfferId(userId, offerId)
                    .orElse(null);
            if (lookup != null) {
                if (urlNorm.isBlank()) {
                    urlNorm = specificApplyUrl(JobUrlNormalizer.persistJobUrl(lookup.getApplyUrl()));
                }
                if (companyNorm.isBlank() || roleNorm.isBlank()) {
                    companyNorm = JobUrlNormalizer.normalizeMatchText(lookup.getCompany());
                    roleNorm = JobUrlNormalizer.normalizeMatchText(lookup.getRole());
                }
            }
        }

        if (dismissed) {
            deleteDismissedByMatchKeys(userId, urlNorm, companyNorm, roleNorm, offerId);
            JobDismissedOfferId id = new JobDismissedOfferId(userId, offerId);
            JobDismissedOffer row = dismissedRepository.findById(id).orElseGet(JobDismissedOffer::new);
            row.setUserId(userId);
            row.setOfferId(offerId);
            row.setDismissedAt(LocalDateTime.now());
            row.setApplyUrlNorm(urlNorm.isBlank() ? null : urlNorm);
            row.setCompanyNorm(companyNorm.isBlank() ? null : companyNorm);
            row.setRoleNorm(roleNorm.isBlank() ? null : roleNorm);
            dismissedRepository.save(row);
        } else {
            dismissedRepository.deleteMatches(userId, offerId, blankToNull(urlNorm), blankToNull(companyNorm), blankToNull(roleNorm));
        }

        ObjectNode result = objectMapper.createObjectNode();
        result.put("offer_id", offerId);
        result.put("dismissed", dismissed);
        return result;
    }

    private void deleteDismissedByMatchKeys(
            Integer userId,
            String urlNorm,
            String companyNorm,
            String roleNorm,
            String keepOfferId) {
        List<JobDismissedOffer> rows = dismissedRepository.findByUserId(userId);
        for (JobDismissedOffer row : rows) {
            if (keepOfferId.equals(row.getOfferId())) {
                continue;
            }
            boolean match = false;
            if (!urlNorm.isBlank() && urlNorm.equals(row.getApplyUrlNorm())) {
                match = true;
            }
            if (!companyNorm.isBlank()
                    && !roleNorm.isBlank()
                    && companyNorm.equals(row.getCompanyNorm())
                    && roleNorm.equals(row.getRoleNorm())) {
                match = true;
            }
            if (match) {
                dismissedRepository.delete(row);
            }
        }
    }

    private static String specificApplyUrl(String urlNorm) {
        if (JobUrlNormalizer.isGenericApplyUrl(urlNorm)) {
            return "";
        }
        return urlNorm;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
