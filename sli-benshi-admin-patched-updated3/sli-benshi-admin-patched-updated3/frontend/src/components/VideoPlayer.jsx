export default function VideoPlayer({
  src = '/sli.mp4',
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  className = '',
}) {
  return (
    <video
      className={`video-player${className ? ` ${className}` : ''}`}
      src={src}
      controls={controls}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted || autoPlay}
      playsInline
      preload="metadata"
      style={{ mixBlendMode: 'screen', background: 'transparent' }}
    >
      Your browser does not support the video tag.
    </video>
  );
}
