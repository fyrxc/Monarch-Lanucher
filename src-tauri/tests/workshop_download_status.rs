use monarch_launcher::workshop::steamworks_ugc::download_progress_percent;

#[test]
fn reports_workshop_download_progress_without_guessing() {
    assert_eq!(download_progress_percent(0, 100), Some(0));
    assert_eq!(download_progress_percent(25, 100), Some(25));
    assert_eq!(download_progress_percent(100, 100), Some(100));
    assert_eq!(download_progress_percent(150, 100), Some(100));
    assert_eq!(download_progress_percent(0, 0), None);
}
