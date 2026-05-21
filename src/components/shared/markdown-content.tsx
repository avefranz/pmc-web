import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils/cn";

/**
 * Renders listing description / host messages with consistent typography.
 * The structured AI description uses h2 sections (About the place / The
 * space / Guest access / Other things to note); legacy plain-text
 * descriptions render as a single paragraph.
 */
export function MarkdownContent({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("text-[15px] leading-relaxed max-w-[65ch]", className)}>
      <ReactMarkdown
        components={{
          h2: ({ children }) => (
            <h3 className="text-[11.5px] font-bold tracking-[0.08em] uppercase text-fg mt-6 mb-2 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-fg-muted leading-relaxed mb-3 last:mb-0 whitespace-pre-line">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="space-y-1.5 mb-3 last:mb-0">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="text-fg-muted flex items-start gap-2 leading-relaxed">
              <span className="text-fg-subtle mt-2 shrink-0 w-1 h-1 rounded-full bg-fg-subtle" />
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-fg">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="font-serif italic">{children}</em>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-brand underline underline-offset-2 hover:text-brand-hover" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // Disable raw HTML (security) — react-markdown is safe by default
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
