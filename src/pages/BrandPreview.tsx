import { GestorNiqLogo } from "@/components/brand/GestorNiqLogo";

const SIZES = [24, 32, 48, 64];

export default function BrandPreview() {
  return (
    <main className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">GestorNiq Brand Preview</h1>
          <p className="text-sm text-muted-foreground">Logo validation for icon and full variants across standard sizes.</p>
        </div>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Dark Surface</h2>
          <div className="mt-4 rounded-xl bg-[#0B1220] p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-3 text-xs uppercase tracking-wide text-slate-300">Icon</p>
                <div className="flex flex-wrap items-end gap-5">
                  {SIZES.map((size) => (
                    <GestorNiqLogo key={`dark-icon-${size}`} variant="icon" size={size} theme="dark" />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs uppercase tracking-wide text-slate-300">Full</p>
                <div className="space-y-4">
                  {SIZES.map((size) => (
                    <GestorNiqLogo key={`dark-full-${size}`} variant="full" size={size} theme="dark" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Light Surface</h2>
          <div className="mt-4 rounded-xl bg-white p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Icon</p>
                <div className="flex flex-wrap items-end gap-5">
                  {SIZES.map((size) => (
                    <GestorNiqLogo key={`light-icon-${size}`} variant="icon" size={size} theme="light" />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Full</p>
                <div className="space-y-4">
                  {SIZES.map((size) => (
                    <GestorNiqLogo key={`light-full-${size}`} variant="full" size={size} theme="light" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

