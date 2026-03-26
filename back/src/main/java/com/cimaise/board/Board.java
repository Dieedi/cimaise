package com.cimaise.board;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA Entity: each instance = one row in the "boards" table.
 *
 * Annotations:
 * - @Entity: tells JPA "this class maps to a database table"
 * - @Table: customizes the table name (otherwise it would be "board")
 * - @Id + @GeneratedValue: primary key, auto-generated as UUID
 * - @Column: customizes column behavior (nullable, unique, etc.)
 * - @PrePersist / @PreUpdate: lifecycle hooks called by JPA before insert/update
 */
@Entity
@Table(name = "boards")
public class Board {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    /** Path to the .cim file on the shared drive (e.g. /data/shared/boards/my-board.cim) */
    @Column(name = "file_path", nullable = false, unique = true)
    private String filePath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Called automatically by JPA before INSERT */
    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    /** Called automatically by JPA before UPDATE */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters & Setters
    // Spring Boot n'utilise pas Lombok par défaut — on écrit les accesseurs à la main.
    // C'est verbeux mais explicite, et ça évite une dépendance magique.

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
