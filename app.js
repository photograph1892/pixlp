const canvas = document.querySelector("#coverCanvas");
const ctx = canvas.getContext("2d");
const ootdInput = document.querySelector("#ootdInput");
const placeInput = document.querySelector("#placeInput");
const lpToggle = document.querySelector("#lpToggle");
const preview = document.querySelector(".device-stage");
const form = document.querySelector("#albumForm");
const shelf = document.querySelector("#albumShelf");
const detail = document.querySelector("#albumDetail");
const coverTitle = document.querySelector("#coverTitle");
const coverSub = document.querySelector("#coverSub");
const styleButtons = document.querySelectorAll(".style-btn");
const aiStatus = document.querySelector("#aiStatus");

const state = {
  ootd: null,
  ootdCutout: null,
  place: null,
  style: "arcade",
  selectedId: null,
  albums: [
    {
      id: "sample-1",
      day: "월요일 산책",
      ootd: "네이비 니트와 데님",
      place: "성수",
      song: "soft track",
      color: "#8f1233",
      date: "2026/05/03",
      month: "2026.05",
      image: ""
    },
    {
      id: "sample-2",
      day: "비 온 뒤",
      ootd: "회색 후디와 검은 팬츠",
      place: "연남",
      song: "rain loop",
      color: "#c23a22",
      date: "2026/05/08",
      month: "2026.05",
      image: ""
    },
    {
      id: "sample-3",
      day: "새 신발",
      ootd: "초록 가디건과 와이드 팬츠",
      place: "한강",
      song: "night ride",
      color: "#ff8b28",
      date: "2026/05/11",
      month: "2026.05",
      image: ""
    }
  ]
};

const AI_PIXEL_PERSON_ENDPOINT = "http://127.0.0.1:8787/api/pixel-person";

const palettes = {
  arcade: {
    sky: "#8bd3ff",
    cloud: "#f8fbff",
    ground: "#74c365",
    shade: "#2f8b4e",
    building: ["#ffe066", "#ff8c42", "#5db7ff", "#f72585"],
    tint: "rgba(255,255,255,0.02)"
  },
  sunset: {
    sky: "#ffb25b",
    cloud: "#ffe8a3",
    ground: "#b76f36",
    shade: "#6f3d27",
    building: ["#ff6b6b", "#ffd166", "#7bdff2", "#9b5de5"],
    tint: "rgba(255,117,64,0.12)"
  },
  midnight: {
    sky: "#172554",
    cloud: "#93c5fd",
    ground: "#263238",
    shade: "#111827",
    building: ["#38bdf8", "#a78bfa", "#f472b6", "#facc15"],
    tint: "rgba(17,24,39,0.22)"
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadImage(file) {
  aiStatus.textContent = "AI가 사진의 색감과 실루엣을 읽는 중...";
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function loadImageFromSource(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function requestPixelPersonObject(file) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("task", "detect_person_generate_pixel_object");

  const response = await fetch(AI_PIXEL_PERSON_ENDPOINT, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("AI pixel person generation failed");
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const result = await response.json();
    if (!result.image) {
      throw new Error("AI response did not include a pixel object image");
    }
    return loadImageFromSource(result.image);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadImageFromSource(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function quantize(value) {
  return Math.round(value / 42) * 42;
}

function drawPixelImage(image, x, y, width, height, pixelSize = 24, outline = false) {
  const offscreen = document.createElement("canvas");
  const octx = offscreen.getContext("2d");
  offscreen.width = Math.max(1, Math.floor(width / pixelSize));
  offscreen.height = Math.max(1, Math.floor(height / pixelSize));
  octx.drawImage(image, 0, 0, offscreen.width, offscreen.height);

  const data = octx.getImageData(0, 0, offscreen.width, offscreen.height);
  for (let i = 0; i < data.data.length; i += 4) {
    data.data[i] = quantize(data.data[i]);
    data.data[i + 1] = quantize(data.data[i + 1]);
    data.data[i + 2] = quantize(data.data[i + 2]);
  }
  octx.putImageData(data, 0, 0);

  if (outline) {
    ctx.fillStyle = "#141414";
    ctx.fillRect(x - 10, y - 10, width + 20, height + 20);
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, x, y, width, height);
  ctx.imageSmoothingEnabled = true;
}

function drawAiCutout(image, x, y, width, height, pixelSize = 10) {
  const sprite = document.createElement("canvas");
  const sctx = sprite.getContext("2d");
  sprite.width = Math.max(1, Math.floor(width / pixelSize));
  sprite.height = Math.max(1, Math.floor(height / pixelSize));
  sctx.clearRect(0, 0, sprite.width, sprite.height);
  sctx.drawImage(image, 0, 0, sprite.width, sprite.height);

  const data = sctx.getImageData(0, 0, sprite.width, sprite.height);
  for (let i = 0; i < data.data.length; i += 4) {
    if (data.data[i + 3] < 24) {
      data.data[i + 3] = 0;
      continue;
    }
    data.data[i] = Math.round(data.data[i] / 24) * 24;
    data.data[i + 1] = Math.round(data.data[i + 1] / 24) * 24;
    data.data[i + 2] = Math.round(data.data[i + 2] / 24) * 24;
    data.data[i + 3] = data.data[i + 3] > 120 ? 255 : data.data[i + 3];
  }
  sctx.putImageData(data, 0, 0);

  const outline = document.createElement("canvas");
  const octx = outline.getContext("2d");
  outline.width = sprite.width;
  outline.height = sprite.height;
  octx.drawImage(sprite, -1, 0);
  octx.drawImage(sprite, 1, 0);
  octx.drawImage(sprite, 0, -1);
  octx.drawImage(sprite, 0, 1);
  octx.globalCompositeOperation = "source-in";
  octx.fillStyle = "#111111";
  octx.fillRect(0, 0, outline.width, outline.height);
  octx.globalCompositeOperation = "destination-out";
  octx.drawImage(sprite, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(outline, x - pixelSize * 0.65, y - pixelSize * 0.65, width + pixelSize * 1.3, height + pixelSize * 1.3);
  ctx.drawImage(sprite, x, y, width, height);
  ctx.imageSmoothingEnabled = true;
}

function drawOotdAvatar() {
  if (state.ootdCutout) {
    drawAiCutout(state.ootdCutout, 238, 250, 292, 374, 9);
    return;
  }

  drawPersonCutout(state.ootd, 266, 292, 236, 328, 12);
}


function drawPersonCutout(image, x, y, width, height, pixelSize = 14) {
  const sprite = document.createElement("canvas");
  const sctx = sprite.getContext("2d");
  sprite.width = Math.max(1, Math.floor(width / pixelSize));
  sprite.height = Math.max(1, Math.floor(height / pixelSize));

  const cropRatio = Math.max(width / height, sprite.width / sprite.height);
  let sourceWidth = image.width;
  let sourceHeight = image.width / cropRatio;
  if (sourceHeight > image.height) {
    sourceHeight = image.height;
    sourceWidth = image.height * cropRatio;
  }
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = Math.max(0, (image.height - sourceHeight) * 0.12);
  sctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sprite.width, sprite.height);

  const data = sctx.getImageData(0, 0, sprite.width, sprite.height);
  const cx = sprite.width / 2;
  const headY = sprite.height * 0.18;
  const neckY = sprite.height * 0.31;
  const shoulderY = sprite.height * 0.36;
  const waistY = sprite.height * 0.59;
  const hipY = sprite.height * 0.72;

  for (let row = 0; row < sprite.height; row += 1) {
    for (let col = 0; col < sprite.width; col += 1) {
      const index = (row * sprite.width + col) * 4;
      const dx = Math.abs(col - cx);
      let halfWidth = 0;

      if (row < neckY) {
        const headRadiusX = sprite.width * 0.2;
        const headRadiusY = sprite.height * 0.14;
        const headValue = (dx * dx) / (headRadiusX * headRadiusX) + ((row - headY) * (row - headY)) / (headRadiusY * headRadiusY);
        halfWidth = headValue <= 1 ? headRadiusX : 0;
      } else if (row < hipY) {
        const progress = Math.max(0, (row - shoulderY) / (hipY - shoulderY));
        const torsoTaper = row < waistY ? progress * 0.08 : 0.06 - progress * 0.02;
        halfWidth = sprite.width * (0.33 - torsoTaper);
      } else {
        const legProgress = (row - hipY) / (sprite.height - hipY);
        const legGap = sprite.width * 0.1;
        const legWidth = sprite.width * (0.105 - legProgress * 0.025);
        const leftLeg = Math.abs(col - (cx - legGap)) < legWidth;
        const rightLeg = Math.abs(col - (cx + legGap)) < legWidth;
        halfWidth = leftLeg || rightLeg ? sprite.width : 0;
      }

      const armZone = row > shoulderY && row < sprite.height * 0.69;
      const armSlope = (row - shoulderY) / (sprite.height * 0.33);
      const leftArm = armZone && Math.abs(col - (cx - sprite.width * (0.34 + armSlope * 0.05))) < sprite.width * 0.07;
      const rightArm = armZone && Math.abs(col - (cx + sprite.width * (0.34 + armSlope * 0.05))) < sprite.width * 0.07;
      const torso = halfWidth > 0 && dx < halfWidth;
      const visible = torso || leftArm || rightArm;

      data.data[index] = Math.round(data.data[index] / 28) * 28;
      data.data[index + 1] = Math.round(data.data[index + 1] / 28) * 28;
      data.data[index + 2] = Math.round(data.data[index + 2] / 28) * 28;
      data.data[index + 3] = visible ? 255 : 0;
    }
  }
  sctx.putImageData(data, 0, 0);

  const outline = document.createElement("canvas");
  const octx = outline.getContext("2d");
  outline.width = sprite.width;
  outline.height = sprite.height;
  octx.drawImage(sprite, -1, 0);
  octx.drawImage(sprite, 1, 0);
  octx.drawImage(sprite, 0, -1);
  octx.drawImage(sprite, 0, 1);
  octx.globalCompositeOperation = "source-in";
  octx.fillStyle = "#111111";
  octx.fillRect(0, 0, outline.width, outline.height);
  octx.globalCompositeOperation = "destination-out";
  octx.drawImage(sprite, 0, 0);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(outline, x - pixelSize * 0.7, y - pixelSize * 0.7, width + pixelSize * 1.4, height + pixelSize * 1.4);
  ctx.drawImage(sprite, x, y, width, height);
  ctx.imageSmoothingEnabled = true;
}

function pixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawDefaultPlace() {
  const p = palettes[state.style];
  pixelRect(0, 0, 768, 768, p.sky);
  pixelRect(72, 94, 92, 36, p.cloud);
  pixelRect(124, 130, 132, 34, p.cloud);
  pixelRect(552, 104, 118, 34, p.cloud);
  pixelRect(0, 532, 768, 236, p.ground);
  pixelRect(0, 610, 768, 158, p.shade);

  const buildings = [
    [72, 318, 116, 214, p.building[0]],
    [208, 248, 146, 284, p.building[2]],
    [392, 296, 112, 236, p.building[1]],
    [532, 360, 160, 172, p.building[3]]
  ];
  buildings.forEach(([x, y, w, h, color], index) => {
    pixelRect(x - 8, y - 8, w + 16, h + 16, "#141414");
    pixelRect(x, y, w, h, color);
    for (let row = y + 32; row < y + h - 20; row += 46) {
      for (let col = x + 20; col < x + w - 24; col += 42) {
        pixelRect(col, row, 22, 26, index % 2 ? "#fff3b0" : "#dff7ff");
      }
    }
  });
}

function drawAvatar() {
  const size = 22;
  const baseX = 384;
  const baseY = 548;
  const colors = state.style === "midnight"
    ? ["#ffd3a7", "#4cc9f0", "#17171a", "#f72585"]
    : ["#f2b88f", "#ffffff", "#17171a", "#0a84ff"];
  const pixels = [
    [0, -7, "#141414"], [1, -7, "#141414"], [-1, -6, "#141414"], [0, -6, colors[0]], [1, -6, colors[0]], [2, -6, "#141414"],
    [-1, -5, "#141414"], [0, -5, colors[0]], [1, -5, colors[0]], [2, -5, "#141414"],
    [-2, -4, "#141414"], [-1, -4, colors[1]], [0, -4, colors[1]], [1, -4, colors[1]], [2, -4, colors[1]], [3, -4, "#141414"],
    [-2, -3, "#141414"], [-1, -3, colors[1]], [0, -3, colors[3]], [1, -3, colors[3]], [2, -3, colors[1]], [3, -3, "#141414"],
    [-1, -2, "#141414"], [0, -2, colors[1]], [1, -2, colors[1]], [2, -2, "#141414"],
    [-2, -1, "#141414"], [-1, -1, colors[2]], [0, -1, colors[2]], [1, -1, colors[2]], [2, -1, colors[2]], [3, -1, "#141414"],
    [-1, 0, "#141414"], [0, 0, colors[2]], [2, 0, colors[2]], [3, 0, "#141414"],
    [-1, 1, "#141414"], [0, 1, colors[2]], [2, 1, colors[2]], [3, 1, "#141414"],
    [-1, 2, "#141414"], [0, 2, "#141414"], [2, 2, "#141414"], [3, 2, "#141414"]
  ];
  pixels.forEach(([px, py, color]) => pixelRect(baseX + px * size, baseY + py * size, size, size, color));
}

function applyCoverText() {
  const day = document.querySelector("#dayComment").value || "오늘의 PixLP";
  const ootd = document.querySelector("#ootdComment").value || "OOTD / Place / Mood";
  coverTitle.textContent = day;
  coverSub.textContent = ootd;
}

function drawScanlines() {
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let y = 0; y < canvas.height; y += 12) {
    ctx.fillRect(0, y, canvas.width, 4);
  }
}

function renderCover() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.place) {
    drawPixelImage(state.place, 0, 0, canvas.width, canvas.height, 20);
  } else {
    drawDefaultPlace();
  }

  ctx.fillStyle = palettes[state.style].tint;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state.ootd) {
    drawOotdAvatar();
  } else {
    drawAvatar();
  }

  drawScanlines();
  pixelRect(0, 606, 768, 162, "rgba(0,0,0,0.46)");
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 38px Pretendard, Segoe UI, sans-serif";
  ctx.fillText((document.querySelector("#dayComment").value || "PixLP day track").slice(0, 22), 46, 666);
  ctx.font = "800 20px Pretendard, Segoe UI, sans-serif";
  ctx.fillText((document.querySelector("#placeComment").value || "AI pixel cover").slice(0, 34), 48, 704);
  applyCoverText();
}

async function handleUpload(event, key) {
  const [file] = event.target.files;
  if (!file) return;

  if (key === "ootd") {
    state.ootd = await loadImage(file);
    state.ootdCutout = null;
    renderCover();
    aiStatus.textContent = "AI 서버가 사람을 인식해 픽셀 오브젝트를 생성하는 중...";
    try {
      state.ootdCutout = await requestPixelPersonObject(file);
      aiStatus.textContent = "AI가 만든 픽셀 인물 오브젝트를 컷아웃해 합성했어요";
    } catch (error) {
      aiStatus.textContent = "AI 서버 연결 전이라 임시 컷아웃으로 합성했어요";
    }
  } else {
    state[key] = await loadImage(file);
    aiStatus.textContent = "AI가 장소를 픽셀 배경으로 변환했어요";
  }

  renderCover();
}

function todayParts() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return {
    date: `${year}/${month}/${day}`,
    month: `${year}.${month}`
  };
}

function colorFromAlbum(album) {
  const colors = ["#8f1233", "#b51f2d", "#c23a22", "#ff7a1a", "#ffb156", "#6d001d", "#3a000f"];
  const text = `${album.day}${album.place}${album.song}`;
  const score = [...text].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[score % colors.length];
}

function addAlbum(event) {
  event.preventDefault();
  renderCover();
  const dateParts = todayParts();
  const album = {
    id: `album-${Date.now()}`,
    image: canvas.toDataURL("image/png"),
    day: document.querySelector("#dayComment").value || "오늘의 PixLP",
    ootd: document.querySelector("#ootdComment").value || "나의 OOTD",
    place: document.querySelector("#placeComment").value || "특별한 장소",
    song: document.querySelector("#songComment").value || "무드 트랙",
    date: dateParts.date,
    month: dateParts.month
  };
  album.color = colorFromAlbum(album);
  state.albums.push(album);
  state.selectedId = album.id;
  aiStatus.textContent = "새 PixLP가 이번 달 책장에 꽂혔어요";
  drawShelf();
  renderDetail(album);
}

function monthRange() {
  const months = new Set(state.albums.map((album) => album.month));
  ["2026.05", "2026.04", "2026.03"].forEach((month) => months.add(month));
  return [...months].sort((a, b) => b.localeCompare(a));
}

function drawMonth(month, albums) {
  const spines = [];
  const totalSlots = 48;
  for (let i = 0; i < totalSlots; i += 1) {
    const album = albums[i];
    if (album) {
      const active = album.id === state.selectedId ? " active" : "";
      spines.push(`
        <button
          class="lp-spine is-album${active}"
          type="button"
          style="--c:${album.color}"
          data-id="${escapeHtml(album.id)}"
          data-date="${escapeHtml(album.date)}"
          aria-label="${escapeHtml(`${album.date} PixLP 꺼내보기`)}"
        ></button>
      `);
    } else {
      spines.push(`<span class="lp-spine is-empty" style="--c:rgba(138,118,124,0.36)"></span>`);
    }
  }

  return `
    <div class="month-row">
      <div class="month-label">${month}<span>${albums.length}장의 LP</span></div>
      <div class="spine-track">${spines.join("")}</div>
    </div>
  `;
}

function drawShelf() {
  const grouped = monthRange().map((month) => ({
    month,
    albums: state.albums.filter((album) => album.month === month)
  }));
  shelf.innerHTML = grouped.map(({ month, albums }) => drawMonth(month, albums)).join("");
}

function renderDetail(album) {
  state.selectedId = album.id;
  detail.innerHTML = `
    ${album.image ? `<img class="detail-cover" src="${album.image}" alt="${escapeHtml(album.day)} 커버" />` : ""}
    <p class="eyebrow">Selected LP</p>
    <h3>${escapeHtml(album.day)}</h3>
    <div class="detail-list">
      <div><span>Date</span><strong>${escapeHtml(album.date)}</strong></div>
      <div><span>OOTD</span><strong>${escapeHtml(album.ootd)}</strong></div>
      <div><span>Place</span><strong>${escapeHtml(album.place)}</strong></div>
      <div><span>Song</span><strong>${escapeHtml(album.song)}</strong></div>
    </div>
    <div class="detail-actions">
      <button class="secondary-btn" type="button" data-action="edit" data-id="${escapeHtml(album.id)}">수정</button>
      <button class="danger-btn" type="button" data-action="delete" data-id="${escapeHtml(album.id)}">삭제</button>
    </div>
  `;
  drawShelf();
}

function renderEmptyDetail() {
  detail.innerHTML = `
    <p class="eyebrow">Selected LP</p>
    <h3>LP를 클릭해 꺼내보기</h3>
    <p>책장에 꽂힌 PixLP를 누르면 그날 적었던 정보가 여기에 나타나요.</p>
  `;
}

function renderEditDetail(album) {
  state.selectedId = album.id;
  detail.innerHTML = `
    <p class="eyebrow">Edit LP</p>
    <h3>${escapeHtml(album.date)}</h3>
    <form class="edit-form" data-edit-id="${escapeHtml(album.id)}">
      <label>
        <span>오늘 하루</span>
        <input name="day" type="text" maxlength="42" value="${escapeHtml(album.day)}" />
      </label>
      <label>
        <span>OOTD</span>
        <input name="ootd" type="text" maxlength="42" value="${escapeHtml(album.ootd)}" />
      </label>
      <label>
        <span>장소</span>
        <input name="place" type="text" maxlength="52" value="${escapeHtml(album.place)}" />
      </label>
      <label>
        <span>노래</span>
        <input name="song" type="text" maxlength="52" value="${escapeHtml(album.song)}" />
      </label>
      <div class="detail-actions">
        <button class="secondary-btn" type="button" data-action="cancel" data-id="${escapeHtml(album.id)}">취소</button>
        <button class="primary-mini-btn" type="submit">저장</button>
      </div>
    </form>
  `;
  drawShelf();
}

function updateAlbum(id, formData) {
  const album = state.albums.find((item) => item.id === id);
  if (!album) return;
  album.day = formData.get("day")?.trim() || "오늘의 PixLP";
  album.ootd = formData.get("ootd")?.trim() || "나의 OOTD";
  album.place = formData.get("place")?.trim() || "특별한 장소";
  album.song = formData.get("song")?.trim() || "무드 트랙";
  album.color = colorFromAlbum(album);
  aiStatus.textContent = "PixLP 정보가 수정됐어요";
  renderDetail(album);
}

function deleteAlbum(id) {
  const index = state.albums.findIndex((album) => album.id === id);
  if (index === -1) return;
  state.albums.splice(index, 1);
  state.selectedId = null;
  aiStatus.textContent = "PixLP가 책장에서 삭제됐어요";
  drawShelf();
  renderEmptyDetail();
}

ootdInput.addEventListener("change", (event) => handleUpload(event, "ootd"));
placeInput.addEventListener("change", (event) => handleUpload(event, "place"));
form.addEventListener("submit", addAlbum);
lpToggle.addEventListener("change", () => preview.classList.toggle("hide-lp", !lpToggle.checked));

shelf.addEventListener("click", (event) => {
  const spine = event.target.closest(".is-album");
  if (!spine) return;
  const album = state.albums.find((item) => item.id === spine.dataset.id);
  if (album) renderDetail(album);
});

detail.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const album = state.albums.find((item) => item.id === actionButton.dataset.id);

  if (actionButton.dataset.action === "edit" && album) renderEditDetail(album);
  if (actionButton.dataset.action === "cancel" && album) renderDetail(album);
  if (actionButton.dataset.action === "delete") deleteAlbum(actionButton.dataset.id);
});

detail.addEventListener("submit", (event) => {
  const editForm = event.target.closest(".edit-form");
  if (!editForm) return;
  event.preventDefault();
  updateAlbum(editForm.dataset.editId, new FormData(editForm));
});

["dayComment", "ootdComment", "placeComment", "songComment"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", renderCover);
});

styleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    styleButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.style = button.dataset.style;
    renderCover();
  });
});

renderCover();
drawShelf();
