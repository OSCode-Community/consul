import type { Metadata } from 'next';
import FileUpload from '@/components/FileUpload';

export const metadata: Metadata = {
  title: 'File Upload'
};

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <main className="mx-auto max-w-205 px-6 pt-12 pb-20">
        <FileUpload maxSizeMB={50} maxFiles={10} />
      </main>
    </div>
  );
}
