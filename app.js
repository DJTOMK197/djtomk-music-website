(() => {
  const audio = document.querySelector("#audio");
  const list = document.querySelector("#track-list");
  const search = document.querySelector("#search");
  const genre = document.querySelector("#genre");
  const playButton = document.querySelector("#play");
  let tracks = [], current = -1;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  const time = value => Number.isFinite(value) ? `${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,"0")}` : "0:00";
  document.querySelector("#year").textContent = new Date().getFullYear();

  function render() {
    const q = search.value.trim().toLowerCase(), g = genre.value;
    const shown = tracks.map((track, index) => ({...track, index})).filter(t =>
      (!g || t.genre === g) && `${t.title} ${t.artist} ${t.genre}`.toLowerCase().includes(q));
    document.querySelector("#track-count").textContent = `${tracks.length} TRACKS`;
    if (!shown.length) {
      list.innerHTML = `<div class="empty-state">${tracks.length ? "Không tìm thấy bài nhạc phù hợp." : "Chưa có bài nhạc nào. Mở mục Quản trị để thêm nhạc."}</div>`;
      return;
    }
    list.innerHTML = shown.map(t => `<button class="track-row ${t.index===current?"selected":""}" data-index="${t.index}"><span class="track-number">${String(t.index+1).padStart(2,"0")}</span><span class="track-cover">${t.cover ? `<img src="${esc(t.cover)}" alt="">` : "TK"}</span><span class="track-info"><strong>${esc(t.title)}</strong><small>${esc(t.artist || "DJ TOMK")} · ${esc(t.genre || "VinaHouse")}</small></span><span class="track-play">${t.index===current && !audio.paused ? "Ⅱ" : "▶"}</span></button>`).join("");
    list.querySelectorAll("[data-index]").forEach(btn => btn.addEventListener("click", () => play(Number(btn.dataset.index))));
  }
  async function load() {
    try {
      const response = await fetch("/api/tracks");
      if (!response.ok) throw new Error("Không tải được danh sách nhạc");
      tracks = await response.json(); render();
    } catch {
      list.innerHTML = '<div class="empty-state">Không kết nối được máy chủ. Hãy tải lại trang sau ít phút.</div>';
    }
  }
  function play(index) {
    if (!tracks[index]) return;
    current = index;
    audio.src = tracks[index].audio;
    document.querySelector("#now-title").textContent = tracks[index].title;
    document.querySelector("#now-artist").textContent = tracks[index].artist || "DJ TOMK";
    audio.play().then(() => { playButton.textContent = "Ⅱ"; render(); }).catch(() => { playButton.textContent = "▶"; });
    render();
  }
  playButton.addEventListener("click", () => {
    if (current < 0) { if (tracks.length) play(0); return; }
    if (audio.paused) audio.play().then(() => playButton.textContent="Ⅱ").catch(()=>{}); else audio.pause();
  });
  document.querySelector("#prev").addEventListener("click", () => { if (tracks.length) play((current - 1 + tracks.length) % tracks.length); });
  document.querySelector("#next").addEventListener("click", () => { if (tracks.length) play((current + 1) % tracks.length); });
  audio.addEventListener("play", () => playButton.textContent = "Ⅱ");
  audio.addEventListener("pause", () => playButton.textContent = "▶");
  audio.addEventListener("ended", () => { if (tracks.length) play((current + 1) % tracks.length); });
  audio.addEventListener("loadedmetadata", () => document.querySelector("#duration").textContent = time(audio.duration));
  audio.addEventListener("timeupdate", () => {
    document.querySelector("#current-time").textContent = time(audio.currentTime);
    document.querySelector("#seek").value = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
  });
  document.querySelector("#seek").addEventListener("input", e => { if (audio.duration) audio.currentTime = Number(e.target.value)/100*audio.duration; });
  search.addEventListener("input", render); genre.addEventListener("change", render);
  load();
})();
