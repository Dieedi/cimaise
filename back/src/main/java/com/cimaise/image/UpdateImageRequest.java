package com.cimaise.image;

public record UpdateImageRequest(
    String filePath,
    Double x,
    Double y,
    Double width,
    Double height,
    Double scaleX,
    Double scaleY,
    Double rotation
) {}
