// Use the native alpha codec on Apple browsers and the portable matte as a fallback.
window.spaceFoldMovieSources = function (video, basename) {
  const apple =
    navigator.vendor?.startsWith("Apple") || /iPad|iPhone|iPod/.test(navigator.userAgent);
  const files = [];
  if (apple && video.canPlayType('video/mp4; codecs="hvc1"')) files.push(basename + "-hevc.mp4");
  if (video.canPlayType('video/webm; codecs="vp9"')) files.push(basename + ".webm");
  if (video.canPlayType('video/mp4; codecs="avc1.42E01E"')) files.push(basename + ".mp4");
  return files;
};

window.createSpaceFoldOverview = function (translate, query) {
  "use strict";
  const root = document.getElementById("overview");
  const video = document.getElementById("overview-video");
  const poster = document.getElementById("overview-poster");
  const playback = document.getElementById("overview-play");
  const scrub = document.getElementById("overview-scrub");
  const note = document.getElementById("overview-note");
  const operators = [...root.querySelectorAll(".operator")];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const preferStill = () => reduce.matches || navigator.connection?.saveData;
  const fps = 24;
  const frames = Number(scrub.max);
  // Frame indices correspond to the registered S055 panorama, octree trace and camera orbit.
  const phases = [
    { id: "input", start: 0, inspect: 0, label: "heroInput", note: "overviewInputNote" },
    { id: "encode", start: 34, inspect: 57, label: "heroEncode", note: "overviewEncodeNote" },
    { id: "flow", start: 80, inspect: 99, label: "heroFlow", note: "overviewFlowNote" },
    { id: "decode", start: 106, inspect: 137, label: "heroDecode", note: "overviewDecodeNote" },
    { id: "room", start: 180, inspect: frames, label: "heroRoom", note: "overviewRoomNote" },
  ];
  const filenames = window.spaceFoldMovieSources(video, "overview");
  const movieVersion = root.dataset.version;
  const requested = !query.has("action") && phases.find((p) => p.id === query.get("opening"));
  let playing = !preferStill() && (!requested || query.get("play") === "1");
  let position = requested ? (playing ? requested.start : requested.inspect) : playing ? 0 : frames;
  let inView = false,
    played = false,
    pendingPlay = false;
  let seekTo = null,
    animation = 0,
    filmReady = false,
    stillSelected = !playing;

  function paint() {
    const phase = phases.findLast((p) => position >= p.start);
    const name = phase.id;
    const end = position >= frames;
    const showFilm = !stillSelected && filmReady && !end;
    root.dataset.frame = showFilm ? "film" : "still";
    root.dataset.phase = name;
    root.dataset.playback = playing ? "playing" : end ? "finished" : "paused";
    if (!showFilm) {
      const still =
        name === "room"
          ? "assets/hero-room.webp?v=d36436e3"
          : "assets/overview-" + name + ".webp?v=" + movieVersion;
      if (poster.getAttribute("src") !== still) poster.src = still;
    }
    const key = playing
      ? "heroPause"
      : end && played
        ? "heroReplay"
        : !end && position > 0
          ? "heroResume"
          : "heroPlay";
    if (playback.title !== translate(key)) {
      playback.title = translate(key);
      playback.setAttribute("aria-label", playback.title);
      playback
        .querySelector("use")
        .setAttribute("href", playing ? "#i-pause" : end && played ? "#i-reset" : "#i-play");
    }
    if (note.textContent !== translate(phase.note)) note.textContent = translate(phase.note);
    for (const button of operators) {
      const active = String(button.dataset.phase === name);
      if (button.getAttribute("aria-pressed") !== active)
        button.setAttribute("aria-pressed", active);
    }
    scrub.value = String(Math.round(position));
    scrub.style.setProperty("--played", (position / frames) * 100 + "%");
    const unit = document.documentElement.lang.startsWith("zh") ? " 秒" : " s";
    const spoken = translate(phase.label) + " · " + (position / fps).toFixed(1) + unit;
    if (scrub.getAttribute("aria-valuetext") !== spoken)
      scrub.setAttribute("aria-valuetext", spoken);
  }

  function onFrame() {
    if (!video.paused && !video.seeking && seekTo === null) {
      position = Math.min(frames, video.currentTime * fps);
      paint();
    }
    if (playing && inView && !document.hidden) animation = requestAnimationFrame(onFrame);
  }

  function nextSource() {
    const file = filenames.shift();
    filmReady = false;
    if (!file) {
      playing = false;
      stillSelected = true;
      if (position < phases[1].start) position = frames;
      playback.hidden = scrub.hidden = true;
      paint();
      return;
    }
    seekTo = position;
    video.preload = "auto";
    video.muted = true;
    video.toggleAttribute("data-matte", file === "overview.mp4");
    video.src = "assets/" + file + "?v=" + movieVersion;
  }

  function sync() {
    cancelAnimationFrame(animation);
    if (!playing || !inView || document.hidden) {
      video.pause();
    } else if (!video.hasAttribute("src")) {
      nextSource();
    } else if (video.readyState >= 2 && video.paused && !pendingPlay && !video.ended) {
      pendingPlay = true;
      video
        .play()
        .catch((error) => {
          if (error.name !== "AbortError" && !video.error) playing = false;
        })
        .finally(() => {
          pendingPlay = false;
          paint();
          if (playing && video.paused && !video.error) sync();
        });
    } else if (!video.paused) animation = requestAnimationFrame(onFrame);
    paint();
  }

  function applySeek() {
    if (seekTo === null || video.readyState < 1) return;
    const time = Math.min(seekTo / fps, video.duration);
    seekTo = null;
    if (Math.abs(video.currentTime - time) >= 0.001) video.currentTime = time;
  }

  function jump(frame, play = false, still = false) {
    video.pause();
    position = Math.max(0, Math.min(frames, frame));
    playing = play;
    stillSelected = still;
    filmReady = false;
    seekTo = position;
    if (!still && position < frames && !playback.hidden) {
      if (!video.hasAttribute("src")) nextSource();
      applySeek();
      filmReady = video.readyState >= 2 && !video.seeking;
    }
    sync();
  }

  video.addEventListener("loadedmetadata", applySeek);
  video.addEventListener("canplay", () => {
    filmReady = seekTo === null && !video.seeking;
    sync();
  });
  video.addEventListener("seeked", () => {
    filmReady = true;
    sync();
  });
  video.addEventListener("playing", () => {
    filmReady = played = true;
    sync();
  });
  video.addEventListener("ended", () => {
    jump(frames);
  });
  video.addEventListener("error", nextSource);
  playback.addEventListener("click", () => {
    if (playing) {
      playing = false;
      sync();
    } else jump(position >= frames ? 0 : position, true);
  });
  scrub.addEventListener("input", () => jump(Number(scrub.value)));
  for (const button of operators) {
    const phase = phases.find((p) => p.id === button.dataset.phase);
    button.addEventListener("click", () => {
      const still = preferStill() || playback.hidden;
      jump(still ? phase.inspect : phase.start, !still, still);
    });
  }
  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      sync();
    },
    { threshold: 0.06 },
  ).observe(root);
  document.addEventListener("visibilitychange", sync);
  reduce.addEventListener("change", () => {
    if (reduce.matches) jump(frames, false, true);
  });
  playback.hidden = scrub.hidden = !filenames.length;
  if (playback.hidden) {
    playing = false;
    stillSelected = true;
    position = requested ? requested.inspect : frames;
  }
  paint();
  return paint;
};
