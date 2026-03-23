package com.moody.session;

import java.util.UUID;

public class SessionNotFoundException extends RuntimeException {
    public SessionNotFoundException(UUID token) {
        super("Session not found for token: " + token);
    }
}
