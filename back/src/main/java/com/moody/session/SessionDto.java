package com.moody.session;

import java.time.Instant;
import java.util.UUID;

public record SessionDto(
    UUID token,
    String clientName,
    UUID boardId,
    Instant createdAt,
    Instant lastHeartbeat
) {
    public static SessionDto from(Session session) {
        return new SessionDto(
            session.getToken(),
            session.getClientName(),
            session.getBoard().getId(),
            session.getCreatedAt(),
            session.getLastHeartbeat()
        );
    }
}
