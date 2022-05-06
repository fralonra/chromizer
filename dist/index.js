// build/_snowpack/pkg/kyrema.js
function createCommonjsModule(fn, basedir, module) {
  return module = {
    path: basedir,
    exports: {},
    require: function(path, base) {
      return commonjsRequire(path, base === void 0 || base === null ? module.path : base);
    }
  }, fn(module, module.exports), module.exports;
}
function commonjsRequire() {
  throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
}
var lib = createCommonjsModule(function(module, exports) {
  Object.defineProperty(exports, "__esModule", {value: true});
  exports.kyremaWithCentroids = exports.kyrema = void 0;
  const MAX_TRY = 50;
  function kyrema2(k, data, distanceCalculator, averageCalculator, centroidEqualator, maxTry = MAX_TRY) {
    if (data.length <= 0) {
      return [];
    }
    if (k >= data.length) {
      throw "Data count is less than k.";
    }
    const centroids = [];
    let lastLoopStartIdx = 0;
    let idx = lastLoopStartIdx;
    let step = decideStep();
    while (centroids.length < k) {
      if (lastLoopStartIdx > data.length - 1) {
        throw "No enough centroids found. Please specify a smaller k.";
      }
      const centroid = data[idx];
      if (centroids.every((c) => !centroidEqualator(c, centroid))) {
        centroids.push(centroid);
      } else {
        step = decideStep();
        if (step <= 0) {
          lastLoopStartIdx++;
          idx = lastLoopStartIdx;
          step = decideStep();
          continue;
        }
      }
      idx += step;
    }
    return kyremaWithCentroids(k, centroids, data, distanceCalculator, averageCalculator, centroidEqualator, maxTry);
    function decideStep() {
      return Math.floor((data.length - 1 - idx) / (k - centroids.length));
    }
  }
  exports.kyrema = kyrema2;
  function kyremaWithCentroids(k, initialCentroids, data, distanceCalculator, averageCalculator, centroidEqualator, maxTry = MAX_TRY) {
    const dataGroups = [];
    for (let i = 0; i < k; i++) {
      dataGroups.push([]);
    }
    const result = initialCentroids.map((value) => ({
      value,
      count: 0,
      indexes: []
    }));
    let iterCount = 0;
    while (true) {
      data.forEach((d, i) => groupItem(d, i));
      let equalCentroidCount = 0;
      for (let i = 0; i < k; i++) {
        const datas = dataGroups[i];
        const centroid = result[i];
        const averageCentroid = averageCalculator(datas);
        if (!centroidEqualator(centroid.value, averageCentroid)) {
          centroid.value = averageCentroid;
        } else {
          equalCentroidCount++;
        }
      }
      if (++iterCount >= maxTry || equalCentroidCount === k) {
        break;
      }
      for (let i = 0; i < k; i++) {
        result[i].count = 0;
        result[i].indexes = [];
        dataGroups[i] = [];
      }
    }
    return result;
    function groupItem(data2, idx) {
      let minDistance = Number.MAX_SAFE_INTEGER;
      let groupIdx = 0;
      for (let i = 0; i < k; i++) {
        const d = distanceCalculator(data2, result[i].value);
        if (d < minDistance) {
          minDistance = d;
          groupIdx = i;
        }
      }
      result[groupIdx].count++;
      result[groupIdx].indexes.push(idx);
      dataGroups[groupIdx].push(data2);
    }
  }
  exports.kyremaWithCentroids = kyremaWithCentroids;
});
var kyrema = lib.kyrema;

// build/dist/utils.js
function rgbaToHex(r, g, b, a) {
  const channels = [
    r.toString(16),
    g.toString(16),
    b.toString(16),
    a.toString(16)
  ];
  channels.forEach((channel, i) => {
    if (channel.length < 2) {
      channels[i] = "0" + channel;
    }
  });
  return "#" + channels.join("");
}

// build/dist/index.js
function main() {
  const canvas = document.getElementById("canvas");
  const canvasWrapper = document.getElementById("canvas-wrapper");
  const kInput = document.getElementById("k-input");
  const modal = document.getElementById("modal");
  const palette = document.getElementById("palette");
  const upload = document.getElementById("upload");
  const ctx = canvas.getContext("2d");
  let k = parseInt(kInput.value);
  let image = null;
  let activedPalleteIndex = -1;
  let originalImageData = new Uint8ClampedArray();
  const renderImageDatas = [];
  upload.addEventListener("change", onUploaded);
  kInput.addEventListener("change", onKChanged);
  window.addEventListener("resize", onWindowResized);
  function addPaletteItem(index, centroid, image2) {
    const itemEl = document.createElement("li");
    const colorEl = document.createElement("div");
    colorEl.classList.add("colorbar");
    colorEl.style.backgroundColor = `rgba(${centroid.value.join(",")})`;
    colorEl.addEventListener("click", function onColorbarClicked() {
      const itemFocused = activedPalleteIndex !== index;
      activedPalleteIndex = itemFocused ? index : -1;
      if (itemFocused) {
        palette.querySelectorAll(".colorbar").forEach((el) => el.style.border = "");
      }
      colorEl.style.border = itemFocused ? "1px solid #f00" : "";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(new ImageData(activedPalleteIndex > -1 ? renderImageDatas[activedPalleteIndex] : originalImageData, image2.width, image2.height), 0, 0);
    });
    const hexValue = rgbaToHex(centroid.value[0], centroid.value[1], centroid.value[2], centroid.value[3]);
    const hexEl = document.createElement("div");
    hexEl.classList.add("hex");
    hexEl.textContent = hexValue;
    const copyHexEl = document.createElement("button");
    copyHexEl.textContent = "Copy Hex";
    copyHexEl.addEventListener("click", () => {
      navigator.clipboard.writeText(hexValue);
    });
    hexEl.appendChild(copyHexEl);
    const percentEl = document.createElement("div");
    percentEl.textContent = `${(centroid.count * 100 / (image2.width * image2.height)).toFixed(2)}%`;
    itemEl.appendChild(colorEl);
    itemEl.appendChild(hexEl);
    itemEl.appendChild(percentEl);
    palette.appendChild(itemEl);
  }
  function chromizeImage(image2) {
    modalShow();
    setTimeout(() => {
      activedPalleteIndex = -1;
      renderImageDatas.length = 0;
      const collection = [];
      for (let i = 0; i < originalImageData.length; i += 4) {
        collection.push([
          originalImageData[i],
          originalImageData[i + 1],
          originalImageData[i + 2],
          originalImageData[i + 3]
        ]);
      }
      const distanceCalculator = (data, centroid) => {
        return Math.sqrt(Math.pow(data[0] - centroid[0], 2) + Math.pow(data[1] - centroid[1], 2) + Math.pow(data[2] - centroid[2], 2) + Math.pow(data[3] - centroid[3], 2));
      };
      const averageCalculator = (datas) => {
        let c0 = 0;
        let c1 = 0;
        let c2 = 0;
        let c3 = 0;
        for (let i = 0; i < datas.length; i++) {
          c0 += datas[i][0];
          c1 += datas[i][1];
          c2 += datas[i][2];
          c3 += datas[i][3];
        }
        const average = [
          c0 / datas.length,
          c1 / datas.length,
          c2 / datas.length,
          c3 / datas.length
        ];
        let minDistance = Number.MAX_SAFE_INTEGER;
        let averageData = datas[0];
        datas.forEach((data) => {
          const d = distanceCalculator(data, average);
          if (d < minDistance) {
            minDistance = d;
            averageData = data;
          }
        });
        return averageData;
      };
      const centroidEqualator = (c1, c2) => {
        return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
      };
      const k2 = parseInt(kInput.value);
      try {
        const result = kyrema(k2, collection, distanceCalculator, averageCalculator, centroidEqualator);
        result.sort((a, b) => b.count - a.count);
        result.forEach(({indexes}) => {
          const data = Uint8ClampedArray.from(originalImageData);
          const set = new Set(indexes);
          for (let i = 0; i < data.length; i += 4) {
            if (set.has(i / 4))
              continue;
            data[i + 3] = 20;
          }
          renderImageDatas.push(data);
        });
        palette.innerHTML = "";
        for (let i = 0; i < k2; i++) {
          addPaletteItem(i, result[i], image2);
        }
      } catch (e) {
        console.error(e);
        palette.innerHTML = "";
      } finally {
        modalHide();
      }
    });
  }
  function modalHide() {
    modal.style.display = "none";
  }
  function modalShow() {
    modal.style.display = "block";
  }
  function onKChanged() {
    k = parseInt(kInput.value);
    if (image !== null) {
      if (activedPalleteIndex > -1) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
      }
      chromizeImage(image);
    }
  }
  function onUploaded(e) {
    const target = e.target;
    if (target.files !== null && target.files.length > 0) {
      const imageFile = target.files[0];
      image = new Image();
      image.src = URL.createObjectURL(imageFile);
      image.onload = function onImageLoaded() {
        if (image === null)
          return;
        resizeCanvas();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        originalImageData = ctx.getImageData(0, 0, image.width, image.height).data;
        chromizeImage(image);
      };
    }
  }
  function onWindowResized() {
    resizeCanvas();
    if (image != null) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(new ImageData(activedPalleteIndex > -1 ? renderImageDatas[activedPalleteIndex] : originalImageData, image.width, image.height), 0, 0);
    }
  }
  function resizeCanvas() {
    if (image !== null) {
      canvas.width = image.width;
      canvas.height = image.height;
    }
    const aspect = canvas.width / canvas.height;
    if (canvas.width >= canvasWrapper.clientWidth) {
      if (canvas.height >= canvasWrapper.clientHeight) {
        const cw = canvasWrapper.clientHeight * aspect;
        canvas.style.width = cw < canvasWrapper.clientWidth ? `${cw}px` : "100%";
      } else {
        canvas.style.width = "100%";
      }
    } else if (canvas.width < canvasWrapper.clientWidth) {
      if (canvas.height >= canvasWrapper.clientHeight) {
        canvas.style.width = `${canvasWrapper.clientHeight * aspect}px`;
      } else {
        canvas.style.width = `${canvas.width}px`;
      }
    }
    if (canvas.height >= canvasWrapper.clientHeight) {
      if (canvas.width >= canvasWrapper.clientWidth) {
        const ch = canvasWrapper.clientWidth / aspect;
        canvas.style.height = ch < canvasWrapper.clientHeight ? `${ch}px` : "100%";
      } else {
        canvas.style.height = "100%";
      }
    } else if (canvas.height < canvasWrapper.clientHeight) {
      if (canvas.width >= canvasWrapper.clientWidth) {
        canvas.style.height = `${canvasWrapper.clientWidth / aspect}px`;
      } else {
        canvas.style.height = `${canvas.height}px`;
      }
    }
  }
}
main();
//# sourceMappingURL=index.js.map
