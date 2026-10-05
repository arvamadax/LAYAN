//! Helper kecil: waktu WIB tanpa crate tanggal.

const WIB: i64 = 7 * 3600;
const BULAN: [&str; 12] = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

pub fn now() -> i64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

/// "09.15"
pub fn clock(at: i64) -> String {
    let t = at + WIB;
    format!("{:02}.{:02}", (t / 3600).rem_euclid(24), (t / 60).rem_euclid(60))
}

/// (tahun, bulan 1-12, tanggal) dari hari sejak epoch. Algoritma civil_from_days (H. Hinnant).
fn civil(days: i64) -> (i64, usize, i64) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (yoe + era * 400 + i64::from(m <= 2), m as usize, d)
}

/// "09.15" untuk hari ini, "Kemarin", atau "12 Sep".
pub fn when(at: i64) -> String {
    let day = |t: i64| (t + WIB).div_euclid(86_400);
    match day(now()) - day(at) {
        0 => clock(at),
        1 => "Kemarin".into(),
        _ => {
            let (_, m, d) = civil(day(at));
            format!("{d} {}", BULAN[m - 1])
        }
    }
}

/// "2026-08-14" -> "14 Agu 2026"
pub fn tanggal(iso: &str) -> String {
    let p: Vec<&str> = iso.split('-').collect();
    match (p.first(), p.get(1).and_then(|m| m.parse::<usize>().ok()), p.get(2)) {
        (Some(y), Some(m @ 1..=12), Some(d)) => format!("{} {} {y}", d.trim_start_matches('0'), BULAN[m - 1]),
        _ => iso.to_owned(),
    }
}

const BULAN_PANJANG: [&str; 12] = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
pub const HARI: [&str; 7] = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/// Nomor hari (sejak epoch) menurut WIB.
pub fn day_of(at: i64) -> i64 {
    (at + WIB).div_euclid(86_400)
}

/// Awal hari ini (WIB) dalam detik epoch.
pub fn today_start() -> i64 {
    day_of(now()) * 86_400 - WIB
}

/// 0 = Minggu. 1 Jan 1970 hari Kamis.
pub fn weekday(days: i64) -> usize {
    (days + 4).rem_euclid(7) as usize
}

/// Kebalikan civil(): tanggal -> nomor hari.
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = y.div_euclid(400);
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

pub fn iso(days: i64) -> String {
    let (y, m, d) = civil(days);
    format!("{y}-{m:02}-{d:02}")
}

/// "2026-10-02" -> nomor hari. None kalau format salah.
pub fn parse_iso(s: &str) -> Option<i64> {
    let p: Vec<i64> = s.trim().split('-').map(|x| x.parse().ok()).collect::<Option<_>>()?;
    match p[..] {
        [y, m @ 1..=12, d @ 1..=31] => Some(days_from_civil(y, m, d)),
        _ => None,
    }
}

/// "Jumat, 2 Okt"
pub fn day_label(days: i64) -> String {
    let (_, m, d) = civil(days);
    format!("{}, {d} {}", HARI[weekday(days)], BULAN[m - 1])
}

/// (singkatan hari, tanggal, bulan) untuk blok kalender: ("JUM", "2", "Okt")
pub fn day_parts(days: i64) -> (String, String, String) {
    let (_, m, d) = civil(days);
    (HARI[weekday(days)][..3].to_uppercase(), d.to_string(), BULAN[m - 1].to_owned())
}

/// "Selasa, 29 September 2026" untuk konteks LLM.
pub fn today_long() -> String {
    let t = day_of(now());
    let (y, m, d) = civil(t);
    format!("{}, {d} {} {y} ({})", HARI[weekday(t)], BULAN_PANJANG[m - 1], iso(t))
}

/// "13:00" -> "13.00"
pub fn hm(s: &str) -> String {
    s.replace(':', ".")
}

/// IP asli pengguna. Di server, Cloudflare Tunnel mengisi CF-Connecting-IP; lokal jatuh ke X-Forwarded-For dari Next.js.
pub fn client_ip(h: &axum::http::HeaderMap) -> String {
    let get = |k: &str| h.get(k).and_then(|v| v.to_str().ok()).map(|v| v.split(',').next().unwrap_or("").trim().to_owned()).filter(|v| !v.is_empty());
    get("cf-connecting-ip").or_else(|| get("x-forwarded-for")).or_else(|| get("x-real-ip")).unwrap_or_else(|| "-".into())
}

/// Catat akses untuk pemantauan admin. Gagal mencatat tidak boleh menggagalkan layanan, cukup dilog.
pub async fn log_access(db: &sqlx::SqlitePool, user: Option<&str>, h: &axum::http::HeaderMap, action: &str, detail: &str) {
    let detail: String = detail.chars().take(160).collect();
    if let Err(e) = sqlx::query("INSERT INTO access_log (user_id, ip, action, detail) VALUES (?1, ?2, ?3, ?4)")
        .bind(user).bind(client_ip(h)).bind(action).bind(detail)
        .execute(db)
        .await
    {
        eprintln!("access_log gagal: {e}");
    }
}

/// Batas login gagal per IP dalam 10 menit.
pub const LOGIN_MAX_FAILS: i64 = 10;

/// True kalau IP ini sudah terlalu sering gagal login. IP tak dikenal ("-") tidak dibatasi,
/// supaya satu header yang hilang tidak mengunci semua orang sekaligus.
pub async fn login_throttled(db: &sqlx::SqlitePool, h: &axum::http::HeaderMap) -> bool {
    let ip = client_ip(h);
    if ip == "-" {
        return false;
    }
    sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM access_log WHERE action = 'login_gagal' AND ip = ?1 AND at > unixepoch() - 600")
        .bind(ip)
        .fetch_one(db)
        .await
        .is_ok_and(|n| n >= LOGIN_MAX_FAILS)
}

/// Hex acak kriptografis, dipakai untuk token sesi dan id lampiran.
pub fn random_hex(bytes: usize) -> String {
    use argon2::password_hash::rand_core::{OsRng, RngCore};
    let mut b = vec![0u8; bytes];
    OsRng.fill_bytes(&mut b);
    b.iter().map(|x| format!("{x:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_waktu() {
        assert_eq!(clock(0), "07.00");
        assert_eq!(civil(0), (1970, 1, 1));
        assert_eq!(civil(20_725), (2026, 9, 29));
        assert_eq!(tanggal("2026-08-14"), "14 Agu 2026");
        assert_eq!(tanggal("rusak"), "rusak");
        assert_eq!(parse_iso("2026-10-02").map(day_label).as_deref(), Some("Jumat, 2 Okt"));
        assert_eq!(parse_iso("2026-10-02").map(iso).as_deref(), Some("2026-10-02"));
        assert_eq!(weekday(20_725), 2); // Selasa
        assert_eq!(parse_iso("2026-13-01"), None);
    }

    #[tokio::test]
    async fn login_throttle_per_ip() {
        use axum::http::HeaderMap;
        let db = sqlx::sqlite::SqlitePoolOptions::new().max_connections(1).connect("sqlite::memory:").await.unwrap();
        sqlx::migrate!().run(&db).await.unwrap();
        let ip = |v: &str| {
            let mut h = HeaderMap::new();
            h.insert("cf-connecting-ip", v.parse().unwrap());
            h
        };
        let (a, b) = (ip("1.2.3.4"), ip("5.6.7.8"));
        for _ in 0..LOGIN_MAX_FAILS {
            assert!(!login_throttled(&db, &a).await);
            log_access(&db, None, &a, "login_gagal", "x").await;
        }
        assert!(login_throttled(&db, &a).await);
        assert!(!login_throttled(&db, &b).await);
        assert!(!login_throttled(&db, &HeaderMap::new()).await);
    }
}
