import { useState } from "react";
import { Button } from "../ui/button";

function followUps(text: string) {
  const tail = text.slice(-2400);
  const german = /\b(ich|und|die|der|das|kann|möchtest|soll|nächste|erledigt)\b/i.test(tail);
  const suggestions: string[] = [];
  const nextStep =
    /(?:next steps?|next:|nächste[rn]? schritt[e]?)[:\s*]*\n?\s*(?:[-*]|\d+\.)?\s*([^\n]{12,180})/i.exec(
      tail,
    )?.[1];
  if (nextStep)
    suggestions.push(
      german ? `Setze den nächsten Schritt um: ${nextStep}` : `Do the next step: ${nextStep}`,
    );
  if (/\b(fail(?:ed|ing)?|error|broken|fehler|fehlgeschlagen)\b/i.test(tail)) {
    suggestions.push(
      german
        ? "Untersuche und behebe den beschriebenen Fehler."
        : "Investigate and fix the issue you described.",
    );
  } else if (/\b(plan|proposal|vorschlag|implementieren|implement)\b/i.test(tail)) {
    suggestions.push(
      german ? "Setze den vorgeschlagenen Plan um." : "Implement the plan you proposed.",
    );
  } else if (/\?\s*$/.test(tail)) {
    suggestions.push(
      german
        ? "Ja, fahre mit deinem Vorschlag fort."
        : "Yes, continue with your proposed next step.",
    );
  }
  suggestions.push(
    german
      ? "Prüfe die Änderungen auf Fehler und Randfälle."
      : "Review the changes for bugs and edge cases.",
  );
  suggestions.push(
    german
      ? "Führe die passenden Checks aus und behebe Fehler."
      : "Run the relevant checks and fix any failures.",
  );
  return suggestions.slice(0, 3);
}

export function PromptSuggestions({
  response,
  onSelect,
}: {
  response: { id: string; text: string };
  onSelect: (prompt: string) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-1 px-1 pb-2" aria-label="Suggested follow-ups">
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {followUps(response.text).map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="max-w-full truncate rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            title={prompt}
            onClick={() => onSelect(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="Dismiss prompt suggestions"
        onClick={() => setDismissed(true)}
      >
        ×
      </Button>
    </div>
  );
}
