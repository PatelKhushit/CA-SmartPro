"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Calculator as CalculatorIcon, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ApiClientError } from "@/lib/api-client";
import type { CalculatorConfig } from "@/lib/calculator-configs";
import { formatCurrency, formatPercent, formatNumber, formatDays, formatDateFromEpoch } from "@/lib/format";

interface CalculatorResponse {
  inputs: Record<string, unknown>;
  formula: string;
  result: Record<string, number>;
  assumptions: string[];
  calculatedAt: string;
}

function formatValue(format: string, value: number) {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value);
    case "days":
      return formatDays(value);
    case "date":
      return formatDateFromEpoch(value);
    default:
      return formatNumber(value);
  }
}

export function CalculatorRunner({ config }: { config: CalculatorConfig }) {
  const [values, setValues] = React.useState<Record<string, string | number>>(() => {
    const initial: Record<string, string | number> = {};
    for (const field of config.fields) {
      if (field.type === "date") {
        initial[field.name] = new Date().toISOString().slice(0, 10);
      } else {
        initial[field.name] = field.defaultValue !== undefined ? String(field.defaultValue) : "";
      }
    }
    return initial;
  });
  const [result, setResult] = React.useState<CalculatorResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post<CalculatorResponse>(config.endpoint, body),
  });

  const setField = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const calculate = async () => {
    setError(null);
    const body: Record<string, unknown> = {};
    for (const field of config.fields) {
      const raw = values[field.name];
      if (field.type === "number") body[field.name] = Number(raw);
      else if (field.name === "interState") body[field.name] = raw === "true";
      else body[field.name] = raw;
    }
    try {
      const res = await mutation.mutateAsync(body);
      setResult(res);
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiClientError ? err.message : "We couldn't calculate that. Please check your inputs.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalculatorIcon className="h-4 w-4 text-brand-600" /> {config.title}
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {config.fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label htmlFor={`${config.id}-${field.name}`}>
                {field.label} {field.suffix && <span className="text-muted">({field.suffix})</span>}
              </Label>
              {field.type === "select" ? (
                <Select value={String(values[field.name])} onValueChange={(v) => setField(field.name, v)}>
                  <SelectTrigger id={`${config.id}-${field.name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={`${config.id}-${field.name}`}
                  type={field.type === "date" ? "date" : "number"}
                  value={values[field.name]}
                  onChange={(e) => setField(field.name, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <Button onClick={calculate} disabled={mutation.isPending} className="w-full sm:w-auto">
          {mutation.isPending ? "Calculating…" : "Calculate"}
        </Button>

        {error && <p className="text-sm text-status-overdue">{error}</p>}

        {result && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted-surface p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(result.result).map(([key, value]) => {
                const meta = config.resultLabels[key];
                if (!meta) return null;
                return (
                  <div key={key}>
                    <p className="text-xs text-muted">{meta.label}</p>
                    <p className="text-lg font-semibold text-foreground">{formatValue(meta.format, value)}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-start gap-2 border-t border-border pt-3 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <p>
                  <span className="font-medium text-foreground">Formula:</span> {result.formula}
                </p>
                {result.assumptions.length > 0 && (
                  <p className="mt-1">
                    <span className="font-medium text-foreground">Assumptions:</span> {result.assumptions.join(" ")}
                  </p>
                )}
                <p className="mt-1">
                  Calculated {new Date(result.calculatedAt).toLocaleString()} — an estimate, not a guaranteed filing result.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
