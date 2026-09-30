import { Uploader } from "@/components/Uploader";
import { Eyebrow } from "@/components/ui";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Step 1 · you</Eyebrow>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Upload CVs</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Choose the role each person applied for. Name, email and phone are split off and kept in the database. Only the rest of the CV goes to the AI,
          which scores it against both the PM and SPM rubrics.
        </p>
      </div>
      <Uploader />
    </div>
  );
}
