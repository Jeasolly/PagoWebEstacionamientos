(function () {
  const btn = document.getElementById("hambBtn");
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("drawerOverlay");

  if (!btn || !drawer || !overlay) {
    console.warn("[drawer] faltan elementos:", { btn, drawer, overlay });
    return;
  }

  function openDrawer() {
    drawer.classList.add("is-open");
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", () => {
    const opened = drawer.classList.contains("is-open");
    if (opened) closeDrawer();
    else openDrawer();
  });

  overlay.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  drawer.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", closeDrawer);
  });
})();
