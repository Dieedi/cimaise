package com.moody.board;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO for API responses. Controls what the client sees.
 *
 * Why not return the Entity directly?
 * - Security: the entity might have fields you don't want to expose
 * - Stability: you can change the DB schema without breaking the API
 * - Clarity: the DTO is the API contract, the entity is the DB contract
 *
 * Java Records (since Java 16): immutable data class with auto-generated
 * constructor, getters, equals, hashCode, toString. Perfect for DTOs.
 */
public record BoardDto(
    UUID id,
    String title,
    String filePath,
    Instant createdAt,
    Instant updatedAt
) {
    /** Convert entity to DTO */
    public static BoardDto from(Board board) {
        return new BoardDto(
            board.getId(),
            board.getTitle(),
            board.getFilePath(),
            board.getCreatedAt(),
            board.getUpdatedAt()
        );
    }
}
