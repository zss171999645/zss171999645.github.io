// The movie carries the whole registered camera move. Its media time also drives the scrubber.
window.createSpaceFoldStudy = function (translate) {
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
  const operationNav = document.getElementById("op-navigation");
  const stepPicker = document.getElementById("op-step");
  const previousStep = document.getElementById("op-prev");
  const nextStep = document.getElementById("op-next");
  const startButtons = [...document.querySelectorAll("[data-play-operation]")];
  const overlay = document.getElementById("hero-operation-labels");
  const words = overlay.getContext("2d");
  const actionKeys = {
    locate: "opLocation",
    children: "opRead",
    merge: "opFuse",
    add: "opAdd",
    latent: "opCode",
    predict: "opPredict",
    split: "opExpand",
    branch: "opDecision",
    bed: "opReturn",
    refine: "opLevels",
  };
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let duration = timing.frames / timing.fps;
  let wantsPlay = false;
  let position = duration;
  let visible = false,
    hasPlayed = false,
    showMovie = false,
    photoReady = false;
  let frame = 0,
    playRequest = false,
    desiredSeek = null,
    sources,
    stopAt = null,
    menuKey = "",
    drawn = "";

  function operationControls(phase, action) {
    operationNav.hidden = !action;
    if (!action) return;
    const items = timing.actions.filter((a) => a.phase === phase);
    const key = phase + document.documentElement.lang;
    if (menuKey !== key) {
      stepPicker.replaceChildren(
        ...items.map(
          (item, i) =>
            new Option(
              i + 1 + " / " + items.length + " · " + translate(actionKeys[item.id]),
              item.id,
            ),
        ),
      );
      menuKey = key;
    }
    stepPicker.value = action.id;
    previousStep.disabled = action === items[0];
    nextStep.disabled = action === items[items.length - 1];
  }

  function paint() {
    const end = position >= duration - 0.001;
    const index = Math.round(position * timing.fps);
    const phase = timing.phases.findLast((p) => index >= p.frame).id;
    const action = timing.actions.findLast((a) => a.phase === phase && index >= a.frame);
    const level =
      phase === "decode" ? (timing.levels.findLast((entry) => index >= entry[1])?.[0] ?? 0) : 0;
    const codeView = action?.id === "latent" || phase === "flow";
    const caption = translate(action ? actionKeys[action.id] + "Note" : keys[phase][1]);
    const dimensions = level ? level + "³" : codeView ? "32³ × 16" : "";
    if (note.textContent !== caption) note.textContent = caption;
    scale.hidden = !codeView;
    levelPicker.hidden = !level;
    if (level) levelPicker.value = String(level);
    intro.dataset.phase = phase;
    intro.dataset.action = action?.id ?? "";
    operationControls(phase, action);
    stage.dataset.frame = !end && showMovie ? "video" : !end && photoReady ? "input" : "room";
    const opacity = showMovie ? window.SpaceFoldOperationLabels.opacity(index) : 0;
    stage.style.setProperty("--op-magnification", String(1 + 0.11 * opacity));
    const labelKey = opacity > 0 ? index + document.documentElement.lang : "";
    if (drawn !== labelKey) {
      drawn = labelKey;
      words.clearRect(0, 0, overlay.width, overlay.height);
      if (opacity > 0) window.SpaceFoldOperationLabels.paint(words, index, translate, opacity);
    }
    const fraction = Math.min(1, position / duration);
    scrub.value = String(Math.round(fraction * Number(scrub.max)));
    scrub.style.setProperty("--played", (fraction * 100).toFixed(2) + "%");
    scrub.setAttribute(
      "aria-valuetext",
      translate(keys[phase][0]) +
        (action ? " · " + translate(actionKeys[action.id]) : "") +
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
      for (const button of startButtons) button.disabled = true;
      wantsPlay = false;
      position = position < 1 ? 0 : duration;
      if (!position) preparePhoto();
      labels();
      return;
    }
    video.toggleAttribute("data-matte", file === "hero-orbit.mp4");
    desiredSeek = position;
    video.src = "assets/" + file + "?v=c7e8aa38";
  }

  function prepareMovie() {
    if (sources) return;
    video.muted = true;
    video.preload = "auto";
    sources = window.spaceFoldMovieSources(video, "hero-orbit");
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
    if (stopAt !== null && position >= stopAt) {
      jump(stopAt);
      return;
    }
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
    stopAt = null;
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
  function goToAction(id) {
    const action = timing.actions.find((a) => a.id === id);
    if (action) jump(action.inspect / timing.fps);
  }
  function advanceStep(offset) {
    const active = timing.actions.findIndex((a) => a.id === stepPicker.value);
    const item = timing.actions[active + offset];
    if (item && item.phase === timing.actions[active]?.phase) goToAction(item.id);
  }
  stepPicker.addEventListener("change", () => goToAction(stepPicker.value));
  previousStep.addEventListener("click", () => advanceStep(-1));
  nextStep.addEventListener("click", () => advanceStep(1));
  function playOperation(id) {
    const i = timing.phases.findIndex((p) => p.id === id);
    jump(timing.phases[i].frame / timing.fps, true);
    stopAt = timing.operationHolds[id] / timing.fps;
  }
  for (const button of startButtons)
    button.addEventListener("click", () => {
      if (!visible) stage.scrollIntoView({ block: "center", behavior: "instant" });
      playOperation(button.dataset.playOperation);
    });
  const proof = document.getElementById("branch-dialog");
  const trace = globalThis.SpaceFoldBedTrace;
  const options = document.getElementById("branch-children");
  const numeric = (n, places) => n.toFixed(places).replace("-", "−");
  function chooseChild(i) {
    const child = trace.decoder.children[i];
    for (const [j, b] of [...options.children].entries()) {
      b.setAttribute("aria-pressed", String(i === j));
      b.setAttribute("aria-label", translate("opChild") + " " + (j + 1));
    }
    document.getElementById("branch-distance").textContent = numeric(child.distance, 3);
    document.getElementById("branch-logit").textContent =
      (child.logit > 0 ? "+" : "") + numeric(child.logit, 3);
    const result = document.getElementById("branch-outcome");
    result.textContent = translate(child.split ? "opWillSplit" : "opWillStop");
    result.dataset.split = String(child.split);
  }
  trace.decoder.children.forEach((child, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(i + 1);
    b.dataset.split = String(child.split);
    b.addEventListener("click", () => chooseChild(i));
    options.append(b);
  });
  const encoderLevel = document.getElementById("branch-encoder-level");
  function showFusion() {
    const a = trace.encoder.path.find(
      (level) => level.parent === Number(encoderLevel.value),
    ).example;
    for (const [id, val] of [
      ["branch-summary", a.summary],
      ["branch-distance-feature", a.self],
      ["branch-fused", a.fused],
    ]) {
      document.getElementById(id).textContent = numeric(val, 6);
    }
  }
  encoderLevel.addEventListener("change", showFusion);
  document.getElementById("op-inspect").addEventListener("click", () => {
    if (!video.paused) position = video.currentTime;
    wantsPlay = false;
    sync();
    const enc = intro.dataset.phase === "encode";
    document.getElementById("branch-encoding").hidden = !enc;
    document.getElementById("branch-decoding").hidden = enc;
    if (enc) {
      encoderLevel.value = "64";
      showFusion();
    } else chooseChild(trace.decoder.hold);
    proof.showModal();
  });
  document.getElementById("close-branch").addEventListener("click", () => proof.close());
  proof.addEventListener("click", (e) => {
    if (e.target === proof) proof.close();
  });
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
  const query = new URLSearchParams(location.search);
  const requested = query.get("opening");
  const action = timing.actions.find((a) => a.phase === requested && a.id === query.get("action"));
  if (action) goToAction(action.id);
  else labels();
  document.getElementById("method-calculation").addEventListener("toggle", (event) => {
    if (!event.currentTarget.open) {
      wantsPlay = false;
      sync();
    }
  });
  return labels;
};
