"use client";

import { useEffect, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";

const VALUE_FORMAT = "yyyy-MM-dd'T'HH:mm";
const DATE_DISPLAY_FORMAT = "dd/MM/yyyy";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

// Native <option> popups don't inherit our theme; force readable dark-on-light
// regardless of the page's dark mode, since some browsers otherwise render
// unselected options with light text on a light background.
const optionStyle = { color: "#111111", backgroundColor: "#ffffff" };

function parseValue(value: string): Date | null {
  return value ? parse(value, VALUE_FORMAT, new Date()) : null;
}

export function DatePicker({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = parseValue(value);
  const [viewMonth, setViewMonth] = useState(selected ?? new Date());

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
    const base = selected ?? new Date(0, 0, 0, 12, 0);
    const next = new Date(day);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    onChange(format(next, VALUE_FORMAT));
    setOpen(false);
  }

  const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-11 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors flex items-center justify-between gap-2"
      >
        <span className={selected ? "" : "text-[var(--color-muted)]"}>
          {selected ? format(selected, DATE_DISPLAY_FORMAT) : "dd/mm/yyyy"}
        </span>
        <CalendarIcon size={16} className="text-[var(--color-muted)] shrink-0" />
      </button>

      {/* Hidden input so native "required" validation still works on submit */}
      <input type="text" value={value} required={required} readOnly tabIndex={-1}
        className="absolute w-0 h-0 opacity-0 pointer-events-none" aria-hidden />

      {open && (
        <div className="absolute z-50 mt-2 w-64 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setViewMonth((m) => subMonths(m, 1))}
              className="p-1 rounded hover:bg-[var(--color-bg)]">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium">{format(viewMonth, "MMMM yyyy")}</span>
            <button type="button" onClick={() => setViewMonth((m) => addMonths(m, 1))}
              className="p-1 rounded hover:bg-[var(--color-bg)]">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--color-muted)] mb-1">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = selected && isSameDay(day, selected);
              const inMonth = isSameMonth(day, viewMonth);
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  onClick={() => pickDay(day)}
                  className={`h-8 rounded text-sm transition-colors ${
                    isSelected
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

export function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseValue(value);
  const hasDate = !!selected;

  function pickHour(h: string) {
    const base = selected ?? new Date();
    const next = new Date(base);
    next.setHours(Number(h));
    onChange(format(next, VALUE_FORMAT));
  }

  function pickMinute(m: string) {
    const base = selected ?? new Date();
    const next = new Date(base);
    next.setMinutes(Number(m));
    onChange(format(next, VALUE_FORMAT));
  }

  return (
    <div className="flex items-center gap-1.5 h-11 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
      <Clock size={16} className="text-[var(--color-muted)] shrink-0" />
      <select
        disabled={!hasDate}
        value={selected ? format(selected, "HH") : ""}
        onChange={(e) => pickHour(e.target.value)}
        className="bg-transparent text-sm outline-none disabled:text-[var(--color-muted)]"
        style={{ colorScheme: "light" }}
      >
        <option value="" disabled style={optionStyle}>HH</option>
        {HOURS.map((h) => <option key={h} value={h} style={optionStyle}>{h}</option>)}
      </select>
      <span className="text-sm text-[var(--color-muted)]">:</span>
      <select
        disabled={!hasDate}
        value={selected ? format(selected, "mm") : ""}
        onChange={(e) => pickMinute(e.target.value)}
        className="bg-transparent text-sm outline-none disabled:text-[var(--color-muted)]"
        style={{ colorScheme: "light" }}
      >
        <option value="" disabled style={optionStyle}>MM</option>
        {MINUTES.map((m) => <option key={m} value={m} style={optionStyle}>{m}</option>)}
      </select>
    </div>
  );
}
