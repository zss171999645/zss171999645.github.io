// The movie carries the whole registered camera move. Its media time also drives the scrubber.
window.createSpaceFoldOpening = function (translate) {
  "use strict";
  const intro = document.getElementById("hero-intro");
  const stage = document.getElementById("hero-stage");
  const photo = document.getElementById("hero-photo");
  const video = document.getElementById("hero-orbit");
  const playback = document.getElementById("hero-playback");
  const scrub = document.getElementById("hero-scrub");
  const chapters = [...intro.querySelectorAll("[data-chapter]")];
  const timing = window.SpaceFoldOpeningTiming;
  const keys = {
    input: ["heroInput", "openingInputNote"],
    encode: ["heroEncode", "openingEncodeNote"],
    flow: ["heroFlow", "openingFlowNote"],
    decode: ["heroDecode", "openingDecodeNote"],
    room: ["heroRoom", "openingRoomNote"],
  };
  const note = document.getElementById("hero-step-copy");
  const scale = document.getElementById("hero-step-scale");
  const levelPicker = document.getElementById("hero-level");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let duration = timing.frames / timing.fps;
  let wantsPlay = !motion.matches && !navigator.connection?.saveData;
  let position = wantsPlay ? 0 : duration;
  let visible = false,
    hasPlayed = false,
    showMovie = false,
    photoReady = false;
  let frame = 0,
    playRequest = false,
    desiredSeek = null,
    sources;

  function paint() {
    const end = position >= duration - 0.001;
    const index = Math.round(position * timing.fps);
    const phase = timing.phases.findLast((p) => index >= p.frame).id;
    const level = phase === "decode" ? timing.levels.findLast((entry) => index >= entry[1])[0] : 0;
    const caption = translate(keys[phase][1]);
    const dimensions = level
      ? level + "³"
      : phase === "encode" || phase === "flow"
        ? "32³ × 16"
        : "";
    if (note.textContent !== caption) note.textContent = caption;
    scale.hidden = phase !== "encode" && phase !== "flow";
    levelPicker.hidden = !level;
    if (level) levelPicker.value = String(level);
    intro.dataset.phase = phase;
    stage.dataset.frame = !end && showMovie ? "video" : !end && photoReady ? "input" : "room";
    const fraction = Math.min(1, position / duration);
    scrub.value = String(Math.round(fraction * Number(scrub.max)));
    scrub.style.setProperty("--played", (fraction * 100).toFixed(2) + "%");
    scrub.setAttribute(
      "aria-valuetext",
      translate(keys[phase][0]) +
        (dimensions ? " · " + dimensions : "") +
        " · " +
        position.toFixed(1) +
        (document.documentElement.lang.startsWith("zh") ? " 秒" : " s"),
    );
    for (const button of chapters)
      button.setAttribute("aria-pressed", String(button.dataset.chapter === phase));
  }

  function labels() {
    const end = position >= duration - 0.001;
    const key = wantsPlay
      ? "heroPause"
      : end && hasPlayed
        ? "heroReplay"
        : position > 0 && !end
          ? "heroResume"
          : "heroPlay";
    playback.dataset.tip = key;
    playback.title = translate(key);
    playback.setAttribute("aria-label", playback.title);
    playback
      .querySelector("use")
      .setAttribute("href", wantsPlay ? "#i-pause" : end && hasPlayed ? "#i-reset" : "#i-play");
    intro.dataset.playback = wantsPlay ? "playing" : end ? "finished" : "paused";
    paint();
  }

  const inputImage = new Image();
  inputImage.onload = () => {
    const ctx = photo.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(inputImage, 48, 114, 1024, 576);
    photoReady = true;
    paint();
  };
  function preparePhoto() {
    if (!inputImage.getAttribute("src")) inputImage.src = photo.dataset.image;
  }

  function nextSource() {
    const file = sources.shift();
    showMovie = false;
    if (!file) {
      playback.hidden = scrub.hidden = true;
      for (const button of chapters) {
        button.hidden = !["input", "room"].includes(button.dataset.chapter);
      }
      wantsPlay = false;
      position = position < 1 ? 0 : duration;
      if (!position) preparePhoto();
      labels();
      return;
    }
    video.toggleAttribute("data-matte", file === "hero-orbit.mp4");
    desiredSeek = position;
    video.src = "assets/" + file + "?v=c3a0815b";
  }

  function prepareMovie() {
    if (sources) return;
    sources = [];
    video.muted = true;
    video.preload = "auto";
    const apple =
      navigator.vendor?.startsWith("Apple") || /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (apple && video.canPlayType('video/mp4; codecs="hvc1"')) sources.push("hero-orbit-hevc.mp4");
    if (video.canPlayType('video/webm; codecs="vp9"')) sources.push("hero-orbit.webm");
    if (video.canPlayType('video/mp4; codecs="avc1.42E01E"')) sources.push("hero-orbit.mp4");
    nextSource();
  }

  function applySeek() {
    if (desiredSeek === null || video.readyState < 1) return;
    const to = Math.min(desiredSeek, video.duration);
    desiredSeek = null;
    if (Math.abs(video.currentTime - to) > 0.005) video.currentTime = to;
  }

  function tick() {
    cancelAnimationFrame(frame);
    if (!wantsPlay || !visible || document.hidden || video.paused) return;
    if (desiredSeek === null && !video.seeking) position = video.currentTime;
    paint();
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    if (!wantsPlay || !visible || document.hidden) {
      video.pause();
      cancelAnimationFrame(frame);
    } else {
      preparePhoto();
      prepareMovie();
      applySeek();
      if (!playback.hidden && video.readyState >= 2 && video.paused && !playRequest) {
        playRequest = true;
        video
          .play()
          .catch((error) => {
            if (error.name !== "AbortError" && !video.error) {
              wantsPlay = false;
              labels();
            }
          })
          .finally(() => {
            playRequest = false;
            if (wantsPlay && visible && !document.hidden && video.paused && !video.error) sync();
          });
      }
    }
    labels();
  }

  function jump(to, play = false) {
    wantsPlay = play;
    position = Math.max(0, Math.min(duration, to));
    video.pause();
    if (position <= 0 || position >= duration) showMovie = false;
    if (position < duration) preparePhoto();
    if (position > 0 && position < duration) prepareMovie();
    desiredSeek = position;
    applySeek();
    if (position > 0 && position < duration && video.readyState >= 2) showMovie = true;
    sync();
  }

  video.addEventListener("loadedmetadata", () => {
    const atEnd = position >= duration;
    duration = video.duration;
    if (atEnd) position = duration;
    applySeek();
    labels();
  });
  video.addEventListener("canplay", () => {
    if (position > 0 && position < duration) showMovie = true;
    sync();
  });
  video.addEventListener("playing", () => {
    if (!wantsPlay || !visible || document.hidden) {
      video.pause();
      return;
    }
    hasPlayed = showMovie = true;
    labels();
    tick();
  });
  video.addEventListener("seeked", () => {
    if (position > 0 && position < duration) showMovie = true;
    paint();
  });
  video.addEventListener("ended", () => {
    jump(duration);
  });
  video.addEventListener("error", () => {
    if (sources) nextSource();
  });
  playback.addEventListener("click", () => {
    if (wantsPlay) {
      if (!video.paused) position = video.currentTime;
      wantsPlay = false;
      sync();
    } else {
      jump(position >= duration - 0.001 ? 0 : position, true);
    }
  });
  for (const button of chapters) {
    const cue = timing.phases.find((phase) => phase.id === button.dataset.chapter);
    button.addEventListener("click", () => jump(cue.inspect / timing.fps));
  }
  levelPicker.addEventListener("change", () => {
    const index = timing.levels.find(([resolution]) => resolution === Number(levelPicker.value))[1];
    jump((index + 7) / timing.fps);
  });
  scale.addEventListener("click", () => {
    if (!video.paused) position = video.currentTime;
    wantsPlay = false;
    sync();
  });
  scrub.addEventListener("input", () => jump((Number(scrub.value) / Number(scrub.max)) * duration));
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.intersectionRatio >= 0.14;
      sync();
    },
    { threshold: 0.14 },
  ).observe(stage);
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener("change", () => {
    if (motion.matches) jump(duration);
  });
  document.getElementById("hero-controls").hidden = false;
  document.getElementById("hero-readout").hidden = false;
  const requested = new URLSearchParams(location.search).get("opening");
  const cue = timing.phases.find((phase) => phase.id === requested);
  if (cue) jump(cue.inspect / timing.fps);
  else labels();
  return labels;
};
