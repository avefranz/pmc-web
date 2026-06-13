import { useNavigate } from "react-router-dom";
import { Search, Building2 } from "lucide-react";

export function IntentOnboardingStep() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-xl">
        <h1 className="text-3xl font-bold text-fg text-center mb-2">
          What brings you to Siamo?
        </h1>
        <p className="text-fg-muted text-center mb-10">
          We'll take you to the right place.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/listings")}
            className="group text-left bg-bg-card rounded-2xl shadow-card hover:shadow-hover border border-border hover:border-brand/40 transition-all p-7"
          >
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mb-5 group-hover:bg-brand/20 transition-colors">
              <Search size={22} className="text-brand" />
            </div>
            <h2 className="text-base font-semibold text-fg mb-1.5">Find a place to rent</h2>
            <p className="text-sm text-fg-muted leading-relaxed mb-5">
              Browse furnished mid-term rentals across Thailand and move in within days.
            </p>
            <p className="text-sm font-semibold text-brand group-hover:underline underline-offset-2">
              Browse rentals →
            </p>
          </button>

          <button
            onClick={() => navigate("/me/host/properties/new")}
            className="group text-left bg-bg-card rounded-2xl shadow-card hover:shadow-hover border border-border hover:border-fg/20 transition-all p-7"
          >
            <div className="w-12 h-12 rounded-xl bg-fg/8 flex items-center justify-center mb-5 group-hover:bg-fg/12 transition-colors">
              <Building2 size={22} className="text-fg" />
            </div>
            <h2 className="text-base font-semibold text-fg mb-1.5">List my property</h2>
            <p className="text-sm text-fg-muted leading-relaxed mb-5">
              Publish your apartment or villa and start getting requests from prospective tenants.
            </p>
            <p className="text-sm font-semibold text-fg group-hover:underline underline-offset-2">
              Get started →
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
