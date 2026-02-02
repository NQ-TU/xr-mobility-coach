package ie.noelmccarthy.xrmobilitycoach.api.profile;

import ie.noelmccarthy.xrmobilitycoach.api.profile.dto.UpsertUserProfileRequest;
import ie.noelmccarthy.xrmobilitycoach.api.profile.dto.UserProfileResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Endpoints for managing the authenticated user's profile. */
@RestController
@RequestMapping("/api/profile")
public class UserProfileController {

    private static final Logger log = LoggerFactory.getLogger(UserProfileController.class);

    private final UserProfileService profiles;

    public UserProfileController(UserProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping("/me")
    /** Return the current user's profile (auto-created if missing). */
    public UserProfileResponse me(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return profiles.getOrCreate(userId);
    }

    @PutMapping("/me")
    /** Update or create the current user's profile. */
    public UserProfileResponse upsert(@AuthenticationPrincipal Jwt jwt,
                                      @Valid @RequestBody UpsertUserProfileRequest req) {
        UUID userId = UUID.fromString(jwt.getSubject());
        int notesLength = req.notes() == null ? 0 : req.notes().length();
        log.info("Profile upsert payload: userId= {} | preferredSessionLength= {} | trainingExperience= {} | targetAreas= {} | notesLength= {}",
                userId,
                req.preferredSessionLength(),
                req.trainingExperience(),
                req.targetAreas(),
                notesLength);
        return profiles.upsert(userId, req);
    }
}
