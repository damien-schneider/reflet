export function createReflectionAnimation(render: (seconds: number) => void) {
  let frameId = 0;
  let lastFrameTime = 0;
  let elapsedSeconds = 0;

  function animateFrame(timestamp: number) {
    if (timestamp - lastFrameTime >= 1000 / 30) {
      elapsedSeconds += (timestamp - lastFrameTime) / 1000;
      render(elapsedSeconds);
      lastFrameTime = timestamp;
    }
    frameId = requestAnimationFrame(animateFrame);
  }

  return {
    paint() {
      render(elapsedSeconds);
    },
    pause() {
      cancelAnimationFrame(frameId);
    },
    resume() {
      cancelAnimationFrame(frameId);
      lastFrameTime = performance.now();
      frameId = requestAnimationFrame(animateFrame);
    },
  };
}
