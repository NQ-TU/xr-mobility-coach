# XR Mobility Coach

**Final Year Project – BSc (Hons) Computer Science**  
Technological University Dublin

**Student:** Noel McCarthy  
**Academic Year:** 2025–2026  

---

## Project Overview
XR Mobility Coach is an extended reality (XR) rehabilitation and mobility coaching system.
It consists of:
- an XR client built with Godot and OpenXR
- a web dashboard for user and routine management
- a backend API implemented in Java Spring Boot

This repository contains all components of the system, structured as a multi-application workspace.

---

## Status
This project is under active development. See change logs below.

# Backend: xr-mobility-coach-api

### Tech Stack

- Spring Boot 3.5.10 + Java 17 + JPA + Flyway + PostgreSQL, JWT via OAuth2 resource server.

# Change logs

## (PR#1): feature: implemented stateless JWT auth with register/login/me endpoints and secure API
https://github.com/NQ-TU/xr-mobility-coach/pull/1

This PR introduces stateless JWT-based authentication to the backend API.

It enables user registration, login, and authenticated user identity retrieval, and secures all non-auth endpoints by default.

#### Features added
- `POST /api/auth/register` – create a new user account
- `POST /api/auth/login` – authenticate and receive a JWT access token
- `GET /api/auth/me` – retrieve the authenticated user identity
- Stateless JWT authentication (HS256)
- All non-auth endpoints protected (401 without token)
- JWT signing secret externalised via environment variable (`JWT_SECRET`)

#### Notes

- No server side sessions are stored, logout will be handled client side by discarding the token
- Token expiry is enforced via JWT exp claim

## (PR#2): feature: Add authenticated user profile API with lazy creation
https://github.com/NQ-TU/xr-mobility-coach/pull/2

This PR introduces an authenticated **user profile API** to the backend.

It adds a 1:1 user profile model that is **lazily created on first access**, allowing clients to retrieve and update user specific preferences without requiring explicit profile creation during registration.

This establishes the foundation for user personalisation and future XR / LLM-driven features.

#### Features added
- `GET /api/profile/me` - retrieve the authenticated user’s profile  
  - Automatically creates an empty profile if one does not exist
- `PUT /api/profile/me` - create or update the authenticated user’s profile (upsert)
- One-to-one `UserProfile` entity linked to authenticated users
- Stateless, JWT authenticated access (reuses existing security config)
- JPA managed `createdAt` and `updatedAt` timestamps
- DTO based request / response boundaries
- Domain level logging for profile access and updates

#### Notes
- Profiles are **created lazily** on first access to reduce coupling with registration
- The `PUT /me` endpoint is implemented as an **upsert** (create or update)
- No additional security configuration was required, existing JWT enforcement applies
- Profile data is fully owned by the authenticated user (no cross user access)
- Logging avoids sensitive data and focuses on domain level events

## (PR#3): feature: Adding exercise DTOs, pageable exercise API addition, provides exercise catalogue functionality
https://github.com/NQ-TU/xr-mobility-coach/pull/3

This PR introduces our exercise DTO, service, repository and controller.

This establishes the functionality for our exercise catalogue, which will be used to populate routines later. 

#### Features added
- `GET /api/exercises` - return from exercise table  
  - 20 record limit set through `@PageableDefault(size = 20, sort = "name") Pageable pageable)`
- `GET /api/exercises?q=curl&muscleGroup=Spine` - Allows for partial search & by muscleGroup filters 
  - Search parameters we will want in Routine builder page. 
- Stateless, JWT authenticated access (reuses existing security config)
- DTO based request / response boundaries
- Logging for filtered requests

#### Notes

- This endpoint is intentionally read only: exercise addition will be managed by migrations to ensure catalogue consistency, keeping purely metadata available that coincides with our XR exercise catalogue, rather than runtime CRUD.
- Pagination is implemented server side using Spring Pageable to ensure scalability and avoid loading large datasets into memory

## (PR#4): feature: implementing user owned routine management, create/update/delete, DTO response/request, ordered sequence, expose 5 endpoints
https://github.com/NQ-TU/xr-mobility-coach/pull/4 

This PR introduces the routines domain layer as part of the XR Mobility Coach backend architecture.

The routines module establishes a user owned structured exercise workflow that serves as the core execution model for:

- XR guided sessions
- Session tracking and analytics
- AI generated routine personalization

This aligns with the layered architecture separating:

- Exercise catalogue (reference data)
- User routines (mutable domain state)
- Sessions (execution history)

#### Features added
- `GET /api/routines?page=0&size=10&sort=createdAt,desc` - get paginated list of routines
- `GET /api/routines/{id}` - get routine details for specific routine 
- `POST /api/routines` - Create routine 
- `PUT /api/routines/{id}` - Update existing routine
- `DELETE /api/routines/{id}` - Delete a routine
- Service layer validation
- Ownership enforced via JWT 
- DTO request/response boundaries#
- Exercise must exist in DB for create/update
 - Enforces our exercise catalogue 


#### Domain Model

``Routine``
- Represents a user owned mobility workflow
- Contains ordered list of RoutineExercise items

``RoutineExercise``
- Links a Routine to Exercise catalogue entries
- Maintains sequenceIndex for deterministic ordering
- Stores execution metadata (sets, tempo, reps/hold etc)

``Exercise``
- Immutable catalogue reference entity

#### API Design Notes

- Exercises remain read only catalogue data
- Routines are fully user owned resources
- DTOs used to maintain separation between persistence and API contracts
- Pagination implemented using Spring Pageable

## (PR#5): feature: add session creation endpoint with per exercise metrics capturing for XR completed routines
https://github.com/NQ-TU/xr-mobility-coach/pull/5 

This PR introduces the session metrics capture layer for the XR mobility coach backend.

It enables the XR client to submit a single completed session payload with per exercise performance data, forming the foundation for:

- End to end XR functionality now possible. 
- Session history & analytics tracking including user progress tracking

#### Features added
- `POST /api/sessions` - record a completed session with metrics
- Session + metric persistance (`sessions`, `session_exercise_metrics`)
- Routine ownership validation (JWT user must own routine)
- Exercise existence validation for metrics 
- Basic payload validation (timestsamps, duplicate setIndex, skips/completed constraints)
- DTO request/response boundaries 

#### Domain Model

`Session`
- Represents a completed XR routine execution
- Linked to a user and routine
- Stores timestamps + overall RPE

`SessionExerciseMetric`
- Links a Session to Exercise catalogue exercise
- Captures setIndex, reps, time under tension, RPE, notes etc. 

`Exercise`
- Immutable catalogue reference entity

#### API Design Notes

- XR client posts one payload at session end (no start endpoint required)
- startedAt/endedAt provided by XR client
- routineId required and must belong to user
- setIndex is 1‑based (no 0)
- Metrics validated for duplicates and invalid exercise IDs