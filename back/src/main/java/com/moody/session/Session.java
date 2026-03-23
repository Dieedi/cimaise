package com.moody.session;

import com.moody.board.Board;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Represents an active client working on a board.
 *
 * Each Electron instance that opens a board gets one Session.
 * The token acts as a lightweight credential (no auth needed on LAN).
 *
 * @ManyToOne: multiple sessions can point to the same board
 * (= multiple people working on the same board).
 */
@Entity
@Table(name = "sessions")
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Unique token the client uses to identify itself in subsequent requests */
    @Column(nullable = false, unique = true)
    private UUID token;

    /** Display name of the client (e.g. machine name or user-chosen name) */
    @Column(name = "client_name", nullable = false)
    private String clientName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /** Last heartbeat received from the client */
    @Column(name = "last_heartbeat", nullable = false)
    private Instant lastHeartbeat;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.lastHeartbeat = Instant.now();
        if (this.token == null) {
            this.token = UUID.randomUUID();
        }
    }

    // Getters & Setters

    public UUID getId() { return id; }

    public UUID getToken() { return token; }
    public void setToken(UUID token) { this.token = token; }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public Board getBoard() { return board; }
    public void setBoard(Board board) { this.board = board; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getLastHeartbeat() { return lastHeartbeat; }
    public void setLastHeartbeat(Instant lastHeartbeat) { this.lastHeartbeat = lastHeartbeat; }
}
