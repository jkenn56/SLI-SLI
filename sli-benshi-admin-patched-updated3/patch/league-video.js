 (() => {
  const addOpeningVideo = () => {
    const league = document.querySelector('main .league');
    if (!league || league.querySelector('.league-opening-video')) return;

    const video = document.createElement('video');
    video.className = 'league-opening-video';
    video.src = '/last-league-final.mp4';
    video.autoplay = true;
    video.muted = true;
    video.loop = false;
    video.playsInline = true;
    video.setAttribute('aria-label', 'Last League opening video');
    league.prepend(video);
  };

  new MutationObserver(addOpeningVideo).observe(document.body, { childList: true, subtree: true });
  addOpeningVideo();
})();
