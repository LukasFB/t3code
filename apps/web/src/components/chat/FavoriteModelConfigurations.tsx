import type { ProviderInstanceEntry } from "../../providerInstances";
import * as Schema from "effect/Schema";
import { ModelSelection } from "@t3tools/contracts";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { Button } from "../ui/button";

const Presets = Schema.Array(ModelSelection);
const presetKey = (selection: ModelSelection) =>
  JSON.stringify({
    ...selection,
    options: [...(selection.options ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
  });

export function FavoriteModelConfigurations({
  current,
  query,
  onSelect,
  disabledReason,
  providers,
}: {
  providers: ReadonlyArray<ProviderInstanceEntry>;
  current: ModelSelection;
  query: string;
  onSelect: (selection: ModelSelection) => void;
  disabledReason: (selection: ModelSelection) => string | null;
}) {
  const [presets, setPresets] = useLocalStorage<ReadonlyArray<ModelSelection>, unknown>(
    "t3code:favorite-model-configurations",
    [],
    Presets,
  );
  const saved = presets.some((preset) => presetKey(preset) === presetKey(current));
  return (
    <section className="max-h-56 overflow-y-auto border-b p-2" aria-label="Favorite configurations">
      <div className="flex items-center justify-between gap-2 pb-2">
        <span className="text-xs font-medium">Favorite configurations</span>
        <Button
          size="xs"
          variant="ghost"
          disabled={saved}
          onClick={() => setPresets([...presets, current])}
        >
          {saved ? "Saved" : "Save current"}
        </Button>
      </div>
      {presets
        .filter((preset) =>
          `${preset.model} ${preset.instanceId} ${(preset.options ?? []).map((option) => `${option.id} ${option.value}`).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((preset) => {
          const provider = providers.find((entry) => entry.instanceId === preset.instanceId);
          const model = provider?.models.find((model) => model.slug === preset.model);
          const titleCase = (text: string) =>
            text.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
          const modelName = model?.name ?? titleCase(preset.model).replace(/^Gpt\b/, "GPT");
          const optionLabel = (pattern: RegExp) => {
            const descriptors = model?.capabilities?.optionDescriptors ?? [];
            const descriptor = descriptors.find((option) => pattern.test(option.id));
            const selection = preset.options?.find((option) => pattern.test(option.id));
            const value =
              selection?.value ??
              descriptor?.currentValue ??
              (descriptor?.type === "select"
                ? descriptor.options.find((option) => option.isDefault)?.id
                : undefined);
            if (value === undefined) return null;
            if (descriptor?.type === "select") {
              const choice = descriptor.options.find((option) => option.id === value);
              if (choice) return choice.label;
            }
            if (value === "priority" || value === true) return "Fast";
            if (value === "default" || value === false) return "Standard";
            return titleCase(String(value));
          };
          const effortLabel = `${optionLabel(/^(reasoningEffort|thinkingLevel|effort|thinking)$/i) ?? "Default"} Thinking`;
          const speedLabel = optionLabel(/^(serviceTier|fastMode|speed|fast)$/i) ?? "Default Speed";
          return (
            <div key={presetKey(preset)} className="flex items-center gap-1">
              <button
                type="button"
                data-model-configuration
                className="min-w-0 flex-1 rounded px-2 py-1.5 text-left text-xs hover:bg-accent disabled:opacity-40"
                disabled={disabledReason(preset) !== null}
                aria-description={disabledReason(preset) ?? undefined}
                onClick={() => onSelect(preset)}
              >
                <span className="flex items-baseline gap-2 whitespace-nowrap text-sm">
                  <span className="font-medium">{modelName}</span>
                  <span>{effortLabel}</span>
                  <span>{speedLabel}</span>
                </span>
                <span className="block truncate text-muted-foreground">
                  {provider?.displayName ?? titleCase(preset.instanceId)}
                </span>
              </button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Remove ${preset.model} configuration`}
                onClick={() =>
                  setPresets(presets.filter((item) => presetKey(item) !== presetKey(preset)))
                }
              >
                ×
              </Button>
            </div>
          );
        })}
      {presets.length === 0 ? (
        <p className="px-2 text-xs text-muted-foreground">
          Choose model, effort and speed, then save the combination here.
        </p>
      ) : null}
    </section>
  );
}
