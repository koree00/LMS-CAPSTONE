// Turns a chosen picture into a small square JPEG (data URL) so it is quick to
// save and show. Throws an Error with a message that is safe to show the user.
export async function toAvatarDataUrl(file, size = 256) {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("Please choose a JPG, PNG or WebP picture.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("That picture is larger than 10 MB. Please choose a smaller one.");
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file could not be read as a picture."));
      el.src = url;
    });

    // Crop the middle square, then shrink it
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // PNGs with see-through areas become white, not black
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
