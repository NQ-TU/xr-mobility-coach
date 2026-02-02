package ie.noelmccarthy.xrmobilitycoach.api.profile;

import ie.noelmccarthy.xrmobilitycoach.api.profile.dto.UpsertUserProfileRequest;
import ie.noelmccarthy.xrmobilitycoach.api.profile.dto.UserProfileResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Service for fetching and updating user profile data. */
@Service
public class UserProfileService {

    private static final Logger log = LoggerFactory.getLogger(UserProfileService.class);

    private final UserProfileRepository profiles;

    public UserProfileService(UserProfileRepository profiles) {
        this.profiles = profiles;
    }

    @Transactional
    public UserProfileResponse getOrCreate(UUID userId) {
        UserProfile profile = profiles.findByUserId(userId).orElse(null);
        if (profile == null) {
            profile = profiles.save(new UserProfile(userId));
            log.info("Created user profile: userId={}, profileId={}", userId, profile.getId());
        } else {
            log.info("Fetched user profile: userId={}, profileId={}", userId, profile.getId());
        }
        return toResponse(profile);
    }

    @Transactional
    public UserProfileResponse upsert(UUID userId, UpsertUserProfileRequest req) {
        UserProfile profile = profiles.findByUserId(userId).orElse(null);
        boolean isNew = false;
        if (profile == null) {
            profile = new UserProfile(userId);
            isNew = true;
        }
        profile.setPreferredSessionLength(req.preferredSessionLength());
        profile.setTrainingExperience(req.trainingExperience());
        profile.setTargetAreas(req.targetAreas());
        profile.setNotes(req.notes());
        UserProfile saved = profiles.save(profile);
        if (isNew) {
            log.info("Created user profile via upsert: userId={}, profileId={}", userId, saved.getId());
        } else {
            log.info("Updated user profile: userId={}, profileId={}", userId, saved.getId());
        }
        return toResponse(saved);
    }

    private static UserProfileResponse toResponse(UserProfile profile) {
        return new UserProfileResponse(
                profile.getPreferredSessionLength(),
                profile.getTrainingExperience(),
                profile.getTargetAreas(),
                profile.getNotes(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
