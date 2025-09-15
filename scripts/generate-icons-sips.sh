#!/bin/bash

# Icon sizes needed for PWA
sizes=(72 96 128 144 152 192 384 512)

# Base icon path
base_icon="public/icons/base-icon.png"

# Generate icons for public directory
for size in "${sizes[@]}"; do
    output_file="public/icons/icon-${size}x${size}.png"
    sips -z $size $size "$base_icon" --out "$output_file" >/dev/null 2>&1
    echo "✅ Created icon-${size}x${size}.png"
done

# Copy to dist/icons if dist exists
if [ -d "dist" ]; then
    mkdir -p dist/icons
    for size in "${sizes[@]}"; do
        cp "public/icons/icon-${size}x${size}.png" "dist/icons/icon-${size}x${size}.png"
    done
    echo "✅ Copied all icons to dist/icons"
fi

echo "🎉 All PWA icons generated successfully!"