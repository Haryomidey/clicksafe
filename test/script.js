const downloadLink = document.querySelector(".download");

downloadLink?.addEventListener("click", () => {
  downloadLink.textContent = "Downloading CV...";
  window.setTimeout(() => {
    downloadLink.textContent = "Download CV";
  }, 1200);
});