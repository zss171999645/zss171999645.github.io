/* Decode a self-contained classic script loaded over HTTPS or file://. */
(() => {
  "use strict";

  function unpackBytes(raw, record) {
    const count = record.count;
    const flagBytes = Math.ceil(count / 8);
    if (
      !Number.isSafeInteger(count) ||
      count < 1 ||
      raw.length !== 9 * count + flagBytes ||
      raw.length !== record.geometryBytes
    ) {
      throw new Error("Unexpected SpaceFold surface length");
    }
    const xyz = new Uint16Array(count * 3);
    for (let axis = 0; axis < 3; axis++) {
      const low = axis * count * 2;
      const high = low + count;
      let position = 0;
      for (let i = 0; i < count; i++) {
        const delta = raw[low + i] | (raw[high + i] << 8);
        position = (position + delta) & 65535;
        xyz[3 * i + axis] = position;
      }
    }

    const normalOct = new Uint8Array(2 * count);
    const support = raw.slice(8 * count, 9 * count);
    const behind = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      normalOct[2 * i] = raw[6 * count + i];
      normalOct[2 * i + 1] = raw[7 * count + i];
      behind[i] = (raw[9 * count + (i >> 3)] >> (i & 7)) & 1;
    }
    return {
      xyz,
      normalOct,
      behind,
      support,
      count,
      spacingM: record.spacingM,
      supportMaxM: record.supportMaxM,
      splatRadiusM: record.splatRadiusM,
    };
  }

  async function inflate(encoded) {
    let zipped;
    if (typeof Uint8Array.fromBase64 === "function") {
      zipped = Uint8Array.fromBase64(encoded);
    } else {
      const binary = atob(encoded);
      zipped = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) zipped[i] = binary.charCodeAt(i);
    }
    const stream = new Blob([zipped]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  window.decodeSpaceFoldSurface = async function decodeSpaceFoldSurface(record) {
    if (record.geometryFormat !== "spacefold-surfel-v1") {
      throw new Error("Unsupported SpaceFold surface format");
    }
    const [raw, lighting] = await Promise.all([
      inflate(record.geometryGzip),
      record.lightingGzip ? inflate(record.lightingGzip) : null,
    ]);
    if (lighting && lighting.length !== 2 * record.count) {
      throw new Error("Unexpected SpaceFold lighting length");
    }
    return { ...unpackBytes(raw, record), lighting };
  };
})();
