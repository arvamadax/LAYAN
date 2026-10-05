use argon2::{Argon2, PasswordHash, PasswordVerifier};
use axum::extract::{FromRequestParts, State};
use axum::http::{header, request::Parts, HeaderMap};
use axum::response::IntoResponse;
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::error::AppError;
use crate::AppState;

const COOKIE: &str = "layan_session";
const TTL_SECS: i64 = 7 * 24 * 3600;

#[derive(Serialize, Deserialize, sqlx::Type, ToSchema, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "TEXT", rename_all = "lowercase")]
pub enum Role {
    Mahasiswa,
    Staf,
    Teknisi,
    /// Tim pemantau: hanya halaman /admin.
    Admin,
}

#[derive(Serialize, sqlx::FromRow, ToSchema, Clone)]
pub struct User {
    pub id: String,
    pub role: Role,
    pub name: String,
    pub email: String,
    pub nim: Option<String>,
    pub prodi: Option<String>,
    pub unit: Option<String>,
}

const USER_COLS: &str = "u.id, u.role, u.name, u.email, u.nim, u.prodi, u.unit";

#[derive(Deserialize, ToSchema)]
pub struct LoginReq {
    /// NIM atau email
    pub identifier: String,
    pub password: String,
}

#[derive(Serialize, ToSchema)]
pub struct LoginRes {
    /// Dipakai app Android sebagai `Authorization: Bearer <token>`. Web memakai cookie.
    pub token: String,
    pub user: User,
}

/// User yang sedang login. Token dibaca dari header Bearer (Android) atau cookie (web).
pub struct CurrentUser {
    pub user: User,
    token: String,
}

impl CurrentUser {
    pub fn require(&self, role: Role) -> Result<(), AppError> {
        if self.user.role == role { Ok(()) } else { Err(AppError::Forbidden) }
    }
}

impl FromRequestParts<AppState> for CurrentUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, s: &AppState) -> Result<Self, Self::Rejection> {
        let token = token_from(&parts.headers).ok_or(AppError::Unauthorized)?;
        let user = sqlx::query_as::<_, User>(&format!(
            "SELECT {USER_COLS} FROM sessions s JOIN users u ON u.id = s.user_id \
             WHERE s.token = ?1 AND s.expires_at > unixepoch()"
        ))
        .bind(&token)
        .fetch_optional(&s.db)
        .await?
        .ok_or(AppError::Unauthorized)?;
        Ok(Self { user, token })
    }
}

fn token_from(h: &HeaderMap) -> Option<String> {
    let bearer = h
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));
    if let Some(t) = bearer {
        return Some(t.to_owned());
    }
    h.get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .find_map(|c| c.trim().strip_prefix(COOKIE)?.strip_prefix('='))
        .map(str::to_owned)
}

fn cookie(s: &AppState, token: &str, max_age: i64) -> String {
    let secure = if s.cookie_secure { "; Secure" } else { "" };
    format!("{COOKIE}={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age={max_age}{secure}")
}

async fn fetch_user(db: &SqlitePool, id: &str) -> Result<User, AppError> {
    Ok(sqlx::query_as::<_, User>(&format!("SELECT {USER_COLS} FROM users u WHERE u.id = ?1"))
        .bind(id)
        .fetch_one(db)
        .await?)
}

#[utoipa::path(
    post, path = "/api/auth/login", request_body = LoginReq,
    responses((status = 200, body = LoginRes), (status = 401, description = "NIM/email atau password salah"), (status = 429, description = "Terlalu banyak login gagal dari IP ini"))
)]
pub async fn login(State(s): State<AppState>, headers: HeaderMap, Json(req): Json<LoginReq>) -> Result<impl IntoResponse, AppError> {
    if crate::util::login_throttled(&s.db, &headers).await {
        return Err(AppError::TooMany);
    }
    let row: Option<(String, String)> =
        sqlx::query_as("SELECT id, password_hash FROM users WHERE email = ?1 OR nim = ?1")
            .bind(req.identifier.trim())
            .fetch_optional(&s.db)
            .await?;
    let ok = row.as_ref().and_then(|(_, hash)| PasswordHash::new(hash).ok()).is_some_and(|p| Argon2::default().verify_password(req.password.as_bytes(), &p).is_ok());
    let Some((user_id, _)) = row.filter(|_| ok) else {
        crate::util::log_access(&s.db, None, &headers, "login_gagal", req.identifier.trim()).await;
        return Err(AppError::BadLogin);
    };
    crate::util::log_access(&s.db, Some(&user_id), &headers, "login", "").await;

    // Catatan: token disimpan apa adanya di SQLite. Simpan hash-nya kalau DB bisa bocor ke pihak lain.
    let token = crate::util::random_hex(32);
    sqlx::query("INSERT INTO sessions (token, user_id, expires_at) VALUES (?1, ?2, unixepoch() + ?3)")
        .bind(&token)
        .bind(&user_id)
        .bind(TTL_SECS)
        .execute(&s.db)
        .await?;

    let user = fetch_user(&s.db, &user_id).await?;
    Ok(([(header::SET_COOKIE, cookie(&s, &token, TTL_SECS))], Json(LoginRes { token, user })))
}

#[utoipa::path(post, path = "/api/auth/logout", responses((status = 204)))]
pub async fn logout(State(s): State<AppState>, me: CurrentUser) -> Result<impl IntoResponse, AppError> {
    sqlx::query("DELETE FROM sessions WHERE token = ?1").bind(&me.token).execute(&s.db).await?;
    Ok((axum::http::StatusCode::NO_CONTENT, [(header::SET_COOKIE, cookie(&s, "", 0))]))
}

#[utoipa::path(get, path = "/api/me", responses((status = 200, body = User), (status = 401)))]
pub async fn me(me: CurrentUser) -> Json<User> {
    Json(me.user)
}
