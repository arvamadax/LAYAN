use std::path::Path;

const KEEP: usize = 7;

/// Salinan harian database lewat VACUUM INTO (aman saat API berjalan, tanpa binary sqlite3).
/// Jalan saat start lalu tiap 6 jam. Satu file per hari, hanya KEEP terbaru yang disimpan.
/// Folder `uploads/` tidak ikut: salin terpisah kalau lampiran perlu dicadangkan.
pub fn spawn(db: sqlx::SqlitePool, dir: String) {
    tokio::spawn(async move {
        loop {
            if let Err(e) = run(&db, &dir).await {
                eprintln!("backup gagal: {e:#}");
            }
            tokio::time::sleep(std::time::Duration::from_secs(6 * 3600)).await;
        }
    });
}

async fn run(db: &sqlx::SqlitePool, dir: &str) -> anyhow::Result<()> {
    tokio::fs::create_dir_all(dir).await?;
    let day: String = sqlx::query_scalar("SELECT date('now', 'localtime')").fetch_one(db).await?;
    let file = Path::new(dir).join(format!("layan-{day}.db"));
    if !file.exists() {
        // Tulis ke .tmp lalu rename, supaya salinan setengah jadi tidak dianggap backup.
        let tmp = file.with_extension("db.tmp");
        let _ = tokio::fs::remove_file(&tmp).await;
        sqlx::query("VACUUM INTO ?1").bind(tmp.to_string_lossy().into_owned()).execute(db).await?;
        tokio::fs::rename(&tmp, &file).await?;
    }
    let mut names = Vec::new();
    let mut rd = tokio::fs::read_dir(dir).await?;
    while let Some(e) = rd.next_entry().await? {
        names.push(e.file_name().to_string_lossy().into_owned());
    }
    for old in to_prune(names, KEEP) {
        let _ = tokio::fs::remove_file(Path::new(dir).join(old)).await;
    }
    Ok(())
}

fn to_prune(mut names: Vec<String>, keep: usize) -> Vec<String> {
    names.retain(|n| n.starts_with("layan-") && n.ends_with(".db"));
    names.sort();
    names.truncate(names.len().saturating_sub(keep));
    names
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prune_sisakan_terbaru() {
        let n = |v: &[&str]| v.iter().map(|s| s.to_string()).collect::<Vec<_>>();
        let names = n(&["layan-2026-10-01.db", "layan-2026-10-03.db", "layan-2026-10-02.db", "catatan.txt", "layan-2026-10-04.db.tmp"]);
        assert_eq!(to_prune(names, 2), n(&["layan-2026-10-01.db"]));
        assert!(to_prune(n(&["layan-2026-10-01.db"]), 7).is_empty());
    }

    #[tokio::test]
    async fn backup_membuat_salinan() {
        // VACUUM INTO tidak jalan di database memori, jadi tes memakai file sementara.
        let dir = std::env::temp_dir().join(format!("layan-bk-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let opts = sqlx::sqlite::SqliteConnectOptions::new().filename(dir.join("src.db")).create_if_missing(true);
        let db = sqlx::sqlite::SqlitePoolOptions::new().max_connections(1).connect_with(opts).await.unwrap();
        sqlx::migrate!().run(&db).await.unwrap();
        let dir = dir.join("backups");
        run(&db, dir.to_str().unwrap()).await.unwrap();
        run(&db, dir.to_str().unwrap()).await.unwrap(); // kedua kali tidak error, file hari ini sudah ada
        let count = std::fs::read_dir(&dir).unwrap().filter(|e| e.as_ref().unwrap().file_name().to_string_lossy().ends_with(".db")).count();
        assert_eq!(count, 1);
        std::fs::remove_dir_all(dir.parent().unwrap()).ok();
    }
}
