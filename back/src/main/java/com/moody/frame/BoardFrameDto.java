package com.moody.frame;

import java.util.List;
import java.util.UUID;

public record BoardFrameDto(
    UUID id,
    UUID boardId,
    String title,
    double x,
    double y,
    double width,
    double height,
    List<UUID> children
) {
    public static BoardFrameDto from(BoardFrame frame) {
        return new BoardFrameDto(
            frame.getId(),
            frame.getBoard().getId(),
            frame.getTitle(),
            frame.getX(),
            frame.getY(),
            frame.getWidth(),
            frame.getHeight(),
            frame.getChildren()
        );
    }
}
