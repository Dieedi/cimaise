package com.moody.frame;

import com.moody.board.Board;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * A frame within a board — a visual grouping zone with a title.
 *
 * children = list of image IDs that belong to this frame.
 * Stored as a simple UUID list (not a JPA relation) because images
 * can exist independently and the frame-image link is purely spatial.
 *
 * @ElementCollection: stores a list of values in a separate table
 * (board_frame_children) without needing a full entity.
 */
@Entity
@Table(name = "board_frames")
public class BoardFrame {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @Column(nullable = false)
    private String title = "Frame";

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    @Column(nullable = false)
    private double width;

    @Column(nullable = false)
    private double height;

    /** Background color (hex, e.g. "#2a2a2a") */
    @Column(nullable = false)
    private String bgColor = "#2a2a2a";

    /** IDs of images attached to this frame */
    @ElementCollection
    @CollectionTable(name = "board_frame_children", joinColumns = @JoinColumn(name = "frame_id"))
    @Column(name = "image_id")
    private List<UUID> children = new ArrayList<>();

    // Getters & Setters

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Board getBoard() { return board; }
    public void setBoard(Board board) { this.board = board; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public double getX() { return x; }
    public void setX(double x) { this.x = x; }

    public double getY() { return y; }
    public void setY(double y) { this.y = y; }

    public double getWidth() { return width; }
    public void setWidth(double width) { this.width = width; }

    public double getHeight() { return height; }
    public void setHeight(double height) { this.height = height; }

    public String getBgColor() { return bgColor; }
    public void setBgColor(String bgColor) { this.bgColor = bgColor; }

    public List<UUID> getChildren() { return children; }
    public void setChildren(List<UUID> children) { this.children = children; }
}
