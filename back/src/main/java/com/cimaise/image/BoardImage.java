package com.cimaise.image;

import com.cimaise.board.Board;
import jakarta.persistence.*;
import java.util.UUID;

/**
 * An image reference within a board.
 *
 * In connected mode, images are NOT stored on the server — only their
 * network path is saved (e.g. \\server\share\photo.jpg or /mnt/studio/photo.jpg).
 * The Electron client resolves the path and loads the image locally.
 *
 * Position/scale/rotation match the Konva.Image properties in the frontend.
 */
@Entity
@Table(name = "board_images")
public class BoardImage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    /** Network path or URL to the image file */
    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    @Column(nullable = false)
    private double width;

    @Column(nullable = false)
    private double height;

    @Column(name = "scale_x", nullable = false)
    private double scaleX = 1.0;

    @Column(name = "scale_y", nullable = false)
    private double scaleY = 1.0;

    @Column(nullable = false)
    private double rotation = 0.0;

    // Getters & Setters

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Board getBoard() { return board; }
    public void setBoard(Board board) { this.board = board; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getY() { return y; }
    public void setY(double y) { this.y = y; }

    public double getWidth() { return width; }
    public void setWidth(double width) { this.width = width; }

    public double getHeight() { return height; }
    public void setHeight(double height) { this.height = height; }

    public double getScaleX() { return scaleX; }
    public void setScaleX(double scaleX) { this.scaleX = scaleX; }

    public double getScaleY() { return scaleY; }
    public void setScaleY(double scaleY) { this.scaleY = scaleY; }

    public double getRotation() { return rotation; }
    public void setRotation(double rotation) { this.rotation = rotation; }
}
