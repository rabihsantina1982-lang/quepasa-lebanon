"use client";

import { useEffect, useRef, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

const VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "dd/MM/yyyy";

// Native <option> popups don't inherit our theme — force readable colors.
const optionStyle = { color: "#111111", backgroundColor: "#ffffff" };

function parseValue(value: string): Date | null {
  return value ? parse(value, VALUE_FORMAT, new Date()) : null;
}

export function BirthDatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  const selected = parseValue(value);
  const [viewMonth, setViewMonth] = useState(selected ?? new Date(currentYear - 25, 0, 1));

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pickDay(day: Date) {
    onChange(format(day, VALUE_FORMAT));
    setOpen(false);
  }

  function setYear(y: number) {
    setViewMonth((m) => new Date(y, m.getMonth(), 1));
  }
  function setMonth(mo: number) {
    setViewMonth((m) => new Date(m.getFullYear(), mo, 1));
  }

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-11 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors flex items-center justify-between gap-2"
      >
        <span className={selected ? "" : "text-[var(--color-muted)]"}>
          {selected ? format(selected, DATE_DISPLAY_FORMAT) : placeholder}
        </span>
        <CalendarIcon size={16} className="text-[var(--color-muted)] shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={viewMonth.getMonth()}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex-1 h-8 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-xs px-1 outline-none"
              style={{ colorScheme: "light" }}
            >
              {months.map((mo) => (
                <option key={mo} value={mo} style={optionStyle}>
                  {format(new Date(2000, mo, 1), "MMMM")}
                </option>
              ))}
            </select>
            <select
              value={viewMonth.getFullYear()}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-20 h-8 rounded border border-[var(--color-border)] bg-[var(--color-card)] text-xs px-1 outline-none"
              style={{ colorScheme: "light" }}
            >
              {years.map((y) => (
                <option key={y} value={y} style={optionStyle}>{y}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-muted)] mb-1">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = selected && isSameDay(day, selected);
              const inMonth = isSameMonth(day, viewMonth);
              const disabled = day > today;
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  disabled={disabled}
                  onClick={() => pickDay(day)}
                  className={`h-8 rounded text-sm transition-colors ${
                    disabled
                      ? "text-[var(--color-muted)]/30 cursor-not-allowed"
                      : isSelected
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                      : inMonth
                      ? "hover:bg-[var(--color-bg)]"
                      : "text-[var(--color-muted)]/50 hover:bg-[var(--color-bg)]"
                  }`}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
