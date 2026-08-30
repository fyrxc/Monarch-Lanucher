use monarch_launcher::updates::{summarize_update, UpdateCandidate};

#[test]
fn no_candidate_reports_current_version_as_up_to_date() {
    let info = summarize_update("0.4.7", None);

    assert!(!info.available);
    assert_eq!(info.current_version, "0.4.7");
    assert_eq!(info.latest_version, None);
    assert_eq!(info.notes, None);
}

#[test]
fn newer_candidate_reports_version_and_release_notes() {
    let info = summarize_update(
        "0.4.7",
        Some(UpdateCandidate {
            version: "0.4.8".to_string(),
            notes: Some("Faster server refresh and updater fixes.".to_string()),
        }),
    );

    assert!(info.available);
    assert_eq!(info.current_version, "0.4.7");
    assert_eq!(info.latest_version.as_deref(), Some("0.4.8"));
    assert_eq!(
        info.notes.as_deref(),
        Some("Faster server refresh and updater fixes.")
    );
}
