import { WallResilienceSimulator } from "@/components/simulations/wall-resilience-simulator";

export default function WallResilienceDemoPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
            <span className="h-1 w-6 rounded-full bg-slate-950" />
            3D Presentation
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Gabion Retaining Wall Demo
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            A real-time 3D visualization using the submitted gabion wall drawings, drainage detail, stability computation, and client-updated 30 m inclined embedded wall notes.
          </p>
        </section>
        <WallResilienceSimulator />
      </div>
    </main>
  );
}
