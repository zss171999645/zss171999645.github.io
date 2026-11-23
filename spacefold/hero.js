// The photograph and orbit are two views of the same research sample.
window.createSpaceFoldOpening = function (translate) {
  "use strict";
  const intro = document.getElementById("hero-intro");
  const stage = document.getElementById("hero-stage");
  const projection = stage.querySelector(".hero-projection");
  const film = stage.querySelector(".hero-film");
  const video = document.getElementById("hero-orbit");
  const playback = document.getElementById("hero-playback");
  const icon = playback.querySelector("use");
  const chapters = [...intro.querySelectorAll("[data-chapter]")];
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const orbitStart = 1.42, chapterChange = 2.05, filmEnd = 2.63;
  let duration = orbitStart + 4.5;
  let wantsPlay = !motion.matches && !navigator.connection?.saveData;
  let time = wantsPlay ? 0 : duration;
  let visible = false, photoReady = false, photoRequested = false, hasPlayed = false;
  let previousTick = null, frame = 0, clipStartedAt = null, clipUnavailable = false;
  let sources;

  function smooth(start, end, at) {
    const u = Math.max(0, Math.min(1, (at - start) / (end - start)));
    return u * u * (3 - 2 * u);
  }

  function labelPlayback() {
    const replay = time >= duration && hasPlayed;
    const resume = time > 0 && time < duration;
    const key = wantsPlay ? "heroPause" : replay ? "heroReplay" : resume ? "heroResume" : "heroPlay";
    playback.dataset.tip = key;
    playback.title = translate(key);
    playback.setAttribute("aria-label", playback.title);
    icon.setAttribute("href", wantsPlay ? "#i-pause" : replay ? "#i-reset" : "#i-play");
    intro.dataset.playback = wantsPlay ? "playing" : time >= duration ? "finished" : "paused";
  }

  function paint() {
    const showingFilm = photoReady && time < filmEnd;
    projection.hidden = !showingFilm;
    if (showingFilm) {
      const fold = smooth(0.95, filmEnd, time);
      const drift = smooth(0, 1.36, time);
      projection.style.opacity = 1 - smooth(1.79, filmEnd, time);
      film.style.setProperty("--film-x", (-20 * fold) + "%");
      film.style.setProperty("--film-y", (5 * fold) + "%");
      film.style.setProperty("--film-scale", 1 + 0.028 * drift - 0.59 * fold);
      film.style.setProperty("--film-pitch", (3 + 39 * fold) + "deg");
      film.style.setProperty("--film-yaw", (-5 + 28 * fold) + "deg");
      film.style.setProperty("--film-roll", (-1 - 7 * fold) + "deg");
      film.style.setProperty("--wing", (4 + 63 * fold) + "deg");
      film.style.setProperty("--crease", fold);
    }
    const room = photoReady ? smooth(1.29, 2.38, time) : 1;
    const clip = clipStartedAt === null ? 0 :
      smooth(clipStartedAt, clipStartedAt + 0.16, time) * (1 - smooth(duration - 0.23, duration, time));
    stage.style.setProperty("--poster-opacity", room * (1 - clip));
    stage.style.setProperty("--orbit-opacity", room * clip);
    const roomActive = time >= chapterChange || !photoReady;
    chapters[0].setAttribute("aria-pressed", String(!roomActive));
    chapters[1].setAttribute("aria-pressed", String(roomActive));
    chapters[0].style.setProperty("--progress", Math.max(0.035, Math.min(1, time / chapterChange)));
    chapters[1].style.setProperty("--progress", Math.max(0, (time - chapterChange) / (duration - chapterChange)));
  }

  function preparePhoto() {
    if (photoRequested) return;
    photoRequested = true;
    const photo = new Image();
    photo.onload = () => {
      film.style.setProperty("--photo", 'url("' + film.dataset.image + '")');
      photoReady = true;
      paint();
      syncPlayback();
    };
    photo.onerror = () => {
      wantsPlay = false;
      time = duration;
      document.getElementById("hero-controls").hidden = true;
      paint();
      syncPlayback();
    };
    photo.src = film.dataset.image;
  }

  function prepareOrbit() {
    if (sources) return;
    video.muted = true;
    video.preload = "auto";
    sources = [];
    // Apple WebKit decodes the auxiliary HEVC alpha layer. Other engines
    // may advertise HEVC support while decoding only the opaque base layer.
    const apple = navigator.vendor?.startsWith("Apple") || /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (apple && video.canPlayType('video/mp4; codecs="hvc1"')) sources.push("hero-orbit-hevc.mp4");
    if (video.canPlayType('video/webm; codecs="vp9"')) sources.push("hero-orbit.webm");
    if (video.canPlayType('video/mp4; codecs="avc1.42E01E"')) sources.push("hero-orbit.mp4");
    nextSource();
  }

  function nextSource() {
    const file = sources.shift();
    clipStartedAt = null;
    clipUnavailable = !file;
    if (!file) return;
    video.toggleAttribute("data-matte", file === "hero-orbit.mp4");
    video.src = "assets/" + file;
  }

  function playOrbit() {
    if (clipUnavailable || video.readyState < 2 || time < orbitStart || time >= duration - 0.24) return;
    if (clipStartedAt === null) {
      clipStartedAt = time;
      video.currentTime = Math.min(time - orbitStart, video.duration);
    }
    video.play().catch((error) => {
      if (error.name !== "AbortError") {
        clipStartedAt = null;
        clipUnavailable = true;
        paint();
      }
    });
  }

  function tick(stamp) {
    if (previousTick !== null) time = Math.min(duration, time + (stamp - previousTick) / 1000);
    previousTick = stamp;
    if (time >= duration) {
      wantsPlay = false;
      syncPlayback();
      paint();
      return;
    }
    if (clipStartedAt === null) playOrbit();
    paint();
    frame = requestAnimationFrame(tick);
  }

  function syncPlayback() {
    cancelAnimationFrame(frame);
    previousTick = null;
    if (wantsPlay && visible && !document.hidden) {
      preparePhoto();
      prepareOrbit();
      if (photoReady) {
        hasPlayed = true;
        playOrbit();
        frame = requestAnimationFrame(tick);
      }
    } else {
      video.pause();
    }
    labelPlayback();
  }

  function seek(to) {
    video.pause();
    clipStartedAt = null;
    time = to;
    if (to < duration) preparePhoto();
    paint();
    syncPlayback();
  }

  video.addEventListener("loadedmetadata", () => {
    const atEnd = time >= duration;
    duration = orbitStart + video.duration;
    if (atEnd) time = duration;
    paint();
  });
  video.addEventListener("error", () => {
    if (sources) nextSource();
    paint();
  });
  playback.addEventListener("click", () => {
    wantsPlay = !wantsPlay;
    if (wantsPlay && time >= duration) seek(0);
    else syncPlayback();
  });
  for (const chapter of chapters) {
    chapter.addEventListener("click", () => {
      wantsPlay = false;
      seek(chapter.dataset.chapter === "room" ? duration : 0);
    });
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.intersectionRatio >= 0.14;
    syncPlayback();
  }, { threshold: 0.14 }).observe(stage);
  document.addEventListener("visibilitychange", syncPlayback);
  motion.addEventListener("change", () => {
    if (motion.matches) {
      wantsPlay = false;
      seek(duration);
    }
  });
  document.getElementById("hero-controls").hidden = false;
  paint();
  labelPlayback();
  return labelPlayback;
};
