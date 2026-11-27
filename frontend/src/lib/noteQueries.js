import { api } from "@/lib/api";

export async function fetchNotesWithProfiles(filters) {
  const params = {
    userId: filters?.userId,
    status: filters?.status,
    orderBy: filters?.orderBy,
    limit: filters?.limit,
  };
  const res = await api.notes.list(params);
  return res.data || [];
}

export async function fetchNoteById(id) {
  const res = await api.notes.get(id);
  return res.data || null;
}

export async function fetchExamPapersWithProfiles(filters) {
  const params = {
    userId: filters?.userId,
    status: filters?.status,
    orderBy: filters?.orderBy,
    limit: filters?.limit,
  };
  const res = await api.examPapers.list(params);
  return res.data || [];
}

export async function fetchExamPaperById(id) {
  const res = await api.examPapers.get(id);
  return res.data || null;
}

export async function downloadDocument(options) {
  const { fileUrl, fileName, contentType, contentId } = options;
  try {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName || "download";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (contentType && contentId) {
      if (contentType === "note") {
        await api.notes.download(contentId).catch(() => {});
      } else {
        await api.examPapers.download(contentId).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Download failed:", err);
    throw err;
  }
}
