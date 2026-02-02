package ie.noelmccarthy.xrmobilitycoach.api.auth;


import ie.noelmccarthy.xrmobilitycoach.api.auth.dto.AuthResponse;
import ie.noelmccarthy.xrmobilitycoach.api.users.User;
import ie.noelmccarthy.xrmobilitycoach.api.users.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/** Auth domain logic for registering and logging in users. */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /** Register a new user, returning a token and user details. */
    public AuthResponse register(String emailRaw, String passwordRaw) {
        String email = normaliseEmail(emailRaw);

        if (users.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyInUseException();
        }

        String hash = passwordEncoder.encode(passwordRaw);
        User user = users.save(new User(email, hash));
        log.info("Registered new account: userId={}, email={}", user.getId(), user.getEmail());

        String token = jwtService.issueToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }

    /** Authenticate a user, returning a token and user details. */
    public AuthResponse login(String emailRaw, String passwordRaw) {
        String email = normaliseEmail(emailRaw);

        User user = users.findByEmailIgnoreCase(email).orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(passwordRaw, user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        log.info("User login: userId={}, email={}", user.getId(), user.getEmail());
        String token = jwtService.issueToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail());
    }

    /** Normalize email input for consistent lookup and storage. */
    private String normaliseEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
