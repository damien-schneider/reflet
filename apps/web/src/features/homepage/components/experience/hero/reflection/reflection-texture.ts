const TOKEN_REFERENCE = /var\((--[\w-]+)\)/g;

export function observePreviewImage(
  preview: SVGSVGElement,
  onImage: (image: HTMLImageElement | null) => void
) {
  let revision = 0;
  function refreshImage() {
    const requestedRevision = ++revision;
    const palette = getComputedStyle(preview);
    const source = new XMLSerializer()
      .serializeToString(preview)
      .replaceAll(TOKEN_REFERENCE, (_match: string, token: string) =>
        palette
          .getPropertyValue(token)
          .trim()
          .replaceAll("&", "&amp;")
          .replaceAll('"', "&quot;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
      );
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    image.decode().then(
      () => {
        if (requestedRevision === revision) {
          onImage(image);
        }
      },
      () => {
        if (requestedRevision === revision) {
          onImage(null);
        }
      }
    );
  }
  const theme = new MutationObserver(refreshImage);
  theme.observe(document.documentElement, {
    attributeFilter: ["class"],
    attributes: true,
  });
  const content = new MutationObserver(refreshImage);
  content.observe(preview, {
    attributeFilter: ["data-moment"],
    attributes: true,
  });
  refreshImage();
  return () => {
    revision += 1;
    theme.disconnect();
    content.disconnect();
  };
}

export function createReflectionTexture(
  context: WebGLRenderingContext,
  image: HTMLImageElement
) {
  const texture = context.createTexture();
  if (!texture) {
    return null;
  }
  context.bindTexture(context.TEXTURE_2D, texture);
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_MIN_FILTER,
    context.LINEAR
  );
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_MAG_FILTER,
    context.LINEAR
  );
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_WRAP_S,
    context.CLAMP_TO_EDGE
  );
  context.texParameteri(
    context.TEXTURE_2D,
    context.TEXTURE_WRAP_T,
    context.CLAMP_TO_EDGE
  );
  function update(nextImage: HTMLImageElement) {
    context.bindTexture(context.TEXTURE_2D, texture);
    context.texImage2D(
      context.TEXTURE_2D,
      0,
      context.RGBA,
      context.RGBA,
      context.UNSIGNED_BYTE,
      nextImage
    );
  }
  update(image);
  return {
    dispose() {
      context.deleteTexture(texture);
    },
    update,
  };
}
