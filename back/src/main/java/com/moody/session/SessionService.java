package com.moody.session;

import com.moody.board.Board;
import com.moody.board.BoardService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Manages client sessions on boards.
 *
 * Key concept: a session is considered "alive" if its last heartbeat
 * is within the timeout window. Dead sessions are cleaned up periodically.
 *
 * @Value injects values from application.yml (or env vars).
 * @Scheduled runs a method on a timer (like setInterval in JS).
 * @Transactional wraps the method in a DB transaction (commit on success, rollback on error).
 */
@Service
public class SessionService {

    private final SessionRepository repository;
    private final BoardService boardService;

    /** How long before a session without heartbeat is considered dead */
    @Value("${moody.session.timeout-seconds:30}")
    private int timeoutSeconds;

    public SessionService(SessionRepository repository, BoardService boardService) {
        this.repository = repository;
        this.boardService = boardService;
    }

    /**
     * Open a board: create a session and return who else is working on it.
     */
    @Transactional
    public OpenBoardResponse openBoard(OpenBoardRequest request) {
        Board board = boardService.findById(request.boardId());

        // Find other active sessions on this board
        Instant cutoff = Instant.now().minus(Duration.ofSeconds(timeoutSeconds));
        List<Session> activeSessions = repository.findByBoardIdAndLastHeartbeatAfter(
            board.getId(), cutoff
        );

        List<String> otherClients = activeSessions.stream()
            .map(Session::getClientName)
            .toList();

        // Create new session
        Session session = new Session();
        session.setClientName(request.clientName());
        session.setBoard(board);
        repository.save(session);

        return new OpenBoardResponse(session.getToken(), otherClients);
    }

    /**
     * Heartbeat: the client signals it's still alive.
     */
    @Transactional
    public void heartbeat(UUID token) {
        Session session = repository.findByToken(token)
            .orElseThrow(() -> new SessionNotFoundException(token));
        session.setLastHeartbeat(Instant.now());
        repository.save(session);
    }

    /**
     * Close session: the client explicitly disconnects.
     */
    @Transactional
    public void close(UUID token) {
        Session session = repository.findByToken(token)
            .orElseThrow(() -> new SessionNotFoundException(token));
        repository.delete(session);
    }

    /**
     * List active sessions for a board.
     */
    public List<Session> getActiveSessions(UUID boardId) {
        Instant cutoff = Instant.now().minus(Duration.ofSeconds(timeoutSeconds));
        return repository.findByBoardIdAndLastHeartbeatAfter(boardId, cutoff);
    }

    /**
     * Periodic cleanup: remove dead sessions.
     * Interval is configured in application.yml (moody.session.cleanup-interval-ms).
     * Runs automatically thanks to @Scheduled.
     */
    @Scheduled(fixedRateString = "${moody.session.cleanup-interval-ms:60000}")
    @Transactional
    public void cleanupDeadSessions() {
        Instant cutoff = Instant.now().minus(Duration.ofSeconds(timeoutSeconds));
        repository.deleteByLastHeartbeatBefore(cutoff);
    }
}
