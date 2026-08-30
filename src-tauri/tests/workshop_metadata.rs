use monarch_launcher::workshop::metadata::parse_published_file_details;

#[test]
fn normalizes_successful_workshop_details_and_skips_failed_items() {
    let body = r#"
    {
      "response": {
        "result": 1,
        "resultcount": 3,
        "publishedfiledetails": [
          {
            "publishedfileid": "1559212036",
            "result": 1,
            "title": "Community Framework",
            "preview_url": "https://cdn.example/cf.jpg",
            "creator": "76561198000000000"
          },
          {
            "publishedfileid": "2545327648",
            "result": 1,
            "title": "Dabs Framework",
            "preview_url": "https://cdn.example/dabs.jpg"
          },
          {
            "publishedfileid": "999",
            "result": 9,
            "title": "Unavailable"
          }
        ]
      }
    }
    "#;

    let result = parse_published_file_details(body).expect("parse Workshop response");

    assert_eq!(result.len(), 2);
    assert_eq!(result["1559212036"].title, "Community Framework");
    assert_eq!(
        result["1559212036"].preview_url.as_deref(),
        Some("https://cdn.example/cf.jpg")
    );
    assert_eq!(
        result["1559212036"].creator_id.as_deref(),
        Some("76561198000000000")
    );
    assert_eq!(result["2545327648"].title, "Dabs Framework");
    assert!(!result.contains_key("999"));
}

#[test]
fn accepts_a_successful_item_without_a_preview_image_or_creator() {
    let body = r#"
    {
      "response": {
        "result": 1,
        "publishedfiledetails": [
          {
            "publishedfileid": "42",
            "result": 1,
            "title": "No Preview"
          }
        ]
      }
    }
    "#;

    let result = parse_published_file_details(body).expect("parse Workshop response");
    assert_eq!(result["42"].preview_url, None);
    assert_eq!(result["42"].creator_id, None);
}
