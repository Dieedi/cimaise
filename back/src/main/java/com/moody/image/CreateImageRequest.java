package com.moody.image;

import jakarta.validation.constraints.NotBlank;

public record CreateImageRequest(
    @NotBlank String filePath,
    double x,
    double y,
    double width,
    double height,
    Double scaleX,
    Double scaleY,
    Double rotation
) {}
