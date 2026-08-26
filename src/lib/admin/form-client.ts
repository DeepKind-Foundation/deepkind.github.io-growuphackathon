/**
 * Wires an admin form's submit -> save -> preview -> publish flow.
 * Shared by every /admin/{partners,people}/{new,[slug]/edit}.astro page —
 * only the POST endpoint differs between them.
 */
export function wireAdminForm(endpoint: string): void {
  const form = document.getElementById("form") as HTMLFormElement | null;
  const resultEl = document.getElementById("result") as HTMLDivElement | null;
  if (!form || !resultEl) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = form.querySelector("button") as HTMLButtonElement;
    button.disabled = true;
    resultEl.innerHTML = "";

    const formData = new FormData(form);
    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");

      resultEl.className = "result ok";
      const previewLine = data.previewUrl
        ? `<p>Open the preview to check it before publishing:</p><p><a href="${data.previewUrl}" target="_blank" rel="noopener">${data.previewUrl}</a></p>`
        : `<p>No preview environment is set up yet — check the pull request instead: <a href="${data.prUrl}" target="_blank" rel="noopener">PR #${data.prNumber}</a></p>`;
      const reuseNote = data.reusedExistingPr
        ? "<p><em>Note: this reuses an already-open pending edit for this entry — someone else may be editing it too.</em></p>"
        : "";

      resultEl.innerHTML = `
        <p>Saved.</p>
        ${previewLine}
        ${reuseNote}
        <button id="publish" type="button">Publish to production</button>
      `;

      document
        .getElementById("publish")
        ?.addEventListener("click", async () => {
          const publishBtn = document.getElementById(
            "publish",
          ) as HTMLButtonElement;
          publishBtn.disabled = true;
          publishBtn.textContent = "Publishing...";
          const pubRes = await fetch("/admin/api/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branch: data.branch }),
          });
          const pubData = await pubRes.json();
          if (!pubRes.ok) {
            publishBtn.textContent = `Failed: ${pubData.error}`;
            publishBtn.disabled = false;
            return;
          }
          publishBtn.textContent = "Published!";
          setTimeout(() => {
            window.location.href = "/admin";
          }, 1200);
        });
    } catch (err) {
      resultEl.className = "result err";
      resultEl.textContent =
        err instanceof Error ? err.message : "Unknown error";
    } finally {
      button.disabled = false;
    }
  });
}
