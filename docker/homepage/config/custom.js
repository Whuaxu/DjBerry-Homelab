// DjBerry: header texts (greeting + tagline) in the portfolio style
(function () {
  function saludo() {
    const h = new Date().getHours();
    if (h >= 6 && h < 13) return "Buenos días";
    if (h >= 13 && h < 21) return "Buenas tardes";
    return "Buenas noches";
  }

  function montar() {
    const title = document.querySelector("#information-widgets .text-4xl");
    if (!title) return false;
    if (!document.getElementById("djb-kicker")) {
      const k = document.createElement("span");
      k.id = "djb-kicker";
      k.className = "djb-kicker";
      title.parentNode.insertBefore(k, title);
      const t = document.createElement("span");
      t.className = "djb-tagline";
      t.textContent = "Servidor de día · cabina de noche";
      title.parentNode.insertBefore(t, title.nextSibling);
    }
    document.getElementById("djb-kicker").textContent =
      "[ " + saludo() + " ]";
    return true;
  }

  const iv = setInterval(() => { if (montar()) clearInterval(iv); }, 300);
  setInterval(montar, 60000);
})();
