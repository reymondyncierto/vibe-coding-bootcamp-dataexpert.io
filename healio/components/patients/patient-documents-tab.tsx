"use client";

import { useMemo, useState } from "react";

import type { PatientDocumentListItem } from "@/hooks/usePatientDocuments";

import { usePatientDocuments } from "@/hooks/usePatientDocuments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal, ModalBody } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentUploadDrawer } from "./document-upload-drawer";

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function mimeLabel(mimeType: string) {
  switch (mimeType) {
    case "application/pdf":
      return "PDF";
    case "image/png":
      return "PNG";
    case "image/jpeg":
      return "JPEG";
    default:
      return mimeType;
  }
}

function canInlinePreview(document: PatientDocumentListItem) {
  if (document.downloadUrl.startsWith("memory://")) return false;
  return document.mimeType === "application/pdf" || document.mimeType.startsWith("image/");
}

function DocumentPreviewModal({
  document,
  open,
  onClose,
}: {
  document: PatientDocumentListItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const [previewErrored, setPreviewErrored] = useState(false);

  if (!document || !open) return null;

  const inlinePreview = canInlinePreview(document) && !previewErrored;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Document Preview"
      description="Preview patient documents in-context when a browser-accessible signed URL is available."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={() => window.open(document.downloadUrl, "_blank", "noopener,noreferrer")}>
            Open Link
          </Button>
        </div>
      }
    >
      <ModalBody>
        <div className="rounded-card border border-border bg-app/50 p-3">
          <p className="text-sm font-semibold text-ink">{document.originalFilename}</p>
          <p className="mt-1 text-sm text-muted">
            {mimeLabel(document.mimeType)} • {formatBytes(document.sizeBytes)} • Uploaded {formatDateTime(document.uploadedAt)}
          </p>
        </div>

        {inlinePreview ? (
          document.mimeType === "application/pdf" ? (
            <iframe
              title={`Preview ${document.originalFilename}`}
              src={document.downloadUrl}
              className="h-[55vh] w-full rounded-card border border-border bg-white"
              onError={() => setPreviewErrored(true)}
            />
          ) : (
            <img
              src={document.downloadUrl}
              alt={`Preview ${document.originalFilename}`}
              className="max-h-[55vh] w-full rounded-card border border-border bg-white object-contain"
              onError={() => setPreviewErrored(true)}
            />
          )
        ) : (
          <div className="rounded-card border border-warning/20 bg-warning/5 p-4">
            <p className="text-sm font-semibold text-ink">Preview unavailable in local mode</p>
            <p className="mt-1 text-sm text-muted">
              The current environment returned a non-browser preview URL (`memory://signed/...`). Use the metadata below and the open link action, or connect Supabase storage for signed HTTP previews.
            </p>
            <div className="mt-3 rounded-control border border-border bg-white px-3 py-3 text-sm text-muted">
              <p className="break-all">{document.downloadUrl}</p>
            </div>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}

export function PatientDocumentsTab({ patientId }: { patientId: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PatientDocumentListItem | null>(null);
  const documentsQuery = usePatientDocuments(patientId, { retry: false });

  const documents = useMemo(
    () => [...(documentsQuery.data ?? [])].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)),
    [documentsQuery.data],
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Labs, scans, and referral attachments stay in a soft bento card with in-context upload and preview actions.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={documentsQuery.isError ? "danger" : documentsQuery.isFetching ? "warning" : "success"}>
                {documentsQuery.isError ? "Error" : documentsQuery.isFetching ? "Refreshing" : "Connected"}
              </Badge>
              <Button type="button" variant="secondary" size="sm" onClick={() => void documentsQuery.refetch()}>
                Refresh
              </Button>
              <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
                Upload Document
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {documentsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-card border border-border bg-white p-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-2 h-4 w-32" />
                  <Skeleton className="mt-3 h-10 w-full rounded-control" />
                </div>
              ))}
            </div>
          ) : null}

          {!documentsQuery.isLoading && documentsQuery.isError ? (
            <div className="rounded-card border border-danger/20 bg-danger/5 p-4">
              <p className="text-sm font-semibold text-danger">Unable to load documents</p>
              <p className="mt-1 text-sm text-muted">
                {documentsQuery.error.message}. Retry or verify the patient documents API route.
              </p>
              <div className="mt-3">
                <Button type="button" onClick={() => void documentsQuery.refetch()}>
                  Try Again
                </Button>
              </div>
            </div>
          ) : null}

          {!documentsQuery.isLoading && !documentsQuery.isError && documents.length === 0 ? (
            <div className="rounded-card border border-border bg-app/60 p-4">
              <p className="text-sm font-semibold text-ink">No documents yet</p>
              <p className="mt-1 text-sm text-muted">
                Upload the patient&apos;s first lab result or scan. The drawer keeps you in the chart while building a paper replacement workflow.
              </p>
              <div className="mt-3">
                <Button type="button" onClick={() => setUploadOpen(true)}>
                  Upload First Document
                </Button>
              </div>
            </div>
          ) : null}

          {!documentsQuery.isLoading && !documentsQuery.isError && documents.length > 0 ? (
            <div className="grid gap-3">
              {documents.map((doc) => (
                <article
                  key={doc.id}
                  className="rounded-card border border-border bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{doc.originalFilename}</p>
                        <Badge variant="neutral">{mimeLabel(doc.mimeType)}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {formatBytes(doc.sizeBytes)} • Uploaded {formatDateTime(doc.uploadedAt)}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted">{doc.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedDocument(doc)}>
                        Preview
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DocumentUploadDrawer patientId={patientId} open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <DocumentPreviewModal
        document={selectedDocument}
        open={Boolean(selectedDocument)}
        onClose={() => setSelectedDocument(null)}
      />
    </>
  );
}
