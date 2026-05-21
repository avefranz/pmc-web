import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    number: "1",
    title: "List your property",
    description: "Add photos, set your price, and describe your space in minutes.",
  },
  {
    number: "2",
    title: "Welcome guests",
    description: "We handle bookings, contracts, and ID verification automatically.",
  },
  {
    number: "3",
    title: "Get paid",
    description: "Receive monthly payments directly to your account. No hidden fees.",
  },
];

export function BecomeHostPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="text-center py-16 md:py-24">
        <h1 className="text-4xl md:text-5xl font-bold text-fg leading-tight mb-4">
          Earn extra income hosting on Siamo
        </h1>
        <p className="text-lg text-fg-muted max-w-xl mx-auto mb-8">
          List your property in minutes. We handle bookings, contracts, and payments so you don't have to.
        </p>
        <Button
          asChild
          size="lg"
          className="bg-brand hover:bg-[rgb(var(--color-primary-hover))] text-white font-semibold px-8"
        >
          <Link to="/me/host/properties/new">Add your first property</Link>
        </Button>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-16">
        {STEPS.map((step) => (
          <div key={step.number} className="bg-bg-card rounded-xl p-6 shadow-card">
            <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center mb-4">
              <span className="text-brand font-bold text-lg">{step.number}</span>
            </div>
            <h3 className="font-semibold text-fg mb-2">{step.title}</h3>
            <p className="text-sm text-fg-muted leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
