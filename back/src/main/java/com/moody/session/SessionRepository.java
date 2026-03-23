package com.moody.session;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SessionRepository extends JpaRepository<Session, UUID> {

    Optional<Session> findByToken(UUID token);

    /** Find all active sessions for a board (heartbeat newer than the cutoff) */
    List<Session> findByBoardIdAndLastHeartbeatAfter(UUID boardId, Instant cutoff);

    /** Clean up dead sessions (no heartbeat since cutoff) */
    void deleteByLastHeartbeatBefore(Instant cutoff);
}
