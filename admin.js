(() => {
  const $ = selector => document.querySelector(selector);
  const loginPanel = $("#login-panel"), dashboard = $("#dashboard");
  const message = (el, text, error = false) => { el.textContent = text; el.classList.toggle("error", error); };
  async function api(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Có lỗi xảy ra.");
    return body;
  }
  async function refresh() {
    const tracks = await api("/api/admin/tracks");
    $("#admin-track-list").innerHTML = tracks.length ? tracks.map(t => `<div class="admin-track"><div><strong>${escapeHtml(t.title)}</strong><small>${escapeHtml(t.artist)} · ${escapeHtml(t.genre)}</small></div><button class="delete-btn" data-id="${escapeHtml(t.id)}">Xóa</button></div>`).join("") : '<p class="muted">Chưa có bài nhạc nào.</p>';
    $("#admin-track-list").querySelectorAll("[data-id]").forEach(btn => btn.addEventListener("click", async () => {
      if (!confirm("Bạn chắc chắn muốn xóa bài nhạc này?")) return;
      try { await api(`/api/admin/tracks/${encodeURIComponent(btn.dataset.id)}`, {method:"DELETE"}); await refresh(); }
      catch (e) { alert(e.message); }
    }));
  }
  function escapeHtml(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
  $("#login-form").addEventListener("submit", async e => {
    e.preventDefault(); message($("#login-message"), "Đang đăng nhập…");
    try {
      await api("/api/admin/login", {method:"POST", body:JSON.stringify({password:$("#password").value})});
      loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden"); await refresh();
    } catch (err) { message($("#login-message"), err.message, true); }
  });
  $("#track-form").addEventListener("submit", async e => {
    e.preventDefault(); message($("#track-message"), "Đang lưu…");
    try {
      await api("/api/admin/tracks", {method:"POST", body:JSON.stringify({
        title:$("#title").value, artist:$("#artist").value, genre:$("#track-genre").value,
        audio:$("#audio-url").value, cover:$("#cover-url").value
      })});
      $("#title").value = ""; $("#audio-url").value = ""; $("#cover-url").value = "";
      message($("#track-message"), "Đã thêm bài nhạc."); await refresh();
    } catch (err) { message($("#track-message"), err.message, true); }
  });
  $("#logout").addEventListener("click", async () => {
    try { await api("/api/admin/logout", {method:"POST", body:"{}"}); } finally {
      dashboard.classList.add("hidden"); loginPanel.classList.remove("hidden"); $("#password").value = "";
    }
  });
})();
