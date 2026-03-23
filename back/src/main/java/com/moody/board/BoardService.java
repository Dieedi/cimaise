package com.moody.board;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

/**
 * Business logic layer for boards.
 *
 * @Service: tells Spring to manage this class as a singleton bean.
 * Spring injects it automatically wherever it's needed (dependency injection,
 * same concept as Angular's providedIn: 'root').
 *
 * The constructor injection pattern (no @Autowired needed since Spring 4.3):
 * Spring sees the constructor, finds a BoardRepository bean, and injects it.
 */
@Service
public class BoardService {

    private final BoardRepository repository;

    public BoardService(BoardRepository repository) {
        this.repository = repository;
    }

    public List<Board> findAll() {
        return repository.findAll();
    }

    public Board findById(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new BoardNotFoundException(id));
    }

    public Board create(CreateBoardRequest request) {
        if (repository.existsByFilePath(request.filePath())) {
            throw new IllegalArgumentException("A board with this file path already exists");
        }
        Board board = new Board();
        board.setTitle(request.title());
        board.setFilePath(request.filePath());
        return repository.save(board);
    }

    public Board update(UUID id, UpdateBoardRequest request) {
        Board board = findById(id);
        if (request.title() != null) {
            board.setTitle(request.title());
        }
        if (request.filePath() != null) {
            board.setFilePath(request.filePath());
        }
        return repository.save(board);
    }

    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new BoardNotFoundException(id);
        }
        repository.deleteById(id);
    }
}
