package com.moody.image;

import java.util.UUID;

public class ImageNotFoundException extends RuntimeException {
    public ImageNotFoundException(UUID id) {
        super("Image not found: " + id);
    }
}
