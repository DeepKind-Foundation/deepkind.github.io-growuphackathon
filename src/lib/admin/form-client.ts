interface SaveResponse {
  prNumber: number;
  prUrl: string;
  pendingChangeCount: number;
  previewUrl: string | null;
}

/**
 * Wires a file input to a live `<img>` preview: as soon as an image is
 * chosen, it's shown immediately (via a local object URL — no upload
 * happens yet) instead of the editor only finding out what they picked
 * after saving. No-ops if either element is missing.
 */
export function wireImagePreview(inputId: string, previewImgId: string): void {
  const input = document.getElementById(inputId) as HTMLInputElement | null;
  const img = document.getElementById(previewImgId) as HTMLImageElement | null;
  if (!input || !img) return;

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    img.src = URL.createObjectURL(file);
    img.hidden = false;
    img.closest(".entry-thumb")?.classList.remove("empty");
  });
}

/**
 * Wires a "Publish all pending changes" button: calls the global publish
 * endpoint (no body — publishing is never scoped to one entry) and
 * redirects to /admin on success. Shared by the per-save result panel
 * and the pending-changes banner on /admin itself.
 */
export function wirePublishButton(button: HTMLButtonElement): void {
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Publishing...";
    const res = await fetch("/admin/api/publish", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      button.textContent = `Failed: ${data.error}`;
      button.disabled = false;
      return;
    }
    button.textContent = data.discardedConcurrentSave
      ? "Published — but a concurrent save may have been missed, check /admin"
      : "Published!";
    setTimeout(
      () => {
        window.location.href = "/admin";
      },
      data.discardedConcurrentSave ? 3000 : 1200,
    );
  });
}

/**
 * Renders the post-save/post-delete result: a preview link (or PR
 * fallback), how many changes are pending in total, and a Publish
 * button. Shared by the save flow and the delete flow below.
 */
function renderResult(
  resultEl: HTMLElement,
  verb: string,
  data: SaveResponse,
): void {
  resultEl.className = "result ok";
  const previewLine = data.previewUrl
    ? `<p>Open the live preview to check it before publishing:</p><p><a href="${data.previewUrl}" target="_blank" rel="noopener">${data.previewUrl}</a></p>`
    : `<p>No preview environment is set up yet — check the pull request instead: <a href="${data.prUrl}" target="_blank" rel="noopener">PR #${data.prNumber}</a></p>`;

  resultEl.innerHTML = `
    <p>${verb}.</p>
    ${previewLine}
    <p>${data.pendingChangeCount} file(s) pending, including this one.</p>
    <p><em>Publishing sends ALL pending changes live at once, not just this one.</em></p>
    <button id="publish" type="button">Publish all pending changes</button>
  `;

  const publishBtn = document.getElementById(
    "publish",
  ) as HTMLButtonElement | null;
  if (publishBtn) wirePublishButton(publishBtn);
}

/**
 * Sends a save/delete request, renders the shared result panel on
 * success or an error message on failure. Shared by wireAdminForm and
 * wireDeleteButton below — the only difference between them is how the
 * request itself is built.
 */
async function submitAndRenderResult(
  resultEl: HTMLDivElement,
  verb: string,
  request: () => Promise<Response>,
): Promise<void> {
  resultEl.innerHTML = "";
  try {
    const res = await request();
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Unknown error");
    renderResult(resultEl, verb, data);
  } catch (err) {
    resultEl.className = "result err";
    resultEl.textContent = err instanceof Error ? err.message : "Unknown error";
  }
}

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
    const formData = new FormData(form);
    await submitAndRenderResult(resultEl, "Saved", () =>
      fetch(endpoint, { method: "POST", body: formData }),
    );
    button.disabled = false;
  });
}

/**
 * Wires a "Delete" button on an edit page: confirms, then DELETEs the
 * entry by slug and shows the same preview/publish flow as a save — the
 * deletion itself isn't live until published, same as any other change.
 * Reads the slug and a display label from the button's own data
 * attributes (data-slug, data-label) rather than taking them as
 * parameters, so this stays a plain static import — no need for Astro's
 * define:vars, which would otherwise bypass Vite's module resolution.
 */
export function wireDeleteButton(endpoint: string): void {
  const deleteBtn = document.getElementById(
    "delete",
  ) as HTMLButtonElement | null;
  const resultEl = document.getElementById("result") as HTMLDivElement | null;
  if (!deleteBtn || !resultEl) return;

  const slug = deleteBtn.dataset.slug ?? "";
  const entryLabel = deleteBtn.dataset.label || slug;

  deleteBtn.addEventListener("click", async () => {
    if (
      !window.confirm(
        `Delete "${entryLabel}"? This opens a pull request removing it — nothing is live until you publish.`,
      )
    ) {
      return;
    }
    deleteBtn.disabled = true;
    await submitAndRenderResult(resultEl, "Deleted", () =>
      fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      }),
    );
    deleteBtn.disabled = false;
  });
}
