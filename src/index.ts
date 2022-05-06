import { Centroid, kyrema } from 'kyrema';

type Color = [number, number, number, number];

function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const canvasWrapper = document.getElementById(
    'canvas-wrapper',
  ) as HTMLCanvasElement;
  const kInput = document.getElementById('k-input') as HTMLInputElement;
  const modal = document.getElementById('modal') as HTMLDivElement;
  const palette = document.getElementById('palette') as HTMLDivElement;
  const upload = document.getElementById('upload') as HTMLInputElement;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

  let k = parseInt(kInput.value);
  let image: HTMLImageElement | null = null;
  let activedPalleteIndex = -1;
  let originalImageData = new Uint8ClampedArray();
  const renderImageDatas: Uint8ClampedArray[] = [];

  upload.addEventListener('change', onUploaded);
  kInput.addEventListener('change', onKChanged);
  window.addEventListener('resize', onWindowResized);

  function addPaletteItem(
    index: number,
    centroid: Centroid<Color>,
    image: HTMLImageElement,
  ) {
    const itemEl = document.createElement('li');

    const colorEl = document.createElement('div');
    colorEl.classList.add('colorbar');
    colorEl.style.backgroundColor = `rgba(${centroid.value.join(',')})`;
    colorEl.addEventListener('click', function onColorbarClicked() {
      const itemFocused = activedPalleteIndex !== index;
      activedPalleteIndex = itemFocused ? index : -1;

      if (itemFocused) {
        palette
          .querySelectorAll('.colorbar')
          .forEach((el) => ((el as HTMLElement).style.border = ''));
      }
      colorEl.style.border = itemFocused ? '1px solid #f00' : '';

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(
        new ImageData(
          activedPalleteIndex > -1
            ? renderImageDatas[activedPalleteIndex]
            : originalImageData,
          image.width,
          image.height,
        ),
        0,
        0,
      );
    });

    const percentEl = document.createElement('div');
    percentEl.textContent = `${(
      (centroid.count * 100) /
      (image.width * image.height)
    ).toFixed(2)}%`;

    itemEl.appendChild(colorEl);
    itemEl.appendChild(percentEl);

    palette.appendChild(itemEl);
  }

  function chromizeImage(image: HTMLImageElement) {
    modalShow();

    setTimeout(() => {
      activedPalleteIndex = -1;
      renderImageDatas.length = 0;

      const collection: Color[] = [];
      for (let i = 0; i < originalImageData.length; i += 4) {
        collection.push([
          originalImageData[i],
          originalImageData[i + 1],
          originalImageData[i + 2],
          originalImageData[i + 3],
        ]);
      }
      // collection.sort((a, b) => a[0] + a[1] + a[2] - b[0] - b[1] - b[2]);

      const distanceCalculator = (data: Color, centroid: Color): number => {
        return Math.sqrt(
          Math.pow(data[0] - centroid[0], 2) +
            Math.pow(data[1] - centroid[1], 2) +
            Math.pow(data[2] - centroid[2], 2) +
            Math.pow(data[3] - centroid[3], 2),
        );
      };

      const averageCalculator = (datas: Color[]): Color => {
        const average: Color = [
          datas.reduce((p, c) => p + c[0], 0) / datas.length,
          datas.reduce((p, c) => p + c[1], 0) / datas.length,
          datas.reduce((p, c) => p + c[2], 0) / datas.length,
          datas.reduce((p, c) => p + c[3], 0) / datas.length,
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

      const centroidEqualator = (c1: Color, c2: Color) => {
        return (
          c1[0] === c2[0] &&
          c1[1] === c2[1] &&
          c1[2] === c2[2] &&
          c1[3] === c2[3]
        );
      };

      const k = parseInt(kInput.value);
      try {
        const result = kyrema<Color>(
          k,
          collection,
          distanceCalculator,
          averageCalculator,
          centroidEqualator,
        );
        result.sort((a, b) => b.count - a.count);

        result.forEach(({ indexes }) => {
          const data = Uint8ClampedArray.from(originalImageData);
          const set = new Set(indexes);
          for (let i = 0; i < data.length; i += 4) {
            if (set.has(i / 4)) continue;

            data[i + 3] = 20;
          }
          renderImageDatas.push(data);
        });

        palette.innerHTML = '';
        for (let i = 0; i < k; i++) {
          addPaletteItem(i, result[i], image);
        }
      } catch (e) {
        console.error(e);
        palette.innerHTML = '';
      } finally {
        modalHide();
      }
    });
  }

  function modalHide() {
    modal.style.display = 'none';
  }

  function modalShow() {
    modal.style.display = 'block';
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

  function onUploaded(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files !== null && target.files.length > 0) {
      const imageFile = target.files[0];

      image = new Image();
      image.src = URL.createObjectURL(imageFile);
      image.onload = function onImageLoaded() {
        if (image === null) return;

        resizeCanvas();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);

        originalImageData = ctx.getImageData(
          0,
          0,
          image.width,
          image.height,
        ).data;
        chromizeImage(image);
      };
    }
  }

  function onWindowResized() {
    resizeCanvas();

    if (image != null) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(
        new ImageData(
          activedPalleteIndex > -1
            ? renderImageDatas[activedPalleteIndex]
            : originalImageData,
          image.width,
          image.height,
        ),
        0,
        0,
      );
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
        canvas.style.width =
          cw < canvasWrapper.clientWidth ? `${cw}px` : '100%';
      } else {
        canvas.style.width = '100%';
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
        canvas.style.height =
          ch < canvasWrapper.clientHeight ? `${ch}px` : '100%';
      } else {
        canvas.style.height = '100%';
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
