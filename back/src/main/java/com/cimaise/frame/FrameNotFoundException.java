package com.cimaise.frame;

import java.util.UUID;

public class FrameNotFoundException extends RuntimeException {
    public FrameNotFoundException(UUID id) {
        super("Frame not found: " + id);
    }
}
