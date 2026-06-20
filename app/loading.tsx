import { LoadingCard } from "@/components/ui";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    </main>
  );
}
