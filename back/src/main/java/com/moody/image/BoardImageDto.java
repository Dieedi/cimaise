package com.moody.image;

import java.util.UUID;

public record BoardImageDto(
    UUID id,
    UUID boardId,
    String filePath,
    double x,
    double y,
    double width,
    double height,
    double scaleX,
    double scaleY,
    double rotation
) {
    public static BoardImageDto from(BoardImage img) {
        return new BoardImageDto(
            img.getId(),
            img.getBoard().getId(),
            img.getFilePath(),
            img.getX(),
            img.getY(),
            img.getWidth(),
            img.getHeight(),
            img.getScaleX(),
            img.getScaleY(),
            img.getRotation()
        );
    }
}
