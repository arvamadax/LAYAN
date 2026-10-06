mod admin;
mod agent;
mod app_update;
mod auth;
mod backup;
mod board;
mod chat;
mod error;
mod fasilitas;
mod llm;
mod mock;
mod requests;
mod seed;
mod tools;
mod util;

use std::str::FromStr;
use std::sync::Arc;

use axum::extract::DefaultBodyLimit;
use axum::routing::{get, post};
use axum::{Json, Router};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
use utoipa::OpenApi;

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub cookie_secure: bool,
    pub llm: Arc<llm::Llm>,
    /// Satu agent berjalan per mahasiswa; mahasiswa lain tidak ikut mengantre.
    pub agent_locks: Arc<std::sync::Mutex<std::collections::HashMap<String, Arc<tokio::sync::Mutex<()>>>>>,
    pub upload_dir: String,
    pub app_dir: String,
}

#[derive(OpenApi)]
#[openapi(
    info(title = "LAYAN API", version = "0.3.0"),
    paths(
        health, auth::login, auth::logout, auth::me,
        chat::list, chat::send, chat::reset, chat::action, chat::upload,
        requests::mine, requests::detail, requests::cancel, requests::queue, requests::decide, requests::undo, requests::auto_rejected, requests::review, requests::metrics, requests::metrics_daily,
        board::list, board::set_status,
        app_update::latest, app_update::apk, admin::overview,
    ),
    components(schemas(
        auth::Role, auth::User, auth::LoginReq, auth::LoginRes,
        agent::ChatMessage, chat::SendReq, chat::ActionReq, requests::DecideReq, requests::ReviewReq, board::StatusReq,
    ))
)]
struct ApiDoc;

#[utoipa::path(get, path = "/api/health", responses((status = 200, body = String)))]
async fn health() -> &'static str {
    "ok"
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.to_owned())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // `cargo run -- --openapi > ../openapi.json` untuk generate client web dan Android.
    if std::env::args().any(|a| a == "--openapi") {
        println!("{}", ApiDoc::openapi().to_pretty_json()?);
        return Ok(());
    }

    dotenvy::dotenv().ok();
    let opts = SqliteConnectOptions::from_str(&env_or("DATABASE_URL", "sqlite://layan.db"))?
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal);
    let db = SqlitePoolOptions::new().connect_with(opts).await?;
    sqlx::migrate!().run(&db).await?;
    seed::run(&db).await?;

    let llm = llm::Llm::from_env();
    println!("LLM: {}", llm.name());
    backup::spawn(db.clone(), env_or("BACKUP_DIR", "backups"));
    let state = AppState {
        db,
        cookie_secure: env_or("COOKIE_SECURE", "0") == "1",
        llm: Arc::new(llm),
        agent_locks: Arc::default(),
        upload_dir: env_or("UPLOAD_DIR", "uploads"),
        app_dir: env_or("APP_DIR", "releases"),
    };

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/openapi.json", get(|| async { Json(ApiDoc::openapi()) }))
        .route("/api/auth/login", post(auth::login))
        .route("/api/auth/logout", post(auth::logout))
        .route("/api/me", get(auth::me))
        .route("/api/chat", get(chat::list).post(chat::send).delete(chat::reset))
        .route("/api/chat/action", post(chat::action))
        .route("/api/attachments", post(chat::upload).layer(DefaultBodyLimit::max(6 * 1024 * 1024)))
        .route("/api/attachments/{id}", get(chat::download))
        .route("/api/requests", get(requests::mine))
        .route("/api/requests/{id}", get(requests::detail))
        .route("/api/requests/{id}/cancel", post(requests::cancel))
        .route("/api/staff/queue", get(requests::queue))
        .route("/api/staff/requests/{id}/decide", post(requests::decide))
        .route("/api/staff/requests/{id}/undo", post(requests::undo))
        .route("/api/staff/auto-rejected", get(requests::auto_rejected))
        .route("/api/staff/requests/{id}/review", post(requests::review))
        .route("/api/staff/metrics", get(requests::metrics))
        .route("/api/staff/metrics/daily", get(requests::metrics_daily))
        .route("/api/public/stats", get(requests::public_stats))
        .route("/api/reports", get(board::list))
        .route("/api/reports/{id}/status", post(board::set_status))
        .route("/api/admin/overview", get(admin::overview))
        .route("/api/app/latest", get(app_update::latest))
        .route("/api/app/layan.apk", get(app_update::apk))
        .with_state(state);

    let addr = env_or("BIND", "127.0.0.1:8080");
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    println!("LAYAN API jalan di http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}
