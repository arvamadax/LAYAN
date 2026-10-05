use axum::{http::StatusCode, response::IntoResponse, Json};
use serde_json::json;

pub enum AppError {
    BadLogin,
    TooMany,
    Unauthorized,
    Forbidden,
    NotFound,
    /// Pesan aman untuk ditampilkan ke pengguna.
    Bad(String),
    Internal(anyhow::Error),
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        Self::Internal(e.into())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        Self::Internal(e)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, msg) = match self {
            Self::BadLogin => (StatusCode::UNAUTHORIZED, "NIM/email atau password salah.".into()),
            Self::TooMany => (StatusCode::TOO_MANY_REQUESTS, "Terlalu banyak percobaan masuk. Coba lagi dalam 10 menit.".into()),
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Sesi berakhir. Silakan masuk lagi.".into()),
            Self::Forbidden => (StatusCode::FORBIDDEN, "Kamu tidak punya akses ke halaman ini.".into()),
            Self::NotFound => (StatusCode::NOT_FOUND, "Data tidak ditemukan.".into()),
            Self::Bad(m) => (StatusCode::BAD_REQUEST, m),
            Self::Internal(e) => {
                eprintln!("internal error: {e:#}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Terjadi kesalahan di server. Coba lagi.".into())
            }
        };
        (status, Json(json!({ "error": msg }))).into_response()
    }
}
