(function (root) {
  'use strict';
  const FPS = 60;
  function dimensions(quality) { return quality === '720' ? [1280, 720] : [640, 360]; }
  function validSeconds(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1 || n > 30) throw new Error('장면 길이는 1~30초로 정해 주세요.');
    return Math.round(n * FPS) / FPS;
  }
  function sceneArgs(index, scene, quality) {
    const seconds = validSeconds(scene.seconds), frames = Math.round(seconds * FPS);
    return ['-y', '-framerate', String(FPS), '-start_number', '0', '-i', `frame${index}_%04d.jpg`,
      '-vf', 'setsar=1,format=yuv420p', '-frames:v', String(frames), '-an', '-c:v', 'libx264',
      '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', '-threads', '1', `part${index}.mp4`];
  }
  function drawPhotoFrame(context, image, scene, frame, width, height) {
    const seconds = validSeconds(scene.seconds), count = Math.round(seconds * FPS);
    const p = Math.min(1, Math.max(0, frame / Math.max(1, count - 1)));
    const ease = p * p * (3 - 2 * p);
    const zoom = scene.zoom ? 1 + .12 * ease : 1;
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const base = Math.min(width / sourceWidth, height / sourceHeight);
    const w = sourceWidth * base * zoom, h = sourceHeight * base * zoom;
    context.globalAlpha = 1;
    context.fillStyle = '#101d20';context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;context.imageSmoothingQuality = 'high';
    // Floating-point destination coordinates keep the centre fixed at every frame.
    context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    const fadeTime = Math.min(.8, seconds / 3), t = frame / FPS;
    let opacity = 1;
    if (scene.fadeIn) opacity = Math.min(opacity, t / fadeTime);
    if (scene.fadeOut) opacity = Math.min(opacity, (seconds - 1 / FPS - t) / fadeTime);
    if (opacity < 1) {
      context.fillStyle = '#000';context.globalAlpha = 1 - Math.max(0, opacity);
      context.fillRect(0, 0, width, height);context.globalAlpha = 1;
    }
    return {zoom, x:(width-w)/2, y:(height-h)/2, w, h};
  }
  function finalArgs(scenes, volume) {
    const duration = scenes.reduce((sum, s) => sum + validSeconds(s.seconds), 0);
    const gain = Number(volume);
    if (!Number.isFinite(gain) || gain < 0 || gain > 1) throw new Error('음악 볼륨 값을 확인해 주세요.');
    const endFade = Math.min(1, duration / 3);
    return ['-y', '-f', 'concat', '-safe', '0', '-i', 'parts.txt',
      '-stream_loop', '-1', '-i', 'music.input', '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
      '-af', `volume=${gain},afade=t=out:st=${(duration - endFade).toFixed(3)}:d=${endFade.toFixed(3)}`,
      '-t', duration.toFixed(3), '-movflags', '+faststart', '-threads', '1', 'music-video.mp4'];
  }
  const api = {FPS, dimensions, validSeconds, sceneArgs, finalArgs, drawPhotoFrame};
  root.VideoCommands = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
