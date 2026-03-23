package com.moody.image;

import com.moody.board.Board;
import com.moody.board.BoardService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class BoardImageService {

    private final BoardImageRepository repository;
    private final BoardService boardService;

    public BoardImageService(BoardImageRepository repository, BoardService boardService) {
        this.repository = repository;
        this.boardService = boardService;
    }

    public List<BoardImage> findByBoard(UUID boardId) {
        boardService.findById(boardId); // validates board exists
        return repository.findByBoardId(boardId);
    }

    public BoardImage findById(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ImageNotFoundException(id));
    }

    @Transactional
    public BoardImage create(UUID boardId, CreateImageRequest request) {
        Board board = boardService.findById(boardId);

        BoardImage img = new BoardImage();
        img.setBoard(board);
        img.setFilePath(request.filePath());
        img.setX(request.x());
        img.setY(request.y());
        img.setWidth(request.width());
        img.setHeight(request.height());
        if (request.scaleX() != null) img.setScaleX(request.scaleX());
        if (request.scaleY() != null) img.setScaleY(request.scaleY());
        if (request.rotation() != null) img.setRotation(request.rotation());

        return repository.save(img);
    }

    @Transactional
    public BoardImage update(UUID id, UpdateImageRequest request) {
        BoardImage img = findById(id);
        if (request.filePath() != null) img.setFilePath(request.filePath());
        if (request.x() != null) img.setX(request.x());
        if (request.y() != null) img.setY(request.y());
        if (request.width() != null) img.setWidth(request.width());
        if (request.height() != null) img.setHeight(request.height());
        if (request.scaleX() != null) img.setScaleX(request.scaleX());
        if (request.scaleY() != null) img.setScaleY(request.scaleY());
        if (request.rotation() != null) img.setRotation(request.rotation());
        return repository.save(img);
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new ImageNotFoundException(id);
        }
        repository.deleteById(id);
    }
}
