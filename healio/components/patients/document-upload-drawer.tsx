"use client";

import { useId, useMemo, useState } from "react";

import { useUploadPatientDocument } from "@/hooks/usePatientDocuments";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast-provider";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

type Props = {
  patientId: string;
  open: boolean;
  onClose: () => void;
};

export function DocumentUploadDrawer({ patientId, open, onClose }: Props) {
  const inputId = useId();
  const { pushToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadPatientDocument(patientId, {
    onSuccess: (doc) => {
      pushToast({
        title: "Document uploaded",
        description: `${doc.originalFilename} is now available in the chart documents tab.`,
        variant: "success",
      });
      setSelectedFile(null);
      setError(null);
      onClose();
    },
    onError: (uploadError) => {
      setError(uploadError.message);
      pushToast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "error",
      });
    },
  });

  const derivedValidation = useMemo(() => {
    if (!selectedFile) return null;
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      return "Only PDF, PNG, and JPEG files are supported.";
    }
    if (selectedFile.size <= 0) {
      return "Selected file is empty.";
    }
    if (selectedFile.size > MAX_FILE_BYTES) {
      return "File exceeds the 10 MB upload limit.";
    }
    return null;
  }, [selectedFile]);

  function resetAndClose() {
    setSelectedFile(null);
    setError(null);
    onClose();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = derivedValidation;
    if (!selectedFile) {
      setError("Choose a PDF, PNG, or JPEG file before uploading.");
      return;
    }
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    setError(null);
    await uploadMutation.mutateAsync(selectedFile);
  }

  return (
    <Drawer
      open={open}
      onClose={resetAndClose}
      title="Upload Patient Document"
      description="Use an in-context drawer so staff can add labs/scans without leaving the patient chart."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={resetAndClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="patient-document-upload-form"
            loading={uploadMutation.isPending}
            disabled={!selectedFile || Boolean(derivedValidation)}
          >
            Upload Document
          </Button>
        </div>
      }
    >
      <form id="patient-document-upload-form" className="space-y-4" onSubmit={onSubmit}>
        <div className="rounded-card border border-border bg-app/50 p-4">
          <label htmlFor={inputId} className="block text-sm font-semibold text-ink">
            File
          </label>
          <p className="mt-1 text-sm text-muted">
            Accepted: PDF, PNG, JPEG. Max size 10 MB. Files are stored as private patient documents.
          </p>
          <input
            id={inputId}
            name="file"
            type="file"
            accept=".pdf,image/png,image/jpeg"
            className="mt-3 block w-full rounded-control border border-border bg-white px-3 py-2 text-sm text-ink file:mr-3 file:rounded-control file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            onChange={(event) => {
              const nextFile = event.currentTarget.files?.[0] ?? null;
              setSelectedFile(nextFile);
              setError(null);
            }}
          />
        </div>

        {selectedFile ? (
          <div className="rounded-card border border-border bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Selected File</p>
            <p className="mt-2 text-sm font-semibold text-ink">{selectedFile.name}</p>
            <p className="mt-1 text-sm text-muted">
              {selectedFile.type || "Unknown type"} • {formatBytes(selectedFile.size)}
            </p>
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-border bg-white p-4 text-sm text-muted">
            No file selected yet. Upload a lab result, referral letter, or scan to keep the chart complete.
          </div>
        )}

        {derivedValidation ? (
          <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {derivedValidation}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-card border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </form>
    </Drawer>
  );
}
