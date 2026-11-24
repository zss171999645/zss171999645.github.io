// Normalized film coordinates, shared by the bilingual page and exported previews.
(() => {
  "use strict";
  const ramp = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  function opacity(frame) {
    if (frame >= 34 && frame < 169) return (1 - ramp(159, 169, frame)) * ramp(34, 41, frame);
    if (frame >= 202 && frame < 330) return (1 - ramp(322, 330, frame)) * ramp(202, 210, frame);
    return 0;
  }
  function layout(f) {
    if (f < 34 || f >= 330 || (f >= 169 && f < 202)) return [];
    if (f < 50) return [["opBedLocation", 560, 715, 48, 810]];
    if (f < 112) {
      const notes = [
        ["opEightChildren", 246, 147, 47, 400],
        ["opOneParent", 871, 147, 47, 390],
      ];
      if (f >= 76) notes.push(["opOrdered", 555, 237, 31, 223]);
      return notes;
    }
    if (f < 148)
      return [
        ["opChildSummary", 205, 180, 39, 317],
        ["opParentDistance", 562, 180, 39, 309],
        ["opParentFeature", 922, 180, 39, 317],
        ["opOneChannel", 560, 634, 29, 600],
      ];
    if (f < 169)
      return [
        ["opCoarseGrid", 244, 185, 41, 426],
        ["opSpatialCode", 869, 185, 42, 413],
        ["opDownsample", 555, 330, 31, 215],
      ];
    if (f < 234)
      return [
        ["opParentFeature", 250, 148, 48, 400],
        ["opDistanceHead", 819, 212, 36, 418],
        ["opSplitHead", 819, 401, 36, 418],
      ];
    if (f < 271)
      return [
        ["opOneParent", 246, 147, 47, 410],
        ["opEightChildren", 831, 147, 47, 428],
      ];
    if (f < 310)
      return [
        ["opKeep", 260, 160, 47, 423],
        ["opSplitAgain", 823, 160, 47, 430],
      ];
    return [["opSameEdge", 560, 718, 42, 820]];
  }
  function paint(ctx, frame, translate, alpha = 1) {
    const notes = layout(frame);
    if (!notes.length || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    for (const [key, x, y, initial, max] of notes) {
      const text = translate(key);
      let size = initial;
      const font = () =>
        "bold " +
        size +
        'px "SpaceFold CJK", "DM Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
      ctx.font = font();
      while (ctx.measureText(text).width > max && size > 25) {
        size -= 1;
        ctx.font = font();
      }
      ctx.strokeStyle = "rgba(26,24,35,.84)";
      ctx.lineWidth = 5;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = "#f8efe9";
      ctx.fillText(text, x, y);
    }
    ctx.restore();
  }
  globalThis.SpaceFoldOperationLabels = { paint, opacity, layout };
})();
