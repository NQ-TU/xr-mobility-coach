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

# Backend

- Stack: Spring Boot 3.5.10 + Java 17 + JPA + Flyway + PostgreSQL, JWT via OAuth2 resource server.

**Change logs**

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