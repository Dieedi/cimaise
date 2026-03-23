package com.moody.image;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BoardImageRepository extends JpaRepository<BoardImage, UUID> {
    List<BoardImage> findByBoardId(UUID boardId);
    void deleteByBoardId(UUID boardId);
}
