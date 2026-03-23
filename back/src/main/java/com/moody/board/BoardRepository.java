package com.moody.board;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

/**
 * Spring Data JPA Repository.
 *
 * JpaRepository<Board, UUID> means:
 * - Board = the entity type
 * - UUID = the primary key type
 *
 * Spring auto-implements these methods (no code needed):
 * - findAll()          → SELECT * FROM boards
 * - findById(id)       → SELECT * FROM boards WHERE id = ?
 * - save(board)        → INSERT or UPDATE
 * - deleteById(id)     → DELETE FROM boards WHERE id = ?
 * - existsById(id)     → SELECT COUNT(*) FROM boards WHERE id = ?
 *
 * You can also declare custom queries by method name:
 * - findByTitle(title) → SELECT * FROM boards WHERE title = ?
 * Spring parses the method name and generates the SQL.
 */
public interface BoardRepository extends JpaRepository<Board, UUID> {
    boolean existsByFilePath(String filePath);
}
