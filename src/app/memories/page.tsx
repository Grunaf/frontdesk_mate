import { UploadMemoriesForm } from "@/features/upload-memories/ui/UploadMemoriesForm";

export default function MemoriesPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-xl mx-auto">
        <h1 className="text-4xl font-semibold mb-4">
          Share your memories
        </h1>
        <p className="text-white/70 mb-10">
          Upload your favourite hostel photos or videos.
        </p>
        <UploadMemoriesForm />
      </div>
    </main>
  )
}