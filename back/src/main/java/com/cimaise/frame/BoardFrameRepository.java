package com.cimaise.frame;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BoardFrameRepository extends JpaRepository<BoardFrame, UUID> {
    List<BoardFrame> findByBoardId(UUID boardId);
    void deleteByBoardId(UUID boardId);
}
