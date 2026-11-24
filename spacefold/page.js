(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const pairs = window.SpaceFoldStrings;
  const models = {
    "round-table-bedroom": { name: "nightstandRoom", dataset: "ERP-FRONT", note: "nightstandNote" },
    "paired-armchair-lounge": { name: "armchairLounge", dataset: "Replica", note: "armchairNote" },
    "dining-chairs": { name: "eightChairRoom", dataset: "Replica", note: "chairRowsNote" },
    "desk-frame-bedroom": { name: "deskBedroom", dataset: "ERP-FRONT", note: "deskFrameNote" },
  };
  const defaultScene = "round-table-bedroom";
  const roomKinds = { "ERP-FRONT": "syntheticRoom", Replica: "scannedRoom" };
  const cameras = {
    "reading-floral": ["floralChair", "floralDa2", "floralInfini", "readingViewSource"],
    "front-door": ["doorTrim", "doorDa2", "doorInfini", "doorSource"],
    "hotel-bed": ["bedside", "bedNote", "bedInfini", "hotelViewSource"],
    "mp3d-fireplace": ["fireplace", "fireplaceDa2", "fireplaceInfini", "fireSource"],
    "restaurant-chairs": [
      "wovenChairs",
      "restaurantDa2",
      "restaurantInfini",
      "restaurantViewSource",
    ],
  };
  const params = new URLSearchParams(location.search);
  const requestedScene = params.get("scene");
  let lang = params.get("lang") === "zh" ? 1 : 0;
  let scene = Object.hasOwn(models, requestedScene) ? requestedScene : defaultScene,
    method = "codec",
    task = "reconstruction",
    dataset = "3D-FRONT";
  let camera = Object.keys(cameras)[0],
    baseline = "da2",
    expanded = false,
    viewer = null;
  const t = (key) => pairs[key][lang];
  const translateOpening = window.createSpaceFoldOpening(t);

  function pressed(selector, key, value) {
    document
      .querySelectorAll(selector)
      .forEach((button) =>
        button.setAttribute("aria-pressed", String(button.dataset[key] === value)),
      );
  }

  function updateViewerText() {
    const mode = viewer?.mode ?? "geometry";
    const panoramic = mode === "panorama";
    const model = models[scene];
    $("scene-dataset").textContent = t(roomKinds[model.dataset]) + " · " + model.dataset;
    $("scene-title").textContent = t(model.name);
    $("scene-observation").textContent = t(model.note);
    $("scene-reference").textContent = t("table3");
    $("scene-reference").title = t("emaWeights");
    $("scene-reference").setAttribute("aria-label", t("table3") + " · " + t("emaWeights"));
    $("compare-geometry").href =
      "assets/scenes/" + scene + (lang ? "-comparison-zh.webp" : "-comparison.webp");
    const erp = "assets/scenes/" + scene + ".webp";
    if ($("scene-strip").getAttribute("src") !== erp) $("scene-strip").src = erp;
    $("input-preview").disabled = panoramic;
    pressed(".mode-switch [data-view]", "view", mode);
    $("geo-options").disabled = panoramic;
    $("flat-panorama").hidden = !panoramic;
    $("flat-panorama").href = erp;
    $("gesture").textContent = t(panoramic ? "panoHint" : "orbitHint");
    const note = panoramic ? "inputNote" : $("occlusion").checked ? "depthNote" : "geometryNote";
    $("scene-note").textContent = t(note);
    $("scene-note").classList.toggle("key-occluded", note === "depthNote");
    $("scene-status").textContent = viewer?.failed
      ? t("loadError")
      : viewer?.loading
        ? t("loading")
        : "";
    $("stage").setAttribute("aria-label", t(model.name) + (lang ? "。" : ". ") + t("viewerAria"));
    const expandText = t(expanded ? "collapse" : "expand");
    $("expand").title = expandText;
    $("expand").setAttribute("aria-label", expandText);
  }

  function chooseScene(id) {
    scene = id;
    pressed("[data-scene]", "scene", id);
    if (!viewer) {
      viewer = new window.SpaceFoldViewer($("stage"), updateViewerText);
      const initialView = params.get("view");
      if (initialView === "cutaway" || initialView === "panorama") viewer.setMode(initialView);
    }
    viewer.select(scene);
    updateViewerText();
  }

  function updateSceneAddress(id) {
    if (!["https:", "http:"].includes(location.protocol)) return;
    const url = new URL(location.href);
    url.searchParams.set("scene", id);
    if (viewer?.mode && viewer.mode !== "geometry") url.searchParams.set("view", viewer.mode);
    else url.searchParams.delete("view");
    history.replaceState(history.state, "", url);
  }

  function populateSceneChoices() {
    for (const [id, model] of Object.entries(models)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "scene-choice";
      button.dataset.scene = id;
      button.setAttribute("aria-pressed", String(id === scene));
      const previews = document.createElement("div");
      previews.className = "scene-previews";
      for (const suffix of ["thumb", "cutaway"]) {
        const image = new Image(256, 144);
        image.src = "assets/scenes/" + id + "-" + suffix + ".webp" + (suffix === "cutaway" ? "?v=surfaces1" : "");
        image.alt = "";
        if (suffix === "cutaway") image.className = "cutaway-thumb";
        image.loading = "lazy";
        previews.append(image);
      }
      const label = document.createElement("span");
      const name = document.createElement("strong");
      name.dataset.t = model.name;
      const dataset = document.createElement("small");
      dataset.dataset.t = roomKinds[model.dataset];
      label.append(name, dataset);
      button.append(previews, label);
      button.addEventListener("click", () => {
        chooseScene(id);
        updateSceneAddress(id);
      });
      $("scene-options").append(button);
    }
  }

  function showMethod() {
    pressed("button[data-method]", "method", method);
    document.querySelector(".method-exhibit").dataset.methodPanel = method;
    $("method-heading").textContent = t(method + "Heading");
    $("method-body").textContent = t(method + "Body");
    const image = $("method-image");
    image.src = "assets/method/" + method + (lang ? "-zh" : "") + ".webp";
    image.alt = t(method + "Alt");
    image.width = method === "codec" ? 2300 : 1574;
    image.height = method === "codec" ? 575 : 1427;
  }

  const reconColumns = [
    ["sizeCol", "MiB ↓"],
    ["surfaceDistance", "millimetres"],
    ["match1", "% ↑"],
    ["match2", "% ↑"],
  ];
  const genColumns = [
    ["occCol", "withinFive"],
    ["surfaceDistance", "centimetres"],
    ["completeF", "withinFive"],
    ["extraCells", "perHundred"],
    ["viewBF", "% ↑"],
  ];
  const countText = {
    "3D-FRONT": "frontCount",
    "ScanNet++": "scanCount",
    HSSD: "hssdCount",
    "ERP-FRONT": "erpCount",
    Replica: "replicaCount",
  };
  function showMetricGuide(generation) {
    $("dataset-count").textContent = t(countText[dataset]);
    const terms = generation
      ? ["occluded", "distance", "match", "extra", "edge"]
      : ["code", "distance", "match"];
    const definitions = document.createDocumentFragment();
    for (const term of terms) {
      const label = document.createElement("dt");
      const meaning = document.createElement("dd");
      label.textContent = t(term + "Term");
      meaning.textContent = t(term + "Def");
      definitions.append(label, meaning);
    }
    $("metric-definitions").replaceChildren(definitions);
    const setup = generation
      ? [t("genSetup"), ...(dataset === "ERP-FRONT" ? [t("erpEdgeSet")] : [])]
      : [
          t({ "3D-FRONT": "frontSetup", "ScanNet++": "scanSetup", HSSD: "hssdSetup" }[dataset]),
          t("detailProtocol"),
        ];
    $("metric-setup").replaceChildren(
      ...setup.map((text) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        return paragraph;
      }),
    );
  }
  function showScrollHint() {
    const container = $("score-scroll");
    $("score-scroll-hint").hidden = container.scrollWidth <= container.clientWidth + 1;
  }
  function showScores() {
    const data = window.SpaceFoldBenchmarks[task];
    if (!Object.hasOwn(data, dataset)) dataset = Object.keys(data)[0];
    $("dataset").replaceChildren(
      ...Object.keys(data).map((name) => new Option(name, name, false, name === dataset)),
    );
    pressed("[data-benchmark]", "benchmark", task);
    const generation = task === "generation";
    const table = $("scores");
    table.classList.toggle("generation", generation);
    $("score-caption").textContent = t(task) + " · " + dataset;
    const head = document.createElement("tr");
    const first = document.createElement("th");
    first.scope = "col";
    first.textContent = t("methodCol");
    head.append(first);
    for (const [key, unit] of generation ? genColumns : reconColumns) {
      const th = document.createElement("th"),
        span = document.createElement("span");
      th.scope = "col";
      th.textContent = t(key);
      span.className = "units";
      span.textContent = pairs[unit] ? t(unit) : unit;
      th.append(span);
      head.append(th);
    }
    table.tHead.replaceChildren(head);
    const rows = data[dataset].map(([label, ...values]) => {
      const row = document.createElement("tr"),
        name = document.createElement("th");
      name.scope = "row";
      name.textContent = label;
      row.append(name);
      if (label === "SpaceFold") row.className = "our-row";
      if (generation && ["VolFill", "World Tracing"].includes(label)) {
        const badge = document.createElement("span");
        badge.className = "fused-note";
        badge.textContent = t("crops");
        name.append(badge);
      }
      for (const value of values) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      return row;
    });
    table.tBodies[0].replaceChildren(...rows);
    showMetricGuide(generation);
    showScrollHint();
    $("recon-details").hidden = generation;
    if (!generation) {
      const id = { "3D-FRONT": "front", "ScanNet++": "scan", HSSD: "hssd" }[dataset];
      $("detail-heading").textContent = t(id + "Detail");
      $("detail-note").textContent = t(id + "DetailNote");
      for (const button of document.querySelectorAll("[data-detail]")) {
        const method = button.dataset.detail;
        const name = { xcube: "XCube", spacefold: "SpaceFold", gt: t("reference") }[method];
        const image = button.querySelector("img");
        image.src = "assets/details/" + id + "-" + method + ".webp";
        image.alt = t(id + "Detail") + " · " + name;
        button.setAttribute("aria-label", t("enlarge") + " " + image.alt);
      }
    }
  }

  function updateWipe() {
    const pct = $("wipe").value;
    $("wipe-stage").style.setProperty("--wipe", pct + "%");
    $("wipe").setAttribute(
      "aria-valuetext",
      lang ? "左图占 " + pct + "%" : "Left image covers " + pct + "%",
    );
    $("base-tag").style.opacity = pct < 6 ? "0" : "1";
    $("wipe-stage").querySelector(".wipe-tags span:last-child").style.opacity =
      pct > 94 ? "0" : "1";
  }
  function showView() {
    $("view-select").replaceChildren(
      ...Object.entries(cameras).map(([id, [key]]) => new Option(t(key), id, false, id === camera)),
    );
    $("baseline-select").value = baseline;
    const name = baseline === "da2" ? t("visibleOnly") : "InfiniSplat v3";
    const title = t(cameras[camera][0]);
    $("base-tag").textContent = name;
    for (const [id, method] of [
      ["ours-view", "spacefold"],
      ["base-view", baseline],
    ]) {
      const source = "assets/views/" + camera + "-" + method + ".webp";
      if ($(id).getAttribute("src") !== source) $(id).src = source;
    }
    $("ours-view").alt = title + " · " + t("withSpaceFold");
    $("base-view").alt = title + " · " + name;
    $("view-note").textContent = t(cameras[camera][baseline === "da2" ? 1 : 2]);
    $("render-explanation").textContent = t(baseline === "da2" ? "renderDa2" : "renderInfini");
    $("view-source").textContent = t(cameras[camera][3]);
    updateWipe();
    pairReady();
  }
  function pairReady() {
    const images = [$("ours-view"), $("base-view")];
    const ready = images.every((img) => img.complete && img.naturalWidth > 0);
    const missing = images.some((img) => img.complete && !img.naturalWidth);
    $("wipe-stage").setAttribute("aria-busy", String(!ready && !missing));
    $("wipe-stage").classList.toggle("pending", !ready);
    $("pair-status").textContent = ready ? "" : t(missing ? "viewFailed" : "viewLoading");
  }
  for (const id of ["ours-view", "base-view"]) {
    $(id).addEventListener("load", pairReady);
    $(id).addEventListener("error", pairReady);
  }

  function translate() {
    document.documentElement.lang = lang ? "zh-CN" : "en";
    document.title = t("pageTitle");
    document.querySelector('meta[name="description"]').content = t("pageDescription");
    for (const elem of document.querySelectorAll("[data-t]")) elem.textContent = t(elem.dataset.t);
    for (const elem of document.querySelectorAll("[data-a]"))
      elem.setAttribute("aria-label", t(elem.dataset.a));
    for (const elem of document.querySelectorAll("[data-alt]")) elem.alt = t(elem.dataset.alt);
    for (const elem of document.querySelectorAll("[data-title]"))
      elem.title = t(elem.dataset.title);
    for (const elem of document.querySelectorAll("[data-tip]")) {
      elem.title = t(elem.dataset.tip);
      elem.setAttribute("aria-label", elem.title);
    }
    const toggle = $("language");
    toggle.textContent = lang ? "English" : "中文";
    toggle.lang = lang ? "en" : "zh-CN";
    toggle.setAttribute("aria-label", lang ? "Switch to English" : "切换到中文");
    const heroLink = $("hero-scene");
    const heroUrl = new URL(heroLink.href);
    if (lang) heroUrl.searchParams.set("lang", "zh");
    else heroUrl.searchParams.delete("lang");
    heroLink.href = heroUrl.href;
    translateOpening();
    updateViewerText();
    showMethod();
    showScores();
    showView();
  }

  function setExpanded(value) {
    if (expanded === value) return;
    expanded = value;
    $("screen").classList.toggle("is-expanded", value);
    document.body.classList.toggle("expanded", value);
    if (value) {
      $("screen").setAttribute("role", "dialog");
      $("screen").setAttribute("aria-modal", "true");
      $("screen").setAttribute("aria-label", t("explorerTitle"));
    } else {
      $("screen").removeAttribute("role");
      $("screen").removeAttribute("aria-modal");
      $("screen").removeAttribute("aria-label");
    }
    $("expand").setAttribute("aria-pressed", String(value));
    updateViewerText();
    $(value ? "stage" : "expand").focus({ preventScroll: true });
  }
  async function toggleExpanded() {
    if (expanded) {
      if (document.fullscreenElement === $("screen")) await document.exitFullscreen();
      setExpanded(false);
    } else {
      setExpanded(true);
      if ($("screen").requestFullscreen && document.fullscreenEnabled) {
        await $("screen")
          .requestFullscreen()
          .catch(() => {}); // Embedded previews can restrict native fullscreen.
      }
    }
  }

  $("language").addEventListener("click", () => {
    lang = 1 - lang;
    translate();
  });
  function showMenu(open) {
    $("section-links").classList.toggle("open", open);
    $("menu").setAttribute("aria-expanded", String(open));
    $("menu")
      .querySelector("use")
      .setAttribute("href", open ? "#i-close" : "#i-menu");
  }
  $("menu").addEventListener("click", () =>
    showMenu($("menu").getAttribute("aria-expanded") !== "true"),
  );
  $("section-links").addEventListener("click", () => showMenu(false));
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".mast")) showMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("menu").getAttribute("aria-expanded") === "true") {
      showMenu(false);
      $("menu").focus();
    }
  });
  matchMedia("(max-width:640px)").addEventListener("change", () => showMenu(false));
  if (requestedScene && requestedScene !== scene) updateSceneAddress(scene);
  populateSceneChoices();
  $("input-preview").addEventListener("click", () => {
    if (!viewer) chooseScene(scene);
    viewer.setMode("panorama");
    updateSceneAddress(scene);
    $("stage").focus({ preventScroll: true });
  });
  for (const button of document.querySelectorAll(".mode-switch [data-view]")) {
    button.addEventListener("click", () => {
      if (!viewer) chooseScene(scene);
      viewer.setMode(button.dataset.view);
      updateSceneAddress(scene);
    });
  }
  $("occlusion").addEventListener("change", () => {
    if (!viewer) chooseScene(scene);
    viewer.highlight = $("occlusion").checked;
    viewer.draw();
    updateViewerText();
  });
  $("zoom-in").addEventListener("click", () => viewer?.magnify(1.2));
  $("zoom-out").addEventListener("click", () => viewer?.magnify(1 / 1.2));
  $("reset").addEventListener("click", () => viewer?.reset());
  $("expand").addEventListener("click", toggleExpanded);
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) setExpanded(false);
  });
  document.addEventListener("keydown", (e) => {
    if (!expanded) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (document.fullscreenElement) document.exitFullscreen();
      setExpanded(false);
    }
    if (e.key === "Tab") {
      const controls = [...$("screen").querySelectorAll("[tabindex='0'],button:not(:disabled)")];
      if (e.shiftKey && document.activeElement === controls[0]) {
        e.preventDefault();
        controls.at(-1).focus();
      } else if (!e.shiftKey && document.activeElement === controls.at(-1)) {
        e.preventDefault();
        controls[0].focus();
      }
    }
  });
  for (const b of document.querySelectorAll("button[data-method]"))
    b.addEventListener("click", () => {
      method = b.dataset.method;
      showMethod();
    });
  function openFigure(image, title, wide, note = "") {
    $("figure-title").textContent = title;
    $("original-figure").hidden = !note;
    if (note) $("original-figure").href = image.src;
    $("figure-note").textContent = note;
    $("figure-note").hidden = !note;
    $("large-diagram").src = image.src;
    $("large-diagram").alt = image.alt;
    $("large-diagram").dataset.wide = String(wide);
    $("figure-dialog").showModal();
  }
  $("diagram-open").addEventListener("click", () =>
    openFigure($("method-image"), t(method + "Heading"), method === "codec"),
  );
  let codeAtlas = null;
  function drawCodeSlices() {
    const index = Number($("code-height").value);
    const height = -1.1168862251 + (index + 0.5) * 0.156036921;
    $("code-meters").textContent = height.toFixed(2) + " m";
    $("code-height").setAttribute("aria-valuetext", $("code-meters").textContent);
    if (!codeAtlas?.naturalWidth) return;
    for (const [part, id] of ["code-visible", "code-complete"].entries()) {
      const ctx = $(id).getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(codeAtlas, part * 32, index * 32, 32, 32, 0, 0, 32, 32);
    }
  }
  function inspectCodes() {
    const dialog = $("code-dialog");
    dialog.showModal();
    if (!codeAtlas) {
      dialog.setAttribute("aria-busy", "true");
      codeAtlas = new Image();
      codeAtlas.onload = () => {
        drawCodeSlices();
        dialog.setAttribute("aria-busy", "false");
      };
      codeAtlas.onerror = () => {
        dialog.setAttribute("aria-busy", "false");
        dialog.querySelector(".code-note").textContent = t("codeLoadError");
        codeAtlas = null;
      };
      codeAtlas.src = "assets/method/room-code-slices.png?v=ddc1f9c6";
    }
    dialog.querySelector(".code-note").textContent = t("codeLegend");
    drawCodeSlices();
  }
  $("method-codes").addEventListener("click", inspectCodes);
  $("hero-step-scale").addEventListener("click", inspectCodes);
  $("code-height").addEventListener("input", drawCodeSlices);
  $("close-codes").addEventListener("click", () => $("code-dialog").close());
  $("code-dialog").addEventListener("click", (event) => {
    if (event.target === $("code-dialog")) $("code-dialog").close();
  });
  for (const button of document.querySelectorAll("[data-detail]"))
    button.addEventListener("click", () => {
      const image = button.querySelector("img");
      openFigure(image, image.alt, false);
    });
  $("compare-geometry").addEventListener("click", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    const title = t(models[scene].name) + " · " + t("compareGeometry");
    openFigure({ src: $("compare-geometry").href, alt: title }, title, false, t("comparisonAlt"));
  });
  $("close-diagram").addEventListener("click", () => $("figure-dialog").close());
  $("figure-dialog").addEventListener("click", (e) => {
    if (e.target === $("figure-dialog")) $("figure-dialog").close();
  });
  for (const b of document.querySelectorAll("[data-benchmark]"))
    b.addEventListener("click", () => {
      task = b.dataset.benchmark;
      showScores();
    });
  $("dataset").addEventListener("change", (e) => {
    dataset = e.target.value;
    showScores();
  });
  $("view-select").addEventListener("change", (e) => {
    camera = e.target.value;
    showView();
  });
  $("baseline-select").addEventListener("change", (e) => {
    baseline = e.target.value;
    showView();
  });
  $("wipe").addEventListener("input", updateWipe);
  translate();
  new ResizeObserver(showScrollHint).observe($("score-scroll"));
  const sceneObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        chooseScene(scene);
        sceneObserver.disconnect();
      }
    },
    { rootMargin: "220px" },
  );
  sceneObserver.observe($("screen"));

  const navLinks = [...document.querySelectorAll(".mast nav a")];
  const sections = navLinks.map((a) => document.querySelector(a.hash));
  let navFrame = 0;
  function trackSection() {
    navFrame = 0;
    const active = sections.findLast(
      (section) => section.getBoundingClientRect().top <= innerHeight * 0.36,
    );
    for (const a of navLinks) {
      if (active && a.hash === "#" + active.id) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    }
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!navFrame) navFrame = requestAnimationFrame(trackSection);
    },
    { passive: true },
  );
  trackSection();
})();
