# XR Mobility Coach API

Spring Boot backend for XR Mobility Coach. This service handles authentication, profile management, exercise catalogue access, routine CRUD, and completed session capture for the web dashboard and XR client.

Built by Noel McCarthy as part of my XR Mobility Coach final year project.

## Stack

- Java 17
- Spring Boot 3
- Spring Security with JWT bearer auth
- Spring Data JPA
- PostgreSQL
- Flyway
- Docker

## Module layout

Key packages under `src/main/java/ie/noelmccarthy/xrmobilitycoach/api`:

- `auth` - registration, login, current-user lookup
- `profile` - user profile read/update
- `exercise` - exercise catalogue queries
- `routine` - routine list, detail, create, update, delete
- `sessions` - completed session ingestion and history
- `config` - security and application wiring
- `llm` - backend support code for AI-assisted features

## API surface

Base path: `/api`

Current controller groups:

- `/api/auth`
- `/api/profile`
- `/api/exercises`
- `/api/routines`
- `/api/sessions`

The actuator health endpoint is exposed at:

- `/actuator/health`

For request and response examples, see [API.md](/c:/Users/Noel%20Quirke/Desktop/xr-mobility-coach/xr-mobility-coach-api/API.md).

## Local development

### Prerequisites

- Java 17
- PostgreSQL running locally
- a local config file at `src/main/resources/application-local.properties`
- `JWT_SECRET` set in your shell or IDE run configuration

Expected local database defaults:

- host: `localhost`
- port: `5433`
- database: `xr_mobility`

### Run locally

From this directory:

```bash
./mvnw spring-boot:run
```

or on Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

When running locally, use:

- `SPRING_PROFILES_ACTIVE=local`

The frontend dev server normally runs on:

- `http://localhost:5173`

and Vite proxies `/api` requests to the backend on `http://localhost:8080`.

## Configuration

Shared settings live in:

- `src/main/resources/application.properties`

Production settings are sourced from environment variables in:

- `src/main/resources/application-prod.properties`

Important production variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `CORS_ALLOWED_ORIGINS`
- `JWT_SECRET`

Other important runtime settings:

- `PORT` defaults to `8080`
- Flyway migrations run on startup
- JWT issuer is `xr-mobility-coach`

## Database and migrations

The service expects PostgreSQL and manages schema changes through Flyway.

Notes:

- schema changes should be made through Flyway migrations
- direct data edits are fine for debugging/admin purposes
- do not manually edit `flyway_schema_history`

## Security

- Stateless JWT authentication
- Protected API by default
- Public auth endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /actuator/health`
- CORS is controlled through `app.cors.allowed-origins`

## Tests

Run tests with:

```bash
./mvnw test
```

CI also validates:

- backend tests
- backend Docker build

## Docker and deployment

This backend is containerized with:

- [Dockerfile](/c:/Users/Noel%20Quirke/Desktop/xr-mobility-coach/xr-mobility-coach-api/Dockerfile)
- [APP_RUNNER.md](/c:/Users/Noel%20Quirke/Desktop/xr-mobility-coach/xr-mobility-coach-api/APP_RUNNER.md)

Current deployment target:

- Amazon ECR for image storage
- AWS App Runner for hosting
- Amazon RDS PostgreSQL for persistence

GitHub Actions is used for:

- pull request validation
- backend image build and push to ECR on `main`

App Runner then deploys the updated image from ECR.

## Related docs

- [API.md](/c:/Users/Noel%20Quirke/Desktop/xr-mobility-coach/xr-mobility-coach-api/API.md)
- [APP_RUNNER.md](/c:/Users/Noel%20Quirke/Desktop/xr-mobility-coach/xr-mobility-coach-api/APP_RUNNER.md)
