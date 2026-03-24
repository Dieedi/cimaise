package com.moody.frame;

import com.moody.board.Board;
import com.moody.board.BoardService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class BoardFrameService {

    private final BoardFrameRepository repository;
    private final BoardService boardService;

    public BoardFrameService(BoardFrameRepository repository, BoardService boardService) {
        this.repository = repository;
        this.boardService = boardService;
    }

    public List<BoardFrame> findByBoard(UUID boardId) {
        boardService.findById(boardId);
        return repository.findByBoardId(boardId);
    }

    public BoardFrame findById(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new FrameNotFoundException(id));
    }

    @Transactional
    public BoardFrame create(UUID boardId, CreateFrameRequest request) {
        Board board = boardService.findById(boardId);

        BoardFrame frame = new BoardFrame();
        frame.setBoard(board);
        frame.setTitle(request.title() != null ? request.title() : "Frame");
        frame.setX(request.x());
        frame.setY(request.y());
        frame.setWidth(request.width());
        frame.setHeight(request.height());
        if (request.bgColor() != null) frame.setBgColor(request.bgColor());
        if (request.children() != null) frame.setChildren(request.children());

        return repository.save(frame);
    }

    @Transactional
    public BoardFrame update(UUID id, UpdateFrameRequest request) {
        BoardFrame frame = findById(id);
        if (request.title() != null) frame.setTitle(request.title());
        if (request.x() != null) frame.setX(request.x());
        if (request.y() != null) frame.setY(request.y());
        if (request.width() != null) frame.setWidth(request.width());
        if (request.height() != null) frame.setHeight(request.height());
        if (request.bgColor() != null) frame.setBgColor(request.bgColor());
        if (request.children() != null) frame.setChildren(request.children());
        return repository.save(frame);
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new FrameNotFoundException(id);
        }
        repository.deleteById(id);
    }
}
