use std::fs;
use std::path::Path;

#[derive(Debug, Clone, PartialEq, Eq)]
enum Token {
    Text(String),
    Open,
    Close,
}

pub fn parse_persona_name(body: &str) -> Option<String> {
    let tokens = tokenize(body);
    let users_index = tokens
        .iter()
        .position(|token| matches!(token, Token::Text(value) if value.eq_ignore_ascii_case("users")))?;

    let mut index = users_index + 1;
    while index < tokens.len() && !matches!(tokens[index], Token::Open) {
        index += 1;
    }
    if index >= tokens.len() {
        return None;
    }
    index += 1;

    let mut first_persona = None;
    let mut most_recent_persona = None;

    while index < tokens.len() {
        match &tokens[index] {
            Token::Close => break,
            Token::Text(account_id) if account_id.parse::<u64>().is_ok() => {
                index += 1;
                if index >= tokens.len() || !matches!(tokens[index], Token::Open) {
                    continue;
                }

                let (persona, most_recent, next_index) = parse_account(&tokens, index + 1);
                index = next_index;

                if let Some(persona) = persona.filter(|value| !value.trim().is_empty()) {
                    if first_persona.is_none() {
                        first_persona = Some(persona.clone());
                    }
                    if most_recent {
                        most_recent_persona = Some(persona);
                    }
                }
            }
            _ => index += 1,
        }
    }

    most_recent_persona.or(first_persona)
}

pub fn detect_persona_name(steam_root: &Path) -> Option<String> {
    let body = fs::read_to_string(steam_root.join("config").join("loginusers.vdf")).ok()?;
    parse_persona_name(&body)
}

pub fn resolve_player_name(saved_name: &str, steam_persona_name: Option<&str>) -> String {
    let saved_name = saved_name.trim();
    if !saved_name.is_empty() {
        return saved_name.to_string();
    }

    steam_persona_name
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or_default()
        .to_string()
}

fn parse_account(tokens: &[Token], mut index: usize) -> (Option<String>, bool, usize) {
    let mut depth = 1usize;
    let mut persona = None;
    let mut most_recent = false;

    while index < tokens.len() && depth > 0 {
        match &tokens[index] {
            Token::Open => {
                depth += 1;
                index += 1;
            }
            Token::Close => {
                depth -= 1;
                index += 1;
            }
            Token::Text(key) if depth == 1 => {
                let value = match tokens.get(index + 1) {
                    Some(Token::Text(value)) => Some(value.as_str()),
                    _ => None,
                };

                if let Some(value) = value {
                    if key.eq_ignore_ascii_case("PersonaName") {
                        persona = Some(value.to_string());
                    } else if key.eq_ignore_ascii_case("MostRecent") {
                        most_recent = value == "1";
                    }
                    index += 2;
                } else {
                    index += 1;
                }
            }
            _ => index += 1,
        }
    }

    (persona, most_recent, index)
}

fn tokenize(body: &str) -> Vec<Token> {
    let mut tokens = Vec::new();
    let mut chars = body.chars().peekable();

    while let Some(ch) = chars.next() {
        match ch {
            ch if ch.is_whitespace() => {}
            '{' => tokens.push(Token::Open),
            '}' => tokens.push(Token::Close),
            '"' => {
                let mut value = String::new();
                while let Some(next) = chars.next() {
                    match next {
                        '"' => break,
                        '\\' => match chars.peek().copied() {
                            Some('"') | Some('\\') => {
                                if let Some(escaped) = chars.next() {
                                    value.push(escaped);
                                }
                            }
                            _ => value.push('\\'),
                        },
                        _ => value.push(next),
                    }
                }
                tokens.push(Token::Text(value));
            }
            _ => {
                let mut value = String::from(ch);
                while let Some(next) = chars.peek().copied() {
                    if next.is_whitespace() || matches!(next, '{' | '}') {
                        break;
                    }
                    chars.next();
                    value.push(next);
                }
                tokens.push(Token::Text(value));
            }
        }
    }

    tokens
}
