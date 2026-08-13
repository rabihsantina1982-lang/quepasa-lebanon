"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Link } from "@/i18n/navigation";

interface Pin {
  id: string;
  slug: string;
  title: string;
  lat: number;
  lng: number;
  starts_at: string;
  cover_image: string | null;
}

export function MapView({ pins, locale }: { pins: Pin[]; locale: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Pin | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    const setSizes = () => {
      if (!wrapperRef.current || !mapDivRef.current) return;
      const top = wrapperRef.current.getBoundingClientRect().top;
      const bottomNav = document.querySelector<HTMLElement>("nav.fixed.bottom-0");
      const bottomNavHeight = bottomNav && getComputedStyle(bottomNav).display !== "none" ? bottomNav.offsetHeight : 0;
      const h = Math.max(400, window.innerHeight - top - bottomNavHeight);
      wrapperRef.current.style.height = `${h}px`;
      mapDivRef.current.style.width = `${wrapperRef.current.clientWidth}px`;
      mapDivRef.current.style.height = `${h}px`;
    };
    setSizes();
    window.addEventListener("resize", setSizes);
    return () => window.removeEventListener("resize", setSizes);
  }, []);

  useEffect(() => {
    if (!token || !mapDivRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapDivRef.current,
      style: {
        version: 8,
        sources: {
          "raster-tiles": {
            type: "raster",
            tiles: [`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=${token}`],
            tileSize: 256,
          },
        },
        layers: [{ id: "streets", type: "raster", source: "raster-tiles" }],
      },
      center: [55.27, 25.2],
      zoom: 10,
    });
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(mapDivRef.current);
    pins.forEach((p) => {
      const el = document.createElement("button");
      el.className = "h-7 w-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold ring-2 ring-white shadow";
      el.textContent = "•";
      el.onclick = () => setSelected(p);
      new mapboxgl.Marker(el).setLngLat([p.lng, p.lat]).addTo(map);
    });
    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, [pins, token]);

  if (!token) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-[var(--color-muted)]">
        Set <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> in <code>.env.local</code> to enable the map.
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative min-h-[400px] overflow-hidden">
      <div ref={mapDivRef} />
      {selected && (
        <div className="absolute bottom-4 inset-x-4 lg:inset-x-auto lg:start-4 lg:max-w-sm bg-[var(--color-card)] rounded-[var(--radius-card)] shadow-xl p-4">
          <h3 className="font-semibold">{selected.title}</h3>
          <p className="text-xs text-[var(--color-muted)] mt-1">{new Date(selected.starts_at).toLocaleString(locale)}</p>
          <Link
            href={`/events/${selected.slug}`}
            className="inline-block mt-3 text-sm font-medium text-[var(--color-primary)]"
          >
            View details →
          </Link>
        </div>
      )}
    </div>
  );
}
