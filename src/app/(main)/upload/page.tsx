import { Uploader } from "@/components/Uploader";
import { PageHeader } from "@/components/ui";

export default function UploadPage() {
  return (
    <>
      <PageHeader
        icon="upload"
        object="Upload"
        title="Import Candidate CVs"
        meta="Contact details are separated on import. Each CV is scored against both the PM and SPM scorecards."
      />
      <Uploader />
    </>
  );
}
