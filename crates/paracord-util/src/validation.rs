use thiserror::Error;

#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("value is too short (min {min}, got {got})")]
    TooShort { min: usize, got: usize },
    #[error("value is too long (max {max}, got {got})")]
    TooLong { max: usize, got: usize },
    #[error("invalid characters")]
    InvalidCharacters,
    #[error("invalid format")]
    InvalidFormat,
}

pub fn validate_username(name: &str) -> Result<(), ValidationError> {
    let len = name.len();
    if len < 2 {
        return Err(ValidationError::TooShort { min: 2, got: len });
    }
    if len > 32 {
        return Err(ValidationError::TooLong { max: 32, got: len });
    }
    if !name.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err(ValidationError::InvalidCharacters);
    }
    Ok(())
}

pub fn validate_guild_name(name: &str) -> Result<(), ValidationError> {
    let len = name.len();
    if len < 2 {
        return Err(ValidationError::TooShort { min: 2, got: len });
    }
    if len > 100 {
        return Err(ValidationError::TooLong { max: 100, got: len });
    }
    Ok(())
}

pub fn validate_channel_name(name: &str) -> Result<(), ValidationError> {
    let len = name.len();
    if len < 1 {
        return Err(ValidationError::TooShort { min: 1, got: len });
    }
    if len > 100 {
        return Err(ValidationError::TooLong { max: 100, got: len });
    }
    if !name.chars().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_') {
        return Err(ValidationError::InvalidCharacters);
    }
    Ok(())
}

pub fn validate_message_content(content: &str) -> Result<(), ValidationError> {
    let len = content.len();
    if len < 1 {
        return Err(ValidationError::TooShort { min: 1, got: len });
    }
    if len > 2000 {
        return Err(ValidationError::TooLong { max: 2000, got: len });
    }
    Ok(())
}

pub fn validate_email(email: &str) -> Result<(), ValidationError> {
    if email.len() > 255 {
        return Err(ValidationError::TooLong { max: 255, got: email.len() });
    }
    let parts: Vec<&str> = email.splitn(2, '@').collect();
    if parts.len() != 2 || parts[0].is_empty() || parts[1].is_empty() {
        return Err(ValidationError::InvalidFormat);
    }
    if !parts[1].contains('.') {
        return Err(ValidationError::InvalidFormat);
    }
    Ok(())
}

pub fn validate_password(password: &str) -> Result<(), ValidationError> {
    let len = password.len();
    if len < 8 {
        return Err(ValidationError::TooShort { min: 8, got: len });
    }
    Ok(())
}
